import assert from 'node:assert/strict';
import { EXCEPTION_KEYS, EXCEPTION_METRICS, exceptionProjection, validateAgencyOverview, agencyExceptionsCsv } from '../shared/agencyExceptions';
const zero = Object.fromEntries(EXCEPTION_KEYS.map(k => [k, 0]));
const p = exceptionProjection({ ...zero, unknownDispatches: 1, failedIntakes: 2, queuedIntakes: 10 });
assert.equal(p.priorityScore, 11);
assert.equal(p.backlog.queuedIntakes, 10);
for (const value of [undefined, null, -1, 0.5, NaN, Infinity, true, '', '1e3'])
    assert.throws(() => exceptionProjection({ ...zero, newLeads: value }));
assert.equal(exceptionProjection({ ...zero, newLeads: '3' }).priorityScore, 3);
assert.throws(() => exceptionProjection({ ...zero, unknownDispatches: Number.MAX_SAFE_INTEGER }));
const overview = { agencyId: 'agency', modelVersion: 3, scope: 'CURRENT_AUTHORIZED_CLIENTS', timeZone: 'Asia/Kolkata', checkedAtMs: Date.now(), clients: [{ companyId: '=FORMULA', operationStatus: 'ACTIVE', ...p }] };
assert.equal(validateAgencyOverview(overview, 'agency'), overview);
assert.match(agencyExceptionsCsv(overview, 'agency'), /"'=FORMULA"/);
assert.match(agencyExceptionsCsv(overview, 'agency'), /unknownDispatches/);
for (const value of [{ ...overview, agencyId: 'foreign' }, { ...overview, clients: [...overview.clients, ...overview.clients] }, { ...overview, clients: [{ ...overview.clients[0], priorityScore: 100 }] }, { ...overview, clients: [{ ...overview.clients[0], backlog: {} }] }, { ...overview, clients: [{ ...overview.clients[0], operationStatus: 'READY' }] }])
    assert.throws(() => validateAgencyOverview(value, 'agency'));
assert.equal(EXCEPTION_KEYS.length, 14);
assert.equal(EXCEPTION_METRICS.queuedIntakes.weight, 0);
assert.equal(exceptionProjection({...zero,failedCaptureRuns:2,captureRecoveryNeeded:1,pendingCaptureRuns:9,captureActorRevoked:1}).priorityScore,10);
assert.equal(EXCEPTION_METRICS.pendingCaptureRuns.weight,0);
assert.throws(()=>validateAgencyOverview({...overview,modelVersion:2},'agency'));
for(const key of ['failedCaptureRuns','captureRecoveryNeeded','pendingCaptureRuns','captureActorRevoked'])assert.throws(()=>exceptionProjection({...zero,[key]:undefined}));
console.log('Agency exceptions:14 metrics, explicit weighted score, zero-weight queued work, strict missing/unsafe counts, scope/duplicate/state refusal and spreadsheet-safe CSV passed.');
