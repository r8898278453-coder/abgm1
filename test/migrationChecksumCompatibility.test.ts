import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { MIGRATIONS, computeMigrationChecksum } from '../server/migrator';

const expected = Object.fromEntries(MIGRATIONS.map(m => [m.name, computeMigrationChecksum(m)]));
// First five identities independently obtained from the user-provided export.
const historical = [
  '95f0c8ff95246526e90ef6a0349c54f48911358074793242a3cafb2e8168a64e',
  '08b5b91e16bb4f1498afd33877da4bb150e0d5d8c76b5c8a679928bbbdda1ee6',
  '2e3e9bc29363426afad111d61925f2e6bd67d023ae5bf24ffcba0308988a4e24',
  'ea73eb53938854286ed95662884aa7d1f4cfb31a428c7517d42fbc883d882d8d',
  '05c541e1ab362e666710c11656b7e278a92a2a10389e10a3bc736b653506eb22',
];
assert.deepEqual(MIGRATIONS.slice(0, 5).map(computeMigrationChecksum), historical);
const changed = { ...MIGRATIONS[0], up: async () => { throw new Error('edited definition'); } };
assert.throws(()=>computeMigrationChecksum(changed),/MIGRATION_LEGACY_MODIFIED/);

await mkdir('node_modules/.cache', { recursive: true });
const dir = await mkdtemp(path.resolve('node_modules/.cache/migration-compat-'));
try {
  const output = path.join(dir, 'checksums.cjs');
  await build({
    stdin: { contents: "export { MIGRATIONS, computeMigrationChecksum } from './server/migrator';", resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: output,
    define: { __MIGRATION_SOURCE_CHECKSUMS__: JSON.stringify(expected) },
  });
  const compiled = createRequire(import.meta.url)(output);
  assert.deepEqual(compiled.MIGRATIONS.map(compiled.computeMigrationChecksum), MIGRATIONS.map(computeMigrationChecksum));
  assert.throws(() => compiled.computeMigrationChecksum({ name: 'unregistered', up: async () => {} }), /MISSING/);
  // Demonstrate that compiler-specific function serialization really differs.
  assert.ok(compiled.MIGRATIONS.some((m: any) => crypto.createHash('sha256').update(m.name + m.up.toString()).digest('hex') !== expected[m.name]));
  // Contract harness based only on exported migration metadata, not customer data.
  const ledger = MIGRATIONS.slice(0, 5).map((m, i) => ({ migration_name: m.name, checksum: historical[i] }));
  const statements: string[] = [];
  let releases = 0;
  const connection = {
    query: async (sql: string, params: unknown[] = []) => {
      statements.push(sql);
      if (sql.includes('SELECT GET_LOCK')) return [[{ acquired: 1 }], []];
      if (sql.includes('SELECT migration_name, checksum')) return [ledger.map(r => ({ ...r,success:1 })), []];
      if (/INSERT INTO schema_migrations\s*\(/.test(sql)) {
        ledger.push({ migration_name: String(params[0]), checksum: String(params[1]) });
      }
      return [[], []];
    },
    release: () => { releases++; },
  };
  const pool = { getConnection: async () => connection };
  // runMigrations is exported from the same compiled implementation as its checksum helper.
  // Rebuild the test entry to expose it, still using the production build definitions.
  const upgradeOutput = path.join(dir, 'upgrade.cjs');
  await build({
    stdin: { contents: "export { runMigrations } from './server/migrator';", resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: upgradeOutput,
    define: { __MIGRATION_SOURCE_CHECKSUMS__: JSON.stringify(expected) },
  });
  const { runMigrations } = createRequire(import.meta.url)(upgradeOutput);
  const upgrade = await runMigrations(pool);
  assert.deepEqual(upgrade.appliedNames, MIGRATIONS.slice(5).map(m => m.name));
  assert.equal(ledger.length, MIGRATIONS.length);
  assert.deepEqual(ledger.slice(0, 5).map(r => r.checksum), historical);
  assert.equal(ledger[5].checksum, expected[MIGRATIONS[5].name]);
  assert.ok(statements.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS job_queue')));
  assert.ok(statements.some(sql => sql.includes('ADD COLUMN campaign_id')));
  assert.equal((await runMigrations(pool)).appliedCount, 0);
  ledger[0].checksum = '0'.repeat(64);
  await assert.rejects(runMigrations(pool), /MIGRATION_CHECKSUM_MISMATCH/);
  assert.equal(releases, 3);
  console.log('Migration compatibility: historical ledger preserved; compiled pending-upgrade/replay and corrupt-ledger rejection passed (contract harness).');
} finally {
  await rm(dir, { recursive: true, force: true });
}
