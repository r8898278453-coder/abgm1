import type { Pool } from 'mysql2/promise';
import type { ReadOnlySql } from './readOnlySqlDeadline';
import { withReadOnlySqlDeadline } from './readOnlySqlDeadline';
import { messageEvidence, emptyDeliveryCounts } from '../shared/messageEvidence';
import { readMessageDelivery, deliveryFromStatuses } from './messageDeliveryReceipts';
import { platformDayBounds } from '../shared/dailyWorkReport';
import { SalesError } from './salesWorkspace';
const senderBound = (v: any) => typeof v === 'string' && /^\d{1,64}$/.test(v);
export async function evidenceForDispatch(sql: ReadOnlySql, company: string, row: any) { const accepted = row.status === 'API_ACCEPTED', bound = senderBound(row.sender_id), provider = accepted ? row.provider_id : null; const receipt = await readMessageDelivery(sql, company, provider, bound ? row.sender_id : null); let identityCount = 0; if (accepted && provider && bound) {
    const [identities]: any = await sql.query("SELECT COUNT(*) total FROM message_dispatch_intents WHERE company_id=? AND sender_id=? AND provider_id=? AND status='API_ACCEPTED'", [company, row.sender_id, provider]);
    identityCount = Number(identities[0].total);
} return { ...receipt, senderBound: bound, providerIdentityCount: identityCount, evidence: messageEvidence({ status: row.status, delivery: receipt.delivery, conflicting: receipt.conflicting, providerId: provider, senderBound: bound, identityCount }) }; }
export async function readDispatchReceiptTimeline(pool: Pool, company: string, key: string) { return withReadOnlySqlDeadline(pool, async (sql) => { const [requests]: any = await sql.query('SELECT status,provider_id,sender_id,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM message_dispatch_intents WHERE company_id=? AND request_key=?', [company, key]); if (!requests.length)
    return null; const r = requests[0], summary = await evidenceForDispatch(sql, company, r); const [clock]: any = await sql.query('SELECT UNIX_TIMESTAMP()*1000 now_ms'); let rows: any[] = []; if (r.status === 'API_ACCEPTED' && r.provider_id && senderBound(r.sender_id)) {
    const [found]: any = await sql.query('SELECT event_key,status,occurred_at_ms,error_code,UNIX_TIMESTAMP(received_at)*1000 received_ms FROM message_delivery_receipts WHERE company_id=? AND provider_id=? AND phone_number_id=? ORDER BY received_at DESC,event_key DESC LIMIT 21', [company, r.provider_id, r.sender_id]);
    rows = found;
} const receipts = rows.slice(0, 20).map((r: any) => { if (!['sent', 'delivered', 'read', 'failed'].includes(r.status) || ![r.occurred_at_ms, r.received_ms].every(v => Number.isSafeInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 8640000000000000) || r.error_code !== null && (!Number.isInteger(Number(r.error_code)) || Number(r.error_code) < 0 || Number(r.error_code) > 4294967295))
    throw new Error('RECEIPT_EVIDENCE_INVALID'); return { id: r.event_key, status: r.status, occurredAtMs: Number(r.occurred_at_ms), receivedAtMs: Number(r.received_ms), errorCode: r.error_code === null ? null : Number(r.error_code) }; }); return { ...summary, receipts, truncated: rows.length > 20, checkedAtMs: Number(clock[0].now_ms), ageSinceDispatchUpdateMs: r.updated_ms === null ? null : Math.max(0, Number(clock[0].now_ms) - Number(r.updated_ms)), readOnly: true }; }); }
export async function readMessageDeliveryReport(pool: Pool, company: string, date: string) {
    let day: {
        start: number;
        end: number;
    };
    try {
        day = platformDayBounds(date);
    }
    catch {
        throw new SalesError(400, 'DELIVERY_REPORT_DATE_INVALID');
    }
    return withReadOnlySqlDeadline(pool, async (sql) => {
        const [clock]: any = await sql.query('SELECT UNIX_TIMESTAMP()*1000 now_ms');
        const joins = ` FROM message_dispatch_intents m LEFT JOIN (SELECT provider_id,phone_number_id,MAX(BINARY status='read') has_read,MAX(BINARY status='delivered') has_delivered,MAX(BINARY status='failed') has_failed,MAX(BINARY status='sent') has_sent,MAX(BINARY status NOT IN ('sent','delivered','read','failed')) invalid_status FROM message_delivery_receipts WHERE company_id=? GROUP BY provider_id,phone_number_id) r ON m.status='API_ACCEPTED' AND BINARY r.provider_id=BINARY m.provider_id AND r.phone_number_id=m.sender_id LEFT JOIN (SELECT provider_id,sender_id,COUNT(*) identities FROM message_dispatch_intents WHERE company_id=? AND status='API_ACCEPTED' GROUP BY provider_id,sender_id) u ON m.status='API_ACCEPTED' AND u.provider_id=m.provider_id AND u.sender_id=m.sender_id WHERE m.company_id=? AND m.created_at>=FROM_UNIXTIME(?) AND m.created_at<FROM_UNIXTIME(?)`;
        const parameters = [company, company, company, day.start / 1000, day.end / 1000];
        const [groups]: any = await sql.query(`SELECT m.status COLLATE utf8mb4_bin status,m.sender_id IS NOT NULL AND m.sender_id REGEXP '^[0-9]{1,64}$' sender_bound,m.provider_id IS NOT NULL AND BINARY m.provider_id REGEXP '^[!-~]{1,255}$' provider_valid,COALESCE(r.has_read,0) has_read,COALESCE(r.has_delivered,0) has_delivered,COALESCE(r.has_failed,0) has_failed,COALESCE(r.has_sent,0) has_sent,COALESCE(r.invalid_status,0) invalid_status,COALESCE(u.identities,0) identities,COUNT(*) total${joins} GROUP BY m.status COLLATE utf8mb4_bin,sender_bound,provider_valid,has_read,has_delivered,has_failed,has_sent,invalid_status,identities`, parameters);
        const counts = emptyDeliveryCounts();
        let totalRequests = 0;
        for (const g of groups) {
            if (Number(g.invalid_status))
                throw new Error('RECEIPT_EVIDENCE_INVALID');
            const set = new Set<string>();
            for (const [field, status] of [['has_read', 'read'], ['has_delivered', 'delivered'], ['has_failed', 'failed'], ['has_sent', 'sent']])
                if (Number(g[field]))
                    set.add(status);
            const delivery = deliveryFromStatuses(set), conflicting = set.has('failed') && (set.has('read') || set.has('delivered'));
            const e = messageEvidence({ status: g.status, delivery, conflicting, providerId: Number(g.provider_valid) ? 'valid-provider-id' : null, senderBound: Boolean(Number(g.sender_bound)), identityCount: Number(g.identities) });
            const n = Number(g.total);
            if (!Number.isSafeInteger(n) || n < 0)
                throw new Error('DELIVERY_REPORT_COUNT_INVALID');
            counts[e.state] += n;
            totalRequests += n;
        }
        const [recent]: any = await sql.query(`SELECT m.request_key,m.status,m.provider_id,m.sender_id,UNIX_TIMESTAMP(m.created_at)*1000 created_ms,COALESCE(r.has_read,0) has_read,COALESCE(r.has_delivered,0) has_delivered,COALESCE(r.has_failed,0) has_failed,COALESCE(r.has_sent,0) has_sent,COALESCE(r.invalid_status,0) invalid_status,COALESCE(u.identities,0) identities ${joins} ORDER BY m.created_at DESC,m.request_key DESC LIMIT 51`, parameters);
        const requests = recent.slice(0, 50).map((r: any) => { if (Number(r.invalid_status))
            throw new Error('RECEIPT_EVIDENCE_INVALID'); const statuses = new Set<string>(); for (const [field, status] of [['has_read', 'read'], ['has_delivered', 'delivered'], ['has_failed', 'failed'], ['has_sent', 'sent']])
            if (Number(r[field]))
                statuses.add(status); return { requestKey: r.request_key, status: r.status, createdAtMs: Number(r.created_ms), evidence: messageEvidence({ status: r.status, delivery: deliveryFromStatuses(statuses), conflicting: statuses.has('failed') && (statuses.has('read') || statuses.has('delivered')), providerId: r.status === 'API_ACCEPTED' ? r.provider_id : null, senderBound: senderBound(r.sender_id), identityCount: Number(r.identities) }) }; });
        const [observations]: any = await sql.query(`SELECT COUNT(*) total,SUM(r.occurred_at_ms<? OR r.occurred_at_ms>=?) outside_provider_day,SUM(NOT EXISTS(SELECT 1 FROM message_dispatch_intents m WHERE m.company_id=r.company_id AND m.status='API_ACCEPTED' AND m.sender_id=r.phone_number_id AND BINARY m.provider_id=BINARY r.provider_id)) unmatched FROM message_delivery_receipts r WHERE r.company_id=? AND r.received_at>=FROM_UNIXTIME(?) AND r.received_at<FROM_UNIXTIME(?)`, [day.start, day.end, company, day.start / 1000, day.end / 1000]);
        const [current]: any = await sql.query("SELECT status,COUNT(*) total FROM message_dispatch_intents WHERE company_id=? AND status IN ('UNKNOWN','IN_PROGRESS') GROUP BY status", [company]);
        return { date, timeZone: 'Asia/Kolkata', cohort: 'CREATED_REQUESTS_CURRENT_EVIDENCE', checkedAtMs: Number(clock[0].now_ms), totalRequests, counts, requests, requestsTruncated: recent.length > 50, receiptObservations: { recorded: Number(observations[0].total), providerOutsideSelectedDay: Number(observations[0].outside_provider_day || 0), currentlyUnmatched: Number(observations[0].unmatched || 0) }, currentBacklog: { unknown: Number(current.find((r: any) => r.status === 'UNKNOWN')?.total || 0), inProgress: Number(current.find((r: any) => r.status === 'IN_PROGRESS')?.total || 0) }, readOnly: true, historicalSnapshot: false };
    });
}
