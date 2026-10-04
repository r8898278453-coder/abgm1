import dotenv from 'dotenv';
dotenv.config();

import { getDbPool } from '../db';
import { verifySchema } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [Database Verification] Schema Integrity Check     ');
  console.log('====================================================');

  try {
    const pool = await getDbPool();
    if (!pool) {
      console.error('DATABASE VERIFICATION');
      console.error('--------------------');
      console.error('Connection: FAIL');
      console.error('STATUS: UNAVAILABLE');
      process.exit(1);
    }

    const report = await verifySchema(pool);

    console.log('DATABASE VERIFICATION');
    console.log('--------------------');
    console.log(`Connection: ${report.connection}`);
    console.log(`Engine: ${report.engine}`);
    console.log(`Migration table: ${report.migrationTable}`);
    console.log(`Applied migrations: ${report.appliedMigrations}`);
    console.log(`Pending migrations: ${report.pendingMigrations}`);
    console.log(`Required tables: ${report.requiredTables}`);
    console.log(`Required indexes: ${report.requiredIndexes}`);
    console.log(`Schema version: ${report.schemaVersion}`);
    if (report.missingTables && report.missingTables.length > 0) {
      console.log(`Missing tables: ${report.missingTables.join(', ')}`);
    }
    console.log(`STATUS: ${report.status}`);

    if (report.status !== 'READY') {
      console.error(`❌ Verification failed with status: ${report.status}`);
      process.exit(1);
    }

    console.log('✅ DATABASE INTEGRITY VERIFIED - PRODUCTION READY');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ DATABASE VERIFICATION ERROR:', err?.message);
    process.exit(1);
  }
}

main();
