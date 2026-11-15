import React, { useEffect, useRef, useState } from 'react';
import { apiRequest, getStoredToken } from '../services/authService';
import { platformDateKey } from '../../shared/dailyWorkReport';
import { deliveryReportCsv, EVIDENCE_STATES, EVIDENCE_LABELS } from '../../shared/messageEvidence';
import { MessageDispatchStatus } from './MessageDispatchStatus';
export const MessageDeliveryReportPanel: React.FC<{
    companyId: string;
}> = props => <Report key={props.companyId} {...props}/>;
const Report: React.FC<{
    companyId: string;
}> = ({ companyId }) => {
    const [date, setDate] = useState(platformDateKey), [data, setData] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [selected, setSelected] = useState('');
    const active = useRef<AbortController | null>(null);
    useEffect(() => () => active.current?.abort(), []);
    const load = async () => {
        active.current?.abort();
        const c = new AbortController();
        active.current = c;
        const token = getStoredToken(), wanted = date;
        setData(null);
        setSelected('');
        setError('');
        setBusy(true);
        const current = () => !c.signal.aborted && getStoredToken() === token;
        try {
            const r = await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/sales/delivery-report?date=${encodeURIComponent(wanted)}`, { signal: c.signal });
            if (!current())
                return;
            const d = r.report;
            if (!r.success || r.companyId !== companyId || d?.date !== wanted || d.readOnly !== true || d.historicalSnapshot !== false || !Array.isArray(d.requests) || d.requests.length > 50 || typeof d.requestsTruncated !== 'boolean' || !d.requests.every((v: any) => /^[a-f0-9]{64}$/.test(v.requestKey) && EVIDENCE_STATES.includes(v.evidence?.state)) || ![...Object.values(d.receiptObservations || {}), ...Object.values(d.currentBacklog || {})].every(v => Number.isSafeInteger(v) && Number(v) >= 0) || !['recorded', 'providerOutsideSelectedDay', 'currentlyUnmatched'].every(k => Number.isSafeInteger(d.receiptObservations?.[k])) || !['unknown', 'inProgress'].every(k => Number.isSafeInteger(d.currentBacklog?.[k])))
                throw new Error();
            const csv = deliveryReportCsv(d);
            setData({ value: d, csv, token });
        }
        catch {
            if (current())
                setError('Delivery report unavailable. Reload before exporting.');
        }
        finally {
            if (current())
                setBusy(false);
        }
    };
    const saved = data?.token === getStoredToken() ? data : null, d = saved?.value;
    const download = () => { if (!saved)
        return; const url = URL.createObjectURL(new Blob([saved.csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `delivery-evidence-${date}.csv`; a.click(); URL.revokeObjectURL(url); };
    return <section aria-label="Message delivery report" className="border p-3"><h3>Message delivery evidence</h3><p>Requests created on the selected IST date, with current evidence. Later receipts can change these counts. This is not an archived daily snapshot.</p><input aria-label="Delivery report date" type="date" value={date} onChange={e => { active.current?.abort(); setBusy(false); setData(null); setError(''); setSelected(''); setDate(e.target.value); }}/><button disabled={busy} onClick={() => void load()}>Load delivery evidence</button>{error && <p role="alert">{error}</p>}{d && <><p>Created requests: {d.totalRequests}. Checked {new Date(d.checkedAtMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.</p><ul>{EVIDENCE_STATES.map(k => <li key={k}>{EVIDENCE_LABELS[k]}: {d.counts[k]}</li>)}</ul><p>Receipts recorded on selected day: {d.receiptObservations.recorded}; provider timestamp outside day: {d.receiptObservations.providerOutsideSelectedDay}; currently unmatched: {d.receiptObservations.currentlyUnmatched}.</p><p>Current backlog across all dates: unknown {d.currentBacklog.unknown}; in progress {d.currentBacklog.inProgress}.</p><button onClick={download}>Export delivery counts CSV</button>{d.requestsTruncated && <p>Latest50 requests shown. Counts include all requests in this date cohort.</p>}{d.requests.map((r: any) => <p key={r.requestKey}><code>{r.requestKey}</code> · {EVIDENCE_LABELS[r.evidence.state as keyof typeof EVIDENCE_LABELS]} <button onClick={() => setSelected(r.requestKey)}>Inspect request {r.requestKey}</button></p>)}{selected && <MessageDispatchStatus key={selected} companyId={companyId} requestKey={selected}/>}<p>Delivery is not a sale or revenue outcome. This report cannot resend messages.</p></>}</section>;
};
