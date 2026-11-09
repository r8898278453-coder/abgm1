import assert from 'node:assert/strict';
import express from 'express';
import { registerQueueAdmission } from '../server/queueRoutes';

const app = express();
app.use(express.json());
const writes: Array<Record<string, unknown>> = [];
let failWrite = false;
let accessChecks = 0;
let resourceChecks = 0;
registerQueueAdmission(app, {
  getAuthUserFromRequest: async req => req.headers.authorization === 'Bearer fixture' ? { id: 'owner' } as any : null,
  verifyCompanyWorkspaceAccess: async (_user, company) => {
    accessChecks++;
    return company === 'owned' ? { authorized: true, status: 200 } : { authorized: false, status: 403, error: 'Forbidden' };
  },
  getPostById: async id => { resourceChecks++; return id === 'own-post' ? { company_id: 'owned' } : id === 'foreign-post' ? { company_id: 'foreign' } : null; },
  getAllLeads: async company => { resourceChecks++; return company === 'owned' ? [{ id: 'own-lead' }] : []; },
  enqueueJob: async options => {
    if (failWrite) throw new Error('private database connection error');
    writes.push(options);
    return { id: 'fixture-job', ...options } as any;
  },
});
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
try {
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  async function send(company: string, body: unknown, expected: number, authenticated = true) {
    const response = await fetch(`${base}/api/companies/${company}/jobs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer fixture' } : {}) }, body: JSON.stringify(body),
    });
    assert.equal(response.status, expected);
    return response.json();
  }
  await send('owned', { job_type: 'ai_summary' }, 401, false);
  assert.equal(accessChecks, 0);
  await send('foreign', { job_type: 'publishing', payload: { postId: 'own-post' } }, 403);
  assert.equal(resourceChecks, 0);
  for (const body of [
    { job_type: 'unsupported' },
    { job_type: 'publishing', payload: {} },
    { job_type: 'ai_summary', company_id: 'foreign' },
    { job_type: 'ai_summary', requested_by: 'forged-user' },
    { job_type: 'ai_summary', jobType: 'publishing' },
    { job_type: 'ai_summary', scheduled_for: 'tomorrow' },
  ]) await send('owned', body, 400);
  for (const postId of ['foreign-post', 'missing-post']) await send('owned', { job_type: 'publishing', payload: { postId } }, 404);
  await send('owned', { job_type: 'lead_nurture', payload: { leadId: 'foreign-lead' } }, 404);
  assert.equal(writes.length, 0);
  await send('owned', { jobType: 'publishing', payload: { postId: 'own-post' }, idempotencyKey: 'once' }, 201);
  await send('owned', { job_type: 'lead_nurture', payload: { leadId: 'own-lead' } }, 201);
  await send('owned', { job_type: 'ai_summary' }, 201);
  assert.equal(writes.length, 3);
  assert.ok(writes.every(w => w.company_id === 'owned'));
  assert.equal(writes[0].idempotency_key, 'once');
  assert.equal(writes[0].requested_by, 'owner');
  failWrite = true;
  const failure = await send('owned', { job_type: 'ai_summary' }, 500);
  assert.ok(!JSON.stringify(failure).includes('private'));
  console.log('Queue HTTP admission: authentication, authorization, payload/resource rejection, valid writes and storage error redaction passed.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
