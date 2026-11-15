import React, { useEffect, useRef, useState } from 'react';
import { apiRequest, getStoredToken } from '../services/authService';
import { EVIDENCE_STATES, evidenceGuidance, type MessageEvidence } from '../../shared/messageEvidence';
const time = (v: number) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
export const ReceiptEvidencePanel: React.FC<{
    companyId: string;
    requestKey: string;
}> = props => <Evidence key={props.companyId + ':' + props.requestKey} {...props}/>;
const Evidence: React.FC<{
    companyId: string;
    requestKey: string;
}> = ({ companyId, requestKey }) => {
    const [data, setData] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const active = useRef<AbortController | null>(null);
    useEffect(() => () => active.current?.abort(), []);
    const load = async () => {
        active.current?.abort();
        const controller = new AbortController();
        active.current = controller;
        const token = getStoredToken();
        setData(null);
        setError('');
        setBusy(true);
        const current = () => !controller.signal.aborted && getStoredToken() === token;
        try {
            const r = await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/message-dispatch/${requestKey}/receipts`, { signal: controller.signal });
            if (!current())
                return;
            const d = r.receiptEvidence;
            if (!r.success || r.companyId !== companyId || d?.readOnly !== true || !EVIDENCE_STATES.includes(d.evidence?.state) || !Array.isArray(d.receipts) || d.receipts.length > 20 || typeof d.truncated !== 'boolean' || !Number.isSafeInteger(d.receiptCount) || d.receiptCount < d.receipts.length || !Number.isSafeInteger(d.checkedAtMs) || !d.receipts.every((v: any) => ['sent', 'delivered', 'read', 'failed'].includes(v.status) && [v.occurredAtMs, v.receivedAtMs].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 8640000000000000) && (v.errorCode === null || Number.isInteger(v.errorCode) && v.errorCode >= 0 && v.errorCode <= 4294967295)))
                throw new Error();
            setData({ value: d, token });
        }
        catch {
            if (current())
                setError('Receipt evidence unavailable. No delivery conclusion can be drawn.');
        }
        finally {
            if (current())
                setBusy(false);
        }
    };
    const d = data?.token === getStoredToken() ? data.value : null;
    return <section aria-label="Receipt evidence"><button disabled={busy} onClick={() => void load()}>Inspect receipt evidence</button>{error && <p role="alert">{error}</p>}{d && <><p>{evidenceGuidance(d.evidence.state as MessageEvidence)}</p><p>Checked {time(d.checkedAtMs)}. Recorded events: {d.receiptCount}.</p>{d.receipts.length === 0 && <p>No matching receipt events observed.</p>}{d.receipts.map((r: any, i: number) => <p key={i}>{r.status} · Provider time {time(r.occurredAtMs)} · Recorded {time(r.receivedAtMs)}{r.errorCode !== null ? ` · Error code ${r.errorCode}` : ''}</p>)}{d.truncated && <p>Showing the latest20 recorded events; summary uses all matching events.</p>}<p>Read only. Receipt absence does not authorize a resend.</p></>}</section>;
};
