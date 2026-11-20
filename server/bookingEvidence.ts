import crypto from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import { agencyAudit } from './agencyRoutes';
import { agencyClientAccess } from './agencyPolicy';
import { exitSalesWorkflows } from './salesWorkflowLifecycle';
import { SalesError, withSalesLock, salesHash } from './salesWorkspace';
import { bookingEvidenceCommand } from '../shared/bookingEvidence';
import { canonicalJson } from '../shared/canonicalJson';
import { crmId } from '../shared/crmIdentity';
import { withReadOnlySqlDeadline, type ReadOnlySql } from './readOnlySqlDeadline';

async function latest(sql: ReadOnlySql, company: string, lead: string) {
  const [rows] = await sql.query(
    'SELECT *,CAST(revision AS CHAR) version FROM sales_booking_evidence WHERE company_id=? AND lead_id=? ORDER BY revision DESC LIMIT 1',
    [company, lead],
  );
  return rows[0] ?? null;
}
function publicBooking(row: any) {
  return row ? {
    version: row.version, state: row.state, externalEventId: row.external_event_id,
    startAtMs: Number(row.start_at_ms), endAtMs: Number(row.end_at_ms),
    recordedAtMs: Number(row.confirmed_at_ms), source: 'OPERATOR_RECORDED' as const,
  } : null;
}
export async function hasCurrentBooking(sql: ReadOnlySql, company: string, lead: string, nowMs: number) {
  const [rows] = await sql.query(
    `SELECT b.id FROM sales_booking_evidence b
      WHERE b.company_id=? AND b.state='CONFIRMED' AND b.end_at_ms>?
        AND (b.lead_id=? OR b.lead_id IN (
          SELECT alias_lead_id FROM crm_identity_links WHERE company_id=? AND target_lead_id=? AND state='ACTIVE'
        )) AND NOT EXISTS (
          SELECT 1 FROM sales_booking_evidence newer
          WHERE newer.company_id=b.company_id AND newer.lead_id=b.lead_id AND newer.revision>b.revision
        ) LIMIT 1`,
    [company, nowMs, lead, company, lead],
  );
  return rows.length > 0;
}

export async function readBookingEvidence(pool: Pool, user: any, company: string, lead: string) {
  if (!crmId.safeParse(lead).success) throw new SalesError(400, 'BOOKING_SCOPE_INVALID');
  return withReadOnlySqlDeadline(pool, async sql => {
    const access = await agencyClientAccess(sql, user, company, 'read');
    if (!access.authorized) throw new SalesError(access.status, 'SALES_ACCESS_DENIED');
    const [leads] = await sql.query('SELECT id FROM leads WHERE id=? AND company_id=?', [lead, company]);
    if (leads[0]?.id !== lead) throw new SalesError(404, 'LEAD_NOT_FOUND');
    return { booking: publicBooking(await latest(sql, company, lead)) };
  });
}

export async function saveBookingEvidence(pool: Pool, user: any, company: string, lead: string, input: unknown) {
  const parsed = bookingEvidenceCommand.safeParse(input);
  if (!parsed.success || !crmId.safeParse(lead).success) throw new SalesError(400, 'BOOKING_INPUT_INVALID');
  const command = parsed.data;
  const hash = salesHash(canonicalJson({ lead, actor: user.id, ...command }));
  return withSalesLock(pool, user, company, 'write', async (sql, canonicalCompany) => {
    const [leads]: any = await sql.query('SELECT id FROM leads WHERE id=? AND company_id=? FOR UPDATE', [lead, canonicalCompany]);
    if (leads[0]?.id !== lead) throw new SalesError(404, 'LEAD_NOT_FOUND');
    const [alias]: any = await sql.query("SELECT id FROM crm_identity_links WHERE company_id=? AND alias_lead_id=? AND state='ACTIVE'", [canonicalCompany, lead]);
    if (alias.length && command.operation !== 'CANCEL') throw new SalesError(409, 'BOOKING_CANONICAL_CONTACT_REQUIRED');
    const [receipts]: any = await sql.query(
      'SELECT *,CAST(revision AS CHAR) version FROM sales_booking_evidence WHERE company_id=? AND request_key=?',
      [canonicalCompany, command.requestKey],
    );
    if (receipts.length) {
      if (receipts[0].input_hash !== hash) throw new SalesError(409, 'BOOKING_REQUEST_CONFLICT');
      return { booking: publicBooking(receipts[0]), reused: true };
    }
    const previous = await latest(sql, canonicalCompany, lead);
    const [{ nowMs }]: any = (await sql.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs'))[0];
    const now = Number(nowMs);
    if ((previous?.version || '0') !== command.expectedVersion) throw new SalesError(409, 'BOOKING_CHANGED');
    const active = previous?.state === 'CONFIRMED' && Number(previous.end_at_ms) > now;
    if (command.operation === 'CONFIRM' ? active : !active) throw new SalesError(409, 'BOOKING_STATE_CHANGED');

    const start = command.operation === 'CANCEL' ? Number(previous.start_at_ms) : Date.parse(command.startAt);
    const end = command.operation === 'CANCEL' ? Number(previous.end_at_ms) : Date.parse(command.endAt);
    if (command.operation !== 'CANCEL' && (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start <= now || end <= start || end - start > 86400000 || start - now > 365 * 86400000)) {
      throw new SalesError(400, 'BOOKING_TIME_INVALID');
    }
    const eventId = command.operation === 'CANCEL' ? previous.external_event_id : command.externalEventId;
    if (command.operation === 'RESCHEDULE' && eventId !== previous.external_event_id) {
      throw new SalesError(409, 'BOOKING_EVENT_CHANGED');
    }
    const version = (BigInt(command.expectedVersion) + 1n).toString();
    if (BigInt(version)>18446744073709551615n) throw new SalesError(409, 'BOOKING_REVISION_EXHAUSTED');
    const state = command.operation === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED';
    await sql.query(
      'INSERT INTO sales_booking_evidence (id,company_id,lead_id,actor_id,request_key,input_hash,revision,state,external_event_id,start_at_ms,end_at_ms,confirmed_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [crypto.randomUUID(), canonicalCompany, lead, user.id, command.requestKey, hash, version, state, eventId, start, end, now],
    );
    if (state === 'CONFIRMED') {
      await exitSalesWorkflows(sql, canonicalCompany, 'BOOKING_RECORDED', user.id, { leadId: lead, inquiryOnly: true });
    }
    await agencyAudit(sql, canonicalCompany, user.id, 'SALES_BOOKING_EVIDENCE_' + command.operation, { leadId: lead, version, state });
    return {
      booking: publicBooking({version,state,external_event_id:eventId,start_at_ms:start,end_at_ms:end,confirmed_at_ms:now}),
      reused:false,
    };
  });
}
