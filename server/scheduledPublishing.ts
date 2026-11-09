import { createHash } from 'node:crypto';
import type { DbContentPost, enqueueJob } from './db';
import { isScheduledTimePassed } from './scheduleTime';

type ScheduledPost = Pick<DbContentPost, 'id' | 'company_id' | 'scheduled_date' | 'scheduled_time' | 'time_slot' | 'status' | 'workflow_revision'>;
export function scheduledPostKey(post: ScheduledPost): string {
  const fields=[post.company_id,post.id,post.scheduled_date ?? null,post.scheduled_time ?? null,post.time_slot ?? null];
  const revision=String(post.workflow_revision || 0);
  if(revision==='0')return 'scheduled-post-v1:'+createHash('sha256').update(JSON.stringify(fields)).digest('hex');
  return 'scheduled-post-v2:'+createHash('sha256').update(JSON.stringify([...fields,revision])).digest('hex');
}
export async function admitScheduledPosts(deps: {
  getScheduledPosts: () => Promise<ScheduledPost[]>;
  getCompanyById: (id: string) => Promise<{ autopilot_enabled?: boolean | number } | null>;
  enqueueJob: typeof enqueueJob;
  isStopped: () => boolean;
  canStart?: () => boolean;
}) {
  const result = { processed: 0, admitted: 0, skipped: 0, failed: 0 };
  if (deps.isStopped() || deps.canStart?.() === false) return result;
  const posts = await deps.getScheduledPosts();
  for (const post of posts) {
    if (deps.isStopped() || deps.canStart?.() === false) break;
    result.processed++;
    if (post.status !== 'scheduled' || !post.company_id || !isScheduledTimePassed(post.scheduled_date, post.scheduled_time, post.time_slot)) { result.skipped++; continue; }
    try {
      const company = await deps.getCompanyById(post.company_id);
      if (!company?.autopilot_enabled) { result.skipped++; continue; }
      if (deps.canStart?.() === false) break;
      const occurrenceKey = scheduledPostKey(post);
      await deps.enqueueJob({ company_id: post.company_id, job_type: 'publishing',
        payload: { postId: post.id, scheduleOccurrence: occurrenceKey }, idempotency_key: occurrenceKey });
      // Includes existing idempotent admissions; this is not a published-post counter.
      result.admitted++;
    } catch { result.failed++; }
  }
  return result;
}
