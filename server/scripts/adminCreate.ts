import dotenv from 'dotenv';
dotenv.config();

import { getDbPool } from '../db';
import { initializeAdminUser } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [Admin Provisioning Engine] Create Administrator   ');
  console.log('====================================================');

  const args = process.argv.slice(2);
  let emailArg: string | undefined;
  let passArg: string | undefined;
  let nameArg: string | undefined;

  for (const a of args) {
    if (a.startsWith('--email=')) emailArg = a.replace('--email=', '');
    if (a.startsWith('--password=')) passArg = a.replace('--password=', '');
    if (a.startsWith('--name=')) nameArg = a.replace('--name=', '');
  }

  const email = emailArg || process.env.INITIAL_ADMIN_EMAIL;
  const pass = passArg || process.env.INITIAL_ADMIN_PASSWORD;
  const name = nameArg || process.env.INITIAL_ADMIN_NAME || 'System Administrator';

  if (!email || !pass) {
    console.error('Usage: npm run admin:create -- --email=admin@example.com --password=YourSecurePassword123! [--name="Admin Name"]');
    console.error('Or provide INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in environment variables.');
    process.exit(1);
  }

  try {
    const pool = await getDbPool();
    if (!pool) {
      console.error('FATAL: Database pool unavailable.');
      process.exit(1);
    }

    const res = await initializeAdminUser(pool, email, pass, name);
    if (!res) {
      console.error('Failed to create admin.');
      process.exit(1);
    }

    if (res.created) {
      console.log(`✅ Administrator successfully provisioned: ${res.email} (ID: ${res.userId})`);
    } else {
      console.log(`ℹ️ Administrator already exists for: ${res.email} (Verified platform_admin role).`);
    }
    process.exit(0);
  } catch (err: any) {
    console.error('❌ ADMIN CREATION FAILED:', err?.message);
    process.exit(1);
  }
}

main();
