import assert from 'node:assert/strict';
import express from 'express';
import { registerHealthRoutes } from '../server/health';

let production = true;
let connected = false;
let poolAvailable = true;
let schema = 'READY';
let fail = false;
const app = express();
registerHealthRoutes(app, {
  isProduction: () => production,
  getDbPool: async () => {
    if (fail) throw new Error('sensitive connection details');
    connected = poolAvailable;
    return poolAvailable ? {} : null;
  },
  getDbStatus: () => ({ connected }),
  verifySchema: async () => ({ status: schema, schemaVersion: 6 }),
});
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});
try {
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  async function check(path: string, status: number) {
    const response = await fetch(base + path);
    assert.equal(response.status, status);
    const data = await response.json();
    assert.ok(!JSON.stringify(data).includes('sensitive'));
    return data;
  }
  fail = true;
  await check('/api/health/live', 200);
  await check('/api/health', 503);
  fail = false;
  // connected was false before getDbPool: readiness must sample it afterwards.
  assert.equal((await check('/api/health', 200)).database, 'connected');
  await check('/api/health/ready', 200);
  for (const state of ['MIGRATION_REQUIRED', 'DATABASE_SCHEMA_OUTDATED', 'UNAVAILABLE', 'unexpected']) {
    schema = state;
    await check('/api/health', 503);
  }
  poolAvailable = false;
  await check('/api/health/ready', 503);
  production = false;
  assert.equal((await check('/api/health', 200)).database, 'in-memory-development');
  console.log('Health routes: 10 HTTP readiness/liveness scenarios passed.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
