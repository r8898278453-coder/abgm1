import { getDbPool } from './db';
import { processActionOutbox, readActionFeed, validateActionFeedQuery } from './actionOutbox';

export async function processInternalActionFeed(canStart: () => boolean = () => true) {
  if (!canStart()) return { available: false, processed: 0, failed: 0 };
  const pool = await getDbPool();
  return pool ? processActionOutbox(pool, `action-feed-${process.pid}`, 25, canStart) : { available: false, processed: 0, failed: 0 };
}
export async function getCompanyActionFeed(companyId: string, after = '0', limit = 50) {
  validateActionFeedQuery(after, limit);
  const pool = await getDbPool();
  return pool ? readActionFeed(pool, companyId, after, limit) : { available: false, events: [], nextCursor: after, latestRevision: '0' };
}
