import assert from 'node:assert/strict';
import {VerificationAdmission} from '../server/verificationAdmission';
let now=0;
const gate=new VerificationAdmission(()=>now,2,2);
const first=gate.acquire('A');assert.ok('release' in first);
assert.deepEqual(gate.acquire('A'),{retryAfterSeconds:1});
const second=gate.acquire('B');assert.ok('release' in second);
assert.deepEqual(gate.acquire('C'),{retryAfterSeconds:60});
first.release();first.release();
const retry=gate.acquire('A');assert.ok('release' in retry);retry.release();
assert.deepEqual(gate.acquire('A'),{retryAfterSeconds:60});
now=59001;assert.deepEqual(gate.acquire('A'),{retryAfterSeconds:1});
now=60000;
// Active B never evicted, even after its window expires.
assert.deepEqual(gate.acquire('B'),{retryAfterSeconds:1});
const third=gate.acquire('C');assert.ok('release' in third);third.release();
second.release();assert.ok('release' in gate.acquire('A'));
console.log('Verification admission: concurrency, tenant separation, rate windows, bounded capacity, active retention and idempotent release passed.');
