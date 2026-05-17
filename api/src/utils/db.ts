/**
 * Database utilities module.
 *
 * Re-exports the connection pool and query helper from the db layer
 * for convenient imports throughout the application.
 *
 * Usage:
 *   import { pool, query, transaction, healthCheck } from '@/utils/db';
 */

export {
  pool,
  query,
  transaction,
  healthCheck,
  closePool,
} from '../db/connection';

export type { Pool, QueryResult, QueryResultRow } from 'pg';
