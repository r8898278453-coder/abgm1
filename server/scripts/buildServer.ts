import {verifyMigrationSourceIntegrity} from './migrationSourceIntegrity';
import { build } from 'esbuild';
import { MIGRATIONS, computeMigrationChecksum,validateRegisteredMigrations } from '../migrator';

// Capture checksums from the source runtime before esbuild rewrites function bodies.
// Recomputed for every build: editing a migration still changes its expected identity.
await verifyMigrationSourceIntegrity();
validateRegisteredMigrations();
const checksums = Object.fromEntries(MIGRATIONS.map(m => [m.name, computeMigrationChecksum(m)]));
await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  sourcemap: true,
  outfile: 'dist/server.cjs',
  define: { __MIGRATION_SOURCE_CHECKSUMS__: JSON.stringify(checksums) },
});

await build({entryPoints:['server/reelWorkerProcess.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',outfile:'dist/reel-worker.cjs'});

await build({entryPoints:['server/scripts/reelQueueWorker.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',outfile:'dist/reel-queue-worker.cjs',define:{__MIGRATION_SOURCE_CHECKSUMS__:JSON.stringify(checksums)}});
