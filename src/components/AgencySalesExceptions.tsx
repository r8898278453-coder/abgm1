import React, { useEffect, useRef, useState } from 'react';
import { apiRequest, getStoredToken } from '../services/authService';
import { EXCEPTION_KEYS, EXCEPTION_METRICS, validateAgencyOverview, agencyExceptionsCsv, type ExceptionMetric } from '../../shared/agencyExceptions';
export const AgencySalesExceptions: React.FC<{
    agencyId: string;
    onSelectClient?: (id: string) => void;
}> = props => <Exceptions key={props.agencyId} {...props}/>;
const Exceptions: React.FC<{
    agencyId: string;
    onSelectClient?: (id: string) => void;
}> = ({ agencyId, onSelectClient }) => {
    const [data, setData] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [search, setSearch] = useState(''), [filter, setFilter] = useState<ExceptionMetric | ''>('');
    const active = useRef<AbortController | null>(null);
    const load = async () => {
        active.current?.abort();
        const controller = new AbortController();
        active.current = controller;
        const token = getStoredToken();
        const current = () => !controller.signal.aborted && getStoredToken() === token;
        setData(null);
        setError('');
        setBusy(true);
        try {
            const r = await apiRequest<any>(`/api/agencies/${encodeURIComponent(agencyId)}/sales-overview`, { signal: controller.signal });
            if (!current())
                return;
            if (!r.success)
                throw new Error();
            const overview = validateAgencyOverview(r.overview, agencyId);
            setData({ overview, token });
        }
        catch {
            if (current())
                setError('Agency sales exceptions unavailable. Reload before drawing conclusions.');
        }
        finally {
            if (current())
                setBusy(false);
        }
    };
    useEffect(() => { void load(); return () => active.current?.abort(); }, []);
    const overview = data?.token === getStoredToken() ? data.overview : null;
    const clients = overview?.clients.filter((c: any) => c.companyId.toLowerCase().includes(search.toLowerCase().trim()) && (!filter || c.backlog[filter] > 0)) || [];
    const download = () => { if (!overview)
        return; try {
        const csv = agencyExceptionsCsv(overview, agencyId), url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agency-current-exceptions.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
    catch {
        setData(null);
        setError('Agency evidence export unavailable. Reload the overview.');
    } };
    return <section aria-label="Agency sales exceptions" className="border rounded-xl p-3 space-y-3"><h2>Agency sales exceptions</h2><button disabled={busy} onClick={() => void load()}>Reload agency exceptions</button>{error && <p role="alert">{error}</p>}{overview && <><p>{overview.definition}</p><p>Current snapshot checked {new Date(overview.checkedAtMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. Authorized clients: {overview.clients.length}.</p><p>Stale dispatch means IN_PROGRESS for at least30 minutes. It does not establish failure. Failed intake records may be expired or ineligible for replay. Retained failed captures span all dates; pending/reconciliation categories overlap. Actor permission checks are current, not proof that a scheduler runs.</p><label>Search exception client<input aria-label="Search exception client" value={search} onChange={e => setSearch(e.target.value)}/></label><label>Exception type<select aria-label="Exception type" value={filter} onChange={e => setFilter(e.target.value as ExceptionMetric | '')}><option value="">All clients</option>{EXCEPTION_KEYS.map(k => <option key={k} value={k}>{EXCEPTION_METRICS[k].label}</option>)}</select></label><button onClick={download}>Export authorized exception counts</button><p>Export includes all authorized clients in this snapshot; display filters do not change the export.</p>{!overview.clients.length && <p>No authorized clients in this snapshot.</p>}{overview.clients.length > 0 && !clients.length && <p>No clients match these display filters.</p>}{clients.map((c: any) => <article key={c.companyId} className="border p-2"><h3>{c.companyId} · {c.operationStatus}</h3><p>Review priority: {c.priorityScore}</p><ul>{EXCEPTION_KEYS.map(k => <li key={k}>{EXCEPTION_METRICS[k].label}: {c.backlog[k]} · weight {EXCEPTION_METRICS[k].weight}</li>)}</ul><button disabled={!onSelectClient} onClick={() => onSelectClient?.(c.companyId)}>Open client {c.companyId}</button></article>)}<p>No recovery, send, client-status or policy changes occur here. Provider connection health, capacity, costs and revenue are unavailable in this projection.</p></>}</section>;
};
