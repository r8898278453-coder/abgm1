import assert from 'node:assert/strict';
import express from 'express';
import { registerTenantNotificationRoutes } from '../server/tenantNotificationRoutes';
const app = express(); app.use(express.json());
const sends: any[] = [];
let fail = false, confirm = true;
registerTenantNotificationRoutes(app, {
  limiter: (_req, _res, next) => next(),
  getAuthUserFromRequest: async req => req.headers.authorization ? { id: 'owner' } as any : null,
  verifyCompanyWorkspaceAccess: async (_, id) => ({ authorized: id === 'owned', status: 403, error: 'Forbidden' }),
  send: async (company, message) => { if (fail) throw new Error('private token URL'); sends.push({ company, message }); return confirm; },
});
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
try {
  const address = server.address() as any;
  async function send(body: unknown, status: number, authenticated = true) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/telegram/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'fixture' } : {}) }, body: JSON.stringify(body) });
    assert.equal(response.status, status); return response.json();
  }
  await send({ companyId: 'owned', message: 'hello' }, 401, false);
  await send({ companyId: 'foreign', message: 'private' }, 403);
  for (const body of [{ message: 'legacy-no-scope' }, { companyId: 'owned', message: [] }, { companyId: 'owned', message: ' ' }, { companyId: 'owned', message: 'x'.repeat(4097) }, { companyId: 'owned', message: 'hello', chatId: 'forged' }]) await send(body, 400);
  assert.equal(sends.length, 0);
  await send({ companyId: 'owned', message: '  hello  ' }, 200);
  assert.deepEqual(sends, [{ company: 'owned', message: 'hello' }]);
  confirm = false; assert.equal((await send({ companyId: 'owned', message: 'hello' }, 502)).success, false);
  fail = true; assert.ok(!JSON.stringify(await send({ companyId: 'owned', message: 'hello' }, 500)).includes('private'));
  console.log('Manual Telegram HTTP: authentication, explicit workspace access, body validation, recipient override rejection, unconfirmed delivery and redaction passed.');
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
