import assert from 'node:assert/strict';
import express from 'express';
import { telegramConfiguration, registerTelegramOperations } from '../server/telegramOperations';
import { validateTelegramOperations, confirmedManualTelegram } from '../shared/telegramOperations';
import { notificationCursor, validateNotificationPage } from '../shared/notificationEvidence';
const saved = { company_id: 'A', provider: 'telegram_bot', status: 'connected', credentials: { botToken: '123:PRIVATE_TOKEN', chatId: '-123456789' } };
assert.equal(telegramConfiguration('A', []).state, 'NOT_CONFIGURED');
const config = telegramConfiguration('A', [saved]);
assert.equal(config.state, 'SAVED');
assert.equal(config.identityVerified, false);
assert.equal(config.botId, '123');
assert.match(config.destinationFingerprint!, /^[a-f0-9]{12}$/);
assert.ok(!JSON.stringify(config).includes('PRIVATE_TOKEN'));
assert.ok(!JSON.stringify(config).includes('-123456789'));
assert.throws(() => telegramConfiguration('A', [saved, saved]));
assert.throws(() => telegramConfiguration('A', [{ ...saved, company_id: 'B' }]));
assert.equal(telegramConfiguration('A', [{ ...saved, credentials: {} }]).state, 'INVALID');
assert.equal(telegramConfiguration('A', [{ ...saved, status: 'error' }]).state, 'ERROR');
const v = { companyId: 'A', readOnly: true, checkedAtMs: Date.now(), canNotify: true, emergencyStopped: false, integration: config };
validateTelegramOperations(v, 'A');
assert.throws(() => validateTelegramOperations(v, 'B'));
assert.throws(() => validateTelegramOperations({ ...v, emergencyStopped: true }, 'A'));
assert.equal(confirmedManualTelegram({ success: true }, 'A'), false);
assert.equal(confirmedManualTelegram({ success: true, companyId: 'A', outcome: 'API_ACCEPTED', recipientDelivery: 'UNVERIFIED', persisted: false }, 'A'), true);
for (const cursor of ['2026-02-30T00:00:00Z|daily_digest', '2026-11-15T00:00:00Z|manual', 'bad'])
    assert.throws(() => notificationCursor(cursor));
const page = { companyId: 'A', available: true, occurrences: [{ kind: 'daily_digest', dueAt: '2026-11-15T02:30:00Z', status: 'UNKNOWN', needsReview: true }], nextCursor: null };
validateNotificationPage(page, 'A');
for (const p of [{ ...page, companyId: 'B' }, { ...page, occurrences: [{ ...page.occurrences[0], status: 'DELIVERED' }] }, { ...page, occurrences: [{ ...page.occurrences[0], needsReview: false }] }, { ...page, occurrences: [...page.occurrences, ...page.occurrences] }])
    assert.throws(() => validateNotificationPage(p, 'A'));
let stopped = false, rows: any[] = [saved];
const app = express();
registerTelegramOperations(app, { auth: async (req) => req.headers.authorization ? { id: String(req.headers.authorization) } : null, access: async (user, company, operation) => ({ authorized: company === 'A' && user.id !== 'foreign' && (operation === 'read' || user.id === 'owner'), status: 403 }), integrations: async () => rows, stopped: () => stopped });
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(r => server.once('listening', r));
try {
    const origin = `http://127.0.0.1:${(server.address() as any).port}`;
    const get = async (role: string | null, status: number, suffix = '') => { const r = await fetch(origin + '/api/companies/A/telegram-operations' + suffix, { headers: role ? { Authorization: role } : {} }); assert.equal(r.status, status); assert.equal(r.headers.get('cache-control'), 'no-store'); const b = await r.json(); assert.ok(!JSON.stringify(b).includes('PRIVATE_TOKEN')); return b; };
    await get(null, 401);
    await get('foreign', 403);
    await get('owner', 400, '?chatId=forged');
    assert.equal((await get('viewer', 200)).canNotify, false);
    assert.equal((await get('owner', 200)).canNotify, true);
    stopped = true;
    assert.equal((await get('owner', 200)).canNotify, false);
    rows = [saved, saved];
    await get('owner', 503);
}
finally {
    await new Promise<void>(r => server.close(() => r()));
}
console.log('Telegram operations: saved/unverified identity, destination privacy, duplicate/scope refusal, role/stop checks, strict manual ACK, notification casing/cursor truth and HTTP no-store passed.');
