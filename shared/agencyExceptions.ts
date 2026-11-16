export const EXCEPTION_METRICS = {
    newLeads: { label: 'New leads awaiting review', weight: 1, module: 'sales' },
    ambiguousMessages: { label: 'Inbox identities needing review', weight: 3, module: 'inbox' },
    overdueActions: { label: 'Overdue sales actions', weight: 2, module: 'sales' },
    unknownDispatches: { label: 'Unconfirmed dispatch outcomes', weight: 5, module: 'delivery' },
    staleDispatches: { label: 'Dispatches in progress for at least30 minutes', weight: 5, module: 'delivery' },
    failedIntakes: { label: 'Failed intake records', weight: 3, module: 'intakes' },
    deadLetterIntakes: { label: 'Dead-letter intake records', weight: 4, module: 'intakes' },
    queuedIntakes: { label: 'Queued intake replays', weight: 0, module: 'intakes' },
    unresolvedConflicts: { label: 'Unresolved inbound conflicts', weight: 4, module: 'conflicts' },
    pendingReviews: { label: 'Pending workflow reviews', weight: 2, module: 'workflows' },
    failedCaptureRuns: { label: 'Retained failed capture runs', weight: 2, module: 'reports' },
    captureRecoveryNeeded: { label: 'Pending capture runs needing queue reconciliation', weight: 3, module: 'reports' },
    pendingCaptureRuns: { label: 'Capture runs awaiting settlement', weight: 0, module: 'reports' },
    captureActorRevoked: { label: 'Enabled capture schedules without current actor permission', weight: 3, module: 'reports' },
} as const;
export type ExceptionMetric = keyof typeof EXCEPTION_METRICS;
export const EXCEPTION_KEYS = Object.keys(EXCEPTION_METRICS) as ExceptionMetric[];
export function exceptionProjection(input: unknown) {
    if (!input || typeof input !== 'object')
        throw new Error('AGENCY_EXCEPTION_METRICS_INVALID');
    const backlog = {} as Record<ExceptionMetric, number>;
    let priorityScore = 0;
    for (const key of EXCEPTION_KEYS) {
        const raw = (input as any)[key];
        if (typeof raw !== 'number' && (typeof raw !== 'string' || !/^(0|[1-9][0-9]*)$/.test(raw)))
            throw new Error('AGENCY_EXCEPTION_METRICS_INVALID');
        const n = Number(raw);
        if ((input as any)[key] === null || (input as any)[key] === undefined || !Number.isSafeInteger(n) || n < 0)
            throw new Error('AGENCY_EXCEPTION_METRICS_INVALID');
        backlog[key] = n;
        priorityScore += n * EXCEPTION_METRICS[key].weight;
    }
    if (!Number.isSafeInteger(priorityScore))
        throw new Error('AGENCY_EXCEPTION_SCORE_INVALID');
    return { backlog, priorityScore };
}
export function validateAgencyOverview(value: any, agency: string) {
    if (value?.agencyId !== agency || value.modelVersion !== 3 || value.scope !== 'CURRENT_AUTHORIZED_CLIENTS' || value.timeZone !== 'Asia/Kolkata' || !Number.isSafeInteger(value.checkedAtMs) || value.checkedAtMs < 0 || value.checkedAtMs > 8640000000000000 || !Array.isArray(value.clients) || value.clients.length > 100)
        throw new Error('AGENCY_OVERVIEW_INVALID');
    const ids = new Set<string>();
    for (const client of value.clients) {
        if (typeof client.companyId !== 'string' || !client.companyId || client.companyId.length > 64 || ids.has(client.companyId) || !['ACTIVE', 'ARCHIVED'].includes(client.operationStatus))
            throw new Error('AGENCY_OVERVIEW_INVALID');
        ids.add(client.companyId);
        if (!EXCEPTION_KEYS.every(k => typeof client.backlog?.[k] === 'number'))
            throw new Error('AGENCY_OVERVIEW_INVALID');
        const p = exceptionProjection(client.backlog);
        if (p.priorityScore !== client.priorityScore)
            throw new Error('AGENCY_OVERVIEW_INVALID');
    }
    return value;
}
export function agencyExceptionsCsv(value: any, agency: string) { validateAgencyOverview(value, agency); const rows = [['checked_at', 'timezone', 'client_id', 'operation_status', 'metric', 'count', 'weight', 'priority_score']]; for (const c of value.clients)
    for (const key of EXCEPTION_KEYS)
        rows.push([new Date(value.checkedAtMs).toISOString(), 'Asia/Kolkata', c.companyId, c.operationStatus, key, String(c.backlog[key]), String(EXCEPTION_METRICS[key].weight), String(c.priorityScore)]); return rows.map(row => row.map(v => '"' + (/^[\s]*[=+@-]/.test(v) ? "'" : '') + v.replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n'; }
