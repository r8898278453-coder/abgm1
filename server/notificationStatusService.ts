import { getDbPool } from './db';
import { readNotificationStatus, type NotificationCursor } from './notificationStatus';
export async function getCompanyNotificationStatus(company: string, before: NotificationCursor | null, limit: number) {
  const pool = await getDbPool();
  return pool ? readNotificationStatus(pool, company, before, limit) : { available: false, occurrences: [], nextCursor: null };
}
