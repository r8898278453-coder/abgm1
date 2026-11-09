import assert from 'node:assert/strict';
import { sendTenantTelegram } from '../server/tenantNotifications';
import { isInReportWindow, isOverdueUnrepliedReview, recordTime } from '../server/reportingTime';
let calls = 0;
const requests: any[] = [];
let responseBody: any = { ok: true, result: { message_id: 7, chat: { id: -1001 } } };
let status = 200;
const deps = {
  getCompanyIntegration: async (companyId: string, provider: string) => ({ company_id: companyId, provider, status: 'connected', credentials: { botToken: '123:Fixture', chatId: companyId === 'A' ? '-1001' : '-1002' } }),
  fetch: async (_url: any, init: any) => { calls++; requests.push(JSON.parse(init.body)); return new Response(JSON.stringify(responseBody), { status }); },
};
assert.equal(await sendTenantTelegram('A', 'Client A review _[text]', deps), true);
assert.equal(requests[0].chat_id, '-1001');
assert.equal(requests[0].parse_mode, undefined);
responseBody.result.chat.id = -1002;
assert.equal(await sendTenantTelegram('B', 'Client B report', deps), true);
assert.equal(requests[1].chat_id, '-1002');
const sent = calls;
for (const integration of [null, { company_id: 'foreign', provider: 'telegram_bot', status: 'connected', credentials: { botToken: '123:Fixture', chatId: '-1001' } }, { company_id: 'A', provider: 'telegram_bot', status: 'disconnected' }, { company_id: 'A', provider: 'telegram_bot', status: 'connected', credentials: { botToken: '123:Fixture' } }]) {
  assert.equal(await sendTenantTelegram('A', 'private', { ...deps, getCompanyIntegration: async () => integration }), false);
}
assert.equal(await sendTenantTelegram('A', 'x'.repeat(4097), deps), false);
assert.equal(calls, sent);
for (const body of [{ ok: false }, { ok: true }, { ok: true, result: { message_id: 8, chat: { id: -9999 } } }]) {
  responseBody = body; assert.equal(await sendTenantTelegram('A', 'private', deps), false);
}
responseBody = { ok: true, result: { message_id: 9, chat: { id: -1001 } } }; status = 500;
assert.equal(await sendTenantTelegram('A', 'private', deps), false);
assert.equal(await sendTenantTelegram('A', 'private', { ...deps, fetch: async () => { throw new Error('secret token in URL'); } }), false);
const now = Date.parse('2026-11-02T08:00:00Z'), start = now - 86400000;
const rec = (time: number) => ({ created_at: new Date(time).toISOString() });
assert.equal(isInReportWindow(rec(start), start, now), true);
assert.equal(isInReportWindow(rec(now), start, now), false);
assert.equal(isInReportWindow(rec(now + 1), start, now), false);
assert.equal(isInReportWindow({ created_at: 'bad' }, start, now), false);
assert.equal(recordTime({ created_at: 'bad', date: '2026-11-01T00:00:00Z' }), Date.parse('2026-11-01T00:00:00Z'));
assert.equal(isOverdueUnrepliedReview(rec(start - 1), now), true);
assert.equal(isOverdueUnrepliedReview(rec(start), now), false);
assert.equal(isOverdueUnrepliedReview({ ...rec(start - 1), reply_text: 'done' }, now), false);
assert.equal(isOverdueUnrepliedReview({ date: '2 days ago' }, now), false);
console.log('Tenant Telegram destination isolation/no global fallback, verified acknowledgments, redaction and report time boundaries passed with mocked transport.');
