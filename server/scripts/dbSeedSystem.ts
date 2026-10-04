import dotenv from 'dotenv';
dotenv.config();

import { getDbPool } from '../db';
import { seedSystemSettings } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [System Seed Engine] Safe Production System Seed   ');
  console.log('====================================================');

  try {
    const pool = await getDbPool();
    if (!pool) {
      console.error('FATAL: Database pool unavailable.');
      process.exit(1);
    }

    const res = await seedSystemSettings(pool);
    console.log(`✅ System settings safely initialized/verified: ${res.seeded} records.`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ SYSTEM SEED FAILED:', err?.message);
    process.exit(1);
  }
}

main();
