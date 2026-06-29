/**
 * RLS Helper — sets per-connection session variables for Row-Level Security.
 *
 * Usage in API routes:
 *   const client = await pool.connect();
 *   await setRLSContext(client, userId, isPlatformAdmin);
 *   // ... queries are now RLS-scoped ...
 *   client.release();
 *
 * Or use the helper:
 *   const result = await withRLS(pool, userId, isPlatformAdmin, async (client) => {
 *     return await client.query('SELECT * FROM onboarding_jobs');
 *   });
 */

import { Pool, PoolClient } from 'pg';

/**
 * Set the RLS context on a database connection.
 * Must be called before any queries that touch RLS-protected tables.
 */
export async function setRLSContext(
  client: PoolClient,
  userId: string,
  isPlatformAdmin = false
): Promise<void> {
  await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
  if (isPlatformAdmin) {
    await client.query(`SET LOCAL app.bypass_rls = 'true'`);
  } else {
    await client.query(`SET LOCAL app.bypass_rls = 'false'`);
  }
}

/**
 * Execute a function within an RLS-scoped transaction.
 * Acquires a client, sets the RLS context, runs the function, and releases.
 */
export async function withRLS<T>(
  pool: Pool,
  userId: string,
  isPlatformAdmin: boolean,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setRLSContext(client, userId, isPlatformAdmin);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
