import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import {agencyClientAccess} from '../../server/agencyPolicy';
import { readAgencySalesOverview } from '../../server/salesWorkspace';
import { registerSalesRoutes } from '../../server/salesRoutes';
import { agencyExceptionsCsv } from '../../shared/agencyExceptions';
if (process.env.ABGM1_LOCAL_SQL_TESTS !== '1' || process.env.DB_HOST !== '127.0.0.1' || !process.env.DB_NAME?.startsWith('abgm1_test_') || !process.env.LOCAL_SQL_CONTAINER_ID)
    throw new Error('Disposable SQL required');
const db = await import('../../server/db'), pool = await db.getDbPool();
assert.ok(pool);
const prefix = 'aex_' + crypto.randomBytes(5).toString('hex'), a = prefix + '_a', b = prefix + '_b', users: any = {}, companies = [a, b], key = () => crypto.randomBytes(32).toString('hex'), date = '2026-11-15';
let agency = '';
const rows = async (sql: string, args: any[] = []) => { const [r]: any = await pool.query(sql, args); return r; };
try {
    assert.equal((await rows('SELECT @@hostname hostname'))[0].hostname, process.env.LOCAL_SQL_CONTAINER_ID);
    for (const role of ['owner', 'viewer', 'foreign', 'admin']) {
        const id = prefix + '_' + role;
        await pool.query("INSERT INTO users(id,email,password_hash,salt,full_name) VALUES (?,?,'fixture','fixture','Fixture')", [id, id + '@example.invalid']);
        users[role] = await db.findUserById(id);
    }
    for (const c of companies)
        await db.createCompany({ id: c, user_id: users.owner.id, name: c, category: 'Services', city: 'Pune' });
    agency = (await rows('SELECT agency_id FROM agency_clients WHERE company_id=?', [a]))[0].agency_id;
    await pool.query("INSERT INTO agency_memberships(agency_id,user_id,role) VALUES (?,?,'VIEWER')", [agency, users.viewer.id]);
    await pool.query("INSERT INTO client_assignments(company_id,agency_id,user_id,role) VALUES (?,?,?,'VIEWER')", [a, agency, users.viewer.id]);
    const lead = prefix + '_lead';
    await pool.query("INSERT INTO leads(id,company_id,name,phone,service,stage,source) VALUES (?,?,'PRIVATE_CANARY','919999999999','Service','new','fixture')", [lead, a]);
    await pool.query('INSERT INTO sales_opportunities(company_id,lead_id,revision,details_json) VALUES (?,?,0,?)', [a, lead, JSON.stringify({ dueAt: '2020-01-01T00:00:00.000Z' })]);
    await pool.query("INSERT INTO sales_inbox_messages(id,company_id,channel,direction,contact_hash,provider_ref,body,metadata_json) VALUES (?,?,'WHATSAPP','INBOUND',?,'fixture','PRIVATE_CANARY','{}')", [key(), a, key()]);
    for (const [status, minutes] of [['UNKNOWN', 0], ['IN_PROGRESS', 31], ['IN_PROGRESS', 1], ['API_ACCEPTED', 90]] as const)
        await pool.query('INSERT INTO message_dispatch_intents(company_id,request_key,input_hash,actor_id,status,claim_token,updated_at) VALUES (?,?,?,?,?,?,DATE_SUB(NOW(),INTERVAL ? MINUTE))', [a, key(), key(), users.owner.id, status, 'fixture', minutes]);
    for (const state of ['FAILED', 'DEAD_LETTER', 'QUEUED', 'RECORDED'])
        await pool.query("INSERT INTO whatsapp_intakes(id,company_id,input_hash,kind,state,expires_at) VALUES (?,?,?,'INBOUND',?,DATE_ADD(NOW(),INTERVAL 1 HOUR))", [prefix + '_' + state, a, key(), state]);
    const event = key();
    await pool.query("INSERT INTO whatsapp_inbound_events(company_id,event_key,phone_number_id,waba_id,provider_ref,contact_hash,input_hash,occurred_at_ms,disposition,conflicted,conflict_revision,resolved_revision) VALUES (?,?,'123','456','fixture',?,?,1000,'CURRENT',1,2,1)", [a, event, key(), key()]);
    await pool.query("INSERT INTO sales_workflow_tasks(id,company_id,enrollment_id,step_index,revision,state,snapshot_hash,details_json) VALUES (?,?,?,0,0,'PENDING',?,'{}')", [prefix + '_task', a, prefix + '_enroll', key()]);
    await pool.query("INSERT INTO agency_memberships(agency_id,user_id,role) VALUES (?,?,'ADMIN')",[agency,users.admin.id]);
    for(const [i,status]of ['FAILED','QUEUED','RUNNING','FAILED','MISSING','WRONG_TYPE'].entries()){
        const runId='rcr_'+crypto.randomBytes(16).toString('hex'),jobId=prefix+'_capture_'+i,state=i===0?'FAILED':'QUEUED';
        await pool.query("INSERT INTO report_capture_runs(id,company_id,report_date,policy_revision,actor_id,state,job_id,created_at) VALUES (?,?,?,1,?,?,?,DATE_SUB(NOW(),INTERVAL 10 DAY))",[runId,a,`2020-01-0${i+1}`,users.owner.id,state,jobId]);
        if(status!=='MISSING')await pool.query("INSERT INTO job_queue(id,company_id,job_type,payload,status) VALUES (?,?,?,'{}',?)",[jobId,a,status==='WRONG_TYPE'?'foreign_kind':'report_snapshot_capture',status==='WRONG_TYPE'?'QUEUED':status]);
    }
    await pool.query("INSERT INTO report_capture_policies(company_id,enabled,actor_id,first_report_date) VALUES (?,1,?,'2020-01-01'),(?,1,?,'2020-01-01')",[a,users.owner.id,b,users.foreign.id]);
    let overview = await readAgencySalesOverview(pool, users.owner, agency, date);
    assert.equal(overview.clients.length, 2);
    assert.equal(overview.clients[0].companyId, a);
    assert.deepEqual(overview.clients[0].backlog, { newLeads: 1, ambiguousMessages: 1, overdueActions: 1, unknownDispatches: 1, staleDispatches: 1, failedIntakes: 1, deadLetterIntakes: 1, queuedIntakes: 1, unresolvedConflicts: 1, pendingReviews: 1, failedCaptureRuns:1,captureRecoveryNeeded:3,pendingCaptureRuns:5,captureActorRevoked:0 });
    assert.equal(overview.clients[0].priorityScore, 40);
    assert.equal(overview.clients[1].priorityScore, 3);
    assert.equal(JSON.stringify(overview).includes('PRIVATE_CANARY'), false);
    assert.equal(agencyExceptionsCsv(overview, agency).includes('919999999999'), false);
    assert.deepEqual((await readAgencySalesOverview(pool, users.viewer, agency, date)).clients.map(c => c.companyId), [a]);
    await assert.rejects(readAgencySalesOverview(pool, users.foreign, agency, date), { status: 403 });
    await pool.query('UPDATE report_capture_policies SET actor_id=? WHERE company_id=?',[users.admin.id,a]);
    assert.equal((await readAgencySalesOverview(pool,users.owner,agency,date)).clients.find(c=>c.companyId===a)!.backlog.captureActorRevoked,0);
    await pool.query("UPDATE agency_memberships SET role='VIEWER' WHERE agency_id=? AND user_id=?",[agency,users.admin.id]);
    assert.equal((await agencyClientAccess(pool,users.admin,a,'manage',true)).authorized,false);
    assert.equal((await readAgencySalesOverview(pool,users.owner,agency,date)).clients.find(c=>c.companyId===a)!.backlog.captureActorRevoked,1);
    await pool.query('UPDATE users SET is_platform_admin=1 WHERE id=?',[users.admin.id]);
    assert.equal((await readAgencySalesOverview(pool,users.owner,agency,date)).clients.find(c=>c.companyId===a)!.backlog.captureActorRevoked,0);
    await pool.query('UPDATE users SET is_platform_admin=0 WHERE id=?',[users.admin.id]);
    await pool.query('UPDATE report_capture_policies SET actor_id=? WHERE company_id=?',[users.owner.id,a]);
    await pool.query('UPDATE report_capture_policies SET enabled=0 WHERE company_id=?',[b]);
    assert.equal((await readAgencySalesOverview(pool,users.owner,agency,date)).clients.find(c=>c.companyId===b)!.backlog.captureActorRevoked,0);
    await pool.query('UPDATE report_capture_policies SET enabled=1 WHERE company_id=?',[b]);
    await pool.query("UPDATE client_operations SET status='ARCHIVED' WHERE company_id=?", [a]);
    overview = await readAgencySalesOverview(pool, users.owner, agency, date);
    assert.equal(overview.clients[0].operationStatus, 'ARCHIVED');
    assert.equal(overview.clients[0].priorityScore, 40);
    await pool.query('UPDATE whatsapp_inbound_events SET resolved_revision=conflict_revision WHERE company_id=?', [a]);
    await pool.query("UPDATE sales_workflow_tasks SET state='COMPLETED' WHERE company_id=?", [a]);
    await pool.query("UPDATE whatsapp_intakes SET state='RECORDED' WHERE company_id=? AND state IN ('FAILED','DEAD_LETTER','QUEUED')", [a]);
    overview = await readAgencySalesOverview(pool, users.owner, agency, date);
    assert.equal(overview.clients[0].priorityScore, 27);
    assert.equal(overview.clients[0].backlog.unresolvedConflicts, 0);
    assert.equal(overview.clients[0].backlog.queuedIntakes, 0);
    await pool.query('DELETE FROM client_assignments WHERE company_id=? AND user_id=?', [a, users.viewer.id]);
    await assert.rejects(readAgencySalesOverview(pool, users.viewer, agency, date), { status: 403 });
    const app = express();
    registerSalesRoutes(app, { auth: async (req) => users[String(req.headers.authorization)] || null, pool: async () => pool });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(r => server.once('listening', r));
    try {
        const origin = `http://127.0.0.1:${(server.address() as any).port}`;
        for (const [role, suffix, status] of [['missing', '', 401], ['foreign', '', 403], ['owner', '', 200], ['owner', '?date=2026-02-30', 400], ['owner', '?before=ignored', 400]] as const) {
            const r = await fetch(origin + `/api/agencies/${agency}/sales-overview` + suffix, { headers: { Authorization: role } });
            assert.equal(r.status, status);
            assert.equal(r.headers.get('cache-control'), 'no-store');
        }
    }
    finally {
        await new Promise<void>(r => server.close(() => r()));
    }
    console.log('Agency exceptions SQL/HTTP:14 exact current metrics including retained failed captures, queue binding/reconciliation, current actor revocation/admin parity and disabled policy exclusion, stale threshold, weighted rank, archived visibility, no private payloads, assignment isolation/revocation, state resolution and auth/date/query guards passed without sends.');
}
catch (e: any) {
    console.log(JSON.stringify({ fixture: 'agency-exceptions', code: e.code || 'ASSERTION', line: e.stack?.match(/agencyExceptionsSql.test.ts:(\d+)/)?.[1], ...(e.code === 'ERR_ASSERTION' ? { actual: e.actual, expected: e.expected } : {}) }));
    process.exitCode = 1;
}
finally {
    for (const c of companies) {
        for (const t of ['report_capture_runs','report_capture_policies','job_queue','sales_workflow_tasks', 'whatsapp_intakes', 'whatsapp_inbound_events', 'message_dispatch_intents', 'sales_inbox_messages', 'sales_opportunities', 'leads', 'client_assignments', 'company_profiles_data', 'client_operations', 'agency_clients'])
            await pool.query(`DELETE FROM ${t} WHERE company_id=?`, [c]);
        await pool.query('DELETE FROM companies WHERE id=?', [c]);
    }
    for (const u of Object.values(users) as any[])
        await pool.query('DELETE FROM agency_memberships WHERE user_id=?', [u.id]);
    for (const u of Object.values(users) as any[]) {
        await pool.query('DELETE FROM agencies WHERE owner_user_id=?', [u.id]);
        await pool.query('DELETE FROM users WHERE id=?', [u.id]);
    }
    await pool.end();
}
