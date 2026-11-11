import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import {parseSqlDump} from '../../server/scripts/sqlDump';
import {MIGRATIONS,computeMigrationChecksum,runMigrations,verifySchema,CANONICAL_REQUIRED_TABLES} from '../../server/migrator';

// Explicit separate command; never part of default tests and never consumes cloud DB bindings.
assert.equal(process.env.ABGM1_LOCAL_SQL_TESTS,'1');assert.ok(process.env.LOCAL_SQL_CONTAINER_ID);
const port=Number(process.env.LOCAL_SQL_PORT);assert.ok(Number.isInteger(port)&&port>1024&&port<65536);
const bytes=await readFile(process.argv[2]);const source=bytes.toString('utf8');assert.ok(Buffer.from(source).equals(bytes),'DUMP_INVALID_UTF8');
const statements=parseSqlDump(source);
const sourceSha256=crypto.createHash('sha256').update(bytes).digest('hex');
const admin=mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',dateStrings:true});
const database='restore_'+crypto.randomBytes(8).toString('hex');const user='import_'+crypto.randomBytes(8).toString('hex'),password=crypto.randomBytes(24).toString('hex');
let pool:mysql.Pool|undefined;let created=false,userCreated=false;let stage='identity';
const report:Record<string,unknown>={sourceSha256,sourceBytes:bytes.length,statements:statements.length};
const identifier=(s:string)=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '`'+s+'`';};
async function snapshot(p:mysql.Pool,columns:Map<string,string[]>){
 const result=new Map<string,string>();for(const [table,names] of columns){
  if(['schema_migrations','schema_migrations_lock'].includes(table))continue;
  const [rows]:any=await p.query('SELECT '+names.map(identifier).join(',')+' FROM '+identifier(table));
  const hashes=rows.map((row:any)=>crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex')).sort();
  result.set(table,crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex'));
 }return result;
}
try{
 const [identity]:any=await admin.query('SELECT @@hostname hostname,VERSION() version');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);report.engine=identity[0].version;
 await admin.query(`CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);created=true;
 await admin.query("CREATE USER ?@'%' IDENTIFIED BY ?",[user,password]);userCreated=true;
 await admin.query(`GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON ${database}.* TO ?@'%'`,[user]);
 pool=mysql.createPool({host:'127.0.0.1',port,user,password,database,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,connectionLimit:1});
 stage='import';for(const sql of statements)await pool.query({sql,timeout:10000});
 const [metadata]:any=await pool.query('SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');
 const columns=new Map<string,string[]>();for(const row of metadata)columns.set(row.TABLE_NAME,[...(columns.get(row.TABLE_NAME)||[]),row.COLUMN_NAME]);
 report.importedTables=columns.size;report.originalBusinessTables=[...columns.keys()].filter(t=>!t.startsWith('schema_migrations')).length;
 await pool.query("SET time_zone='+00:00'");const before=await snapshot(pool,columns);
 const [ledger]:any=await pool.query('SELECT migration_name,checksum FROM schema_migrations ORDER BY migration_name');report.originalLedgerEntries=ledger.length;
 stage='migrate';const saved={log:console.log,error:console.error,warn:console.warn};let upgrade:any,verification:any;
 try{console.log=console.error=console.warn=()=>{};upgrade=await runMigrations(pool);verification=await verifySchema(pool);assert.equal((await runMigrations(pool)).appliedCount,0);}finally{Object.assign(console,saved);}
 const freshDatabase=database+'_fresh';await admin.query(`CREATE DATABASE ${freshDatabase}`);
 const fresh=mysql.createPool({host:'127.0.0.1',port,user:'root',password:'',database:freshDatabase});
 try{const log=console.log;try{console.log=()=>{};await runMigrations(fresh);}finally{console.log=log;}
 const [expected]:any=await fresh.query('SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
 const [actual]:any=await pool.query('SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
 report.missingCanonicalColumns=expected.filter((r:any)=>!actual.some((a:any)=>a.TABLE_NAME===r.TABLE_NAME&&a.COLUMN_NAME===r.COLUMN_NAME)).map((r:any)=>r.TABLE_NAME+'.'+r.COLUMN_NAME).sort();
 assert.deepEqual(report.missingCanonicalColumns,[]);
 }finally{await fresh.end();await admin.query(`DROP DATABASE ${freshDatabase}`);}
 report.appliedNames=upgrade.appliedNames;report.schemaStatus=verification.status;report.missingColumns=verification.missingColumns;report.missingIndexes=verification.missingIndexes;report.missingConstraints=verification.missingConstraints;assert.equal(verification.status,'READY');
 const [agencyOwners]:any=await pool.query("SELECT COUNT(*) count FROM companies c LEFT JOIN agency_clients ac ON ac.company_id=c.id LEFT JOIN agencies a ON a.id=ac.agency_id AND a.owner_user_id=c.user_id LEFT JOIN agency_memberships m ON m.agency_id=a.id AND m.user_id=c.user_id AND m.role='OWNER' WHERE a.id IS NULL OR m.user_id IS NULL");assert.equal(Number(agencyOwners[0].count),0);report.originalOwnerMappingsPreserved=true;
 const after=await snapshot(pool,columns);assert.deepEqual(after,before);report.businessRowsPreserved=true;
 const [afterLedger]:any=await pool.query('SELECT migration_name,checksum FROM schema_migrations ORDER BY migration_name');for(const row of ledger)assert.ok(afterLedger.some((r:any)=>r.migration_name===row.migration_name&&r.checksum===row.checksum));report.originalLedgerPreserved=true;
 stage='bundled-ledger';await mkdir('node_modules/.cache',{recursive:true});
 const directory=await mkdtemp(path.resolve('node_modules/.cache/restore-bundle-'));
 try{
 const output=path.join(directory,'migrator.cjs');
 await build({stdin:{contents:"export {runMigrations,verifySchema} from './server/migrator';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',packages:'external',outfile:output,define:{__MIGRATION_SOURCE_CHECKSUMS__:JSON.stringify(Object.fromEntries(MIGRATIONS.map(m=>[m.name,computeMigrationChecksum(m)])))}});
 const compiled=createRequire(import.meta.url)(output);
 assert.equal((await compiled.runMigrations(pool)).appliedCount,0);assert.equal((await compiled.verifySchema(pool)).status,'READY');report.bundledLedgerReplay='READY; applied0';
 }finally{await rm(directory,{recursive:true,force:true});}
 stage='canonical-write-probes';const connection=await pool.getConnection();
 try{await connection.beginTransaction();
 const id='restore_probe_'+crypto.randomBytes(8).toString('hex');
 await connection.query('INSERT INTO autonomous_actions (id,company_id,action_type) VALUES (?,?,?)',[id,id,'fixture_only']);
 const [action]:any=await connection.query('SELECT approval_status,execution_state,verification_state FROM autonomous_actions WHERE id=?',[id]);
 assert.deepEqual(action[0],{approval_status:'pending_approval',execution_state:'idle',verification_state:'unverified'});
 await connection.query('INSERT INTO reviews (id,company_id,author,content,reply_status,external_review_id,retrieved_at) VALUES (?,?,?,?,?,?,?)',[id,id,'fixture','synthetic local probe',null,null,null]);
 const [review]:any=await connection.query('SELECT provenance_status,reply_status,external_review_id FROM reviews WHERE id=?',[id]);
 assert.deepEqual(review[0],{provenance_status:'USER_ENTERED',reply_status:null,external_review_id:null});
 report.canonicalWrites='passed and rolled back';
 }finally{await connection.rollback();connection.release();}
 assert.deepEqual(await snapshot(pool,columns),before);
 report.canonicalTables=CANONICAL_REQUIRED_TABLES.length;report.migrations=MIGRATIONS.length;report.repeatApplied=0;report.result='passed';
 console.log(JSON.stringify(report,null,2));
}catch(error:any){
 // Raw database messages, SQL, rows and stack traces may contain customer secrets. Emit codes only.
 report.result='failed';report.stage=stage;report.code=/^[A-Z_0-9]+$/.test(error?.code||'')?error.code: String(error?.message||'').match(/^[A-Z_]+(?=:)/)?.[0]||'RESTORE_CHECK_FAILED';
 console.log(JSON.stringify(report,null,2));process.exitCode=1;
}finally{await pool?.end();if(created)await admin.query(`DROP DATABASE ${database}`);if(userCreated)await admin.query("DROP USER ?@'%'",[user]);await admin.end();}
