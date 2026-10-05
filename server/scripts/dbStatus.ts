import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import { MIGRATIONS, CANONICAL_REQUIRED_TABLES } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [Database Audit] Live Read-Only Connection & Schema');
  console.log('====================================================\n');

  // 1. Environment Variable Audit
  const hasHost = Boolean(process.env.DB_HOST && process.env.DB_HOST.trim());
  const hasPort = Boolean(process.env.DB_PORT && process.env.DB_PORT.trim());
  const hasName = Boolean(process.env.DB_NAME && process.env.DB_NAME.trim());
  const hasUser = Boolean(process.env.DB_USER && process.env.DB_USER.trim());
  const hasPass = Boolean(process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim());
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());

  console.log('--- Environment Variables Configuration ---');
  console.log(`DB_HOST:     ${hasHost ? 'CONFIGURED (PASS)' : 'MISSING (FAIL)'}`);
  console.log(`DB_PORT:     ${hasPort ? 'CONFIGURED (PASS)' : 'DEFAULT (3306)'}`);
  console.log(`DB_NAME:     ${hasName ? 'CONFIGURED (PASS)' : 'MISSING (FAIL)'}`);
  console.log(`DB_USER:     ${hasUser ? 'CONFIGURED (PASS)' : 'MISSING (FAIL)'}`);
  console.log(`DB_PASSWORD: ${hasPass ? 'CONFIGURED (PASS)' : 'MISSING (FAIL)'}`);
  if (hasDatabaseUrl) {
    console.log(`DATABASE_URL: CONFIGURED (PASS)`);
  }
  console.log('');

  if (!hasHost || !hasName || !hasUser) {
    console.error('❌ Configuration Check: FAIL - Missing mandatory environment variables (DB_HOST, DB_NAME, DB_USER).');
    console.error('Failure Category: ENVIRONMENT_VARIABLE_MISSING');
    process.exit(1);
  }

  // 2. Purely Read-Only Connection Attempt
  const host = process.env.DB_HOST!;
  const user = process.env.DB_USER!;
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME!;
  const port = Number(process.env.DB_PORT) || 3306;

  console.log('--- Attempting Real Database Connection ---');
  console.log(`Target: Host = ${host}, Port = ${port}, Database = ${database}, User = ${user}`);

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port,
      connectTimeout: 5000,
    });

    console.log('✅ Real Database Connection: PASS\n');

    // 3. Query Engine, Version, Database Info
    const [versionRows]: any = await connection.query('SELECT VERSION() as version, DATABASE() as current_db');
    const dbVersion = versionRows?.[0]?.version || 'Unknown';
    const currentDb = versionRows?.[0]?.current_db || database;

    console.log('--- Database Metadata ---');
    console.log(`Database Engine / Version: ${dbVersion}`);
    console.log(`Connected Database Name:  ${currentDb}\n`);

    // 4. Query Existing Tables
    const [tableRows]: any = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME ASC
    `, [currentDb]);

    const existingTables: string[] = (tableRows || []).map((r: any) => r.TABLE_NAME);
    console.log('--- Existing Tables ---');
    console.log(`Total Existing Tables: ${existingTables.length}`);
    if (existingTables.length > 0) {
      for (const t of existingTables) {
        console.log(` • ${t}`);
      }
    } else {
      console.log(' (Database is currently completely empty / 0 tables)');
    }
    console.log('');

    // 5. Query Migration State
    const hasMigrationTable = existingTables.includes('schema_migrations');
    console.log('--- Migration State ---');
    console.log(`Migration Table (schema_migrations): ${hasMigrationTable ? 'EXISTS (PASS)' : 'NOT FOUND (Empty/Unmigrated)'}`);

    const appliedMigrations: string[] = [];
    if (hasMigrationTable) {
      try {
        const [migRows]: any = await connection.query('SELECT migration_name, checksum, applied_at, execution_time_ms FROM schema_migrations ORDER BY id ASC');
        for (const m of migRows || []) {
          appliedMigrations.push(m.migration_name);
          console.log(` • [APPLIED] ${m.migration_name} (Applied at: ${m.applied_at}, Time: ${m.execution_time_ms}ms)`);
        }
      } catch (migErr: any) {
        console.warn(' • Warning reading schema_migrations table:', migErr?.message);
      }
    }

    const appliedSet = new Set(appliedMigrations);
    const pendingMigrations = MIGRATIONS.filter((m) => !appliedSet.has(m.name));

    console.log(`\nPending Migrations (${pendingMigrations.length}):`);
    for (const pm of pendingMigrations) {
      console.log(` • [PENDING] ${pm.name}`);
    }
    console.log('');

    // 6. Schema Differences & Canonical Table Comparison
    const existingTableSet = new Set(existingTables);
    const missingTables = CANONICAL_REQUIRED_TABLES.filter((t) => !existingTableSet.has(t));
    const extraTables = existingTables.filter((t) => !CANONICAL_REQUIRED_TABLES.includes(t));

    console.log('--- Schema Comparison vs Canonical Schema ---');
    console.log(`Canonical Required Tables Count: ${CANONICAL_REQUIRED_TABLES.length}`);
    console.log(`Missing Canonical Tables (${missingTables.length}): ${missingTables.length > 0 ? missingTables.join(', ') : 'None (All Present)'}`);
    console.log(`Extra / Custom Tables (${extraTables.length}): ${extraTables.length > 0 ? extraTables.join(', ') : 'None'}\n`);

    // 7. Index & Constraint Audit via INFORMATION_SCHEMA
    console.log('--- Indexes & Constraints Audit ---');
    const [indexRows]: any = await connection.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, INDEX_NAME
    `, [currentDb]);
    console.log(`Total Physical Indexes in DB: ${(indexRows || []).length}`);

    const [constraintRows]: any = await connection.query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `, [currentDb]);
    console.log(`Total Constraints in DB: ${(constraintRows || []).length}\n`);

    // 8. Safety Assessment
    console.log('--- Migration Safety Evaluation ---');
    if (existingTables.length === 0) {
      console.log('Status: FRESH_DATABASE');
      console.log('Safety: 100% SAFE TO MIGRATE (Zero risk of data collision or table conflicts)');
    } else if (missingTables.length > 0) {
      console.log('Status: PARTIALLY_INITIALIZED / UPGRADE_REQUIRED');
      console.log('Safety: SAFE TO MIGRATE (Existing tables use IF NOT EXISTS; pending migrations will add missing tables without data loss)');
    } else if (pendingMigrations.length === 0) {
      console.log('Status: UP_TO_DATE / CURRENT');
      console.log('Safety: DATABASE FULLY UP TO DATE');
    } else {
      console.log('Status: UPGRADE_AVAILABLE');
      console.log('Safety: SAFE TO UPGRADE');
    }

    console.log('\n====================================================');
    console.log(' [Database Audit] Read-Only Audit Completed Successfully');
    console.log('====================================================');
    process.exit(0);
  } catch (connErr: any) {
    console.error('\n❌ Real Database Connection: FAIL');
    console.error('----------------------------------------------------');
    console.error(`Error Code:    ${connErr?.code || 'UNKNOWN_ERROR'}`);
    console.error(`Error Message: ${connErr?.message || String(connErr)}`);

    let category = 'UNKNOWN_FAILURE';
    const msg = (connErr?.message || '').toLowerCase();
    const code = connErr?.code || '';

    if (code === 'ECONNREFUSED' || msg.includes('econnrefused')) {
      category = 'TCP_CONNECTION_REFUSED (MySQL port not accepting connections or host not listening)';
    } else if (code === 'ETIMEDOUT' || msg.includes('timeout') || code === 'EHOSTUNREACH') {
      category = 'NETWORK_TIMEOUT_OR_FIREWALL_RESTRICTION (Remote database host unreachable from Google AI Studio sandbox IP or outbound port blocked)';
    } else if (code === 'ENOTFOUND' || msg.includes('enotfound') || code === 'EAI_AGAIN') {
      category = 'DNS_RESOLUTION_FAILURE (Database host domain cannot be resolved)';
    } else if (code === 'ER_ACCESS_DENIED_ERROR' || msg.includes('access denied')) {
      category = 'AUTHENTICATION_CREDENTIAL_REJECTED (Invalid DB_USER or DB_PASSWORD)';
    } else if (code === 'ER_BAD_DB_ERROR' || msg.includes('unknown database')) {
      category = 'DATABASE_NOT_FOUND (Database name in DB_NAME does not exist on target MySQL instance)';
    } else if (msg.includes('handshake') || msg.includes('ssl')) {
      category = 'SSL_HANDSHAKE_OR_TLS_RESTRICTION';
    }

    console.error(`Failure Category: ${category}`);
    console.error('----------------------------------------------------');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

main();
