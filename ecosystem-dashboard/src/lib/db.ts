/**
 * Database Utility
 * 
 * Direct PostgreSQL connection for server-side operations
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn('[DB] Slow query detected:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('[DB] Query error:', { text, error });
    throw error;
  }
}

export async function getClient() {
  return await pool.connect();
}

export default pool;
