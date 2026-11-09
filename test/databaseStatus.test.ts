import mysql from 'mysql2/promise';
import assert from 'node:assert/strict';
import {readOnlyDatabaseReport} from '../server/scripts/readOnlyDatabaseReport';
let closed=0,reads=0;const pool={end:async()=>{closed++;}} as any;
const ready={connection:'PASS',engine:'10.11.19-MariaDB',migrationTable:'PASS',appliedMigrations:29,pendingMigrations:0,requiredTables:'PASS',requiredIndexes:'PASS',schemaVersion:29,status:'READY'} as any;
const read=async(report:any)=>readOnlyDatabaseReport(async()=>pool,async()=>{reads++;return report;});
const result=await read(ready);assert.equal(result.exitCode,0);assert.equal(result.report.status,'READY');assert.ok(String(result.report.note).includes('not established'));assert.equal(closed,1);
for(const status of ['MIGRATION_REQUIRED','DATABASE_SCHEMA_OUTDATED','UNAVAILABLE']){const result=await read({...ready,status,error:'MIGRATION_LEDGER_AHEAD',private:'private-provider-body'});assert.equal(result.exitCode,1);assert.equal(result.report.code,'MIGRATION_LEDGER_AHEAD');assert.ok(!JSON.stringify(result).includes('private-'));}
for(const report of [{...ready,connection:'FAIL'},{...ready,pendingMigrations:1},{...ready,missingIndexes:['leads.required']},{...ready,status:'UNKNOWN'},{...ready,appliedMigrations:-1}])assert.equal((await read(report)).report.status,'UNAVAILABLE');
const unavailable=await readOnlyDatabaseReport(async()=>{throw new Error('private-password-and-host');},async()=>{throw new Error('must not read');});assert.equal(unavailable.exitCode,1);assert.ok(!JSON.stringify(unavailable).includes('private-'));
assert.equal((await readOnlyDatabaseReport(async()=>null,async()=>{throw new Error('must not read');})).report.status,'UNAVAILABLE');
assert.equal(closed,reads);
process.env.NODE_ENV='production';process.env.AUTH_SECRET='synthetic-runtime-authority-secret-not-for-production';Object.assign(process.env,{DB_HOST:'private-host.invalid',DB_NAME:'private-db',DB_USER:'private-user',DB_PASSWORD:'private-password'});
const originalFactory=mysql.createPool,originalWarn=console.warn;const warnings:string[]=[];
try{
 (mysql as any).createPool=()=>{throw Object.assign(new Error('private-password and private-host.invalid'),{code:'ER_ACCESS_DENIED_ERROR'});};console.warn=(...values)=>{warnings.push(values.join(' '));};
 const {getDbPool}=await import('../server/db');const failed=await readOnlyDatabaseReport(getDbPool,async()=>{throw new Error('must not verify');});assert.equal(failed.exitCode,1);assert.ok(!JSON.stringify(failed).includes('private-'));assert.equal(warnings.length,1);assert.ok(!warnings[0].includes('private-')&&!warnings[0].includes('in-memory'));assert.ok(warnings[0].includes('Production requests remain blocked'));
}finally{(mysql as any).createPool=originalFactory;console.warn=originalWarn;}
console.log('Database CLI reports: both readers use canonical schema evidence, only consistent READY exits0, invalid/future/unavailable states fail, raw detail excluded and command-owned pools close.');
