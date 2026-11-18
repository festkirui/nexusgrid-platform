// api/_db.js — NexusGrid Database Connection (PostgreSQL via pg)
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool;

function getPool() {
  if (!pool) {
    const connectionString =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL;

    if (!connectionString) {
      throw new Error(
        'No PostgreSQL connection string found. Set POSTGRES_URL in Vercel environment variables.'
      );
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const client = getPool();
  const result = await client.query(sql, params);
  return result;
}

module.exports = { query, bcrypt };
