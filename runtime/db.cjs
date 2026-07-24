'use strict';
const { execFileSync } = require('node:child_process');

function literal(value) {
  return `convert_from(decode('${Buffer.from(String(value)).toString('base64')}','base64'),'UTF8')`;
}

function query(sql) {
  return execFileSync('psql', ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--no-align', process.env.DATABASE_URL, '--command', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function json(sql) {
  const output = query(`SELECT COALESCE(row_to_json(runtime_row)::text,'null') FROM (${sql}) runtime_row`);
  return output ? JSON.parse(output) : null;
}

function jsonMutation(sql) {
  const output = query(`WITH runtime_row AS (${sql}) SELECT COALESCE(row_to_json(runtime_row)::text,'null') FROM runtime_row`);
  return output ? JSON.parse(output) : null;
}

module.exports = { json, jsonMutation, literal, query };
