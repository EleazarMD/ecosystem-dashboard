/**
 * Approvals Database Connection
 * PostgreSQL connection pool for the approval system
 */

import { Pool } from 'pg';

// Database connection configuration for Approval System
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Connection event handlers
pool.on('connect', () => {
  console.log('✅ Approval System: Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Approval System: Unexpected database error', err);
});

/**
 * Health check for approvals database
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Approvals database health check failed:', error);
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
