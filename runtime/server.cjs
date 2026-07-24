'use strict';
const crypto = require('node:crypto');
const http = require('node:http');
const { json, jsonMutation, literal, query } = require('./db.cjs');

const port = Number(process.env.BACKEND_PORT);
const host = process.env.BACKEND_HOST || '127.0.0.1';
const allowedOrigins = new Set(String(process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
if (!Number.isInteger(port) || !process.env.DATABASE_URL || String(process.env.SESSION_SECRET || '').length < 32) throw new Error('Runtime configuration is incomplete');

function send(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(payload));
}
function body(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => { raw += chunk; if (raw.length > 262144) reject(Object.assign(new Error('Payload too large'), { status: 413 })); });
    request.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); } });
    request.on('error', reject);
  });
}
function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function currentUser(request) {
  const auth = String(request.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return null;
  return json(`SELECT u.id,u.email,u.name,u.role FROM servicecrew_runtime_sessions s JOIN servicecrew_runtime_users u ON u.id=s.user_id WHERE s.token_hash=${literal(tokenHash(auth.slice(7)))} AND s.expires_at>NOW() AND u.active=TRUE`);
}
function passwordMatches(password, encoded) {
  const [algorithm, salt, expected] = String(encoded || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const target = Buffer.from(expected, 'hex');
  return target.length === actual.length && crypto.timingSafeEqual(target, actual);
}

const server = http.createServer(async (request, response) => {
  try {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) return send(response, 403, { error: 'Origin is not allowed' });
    if (origin) { response.setHeader('access-control-allow-origin', origin); response.setHeader('vary', 'Origin'); }
    if (request.method === 'OPTIONS') { response.writeHead(204, { 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }); return response.end(); }
    const url = new URL(request.url, `http://${host}:${port}`);
    if (request.method === 'GET' && ['/health', '/api/health'].includes(url.pathname)) { query('SELECT 1'); return send(response, 200, { status: 'ok', database: 'reachable', service: 'servicecrew-runtime' }); }
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const payload = await body(request); const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''; const password = typeof payload.password === 'string' ? payload.password : '';
      const user = email ? json(`SELECT id,email,name,role,password_hash FROM servicecrew_runtime_users WHERE email=${literal(email)} AND active=TRUE`) : null;
      if (!user || !passwordMatches(password, user.password_hash)) return send(response, 401, { error: 'Invalid credentials' });
      const token = crypto.randomBytes(32).toString('hex');
      query(`INSERT INTO servicecrew_runtime_sessions(token_hash,user_id,expires_at) VALUES(${literal(tokenHash(token))},${Number(user.id)},NOW()+INTERVAL '12 hours')`);
      return send(response, 200, { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }
    const user = currentUser(request);
    if (request.method === 'GET' && url.pathname === '/api/auth/me') return user ? send(response, 200, { user }) : send(response, 401, { error: 'Bearer token required' });
    if (request.method === 'POST' && url.pathname === '/api/runtime-ai/recommendation') {
      if (!user) return send(response, 401, { error: 'Bearer token required' });
      const payload = await body(request); const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
      if (!prompt || prompt.length > 4000) return send(response, 400, { error: 'Prompt must contain 1-4000 characters' });
      const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim(); const model = String(process.env.OPENROUTER_MODEL || '').trim(); const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
      if (!apiKey || !model || !baseUrl) return send(response, 503, { error: 'AI provider is not configured' });
      const providerResponse = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: 'Give concise field-service operations guidance. Flag safety-critical work for a qualified human.' }, { role: 'user', content: prompt }], max_tokens: 180 }), signal: AbortSignal.timeout(45000) });
      const provider = await providerResponse.json().catch(() => ({})); const content = provider?.choices?.[0]?.message?.content?.trim();
      if (!providerResponse.ok || !provider.id || !content) throw new Error(`OpenRouter request failed with HTTP ${providerResponse.status}`);
      const receipt = jsonMutation(`INSERT INTO servicecrew_ai_provider_receipts(user_id,provider,provider_request_id,model,prompt,content) VALUES(${Number(user.id)},'openrouter',${literal(provider.id)},${literal(provider.model || model)},${literal(prompt)},${literal(content)}) RETURNING id,provider,provider_request_id,model,created_at`);
      return send(response, 200, { content, receipt });
    }
    return send(response, 404, { error: 'Route not found' });
  } catch (error) { console.error('[runtime-request-error]', error.message); return send(response, error.status || 500, { error: error.status ? error.message : 'Internal server error' }); }
});
server.listen(port, host, () => console.log(`ServiceCrew API listening on http://${host}:${port}`));
const shutdown = () => server.close(() => process.exit(0));
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
