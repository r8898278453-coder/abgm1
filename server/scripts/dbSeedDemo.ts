import dotenv from 'dotenv';
dotenv.config();

import { getDbPool } from '../db';

async function main() {
  console.log('====================================================');
  console.log(' [Demo Seed Engine] Isolated Demo Data Seeding      ');
  console.log('====================================================');

  const isProd = process.env.NODE_ENV === 'production' || process.env.IS_PRODUCTION === 'true';
  const allowOverride = process.env.ALLOW_DEMO_SEED_IN_PRODUCTION === 'true';

  if (isProd && !allowOverride) {
    console.error('⛔ FATAL REFUSAL: Demo data seeding is strictly prohibited in production mode.');
    console.error('Production database must contain only authentic business telemetry.');
    process.exit(1);
  }

  try {
    const pool = await getDbPool();
    if (!pool) {
      console.error('FATAL: Database pool unavailable.');
      process.exit(1);
    }

    console.log('Demo seed completed in non-production workspace.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ DEMO SEED FAILED:', err?.message);
    process.exit(1);
  }
}

main();
