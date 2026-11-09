import assert from 'node:assert/strict';
import express from 'express';
import { requestAuditLogger } from '../server/security';

const logs: string[] = [];
const original = { log: console.log, warn: console.warn, error: console.error };
console.log = console.warn = console.error = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
const app = express();
app.use(requestAuditLogger);
app.get('/api/clients/:id', (_req, res) => { res.sendStatus(200); });
app.get('/api/invalid', (_req, res) => { res.sendStatus(403); });
app.get('/api/failure', (_req, res) => { res.sendStatus(500); });
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
try {
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  for (const [route, status] of [['/clients/private-client', 200], ['/invalid', 403], ['/failure', 500]] as const) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${route}?secret=private-cron&hub.verify_token=private-webhook&code=private-oauth&email=private-email`, { headers: { Authorization: 'Bearer private-bearer' } });
    assert.equal(response.status, status);
    await response.text();
  }
  assert.equal(logs.length, 3);
  const output = logs.join('\n');
  for (const secret of ['private-client', 'private-cron', 'private-webhook', 'private-oauth', 'private-email', 'private-bearer']) assert.ok(!output.includes(secret));
  assert.ok(output.includes('/api/clients/:id'));
  assert.ok(output.includes('AUDIT-WARN'));
  assert.ok(output.includes('AUDIT-ERROR'));
} finally {
  Object.assign(console, original);
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
console.log('Audit privacy: success, denied and failed request logs exclude query credentials, bearer tokens and client IDs.');
