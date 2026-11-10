import assert from 'node:assert/strict';
import {deploymentReport} from '../server/scripts/deploymentReport';
let closed=0;const pool={end:async()=>{closed++;}} as any;
const ready={connection:'PASS',engine:'MariaDB',migrationTable:'PASS',appliedMigrations:30,pendingMigrations:0,requiredTables:'PASS',requiredIndexes:'PASS',schemaVersion:30,status:'READY'} as any;
const input={nodeVersion:'v22.10.0',exists:()=>true,getPool:async()=>pool,verify:async()=>ready};
assert.equal((await deploymentReport(input)).exitCode,0);
for(const nodeVersion of['v18.0.0','v19.9.0','invalid'])assert.equal((await deploymentReport({...input,nodeVersion})).exitCode,1);
const missing=await deploymentReport({...input,exists:file=>!file.endsWith('server.cjs')});assert.equal(missing.exitCode,1);assert.deepEqual(missing.report.missingArtifacts,['dist/server.cjs']);
assert.equal((await deploymentReport({...input,getPool:async()=>null})).exitCode,1);
assert.equal((await deploymentReport({...input,verify:async()=>({...ready,status:'READY',pendingMigrations:1})})).exitCode,1);
const failed=await deploymentReport({...input,verify:async()=>{throw new Error('private-host-password');}});assert.equal(failed.exitCode,1);assert.ok(!JSON.stringify(failed).includes('private-'));assert.equal(closed,7);
console.log('Deployment preflight: missing artifacts, unsupported runtime, unavailable DB and contradictory READY refuse; canonical verifier cleanup and private error redaction passed.');

assert.equal((await deploymentReport({...input,nodeVersion:'v20.19.0'})).exitCode,0); // Installed @google/genai requires Node>=20.
