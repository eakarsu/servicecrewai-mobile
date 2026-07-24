'use strict';
const crypto = require('node:crypto');
const { literal, query } = require('./db.cjs');

const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
const name = String(process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator').trim();
if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || !name) throw new Error('Valid acceptance administrator credentials are required');
const salt = crypto.randomBytes(16).toString('hex');
const passwordHash = `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
query(`INSERT INTO servicecrew_runtime_users(email,name,password_hash,role,active)
VALUES(${literal(email)},${literal(name)},${literal(passwordHash)},'administrator',TRUE)
ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='administrator',active=TRUE`);
console.log(`Provisioned ServiceCrew administrator ${email}`);
