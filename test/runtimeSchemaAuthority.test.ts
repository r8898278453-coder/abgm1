import {inspectDatabaseStartup} from '../server/databaseStartup';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
// A transport spy proves normal connection/lead failure never emits DDL or admin writes.
process.env.NODE_ENV='production';
process.env.AUTH_SECRET='synthetic-runtime-authority-secret-not-for-production';
Object.assign(process.env,{DB_HOST:'fixture.invalid',DB_NAME:'fixture',DB_USER:'fixture',DB_PASSWORD:'fixture',INITIAL_ADMIN_EMAIL:'no-implicit-admin@example.invalid',INITIAL_ADMIN_PASSWORD:'fixture-only-password'});
let reads=0;
for(const status of ['MIGRATION_REQUIRED','DATABASE_SCHEMA_OUTDATED','ERROR','UNKNOWN'])await assert.rejects(inspectDatabaseStartup({production:true,getDbPool:async()=>({}),verifySchema:async()=>{reads++;return {status};}}),/DATABASE_SCHEMA_NOT_READY/);
assert.equal(reads,4);
await assert.rejects(inspectDatabaseStartup({production:true,getDbPool:async()=>null,verifySchema:async()=>{throw new Error('must not read');}}),/DATABASE_STARTUP_UNAVAILABLE/);
await assert.rejects(inspectDatabaseStartup({production:true,getDbPool:async()=>({}),verifySchema:async()=>{throw new Error('private database detail');}}),/^Error: DATABASE_SCHEMA_CHECK_UNAVAILABLE$/);
assert.equal((await inspectDatabaseStartup({production:true,getDbPool:async()=>({}),verifySchema:async()=>({status:'READY',schemaVersion:25})})).schemaVersion,25);
assert.equal((await inspectDatabaseStartup({production:false,getDbPool:async()=>null,verifySchema:async()=>{throw new Error('must not read');}})).status,'DEVELOPMENT_MEMORY');
const statements:string[]=[];let connections=0,releases=0;
const original=mysql.createPool;
const pool={
 getConnection:async()=>{connections++;return {release:()=>{releases++;}};},
 query:async(sql:string)=>{statements.push(sql);if(sql.startsWith('SELECT * FROM companies'))return [[{id:'fixture-company',name:'Fixture'}]];const error=Object.assign(new Error('fixture missing company_id'),{code:'ER_BAD_FIELD_ERROR'});throw error;},
 end:async()=>{},
};
(mysql as any).createPool=()=>pool;
try{
 const db=await import('../server/db');
 assert.equal(await db.getDbPool(),pool);assert.equal(await db.getDbPool(),pool);
 assert.equal(connections,1);assert.equal(releases,1);assert.equal(statements.length,0);
 await assert.rejects(db.createLead({company_id:'fixture-company',name:'Fixture',phone:'9999999999'} as any));
 assert.equal(statements.filter(s=>s.startsWith('INSERT INTO leads')).length,1);
 assert.ok(statements.every(s=>!/(CREATE|ALTER|DROP|TRUNCATE)\s/i.test(s)));
 assert.ok(statements.every(s=>!/(INSERT INTO|UPDATE) users/i.test(s)));
 console.log('Runtime schema authority: connection cache has no schema/admin effects; missing lead column fails once without request DDL or repair retry.');
}finally{(mysql as any).createPool=original;}
