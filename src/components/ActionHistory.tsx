import { formatPlatformDateTime } from '../../shared/platformTime';
import React, { useEffect, useRef, useState } from 'react';
import { ApiRequestError, apiRequest } from '../services/authService';

interface ActionEvent {
  id: string; revision: string; job_id: string; job_type: string;
  event_type: string; job_status: string; reason_code: string | null;
  attempt: number; recorded_at: string;
}
interface Feed { available: boolean; events: ActionEvent[]; nextCursor: string; latestRevision: string }
const labels: Record<string, string> = {
  JOB_QUEUED: 'Queued', JOB_CLAIMED: 'Started', JOB_SUCCEEDED: 'Completed',
  JOB_ATTEMPTS_EXHAUSTED: 'Failed', JOB_FAILED: 'Failed', JOB_RETRY_SCHEDULED: 'Retry scheduled', JOB_CANCELLED: 'Cancelled',
};
const jobs: Record<string, string> = { publishing: 'Content publishing', seo_scan: 'SEO scan', competitor_scan: 'Competitor scan', ai_summary: 'AI summary', lead_nurture: 'Lead follow-up' };

/** Mounted with a user/company key: no history survives a workspace or session change. */
export const ActionHistory: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  async function load(after = '0') {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError('');
    try {
      const result = await apiRequest<Feed>(`/api/companies/${encodeURIComponent(companyId)}/job-actions?after=${after}&limit=50`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!result.available || !Array.isArray(result.events) || !/^\d{1,20}$/.test(result.nextCursor) || !/^\d{1,20}$/.test(result.latestRevision)) throw new Error('Invalid feed');
      setFeed(previous => ({ ...result, events: after === '0' ? result.events : [...(previous?.events || []), ...result.events] }));
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiRequestError && [401, 403, 404].includes(cause.status)) setFeed(null);
      setError(cause instanceof ApiRequestError && cause.status === 503 ? 'Action history is temporarily unavailable.' : 'Could not update action history. Please retry.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }
  useEffect(() => { void load(); return () => request.current?.abort(); }, [companyId]);
  const hasMore = feed && BigInt(feed.nextCursor) < BigInt(feed.latestRevision);
  return <section aria-label="Automation action history" className="bg-white border border-slate-200 rounded-3xl p-6 mt-6 space-y-4">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold text-slate-900">Automation action history</h2>
      <button type="button" disabled={loading} onClick={() => void load()} className="text-sm font-semibold text-indigo-600 disabled:opacity-50">Refresh history</button>
    </div>
    <p className="text-sm text-slate-500">Recorded job transitions, oldest first. Updates appear after scheduler processing. This history covers recorded jobs; it is not a complete daily business report.</p>
    {loading && <p role="status">Loading action history…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}{feed && ' Previously loaded history is shown below.'}</p>}
    {!loading && !error && feed?.events.length === 0 && <p className="text-sm text-slate-500">No processed action history yet. This does not confirm that no work is pending.</p>}
    {!!feed?.events.length && <ol className="divide-y divide-slate-100">
      {feed.events.map(event => <li key={event.id} className="py-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{jobs[event.job_type] || 'Automation job'} · {event.job_status === 'RETRY_WAIT' ? 'Retry scheduled' : (labels[event.event_type] || event.job_status.replaceAll('_', ' '))}</strong>
          <time dateTime={event.recorded_at}>{formatPlatformDateTime(event.recorded_at)}</time></div>
        <p className="text-slate-500 break-all">Job {event.job_id} · Claim {event.attempt}{event.reason_code === 'ATTEMPTS_EXHAUSTED' ? ' · Retry limit reached' : event.reason_code === 'RETRY_SCHEDULED' ? ' · Another attempt is scheduled' : event.event_type==='JOB_DEFERRED' ? ` · Paused: ${{GLOBAL_EMERGENCY_STOP:'global stop',CLIENT_AUTOPILOT_PAUSED:'client autopilot',CLIENT_HOLIDAY_PAUSED:'holiday pause',EXECUTION_CONTROLS_UNAVAILABLE:'controls unavailable',PUBLICATION_PAUSED:'publishing pause',PUBLICATION_CHANNEL_PAUSED:'channel pause',PUBLICATION_QUOTA_EXHAUSTED:'daily publication limit'}[event.reason_code || ''] || 'execution paused'}; retry scheduled` : ''}</p>
      </li>)}
    </ol>}
    {hasMore && <button type="button" disabled={loading} onClick={() => void load(feed!.nextCursor)} className="text-sm font-semibold text-indigo-600 disabled:opacity-50">Load more history</button>}
  </section>;
}
