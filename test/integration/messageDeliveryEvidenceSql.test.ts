import express from 'express';
import { registerSalesRoutes } from '../../server/salesRoutes';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readDispatchReceiptTimeline, readMessageDeliveryReport } from '../../server/messageDeliveryEvidence';
import { readMessageDispatchStatus } from '../../server/messageDispatchStatus';
import { recordMessageReceipt } from '../../server/messageDeliveryReceipts';
import { platformDayBounds } from '../../shared/dailyWorkReport';
if (process.env.ABGM1_LOCAL_SQL_TESTS !== '1' || process.env.DB_HOST !== '127.0.0.1' || !process.env.DB_NAME?.startsWith('abgm1_test_') || !process.env.LOCAL_SQL_CONTAINER_ID)
    throw new Error('Disposable SQL required');
const db = await import('../../server/db'), pool = await db.getDbPool();
assert.ok(pool);
const company = 'dev_' + crypto.randomBytes(6).toString('hex'), user = company + '_u', date = '2026-11-15', day = platformDayBounds(date);
let serial = 0;
const rows = async (sql: string, args: any[] = []) => { const [r]: any = await pool.query(sql, args); return r; };
const add = async (provider: string | null, status = 'API_ACCEPTED', sender: string | null = '123', at = day.start) => { const key = (++serial).toString(16).padStart(64, '0'); await pool.query('INSERT INTO message_dispatch_intents(company_id,request_key,input_hash,actor_id,status,claim_token,provider_id,sender_id,created_at) VALUES (?,?,?,?,?,?,?,?,FROM_UNIXTIME(?))', [company, key, 'a'.repeat(64), user, status, 'fixture', provider, sender, at / 1000]); return key; };
try {
    assert.equal((await rows('SELECT @@hostname hostname'))[0].hostname, process.env.LOCAL_SQL_CONTAINER_ID);
    await pool.query("INSERT INTO users(id,email,password_hash,salt,full_name) VALUES (?,?,'fixture','fixture','Fixture')", [user, user + '@example.invalid']);
    await db.createCompany({ id: company, user_id: user, name: 'Fixture', category: 'Services', city: 'Pune' });
    const key = await add('CaseID');
    assert.equal((await readMessageDispatchStatus(pool, company, key))?.evidence.state, 'AWAITING_RECEIPT');
    await recordMessageReceipt(pool, company, { phoneNumberId: '123', providerId: 'caseid', status: 'read', occurredAtMs: day.start });
    assert.equal((await readMessageDispatchStatus(pool, company, key))?.evidence.state, 'AWAITING_RECEIPT');
    await recordMessageReceipt(pool, company, { phoneNumberId: '999', providerId: 'CaseID', status: 'read', occurredAtMs: day.start });
    assert.equal((await readMessageDispatchStatus(pool, company, key))?.evidence.state, 'AWAITING_RECEIPT');
    await recordMessageReceipt(pool, company, { phoneNumberId: '123', providerId: 'CaseID', status: 'delivered', occurredAtMs: day.start });
    assert.equal((await readMessageDispatchStatus(pool, company, key))?.evidence.state, 'DELIVERY_CONFIRMED');
    await recordMessageReceipt(pool, company, { phoneNumberId: '123', providerId: 'CaseID', status: 'failed', occurredAtMs: day.start + 1000, errorCode: 131026 });
    assert.equal((await readMessageDispatchStatus(pool, company, key))?.evidence.state, 'CONFLICTING_RECEIPTS');
    await add('CaseID');
    assert.equal((await readMessageDispatchStatus(pool, company, key))?.evidence.state, 'AMBIGUOUS_PROVIDER_REFERENCE');
    const read = await add('readID');
    for (let n = 0; n < 25; n++)
        await recordMessageReceipt(pool, company, { phoneNumberId: '123', providerId: 'readID', status: 'read', occurredAtMs: day.start + n });
    const timeline = await readDispatchReceiptTimeline(pool, company, read);
    assert.equal(timeline?.evidence.state, 'READ_CONFIRMED');
    assert.equal(timeline?.receiptCount, 25);
    assert.equal(timeline?.receipts.length, 20);
    assert.equal(timeline?.truncated, true);
    assert.equal(timeline?.readOnly, true);
    assert.equal(await readDispatchReceiptTimeline(pool, 'foreign', read), null);
    await add(null, 'UNKNOWN');
    await add('missing', 'API_ACCEPTED', null);
    await add('bad space');
    for (let n = 0; n < 52; n++)
        await add('pending_' + n);
    await add('outside', 'API_ACCEPTED', '123', day.end);
    let report = await readMessageDeliveryReport(pool, company, date);
    assert.equal(report.totalRequests, 58);
    assert.equal(report.requests.length, 50);
    assert.equal(report.requestsTruncated, true);
    assert.equal(report.counts.READ_CONFIRMED, 1);
    assert.equal(report.counts.AMBIGUOUS_PROVIDER_REFERENCE, 2);
    assert.equal(report.counts.UNCONFIRMED_DISPATCH, 1);
    assert.equal(report.counts.MISSING_SENDER, 1);
    assert.equal(report.counts.INVALID_PROVIDER_REFERENCE, 1);
    assert.equal(report.counts.AWAITING_RECEIPT, 52);
    assert.equal(Object.values(report.counts).reduce((a, b) => a + b, 0), report.totalRequests);
    assert.equal(report.historicalSnapshot, false);
    assert.equal((await readMessageDeliveryReport(pool, 'foreign', date)).totalRequests, 0);
    await assert.rejects(readMessageDeliveryReport(pool, company, '2026-02-30'));
    const lower = await add('caseid');
    assert.equal((await readMessageDispatchStatus(pool, company, lower))?.evidence.state, 'READ_CONFIRMED');
    report = await readMessageDeliveryReport(pool, company, date);
    assert.equal(report.counts.READ_CONFIRMED, 2);
    assert.equal(report.counts.AMBIGUOUS_PROVIDER_REFERENCE, 2);
    const before = JSON.stringify(await rows('SELECT request_key,status,provider_id,sender_id,UNIX_TIMESTAMP(created_at) created,UNIX_TIMESTAMP(updated_at) updated FROM message_dispatch_intents WHERE company_id=? ORDER BY request_key', [company]));
    for (const zone of ['-08:00', '+05:30']) {
        const zoned: any = { getConnection: async () => { const c = await pool.getConnection(); await c.query('SET time_zone=?', [zone]); return c; } };
        const other = await readMessageDeliveryReport(zoned, company, date);
        assert.deepEqual(other.counts, report.counts);
    }
    assert.equal(JSON.stringify(await rows('SELECT request_key,status,provider_id,sender_id,UNIX_TIMESTAMP(created_at) created,UNIX_TIMESTAMP(updated_at) updated FROM message_dispatch_intents WHERE company_id=? ORDER BY request_key', [company])), before);
    await pool.query("UPDATE message_delivery_receipts SET status='READ' WHERE company_id=? AND provider_id='readID'", [company]);
    await assert.rejects(readMessageDeliveryReport(pool, company, date));
    await assert.rejects(readDispatchReceiptTimeline(pool, company, read));
    await pool.query("UPDATE message_delivery_receipts SET status='read' WHERE company_id=? AND provider_id='readID'", [company]);
    const app = express(), owner = await db.findUserById(user);
    registerSalesRoutes(app, { auth: async (req) => req.headers.authorization === 'owner' ? owner : req.headers.authorization === 'foreign' ? { id: 'foreign-fixture' } : null, pool: async () => pool });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(r => server.once('listening', r));
    try {
        const origin = `http://127.0.0.1:${(server.address() as any).port}`;
        for (const [auth, suffix, expected] of [[null, '?date=' + date, 401], ['foreign', '?date=' + date, 403], ['owner', '?date=' + date, 200], ['owner', '?date=2026-02-30', 400], ['owner', '?before=ignored', 400]] as const) {
            const response = await fetch(origin + `/api/companies/${company}/sales/delivery-report` + suffix, { headers: auth ? { Authorization: auth } : {} });
            assert.equal(response.status, expected);
            assert.equal(response.headers.get('cache-control'), 'no-store');
        }
    }
    finally {
        await new Promise<void>(r => server.close(() => r()));
    }
    console.log('Delivery SQL: case/tenant/sender identity, ambiguity/conflict precedence, bounded20 timeline, exact58-request IST cohort, bounded50 list, late evidence and no sends passed.');
}
finally {
    for (const table of ['message_delivery_receipts', 'message_dispatch_intents', 'client_operations', 'agency_clients'])
        await pool.query(`DELETE FROM ${table} WHERE company_id=?`, [company]);
    await pool.query('DELETE FROM companies WHERE id=?', [company]);
    await pool.query('DELETE FROM agency_memberships WHERE user_id=?', [user]);
    await pool.query('DELETE FROM agencies WHERE owner_user_id=?', [user]);
    await pool.query('DELETE FROM users WHERE id=?', [user]);
    await pool.end();
}
