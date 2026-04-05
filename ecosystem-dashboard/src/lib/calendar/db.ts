/**
 * Calendar Database Connection
 * PostgreSQL connection pool for calendar services
 */

import { Pool } from 'pg';

// Database connection configuration for Calendar System
// Uses the ecosystem_unified database with calendar schema
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Set search_path to include calendar schema
  options: '-c search_path=calendar,public',
});

// Connection event handlers
pool.on('connect', () => {
  console.log('✅ Calendar System: Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Calendar System: Unexpected database error', err);
});

/**
 * Health check for calendar database
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Calendar database health check failed:', error);
    return false;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
  return pool.connect();
}

export default pool;
