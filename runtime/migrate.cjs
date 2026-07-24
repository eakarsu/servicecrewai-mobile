'use strict';
const { query } = require('./db.cjs');

query(`
CREATE TABLE IF NOT EXISTS servicecrew_runtime_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'administrator',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS servicecrew_runtime_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES servicecrew_runtime_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS servicecrew_ai_provider_receipts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES servicecrew_runtime_users(id) ON DELETE RESTRICT,
  provider VARCHAR(32) NOT NULL CHECK (provider='openrouter'),
  provider_request_id VARCHAR(160) NOT NULL,
  model VARCHAR(160) NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,provider_request_id)
);
CREATE INDEX IF NOT EXISTS servicecrew_ai_receipts_user_created_idx ON servicecrew_ai_provider_receipts(user_id,created_at DESC);
`);
console.log('ServiceCrew runtime schema is current');
