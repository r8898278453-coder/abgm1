import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { registerTelegramOperations } from '../../server/telegramOperations';
import { registerTenantNotificationRoutes } from '../../server/tenantNotificationRoutes';
import { registerNotificationStatus } from '../../server/notificationStatusRoutes';
import { readNotificationStatus } from '../../server/notificationStatus';
import { agencyClientAccess } from '../../server/agencyPolicy';
if (process.env.ABGM1_LOCAL_SQL_TESTS !== '1' || process.env.DB_HOST !== '127.0.0.1' || !process.env.DB_NAME?.startsWith('abgm1_test_') || !process.env.LOCAL_SQL_CONTAINER_ID)
    throw new Error('Disposable SQL required');
const db = await import('../../server/db'), pool = await db.getDbPool();
assert.ok(pool);
const prefix = 'tgo_' + crypto.randomBytes(5).toString('hex'), company = prefix + '_a', users: any = {};
let stopped = false, sends = 0;
const app = express();
app.use(express.json());
const auth = async (req: any) => users[String(req.headers.authorization)] || null;
registerTelegramOperations(app, { auth, access: (u, c, o) => agencyClientAccess(pool, u, c, o), integrations: db.getCompanyIntegrations, stopped: () => stopped });
registerTenantNotificationRoutes(app, { limiter: (_, __, next) => next(), getAuthUserFromRequest: auth, verifyCompanyWorkspaceAccess: (u, c) => agencyClientAccess(pool, u, c, 'execute'), send: async () => { sends++; return true; } });
registerNotificationStatus(app, { getAuthUserFromRequest: auth, verifyCompanyWorkspaceAccess: (u, c) => agencyClientAccess(pool, u, c, 'read'), read: (c, b, l) => readNotificationStatus(pool, c, b, l) });
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(r => server.once('listening', r));
const origin = `http://127.0.0.1:${(server.address() as any).port}`;
const call = async (role: string, path: string, status: number, body?: any) => { const r = await fetch(origin + path, { method: body ? 'POST' : 'GET', headers: { Authorization: role, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); assert.equal(r.status, status); assert.equal(r.headers.get('cache-control'), 'no-store'); const value = await r.json(); assert.ok(!JSON.stringify(value).includes('PRIVATE_TOKEN')); assert.ok(!JSON.stringify(value).includes('-123456789')); return value; };
try {
    const [identity]: any = await pool.query('SELECT @@hostname hostname');
    assert.equal(identity[0].hostname, process.env.LOCAL_SQL_CONTAINER_ID);
    for (const role of ['owner', 'viewer', 'foreign']) {
        const id = prefix + '_' + role;
        await pool.query("INSERT INTO users(id,email,password_hash,salt,full_name) VALUES (?,?,'fixture','fixture','Fixture')", [id, id + '@example.invalid']);
        users[role] = await db.findUserById(id);
    }
    await db.createCompany({ id: company, user_id: users.owner.id, name: 'Fixture', category: 'Services', city: 'Pune' });
    const [agency]: any = await pool.query('SELECT agency_id FROM agency_clients WHERE company_id=?', [company]);
    await pool.query("INSERT INTO agency_memberships(agency_id,user_id,role) VALUES (?,?,'VIEWER')", [agency[0].agency_id, users.viewer.id]);
    await pool.query("INSERT INTO client_assignments(company_id,agency_id,user_id,role) VALUES (?,?,?,'VIEWER')", [company, agency[0].agency_id, users.viewer.id]);
    await db.saveCompanyIntegration(company, 'telegram_bot', { status: 'connected', credentials: { botToken: '123:PRIVATE_TOKEN', chatId: '-123456789' } });
    const base = `/api/companies/${company}`;
    await call('missing', base + '/telegram-operations', 401);
    await call('foreign', base + '/telegram-operations', 403);
    assert.equal((await call('viewer', base + '/telegram-operations', 200)).canNotify, false);
    const meta = await call('owner', base + '/telegram-operations', 200);
    assert.equal(meta.canNotify, true);
    assert.equal(meta.integration.identityVerified, false);
    assert.equal(meta.integration.botId, '123');
    await call('viewer', '/api/telegram/notify', 403, { companyId: company, message: 'fixture' });
    assert.equal(sends, 0);
    const ack = await call('owner', '/api/telegram/notify', 200, { companyId: company, message: 'fixture' });
    assert.equal(ack.outcome, 'API_ACCEPTED');
    assert.equal(ack.persisted, false);
    assert.equal(sends, 1);
    stopped = true;
    assert.equal((await call('owner', base + '/telegram-operations', 200)).canNotify, false);
    stopped = false;
    await pool.query("INSERT INTO notification_occurrences(company_id,notification_kind,due_at,status,claim_token) VALUES (?,'daily_digest','2026-11-15 02:30:00','UNKNOWN','PRIVATE_TOKEN')", [company]);
    const history = await call('viewer', base + '/notification-status', 200);
    assert.equal(history.companyId, company);
    assert.equal(history.occurrences[0].needsReview, true);
    await pool.query("UPDATE notification_occurrences SET status='sent' WHERE company_id=?", [company]);
    await call('owner', base + '/notification-status', 500);
    await pool.query("UPDATE notification_occurrences SET status='SENT' WHERE company_id=?", [company]);
    await pool.query("UPDATE client_operations SET status='ARCHIVED' WHERE company_id=?", [company]);
    assert.equal((await call('owner', base + '/telegram-operations', 200)).canNotify, false);
    await call('owner', '/api/telegram/notify', 409, { companyId: company, message: 'archived' });
    assert.equal(sends, 1);
    await pool.query('DELETE FROM client_assignments WHERE company_id=?', [company]);
    await call('viewer', base + '/telegram-operations', 403);
    console.log('Telegram operations SQL/HTTP: decrypted saved metadata without secrets, real viewer/owner/foreign/archive/revocation checks, stop metadata, explicit manual acceptance and strict saved occurrence state truth passed with injected sender only.');
}
catch (e: any) {
    console.log(JSON.stringify({ fixture: 'telegram-operations', code: e.code || 'ASSERTION', line: e.stack?.match(/telegramOperationsSql.test.ts:(\d+)/)?.[1] }));
    process.exitCode = 1;
}
finally {
    await new Promise<void>(r => server.close(() => r()));
    for (const t of ['notification_occurrences', 'company_integrations', 'client_assignments', 'company_profiles_data', 'client_operations', 'agency_clients'])
        await pool.query(`DELETE FROM ${t} WHERE company_id=?`, [company]);
    await pool.query('DELETE FROM companies WHERE id=?', [company]);
    for (const u of Object.values(users) as any[])
        await pool.query('DELETE FROM agency_memberships WHERE user_id=?', [u.id]);
    for (const u of Object.values(users) as any[]) {
        await pool.query('DELETE FROM agencies WHERE owner_user_id=?', [u.id]);
        await pool.query('DELETE FROM users WHERE id=?', [u.id]);
    }
    await pool.end();
}
