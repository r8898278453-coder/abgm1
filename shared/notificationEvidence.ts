import {validWorkspaceRevision} from './workspaceRevision';
export function notificationCursor(value: unknown) { if (typeof value !== 'string' || value.length > 80)
    throw new Error('NOTIFICATION_CURSOR_INVALID'); const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\|(daily_digest|review_reminder)$/.exec(value); if (!m || !Number.isFinite(Date.parse(m[1])) || new Date(m[1]).toISOString().slice(0, 19) + 'Z' !== m[1])
    throw new Error('NOTIFICATION_CURSOR_INVALID'); return { dueAt: m[1], kind: m[2] }; }
export function validateNotificationPage(value: any, company: string) { if (value?.companyId !== company || value.available !== true || !Array.isArray(value.occurrences) || value.occurrences.length > 100)
    throw new Error('NOTIFICATION_PAGE_INVALID'); const ids = new Set<string>(); for (const row of value.occurrences) {
    const key = row?.dueAt + '|' + row?.kind;
    notificationCursor(key);
    if (ids.has(key) || !['SENT', 'UNKNOWN', 'RUNNING'].includes(row.status) || typeof row.needsReview !== 'boolean' || row.status === 'UNKNOWN' && !row.needsReview || row.status === 'SENT' && row.needsReview)
        throw new Error('NOTIFICATION_PAGE_INVALID');
    if(row.policyVersion!==undefined&&row.policyVersion!==null&&!validWorkspaceRevision(row.policyVersion)||row.providerId!==undefined&&row.providerId!==null&&!(typeof row.providerId==='string'&&/^[1-9][0-9]{0,31}$/.test(row.providerId))||row.reasonCode!==undefined&&row.reasonCode!==null&&!(typeof row.reasonCode==='string'&&/^[A-Z0-9_]{1,64}$/.test(row.reasonCode)))throw new Error('NOTIFICATION_PAGE_INVALID');
    ids.add(key);
} if (value.nextCursor !== null)
    notificationCursor(value.nextCursor); return value; }
