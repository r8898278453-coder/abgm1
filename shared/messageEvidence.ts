import { platformDayBounds } from './dailyWorkReport';
export const MESSAGE_STATES = ['IN_PROGRESS', 'API_ACCEPTED', 'REJECTED', 'PAUSED', 'UNKNOWN'] as const;
export const DELIVERY_STATES = ['UNOBSERVED', 'SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
export const EVIDENCE_STATES = ['UNCONFIRMED_DISPATCH', 'DISPATCH_ACTIVE', 'EXECUTION_PAUSED', 'REQUEST_REJECTED', 'MISSING_SENDER', 'INVALID_PROVIDER_REFERENCE', 'AMBIGUOUS_PROVIDER_REFERENCE', 'CONFLICTING_RECEIPTS', 'AWAITING_RECEIPT', 'SENT_AWAITING_DELIVERY', 'DELIVERY_FAILED', 'DELIVERY_CONFIRMED', 'READ_CONFIRMED'] as const;
export type MessageEvidence = typeof EVIDENCE_STATES[number];
export const EVIDENCE_LABELS: Record<MessageEvidence, string> = { UNCONFIRMED_DISPATCH: 'Dispatch outcome unconfirmed', DISPATCH_ACTIVE: 'Dispatch is in progress', EXECUTION_PAUSED: 'Sending is paused', REQUEST_REJECTED: 'Provider request rejected', MISSING_SENDER: 'Sender identity is missing', INVALID_PROVIDER_REFERENCE: 'Provider reference is invalid', AMBIGUOUS_PROVIDER_REFERENCE: 'Provider reference is not uniquely bound', CONFLICTING_RECEIPTS: 'Delivery and failure evidence conflict', AWAITING_RECEIPT: 'Provider accepted; delivery receipt not observed', SENT_AWAITING_DELIVERY: 'Sent receipt observed; delivery unconfirmed', DELIVERY_FAILED: 'Provider reported delivery failure', DELIVERY_CONFIRMED: 'Delivery receipt confirmed', READ_CONFIRMED: 'Read receipt confirmed' };
export function messageEvidence(input: {
    status: string;
    delivery: string;
    conflicting: boolean;
    providerId: string | null;
    senderBound: boolean;
    identityCount: number;
}) {
    if (!MESSAGE_STATES.includes(input.status as any) || !DELIVERY_STATES.includes(input.delivery as any) || typeof input.conflicting !== 'boolean' || typeof input.senderBound !== 'boolean' || input.providerId !== null && typeof input.providerId !== 'string' || !Number.isSafeInteger(input.identityCount) || input.identityCount < 0)
        throw new Error('MESSAGE_EVIDENCE_INVALID');
    let state: MessageEvidence;
    if (input.status === 'UNKNOWN')
        state = 'UNCONFIRMED_DISPATCH';
    else if (input.status === 'IN_PROGRESS')
        state = 'DISPATCH_ACTIVE';
    else if (input.status === 'PAUSED')
        state = 'EXECUTION_PAUSED';
    else if (input.status === 'REJECTED')
        state = 'REQUEST_REJECTED';
    else if (!input.providerId || !/^[\x21-\x7e]{1,255}$/.test(input.providerId))
        state = 'INVALID_PROVIDER_REFERENCE';
    else if (!input.senderBound)
        state = 'MISSING_SENDER';
    else if (input.identityCount !== 1)
        state = 'AMBIGUOUS_PROVIDER_REFERENCE';
    else if (input.conflicting)
        state = 'CONFLICTING_RECEIPTS';
    else
        state = input.delivery === 'READ' ? 'READ_CONFIRMED' : input.delivery === 'DELIVERED' ? 'DELIVERY_CONFIRMED' : input.delivery === 'FAILED' ? 'DELIVERY_FAILED' : input.delivery === 'SENT' ? 'SENT_AWAITING_DELIVERY' : 'AWAITING_RECEIPT';
    const delivered = ['DELIVERY_CONFIRMED', 'READ_CONFIRMED'].includes(state), needsReview = ['UNCONFIRMED_DISPATCH', 'MISSING_SENDER', 'INVALID_PROVIDER_REFERENCE', 'AMBIGUOUS_PROVIDER_REFERENCE', 'CONFLICTING_RECEIPTS', 'DELIVERY_FAILED'].includes(state);
    return { state, label: EVIDENCE_LABELS[state], deliveryConfirmed: delivered, readConfirmed: state === 'READ_CONFIRMED', needsReview, noAutomaticResend: true as const };
}
export function evidenceGuidance(state: MessageEvidence) { if (['UNCONFIRMED_DISPATCH', 'DISPATCH_ACTIVE'].includes(state))
    return 'Inspect the saved request and provider evidence before another send. Do not retry blindly.'; if (state === 'AWAITING_RECEIPT' || state === 'SENT_AWAITING_DELIVERY')
    return 'Wait for a matching signed receipt or investigate webhook/sender configuration. Receipt absence does not prove failure.'; if (state === 'MISSING_SENDER' || state === 'INVALID_PROVIDER_REFERENCE' || state === 'AMBIGUOUS_PROVIDER_REFERENCE' || state === 'CONFLICTING_RECEIPTS')
    return 'Investigate the canonical request and provider records. This screen cannot override evidence or resend.'; if (state === 'DELIVERY_FAILED' || state === 'REQUEST_REJECTED')
    return 'Review the recorded failure before any new eligible, explicitly approved send.'; if (state === 'EXECUTION_PAUSED')
    return 'Review the current client policy; a paused request is not a delivered message.'; return 'Confirmation applies to the matching provider receipt, not a sale, booking or revenue outcome.'; }
export type DeliveryCounts = Record<MessageEvidence, number>;
export const emptyDeliveryCounts = (): DeliveryCounts => Object.fromEntries(EVIDENCE_STATES.map(k => [k, 0])) as DeliveryCounts;
export function deliveryReportCsv(report: any) { platformDayBounds(report.date); if (report.timeZone !== 'Asia/Kolkata' || !Number.isSafeInteger(report.checkedAtMs) || report.checkedAtMs < 0 || report.checkedAtMs > 8640000000000000 || !Number.isSafeInteger(report.totalRequests) || report.totalRequests < 0 || report.cohort !== 'CREATED_REQUESTS_CURRENT_EVIDENCE')
    throw new Error('DELIVERY_REPORT_INVALID'); let total = 0; const rows = [['date', 'timezone', 'checked_at', 'cohort', 'metric', 'count']]; for (const key of EVIDENCE_STATES) {
    const count = report.counts?.[key];
    if (!Number.isSafeInteger(count) || count < 0)
        throw new Error('DELIVERY_REPORT_INVALID');
    total += count;
    rows.push([report.date, report.timeZone, new Date(report.checkedAtMs).toISOString(), report.cohort, key, String(count)]);
} if (!Number.isSafeInteger(total) || total !== report.totalRequests)
    throw new Error('DELIVERY_REPORT_UNRECONCILED'); return rows.map(r => r.map(v => '"' + v.replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n'; }
