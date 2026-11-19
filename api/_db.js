// api/_db.js — NexusGrid Database (Supabase PostgreSQL)
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let _pool = null;

function getPool() {
  if (_pool) return _pool;

  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;

  if (!url) {
    throw new Error(
      'Missing database URL. Set DATABASE_URL in your Vercel environment variables.\n' +
      'Get it from: Supabase → Project Settings → Database → Connection string (URI mode).'
    );
  }

  _pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  _pool.on('error', (err) => {
    console.error('[DB Pool Error]', err.message);
    _pool = null; // reset so next call rebuilds
  });

  return _pool;
}

async function query(sql, params = []) {
  const pool = getPool();
  try {
    return await pool.query(sql, params);
  } catch (err) {
    console.error('[DB Query Error]', err.message, '\nSQL:', sql.trim().slice(0, 120));
    throw err;
  }
}

module.exports = { query, bcrypt };
