import { getDbPool } from './db';
import { selectScheduledPostBatch } from './scheduledPostBatch';
export async function getScheduledPostBatch() {
  const pool = await getDbPool();
  return pool ? selectScheduledPostBatch(pool) : [];
}
