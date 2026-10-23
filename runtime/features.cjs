'use strict';

// In-memory task store: no database migration is required or performed.
// Tasks are owned by the authenticated user; every read/write checks ownership.
const tasks = new Map();
let seq = 0;
const STATUSES = ['open', 'in_progress', 'done'];

function validateTask(input, existing = null) {
  const title = typeof input?.title === 'string' ? input.title.trim() : (existing?.title ?? '');
  if (!title) throw Object.assign(new Error('Enter a task title.'), { status: 400 });
  if (title.length > 120) throw Object.assign(new Error('Task title must be at most 120 characters.'), { status: 400 });
  const status = input?.status ?? existing?.status ?? 'open';
  if (!STATUSES.includes(status)) throw Object.assign(new Error('Status must be open, in_progress or done.'), { status: 400 });
  const notes = typeof input?.notes === 'string' ? input.notes.trim() : (existing?.notes ?? '');
  if (notes.length > 1000) throw Object.assign(new Error('Task notes must be at most 1000 characters.'), { status: 400 });
  return { title, status, notes };
}

function createTask(userId, input) {
  const value = validateTask(input);
  const task = { id: `task-${++seq}`, userId: Number(userId), ...value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  tasks.set(task.id, task);
  return task;
}
function listTasks(userId, { query = '', status = '' } = {}) {
  const q = String(query).trim().toLowerCase();
  return [...tasks.values()].filter((t) => t.userId === Number(userId))
    .filter((t) => !status || t.status === status)
    .filter((t) => !q || `${t.title} ${t.notes}`.toLowerCase().includes(q))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
function updateTask(userId, id, input) {
  const existing = tasks.get(id);
  if (!existing || existing.userId !== Number(userId)) return null;
  const updated = { ...existing, ...validateTask(input, existing), updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  return updated;
}

// Search / filter over the app's main records (tasks here; reusable for receipts).
function filterRecords(records, { query = '', status = '' } = {}) {
  const q = String(query).trim().toLowerCase();
  return (records ?? []).filter((r) => (!status || r.status === status) && (!q || JSON.stringify(r).toLowerCase().includes(q)));
}

function csvCell(value) {
  const t = String(value ?? '');
  return `"${t.replace(/"/g, '""')}"`;
}
function recordsCsv(records) {
  const rows = [['ID', 'Title', 'Status', 'Notes', 'Created', 'Updated'],
    ...(records ?? []).map((t) => [t.id, t.title, t.status, t.notes ?? '', t.createdAt, t.updatedAt])];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
function recordsJson(records) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), count: (records ?? []).length, records: records ?? [] }, null, 2);
}

// AI features over the app's own records. A provider is called only when the
// caller supplies one (wired in server.cjs only when OPENROUTER_API_KEY or
// OPENAI_API_KEY is configured); otherwise a labelled deterministic fallback.
function deterministicInsights(records) {
  const rows = records ?? [];
  const open = rows.filter((t) => t.status === 'open').length;
  const inProgress = rows.filter((t) => t.status === 'in_progress').length;
  const done = rows.filter((t) => t.status === 'done').length;
  return {
    aiGenerated: false,
    source: 'deterministic-fallback',
    workloadSummary: `${rows.length} task(s) on record: ${open} open, ${inProgress} in progress, ${done} done.`,
    prioritySuggestion: open ? `Start with the oldest open task: "${rows.find((t) => t.status === 'open').title}".` : 'No open tasks; review in-progress work or add the next job task.',
    counts: { total: rows.length, open, inProgress, done },
    followUpDraft: done ? `${done} completed task(s) ready for customer follow-up.` : 'No completed tasks yet; a follow-up draft will appear once work is marked done.',
  };
}
async function generateInsights(records, provider = null) {
  if (typeof provider !== 'function') return deterministicInsights(records);
  const raw = await provider(records);
  if (!raw || typeof raw !== 'object') throw new Error('AI provider returned no usable result.');
  return { ...raw, aiGenerated: true, source: 'provider' };
}
// Readable labelled sections; preserves false / 0 / empty values.
function insightSections(insights) {
  const show = (v) => (v === null || v === undefined ? 'Not supplied' : typeof v === 'boolean' || typeof v === 'number' ? String(v) : Array.isArray(v) ? (v.length ? v.join('; ') : '(none)') : String(v) === '' ? '(empty)' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return [
    ['AI generated', show(insights.aiGenerated)],
    ['Source', show(insights.source)],
    ['Workload summary', show(insights.workloadSummary)],
    ['Priority suggestion', show(insights.prioritySuggestion)],
    ['Total tasks', show(insights.counts?.total)],
    ['Open tasks', show(insights.counts?.open)],
    ['Follow-up draft', show(insights.followUpDraft)],
  ];
}

module.exports = { STATUSES, validateTask, createTask, listTasks, updateTask, filterRecords, recordsCsv, recordsJson, deterministicInsights, generateInsights, insightSections, _reset: () => { tasks.clear(); seq = 0; } };
