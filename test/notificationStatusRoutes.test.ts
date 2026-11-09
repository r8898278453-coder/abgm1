import assert from 'node:assert/strict';
import express from 'express';
import { registerNotificationStatus } from '../server/notificationStatusRoutes';
const app = express();
let reads = 0, available = true, fail = false;
registerNotificationStatus(app, {
  getAuthUserFromRequest: async req => req.headers.authorization ? { id: 'fixture' } as any : null,
  verifyCompanyWorkspaceAccess: async (_, id) => ({ authorized: id === 'owned', status: 403 }),
  read: async (company, before, limit) => {
    reads++; assert.equal(company, 'owned');
    if (fail) throw new Error('private database token');
    return { available, occurrences: [], nextCursor: null, fixtureCursor: before, fixtureLimit: limit };
  },
});
const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
try {
  const address = server.address() as any;
  async function get(path: string, expected: number, auth = true) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/companies/${path}`, { headers: auth ? { Authorization: 'fixture' } : {} });
    assert.equal(response.status, expected); return response.json();
  }
  await get('owned/notification-status',401,false); await get('foreign/notification-status',403);
  for (const query of ['limit=0','limit=101','limit[]=2','before=bad','before=2026-02-30T00%3A00%3A00Z%7Cdaily_digest','before[]=a']) await get(`owned/notification-status?${query}`,400);
  assert.equal(reads,0);
  const valid = await get('owned/notification-status?limit=2&before=2026-11-03T02%3A30%3A00Z%7Cdaily_digest',200);
  assert.equal(valid.fixtureCursor.kind,'daily_digest'); assert.equal(valid.fixtureLimit,2);
  available = false; await get('owned/notification-status',503);
  fail = true; assert.ok(!JSON.stringify(await get('owned/notification-status',500)).includes('private'));
  console.log('Notification status HTTP auth, client isolation, keyset cursor validation, unavailable state and redaction passed.');
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
