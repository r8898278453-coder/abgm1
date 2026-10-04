import dotenv from 'dotenv';
dotenv.config();

import { getDbPool } from '../db';
import { MIGRATIONS } from '../migrator';

async function main() {
  console.log('====================================================');
  console.log(' [Database Status] Migration & Table Inventory     ');
  console.log('====================================================');

  try {
    const pool = await getDbPool();
    if (!pool) {
      console.log('Database Status: Disconnected / Missing Configuration');
      process.exit(0);
    }

    const conn = await pool.getConnection();
    try {
      const [tableCheck]: any = await conn.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'
      `);

      if (!tableCheck || tableCheck.length === 0) {
        console.log('schema_migrations table does not exist. Status: UNINITIALIZED');
        console.log(`Pending migrations (${MIGRATIONS.length}):`);
        for (const m of MIGRATIONS) {
          console.log(` - [PENDING] ${m.name}`);
        }
        process.exit(0);
      }

      const [rows]: any = await conn.query('SELECT * FROM schema_migrations ORDER BY id ASC');
      const appliedMap = new Map((rows || []).map((r: any) => [r.migration_name, r]));

      console.log('Migration Status:');
      for (const m of MIGRATIONS) {
        if (appliedMap.has(m.name)) {
          const info = appliedMap.get(m.name) as any;
          console.log(` - [APPLIED] ${m.name} (Applied at: ${info.applied_at}, Time: ${info.execution_time_ms}ms)`);
        } else {
          console.log(` - [PENDING] ${m.name}`);
        }
      }

      const [tables]: any = await conn.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()');
      console.log(`\nExisting Tables (${tables.length}):`);
      for (const t of tables) {
        console.log(` • ${t.TABLE_NAME}`);
      }
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('Error fetching database status:', err?.message);
    process.exit(1);
  }
}

main();
