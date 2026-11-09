import assert from 'node:assert/strict';
import type {Pool} from 'mysql2/promise';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {defineSqlMigration} from '../../server/migrations/manifestV1';
import {MIGRATIONS,computeMigrationChecksum,runMigrations,verifySchema} from '../../server/migrator';
/** Fixture only. No030 migration is added to the product registry. */
export async function verifyManifestMigrationSql(pool:Pool){
 assert.equal(process.env.ABGM1_LOCAL_SQL_TESTS,'1');const [identity]:any=await pool.query('SELECT @@hostname hostname,DATABASE() name');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);assert.ok(identity[0].name.startsWith('abgm1_test_'));
 const plan={name:'030_manifest_fixture',preflight:[{sql:"SELECT id FROM companies WHERE id='manifest-preflight-conflict'",code:'MIGRATION_FIXTURE_CONFLICT'}],statements:["CREATE TABLE IF NOT EXISTS manifest_fixture(id INT PRIMARY KEY,note VARCHAR(64) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci","INSERT IGNORE INTO manifest_fixture(id,note) VALUES(1,'immutable ☃')"]};
 const definition=defineSqlMigration(plan),extended=[...MIGRATIONS,definition];
 await mkdir('node_modules/.cache',{recursive:true});const directory=await mkdtemp(path.resolve('node_modules/.cache/manifest-sql-'));
 try{
  await pool.query("INSERT INTO companies(id,user_id,name,category,city) VALUES ('manifest-preflight-conflict','fixture','Private fixture','fixture','fixture')");
  await assert.rejects(runMigrations(pool,extended),/MIGRATION_FIXTURE_CONFLICT/);const [before]:any=await pool.query("SHOW TABLES LIKE 'manifest_fixture'");assert.equal(before.length,0);await pool.query("DELETE FROM companies WHERE id='manifest-preflight-conflict'");
  // MySQL DDL survives a later failure; the same immutable idempotent plan must recover without ledger reset.
  const faultPool={getConnection:async()=>{const conn=await pool.getConnection();return {query:(sql:string,params?:any)=>{if(sql.startsWith('INSERT IGNORE INTO manifest_fixture'))throw Object.assign(new Error('private-raw-sql-detail'),{code:'ER_LOCK_DEADLOCK'});return conn.query(sql,params);},release:()=>conn.release()};}} as any;
  await assert.rejects(runMigrations(faultPool,extended),error=>{assert.ok(!String(error).includes('private-'));return /ER_LOCK_DEADLOCK/.test(String(error));});const [partial]:any=await pool.query("SHOW TABLES LIKE 'manifest_fixture'");assert.equal(partial.length,1);const [pending]:any=await pool.query('SELECT id FROM schema_migrations WHERE migration_name=?',[plan.name]);assert.equal(pending.length,0);
  const output=path.join(directory,'minified.cjs');await build({stdin:{contents:"export {defineSqlMigration} from './server/migrations/manifestV1';export {MIGRATIONS,computeMigrationChecksum,runMigrations,verifySchema} from './server/migrator';",resolveDir:process.cwd()},bundle:true,minify:true,platform:'node',format:'cjs',packages:'external',outfile:output,define:{__MIGRATION_SOURCE_CHECKSUMS__:JSON.stringify(Object.fromEntries(MIGRATIONS.map(m=>[m.name,computeMigrationChecksum(m)])))}});
  const compiled=createRequire(import.meta.url)(output),compiledDefinition=compiled.defineSqlMigration(plan),compiledRegistry=[...compiled.MIGRATIONS,compiledDefinition];assert.equal(compiled.computeMigrationChecksum(compiledDefinition),computeMigrationChecksum(definition));
  assert.deepEqual((await compiled.runMigrations(pool,compiledRegistry)).appliedNames,[plan.name]);assert.equal((await runMigrations(pool,extended)).appliedCount,0);assert.equal((await verifySchema(pool,extended)).status,'READY');assert.equal((await compiled.verifySchema(pool,compiledRegistry)).status,'READY');
  const [rows]:any=await pool.query('SELECT id,note FROM manifest_fixture');assert.deepEqual(rows,[{id:1,note:'immutable ☃'}]);const ahead=await verifySchema(pool);assert.equal(ahead.status,'DATABASE_SCHEMA_OUTDATED');assert.equal(ahead.connection,'PASS');assert.match(ahead.error!,/MIGRATION_LEDGER_AHEAD/);await assert.rejects(runMigrations(pool),/MIGRATION_LEDGER_AHEAD/);
  const changed=defineSqlMigration({...plan,statements:[...plan.statements,"UPDATE manifest_fixture SET note='must not apply'"]});await assert.rejects(runMigrations(pool,[...MIGRATIONS,changed]),/MIGRATION_CHECKSUM_MISMATCH/);
  await pool.query('UPDATE schema_migrations SET checksum=? WHERE migration_name=?',['',plan.name]);assert.match((await verifySchema(pool,extended)).error!,/MIGRATION_LEDGER_INVALID/);await assert.rejects(runMigrations(pool,extended),/MIGRATION_LEDGER_INVALID/);await pool.query('UPDATE schema_migrations SET checksum=? WHERE migration_name=?',[computeMigrationChecksum(definition),plan.name]);
  await pool.query("INSERT INTO schema_migrations(migration_name,checksum,success) VALUES ('031_future_fixture',?,0)",['0'.repeat(64)]);assert.match((await verifySchema(pool,extended)).error!,/MIGRATION_LEDGER_FAILED_RECORD/);await assert.rejects(runMigrations(pool,extended),/MIGRATION_LEDGER_FAILED_RECORD/);await pool.query("UPDATE schema_migrations SET success=1 WHERE migration_name='031_future_fixture'");assert.match((await verifySchema(pool,extended)).error!,/MIGRATION_LEDGER_AHEAD/);
  console.log('Manifest SQL: preflight blocks before DDL, partial-DDL failure leaves no ledger adoption, minified build resumes the same data plan, repeat0, changed plan rejected, old binary/future/failed/blank ledger blocked without false connection failure.');
 }finally{
  await pool.query("DELETE FROM schema_migrations WHERE migration_name IN ('030_manifest_fixture','031_future_fixture')");await pool.query('DROP TABLE IF EXISTS manifest_fixture');await pool.query("DELETE FROM companies WHERE id='manifest-preflight-conflict'");await rm(directory,{recursive:true,force:true});
 }
 assert.equal((await verifySchema(pool)).status,'READY');
}
