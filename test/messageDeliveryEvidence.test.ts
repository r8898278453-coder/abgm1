import assert from 'node:assert/strict';
import { messageEvidence, emptyDeliveryCounts, deliveryReportCsv } from '../shared/messageEvidence';
const base = { status: 'API_ACCEPTED', delivery: 'UNOBSERVED', conflicting: false, providerId: 'wamid.Case', senderBound: true, identityCount: 1 };
for (const [patch, state] of [[{}, 'AWAITING_RECEIPT'], [{ status: 'UNKNOWN', delivery: 'READ' }, 'UNCONFIRMED_DISPATCH'], [{ status: 'IN_PROGRESS' }, 'DISPATCH_ACTIVE'], [{ status: 'PAUSED' }, 'EXECUTION_PAUSED'], [{ status: 'REJECTED' }, 'REQUEST_REJECTED'], [{ providerId: null }, 'INVALID_PROVIDER_REFERENCE'], [{ providerId: 'bad space' }, 'INVALID_PROVIDER_REFERENCE'], [{ senderBound: false }, 'MISSING_SENDER'], [{ identityCount: 2, delivery: 'READ' }, 'AMBIGUOUS_PROVIDER_REFERENCE'], [{ identityCount: 0 }, 'AMBIGUOUS_PROVIDER_REFERENCE'], [{ conflicting: true, delivery: 'READ' }, 'CONFLICTING_RECEIPTS'], [{ delivery: 'SENT' }, 'SENT_AWAITING_DELIVERY'], [{ delivery: 'FAILED' }, 'DELIVERY_FAILED'], [{ delivery: 'DELIVERED' }, 'DELIVERY_CONFIRMED'], [{ delivery: 'READ' }, 'READ_CONFIRMED']] as const) {
    const result = messageEvidence({ ...base, ...patch });
    assert.equal(result.state, state);
    assert.equal(result.deliveryConfirmed, ['DELIVERY_CONFIRMED', 'READ_CONFIRMED'].includes(state));
    assert.equal(result.noAutomaticResend, true);
}
for (const patch of [{ status: 'accepted' }, { delivery: 'success' }, { identityCount: -1 }, { identityCount: 1.5 }])
    assert.throws(() => messageEvidence({ ...base, ...patch }));
const counts = emptyDeliveryCounts();
counts.AWAITING_RECEIPT = 2;
const report = { date: '2026-11-15', timeZone: 'Asia/Kolkata', checkedAtMs: Date.now(), cohort: 'CREATED_REQUESTS_CURRENT_EVIDENCE', counts, totalRequests: 2 };
assert.match(deliveryReportCsv(report), /AWAITING_RECEIPT/);
assert.throws(() => deliveryReportCsv({ ...report, totalRequests: 3 }));
assert.throws(() => deliveryReportCsv({ ...report, date: '2026-02-30' }));
assert.throws(() => deliveryReportCsv({ ...report, counts: {} }));
console.log('Delivery evidence: all states, exact identity and conflict precedence, fail-closed inputs and reconciled metadata CSV passed.');
