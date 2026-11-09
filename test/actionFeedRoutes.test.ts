import assert from 'node:assert/strict';
import express from 'express';
import { registerActionFeed } from '../server/actionFeedRoutes';
const app = express();
let reads = 0, unavailable = false, fail = false;
registerActionFeed(app, {
  getAuthUserFromRequest: async req => req.headers.authorization ? { id: 'fixture' } as any : null,
  verifyCompanyWorkspaceAccess: async (_, company) => ({ authorized: company === 'owned', status: 403 }),
  getCompanyActionFeed: async (company, after, limit) => {
    reads++; assert.equal(company, 'owned');
    if (fail) throw new Error('private SQL details');
    return { available: !unavailable, events: [], nextCursor: after!, latestRevision: '0' };
  },
});
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
try {
  const address = server.address() as any;
  async function get(path: string, status: number, auth = true) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/companies/${path}`, { headers: auth ? { Authorization: 'fixture' } : {} });
    assert.equal(response.status, status); return response.json();
  }
  await get('owned/job-actions', 401, false);
  await get('foreign/job-actions', 403);
  assert.equal(reads, 0);
  for (const query of ['after=-1','after=18446744073709551616','after[]=1','limit=0','limit=101','limit=1.5','limit=1&limit=2']) await get(`owned/job-actions?${query}`, 400);
  assert.equal(reads, 0);
  assert.equal((await get('owned/job-actions?after=9&limit=2', 200)).nextCursor, '9');
  unavailable = true; await get('owned/job-actions', 503);
  fail = true; assert.ok(!JSON.stringify(await get('owned/job-actions', 500)).includes('private'));
  console.log('Action feed HTTP authentication, tenant access, cursor validation, unavailable state and redaction passed.');
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
