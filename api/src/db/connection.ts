/**
 * PostgreSQL database connection helper.
 *
 * Provides a singleton Pool instance configured from DATABASE_URL,
 * along with convenience helpers for queries and transactions.
 *
 * Environment variables:
 *   DATABASE_URL  - PostgreSQL connection string (e.g. postgres://user:pass@host:5432/db)
 *                    Defaults to local dev: postgres://postgres:postgres@localhost:5432/safety_mgmt
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) {
    return url;
  }
  // Default local dev connection string (overridden via DATABASE_URL in production)
  return 'postgres://postgres:postgres@localhost:5432/safety_mgmt';
}

/**
 * Singleton PostgreSQL connection pool.
 * Reuse this across the entire application.
 */
const pool = new Pool({
  connectionString: getDatabaseUrl(),
  // Neon/serverless-friendly settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl:
    process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
});

/**
 * Execute a SQL query against the database.
 *
 * @param text   - SQL query string (may contain $1, $2, ... placeholders)
 * @param params - Optional parameter values for the query
 * @returns      - Query result with rows, rowCount, etc.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DB] query executed in ${duration}ms | rows: ${result.rowCount}`);
  }
  return result;
}

/**
 * Execute a callback within a database transaction.
 * Automatically commits on success and rolls back on error.
 *
 * @param cb - Async callback receiving a client; return value is forwarded.
 * @returns  - The value returned by the callback.
 */
export async function transaction<T>(
  cb: (client: import('pg').PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await cb(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test the database connection by running a simple query.
 *
 * @returns `true` if the database is reachable, `false` otherwise.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully shut down the connection pool.
 * Call this during application shutdown (SIGTERM, SIGINT).
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export { pool };
