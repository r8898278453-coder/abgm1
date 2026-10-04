import dotenv from 'dotenv';
dotenv.config();

import { getDbPool } from '../db';
import { runMigrations } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [Database Migration Engine] Starting Migration Run ');
  console.log('====================================================');

  try {
    const pool = await getDbPool();
    if (!pool) {
      console.error('FATAL: Database pool unavailable. Please verify DB_HOST, DB_NAME, DB_USER, DB_PASSWORD.');
      process.exit(1);
    }

    const result = await runMigrations(pool);
    console.log('----------------------------------------------------');
    console.log(`Total Migrations Defined: ${result.totalMigrations}`);
    console.log(`Newly Applied Migrations: ${result.appliedCount}`);
    if (result.appliedNames.length > 0) {
      console.log(`Applied: ${result.appliedNames.join(', ')}`);
    } else {
      console.log('Database is already up to date. Zero pending migrations.');
    }
    console.log('----------------------------------------------------');
    console.log('✅ DATABASE MIGRATION COMPLETED SUCCESSFULLY');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ DATABASE MIGRATION FAILED:', err?.message);
    process.exit(1);
  }
}

main();
