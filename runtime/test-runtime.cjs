'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { literal } = require('./db.cjs');

test('SQL text values are encoded before interpolation', () => {
  const encoded = literal("value'; DROP TABLE users; --");
  assert.match(encoded, /^convert_from\(decode\('[A-Za-z0-9+/=]+'/);
  assert.doesNotMatch(encoded, /DROP TABLE/);
});
