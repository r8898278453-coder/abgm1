import assert from 'node:assert/strict';
import { withReadOnlySqlDeadline } from '../server/readOnlySqlDeadline';
function fixture() {
  const events: string[] = [];
  const connection = {
    query: async (sql: string) => { events.push(sql); return [[{ok:1}]]; },
    commit: async () => { events.push('commit'); }, rollback: async () => { events.push('rollback'); },
    release: () => { events.push('release'); }, destroy: () => { events.push('destroy'); },
  };
  return {events,connection,pool:{getConnection:async()=>connection} as any};
}
const normal = fixture();
assert.equal(await withReadOnlySqlDeadline(normal.pool,async sql => { await sql.query('SELECT 1'); return 'complete'; }), 'complete');
assert.ok(normal.events.includes('START TRANSACTION READ ONLY'));
assert.deepEqual(normal.events.slice(-2),['commit','release']);
const invalid = fixture();
await assert.rejects(withReadOnlySqlDeadline(invalid.pool,sql=>sql.query('UPDATE reviews SET rating = 5')), /READ_ONLY_SQL_STATEMENT_REQUIRED/);
assert.deepEqual(invalid.events.slice(-2),['rollback','release']);
await assert.rejects(withReadOnlySqlDeadline(invalid.pool,sql=>sql.query('SELECT 1; COMMIT')), /READ_ONLY_SQL_STATEMENT_REQUIRED/);
const slow = fixture();
slow.connection.query = async sql => { slow.events.push(sql); if(sql==='SELECT slow') return new Promise(()=>{}); return [[]]; };
await assert.rejects(withReadOnlySqlDeadline(slow.pool,sql=>sql.query('SELECT slow'),20), {code:'READ_ONLY_SQL_TIMEOUT'});
assert.equal(slow.events.filter(e=>e==='destroy').length,1);
assert.ok(!slow.events.includes('commit')); assert.ok(!slow.events.includes('release'));
const slowCommit = fixture();
slowCommit.connection.commit = async () => { slowCommit.events.push('commit-start'); return new Promise<void>(()=>{}); };
await assert.rejects(withReadOnlySqlDeadline(slowCommit.pool,async()=> 'computed-but-not-returned',20),{code:'READ_ONLY_SQL_TIMEOUT'});
assert.ok(slowCommit.events.includes('destroy')); assert.ok(!slowCommit.events.includes('release'));
const resumed = fixture();
let resumeRead!: ()=>void;
const expiredRead = withReadOnlySqlDeadline(resumed.pool,async sql=>{
  await new Promise<void>(resolve=>{resumeRead=resolve;});
  return sql.query('SELECT late');
},20);
await assert.rejects(expiredRead,{code:'READ_ONLY_SQL_TIMEOUT'});
resumeRead(); await new Promise(resolve=>setImmediate(resolve));
assert.ok(!resumed.events.includes('SELECT late'));
const late = fixture();
let resolveAcquire!: (connection: any)=>void;
const latePool = {getConnection:()=>new Promise(resolve=>{resolveAcquire=resolve;})} as any;
await assert.rejects(withReadOnlySqlDeadline(latePool,sql=>sql.query('SELECT 1'),20),{code:'READ_ONLY_SQL_TIMEOUT'});
resolveAcquire(late.connection);
await new Promise(resolve=>setImmediate(resolve));
assert.deepEqual(late.events,['release']);
const failedCleanup = fixture();
failedCleanup.connection.rollback = async () => { throw new Error('cleanup fixture'); };
await assert.rejects(withReadOnlySqlDeadline(failedCleanup.pool,async()=>{throw new Error('original fixture');}), /original fixture/);
assert.ok(failedCleanup.events.includes('destroy')); assert.ok(!failedCleanup.events.includes('release'));
await assert.rejects(withReadOnlySqlDeadline(normal.pool,async()=>1,0),/INVALID_READ_ONLY_SQL_DEADLINE/);
console.log('Read-only SQL deadline: successful commit, write rejection, slow read discard, late pool acquisition release and failed cleanup discard passed.');
