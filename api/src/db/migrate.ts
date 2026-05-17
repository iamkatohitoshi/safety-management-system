/**
 * Database migration runner.
 *
 * Reads and executes schema.sql and seed.sql against the PostgreSQL database
 * configured via DATABASE_URL.
 *
 * Usage (standalone):
 *   tsx src/db/migrate.ts              # Run migrations
 *   DRY_RUN=true tsx src/db/migrate.ts  # Dry-run (log statements without executing)
 *
 * Usage (programmatic):
 *   import { runMigrations } from './db/migrate';
 *   await runMigrations(false); // false = don't exit the process
 *
 * Exit codes (standalone):
 *   0 - Success
 *   1 - Failure
 */

import * as fs from 'fs';
import * as path from 'path';
import { query, closePool } from './connection';

/**
 * Load SQL content from a file path relative to this script's directory.
 */
function loadSqlFile(filename: string): string {
  const filePath = path.resolve(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Split a SQL string into individual executable statements.
 * Handles semicolons inside string literals and dollar-quoted strings.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString: string | null = null; // the quote character, or null if outside a string

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Handle dollar-quoted strings (e.g. $tag$...$tag$)
    if (char === '$' && inString === null) {
      const dollarMatch = sql.slice(i).match(/^\$[a-z_]*\$/i);
      if (dollarMatch) {
        const tag = dollarMatch[0];
        const endIdx = sql.indexOf(tag, i + tag.length);
        if (endIdx !== -1) {
          current += sql.slice(i, endIdx + tag.length);
          i = endIdx + tag.length - 1;
          continue;
        }
      }
    }

    // Track string literals (single or double quotes)
    if ((char === "'" || char === '"') && inString === null) {
      inString = char;
    } else if (char === inString) {
      // Escaped quote inside string
      if (nextChar === inString) {
        i++;
        current += char + nextChar;
        continue;
      }
      inString = null;
    }

    // End of a statement (semicolon outside a string)
    if (char === ';' && inString === null) {
      current += char;
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  // Handle trailing content without semicolon
  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Execute all migration SQL files against the database.
 * Logs each statement before execution.
 */
async function executeMigrations(): Promise<void> {
  const isDryRun = process.env.DRY_RUN === 'true';

  console.log('========================================');
  console.log('  Safety Management System - Migrations');
  console.log('========================================');
  console.log(`  Dry run: ${isDryRun ? 'YES' : 'no'}`);
  console.log('');

  // Load SQL files
  const schemaSql = loadSqlFile('schema.sql');
  const seedSql = loadSqlFile('seed.sql');

  const allStatements = [
    { source: 'schema.sql', statements: splitStatements(schemaSql) },
    { source: 'seed.sql', statements: splitStatements(seedSql) },
  ];

  let totalStatements = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const { source, statements } of allStatements) {
    console.log(`--- ${source} (${statements.length} statements) ---`);

    for (const statement of statements) {
      totalStatements++;
      const preview = statement.length > 80 ? statement.slice(0, 77) + '...' : statement;
      console.log(`  [${totalStatements}] ${preview}`);

      if (!isDryRun) {
        try {
          await query(statement);
          successCount++;
        } catch (err: any) {
          // Ignore idempotent errors (IF NOT EXISTS, ON CONFLICT DO NOTHING)
          const msg = err.message || '';
          if (
            msg.includes('already exists') ||
            msg.includes('duplicate key') ||
            msg.includes('unique constraint')
          ) {
            console.log(`    -> skipped (${msg.slice(0, 60)}...)`);
            successCount++;
          } else {
            console.error(`    -> ERROR: ${msg}`);
            errorCount++;
          }
        }
      } else {
        successCount++;
      }
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`  Total statements : ${totalStatements}`);
  console.log(`  Succeeded        : ${successCount}`);
  console.log(`  Failed           : ${errorCount}`);
  console.log(`  Dry run          : ${isDryRun}`);
  console.log('========================================');

  if (errorCount > 0) {
    throw new Error(`Migration failed with ${errorCount} error(s)`);
  }
}

/**
 * Run all database migrations.
 *
 * @param exitOnFailure - If true, calls process.exit(0/1) on completion/failure.
 *                        Set to false when calling programmatically from the dev server.
 */
export async function runMigrations(exitOnFailure: boolean = true): Promise<void> {
  try {
    await executeMigrations();
    console.log('\nMigration completed successfully.');
    if (exitOnFailure) {
      process.exit(0);
    }
  } catch (err: any) {
    console.error(`\nMigration failed: ${err.message}`);
    if (exitOnFailure) {
      process.exit(1);
    }
    throw err;
  } finally {
    await closePool();
  }
}

// --- Main: Entry point when called directly via `tsx src/db/migrate.ts` ---
runMigrations(true);
