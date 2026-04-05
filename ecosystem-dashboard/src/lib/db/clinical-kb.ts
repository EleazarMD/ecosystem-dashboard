/**
 * Clinical KB Database Utility
 * PostgreSQL connection for clinical knowledge base
 */

import { Pool } from 'pg';

const clinicalPool = new Pool({
  host: process.env.CLINICAL_KB_HOST || '127.0.0.1',
  port: parseInt(process.env.CLINICAL_KB_PORT || '5435'),
  database: 'clinical_kb',
  user: 'clinical_kb',
  password: process.env.CLINICAL_KB_PASSWORD || 'clinical_kb_secure_d0de835df82a2727',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query(text: string, params?: any[]) {
  try {
    const res = await clinicalPool.query(text, params);
    return res;
  } catch (error) {
    console.error('[Clinical KB] Query error:', { text, error });
    throw error;
  }
}

export async function getClient() {
  return await clinicalPool.connect();
}

export default clinicalPool;
