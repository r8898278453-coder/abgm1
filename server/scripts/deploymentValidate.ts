import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getDbPool } from '../db';
import { verifySchema } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [Deployment Validator] Hostinger Deploy Pre-Flight ');
  console.log('====================================================');

  let hasErrors = false;

  // 1. Node Version Check
  const nodeVer = process.version;
  const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
  console.log(`Node.js Version: ${nodeVer} (Target: >= 18.x, Recommended: 22.x)`);
  if (major < 18) {
    console.error('❌ Incompatible Node.js version. Node 18+ required.');
    hasErrors = true;
  } else {
    console.log('✅ Node.js Version PASS');
  }

  // 2. Build Output Check
  const clientDist = path.join(process.cwd(), 'dist', 'client');
  const serverDist = path.join(process.cwd(), 'dist', 'server.cjs');
  const indexHtml = path.join(clientDist, 'index.html');

  if (fs.existsSync(clientDist) && fs.existsSync(indexHtml) && fs.existsSync(serverDist)) {
    console.log('✅ Build Output Artifacts PASS');
  } else {
    console.warn('⚠️ Build output not found in dist/. (Run "npm run build" before deploying to production)');
  }

  // 3. Database Connectivity & Schema Check
  const isProd = process.env.NODE_ENV === 'production' || process.env.IS_PRODUCTION === 'true';
  console.log(`Environment Mode: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT / TEST'}`);

  try {
    const pool = await getDbPool();
    if (!pool) {
      if (isProd) {
        console.error('❌ Production Database Connection FAIL: DB_HOST, DB_NAME, DB_USER parameters required.');
        hasErrors = true;
      } else {
        console.log('ℹ️ Development environment running without live MySQL (in-memory mode for tests).');
      }
    } else {
      const report = await verifySchema(pool);
      if (report.status === 'READY') {
        console.log(`✅ Database Schema PASS (Version: ${report.schemaVersion}, Applied: ${report.appliedMigrations}, Pending: 0)`);
      } else {
        console.error(`❌ Database Schema FAIL: Status = ${report.status}`);
        if (report.missingTables) {
          console.error(`Missing tables: ${report.missingTables.join(', ')}`);
        }
        hasErrors = true;
      }
    }
  } catch (dbErr: any) {
    if (isProd) {
      console.error('❌ Database Pre-Flight Check FAIL:', dbErr?.message);
      hasErrors = true;
    }
  }

  console.log('====================================================');
  if (hasErrors) {
    console.error('❌ DEPLOYMENT VALIDATION FAILED');
    process.exit(1);
  } else {
    console.log('✅ DEPLOYMENT PRE-FLIGHT VALIDATION PASSED');
    process.exit(0);
  }
}

main();
