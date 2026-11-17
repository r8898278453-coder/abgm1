import {CriticalAlertPanel} from './CriticalAlertPanel';
import {NotificationPolicyPanel} from './NotificationPolicyPanel';
import {validateNotificationPage} from '../../shared/notificationEvidence';
import { formatPlatformDateTime } from '../../shared/platformTime';
import React, { useEffect, useRef, useState } from 'react';
import { ApiRequestError, apiRequest } from '../services/authService';
interface Occurrence { kind: string; dueAt: string; status: string; needsReview: boolean; policyVersion?:string|null; providerId?:string|null; reasonCode?:string|null }
interface Result { available: boolean; occurrences: Occurrence[]; nextCursor: string | null }
/** Client changes discard prior history even when the parent preserves this component. */
export const NotificationStatus: React.FC<{ companyId: string }> = props => <ClientNotificationStatus key={props.companyId} {...props}/>;
const ClientNotificationStatus: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  async function load(before?: string) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const response = await apiRequest<Result>(`/api/companies/${encodeURIComponent(companyId)}/notification-status?limit=25${before ? `&before=${encodeURIComponent(before)}` : ''}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      validateNotificationPage(response,companyId);
      setResult(previous => ({ ...response, occurrences: before ? [...(previous?.occurrences || []), ...response.occurrences] : response.occurrences }));
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiRequestError && [401,403,404].includes(cause.status)) setResult(null);
      setError('Notification status is unavailable. Refresh to retry.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }
  useEffect(() => { void load(); return () => request.current?.abort(); }, [companyId]);
  return <section aria-label="Scheduled notification delivery" className="bg-white border border-slate-200 rounded-3xl p-6 mt-6 space-y-4">
    <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Scheduled notification delivery</h2>
      <button type="button" disabled={loading} onClick={() => void load()} className="text-sm font-semibold text-indigo-600 disabled:opacity-50">Refresh notifications</button></div>
    <NotificationPolicyPanel companyId={companyId}/>
    <CriticalAlertPanel companyId={companyId}/>
    <p className="text-sm text-slate-500">Daily digest, review-reminder and critical-alert delivery attempts, newest scheduled cutoff first. Sent means the Telegram API accepted the message; recipient delivery and read status are not confirmed. Manual test alerts are not listed.</p>
    {loading && <p role="status">Loading notification status…</p>}
    {error && <p role="alert" className="text-red-700 text-sm">{error}{result && ' Previously loaded results are shown.'}</p>}
    {!loading && !error && result?.occurrences.length === 0 && <p className="text-sm text-slate-500">No scheduled delivery attempts recorded. Missing configuration or paused delivery may prevent an attempt.</p>}
    {!!result?.occurrences.length && <ul className="divide-y divide-slate-100">{result.occurrences.map(row => <li key={`${row.dueAt}:${row.kind}`} className="py-3 text-sm space-y-1">
      <strong>{row.kind === 'daily_digest' ? 'Daily digest' : row.kind === 'critical_alert' ? 'Critical alert' : 'Review reminder'} · {row.status === 'SENT' ? 'Sent' : row.status === 'UNKNOWN' ? 'Delivery uncertain' : row.needsReview ? 'Running — needs review' : 'Running'}</strong>
      <p>Scheduled cutoff: <time dateTime={row.dueAt}>{formatPlatformDateTime(row.dueAt)}</time></p>
      {row.policyVersion&&<p>Bound policy revision: {row.policyVersion}.</p>}{row.providerId&&<p>Telegram API message reference: {row.providerId}.</p>}{row.reasonCode&&<p>Recorded reason: {row.reasonCode}. A blocked preflight does not imply a provider send.</p>}
      {row.needsReview && <p className="text-amber-800">Check the destination chat before retrying. Delivery may have occurred; automatic resend is disabled.</p>}
    </li>)}</ul>}
    {result?.nextCursor && <button type="button" disabled={loading} onClick={() => void load(result.nextCursor!)} className="text-sm font-semibold text-indigo-600 disabled:opacity-50">Load older notifications</button>}
  </section>;
};
