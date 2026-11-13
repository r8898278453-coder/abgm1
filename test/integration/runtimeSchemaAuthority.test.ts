import {readOnlyDatabaseReport} from '../../server/scripts/readOnlyDatabaseReport';
import assert from 'node:assert/strict';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable local SQL identity required');
const {inspectDatabaseStartup}=await import('../../server/databaseStartup');
const {verifySchema}=await import('../../server/migrator');
const {getDbPool}=await import('../../server/db');
const pool=await getDbPool();assert.ok(pool);
try{
 const [identity]:any=await pool.query('SELECT @@hostname AS hostname');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);
 const [tables]:any=await pool.query('SHOW TABLES');
 if(process.env.RUNTIME_EXPECT_EMPTY==='1'){assert.equal(tables.length,0);await assert.rejects(inspectDatabaseStartup({production:true,getDbPool,verifySchema}),/DATABASE_SCHEMA_NOT_READY/);}else{
  assert.equal(tables.length,79);
  const [users]:any=await pool.query('SELECT id FROM users WHERE email=?',[process.env.INITIAL_ADMIN_EMAIL]);assert.equal(users.length,0);
  assert.equal((await inspectDatabaseStartup({production:true,getDbPool,verifySchema})).status,'READY');
 }
 const commandPool={getConnection:()=>pool.getConnection(),end:async()=>{}} as any;
 const command=await readOnlyDatabaseReport(async()=>commandPool,verifySchema);assert.equal(command.exitCode,process.env.RUNTIME_EXPECT_EMPTY==='1'?1:0);assert.equal(command.report.status,process.env.RUNTIME_EXPECT_EMPTY==='1'?'MIGRATION_REQUIRED':'READY');
 console.log('Restricted runtime connection: no automatic schema/admin bootstrap; readiness inspected read-only.');
}finally{await pool.end();}
