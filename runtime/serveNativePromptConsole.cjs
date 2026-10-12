const fs=require('node:fs');
const crypto=require('node:crypto');
const template=fs.readFileSync(require('node:path').join(__dirname,'ai-workspace.html'),'utf8');
function serveNativePromptConsole(response){const nonce=crypto.randomBytes(18).toString('base64');response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self' blob:; frame-ancestors 'none'`});response.end(template.replaceAll('__NONCE__',nonce));}

module.exports={serveNativePromptConsole};
