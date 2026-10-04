import dotenv from 'dotenv';
dotenv.config();

import { getDbPool } from '../db';
import { runMigrations, verifySchema, seedSystemSettings, initializeAdminUser } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [Database Setup Engine] Full Hostinger DB Setup    ');
  console.log('====================================================');

  try {
    const pool = await getDbPool();
    if (!pool) {
      console.error('FATAL: Database pool unavailable. Please verify DB_HOST, DB_NAME, DB_USER, DB_PASSWORD.');
      process.exit(1);
    }

    // 1. Run migrations
    console.log('Step 1: Running canonical versioned migrations...');
    const migResult = await runMigrations(pool);
    console.log(`Applied ${migResult.appliedCount} new migrations (Total: ${migResult.totalMigrations}).`);

    // 2. Safe system seed
    console.log('Step 2: Ensuring safe production system settings...');
    const seedResult = await seedSystemSettings(pool);
    console.log(`System settings verified/seeded: ${seedResult.seeded} records.`);

    // 3. Admin user initialization
    console.log('Step 3: Checking initial administrator configuration...');
    const adminResult = await initializeAdminUser(pool);
    if (adminResult) {
      if (adminResult.created) {
        console.log(`Initial administrator provisioned for: ${adminResult.email}`);
      } else {
        console.log(`Administrator verified for: ${adminResult.email}`);
      }
    } else {
      console.log('No INITIAL_ADMIN_EMAIL/PASSWORD in environment; skipping admin bootstrap.');
    }

    // 4. Verify complete schema
    console.log('Step 4: Verifying schema integrity...');
    const verification = await verifySchema(pool);
    if (verification.status !== 'READY') {
      console.error('❌ Schema verification failed:', verification);
      process.exit(1);
    }

    console.log('====================================================');
    console.log('✅ DATABASE SETUP COMPLETED - READY FOR TRAFFIC');
    console.log('====================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ DATABASE SETUP FAILED:', err?.message);
    process.exit(1);
  }
}

main();
