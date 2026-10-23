'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { literal } = require('./db.cjs');

const features = require('./features.cjs');

test('tasks are owned, validated, searchable and updatable', () => {
  features._reset();
  const task = features.createTask(7, { title: ' Inspect HVAC unit ' });
  assert.equal(task.title, 'Inspect HVAC unit');
  assert.equal(task.status, 'open');
  assert.throws(() => features.createTask(7, { title: '' }), /task title/i);
  assert.equal(features.listTasks(8, {}).length, 0);
  assert.equal(features.listTasks(7, { query: 'hvac' }).length, 1);
  assert.equal(features.updateTask(8, task.id, { status: 'done' }), null);
  assert.equal(features.updateTask(7, task.id, { status: 'done' }).status, 'done');
  assert.equal(features.listTasks(7, { status: 'done' }).length, 1);
});

test('CSV and JSON export include task records', () => {
  features._reset();
  features.createTask(1, { title: 'Replace filter' });
  assert.match(features.recordsCsv(features.listTasks(1, {})), /Replace filter/);
  assert.equal(JSON.parse(features.recordsJson(features.listTasks(1, {}))).count, 1);
});

test('AI fallback is labelled deterministic and preserves false/0 values', async () => {
  features._reset();
  const insights = await features.generateInsights([]);
  assert.equal(insights.aiGenerated, false);
  assert.equal(insights.counts.total, 0);
  const sections = Object.fromEntries(features.insightSections(insights));
  assert.equal(sections['AI generated'], 'false');
  assert.equal(sections['Total tasks'], '0');
  const provided = await features.generateInsights([], async () => ({ workloadSummary: 'x', prioritySuggestion: 'y', followUpDraft: 'z', counts: { total: 0, open: 0 } }));
  assert.equal(provided.aiGenerated, true);
});

test('SQL text values are encoded before interpolation', () => {
  const encoded = literal("value'; DROP TABLE users; --");
  assert.match(encoded, /^convert_from\(decode\('[A-Za-z0-9+/=]+'/);
  assert.doesNotMatch(encoded, /DROP TABLE/);
});
