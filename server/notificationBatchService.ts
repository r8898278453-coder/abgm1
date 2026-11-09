import { getDbPool } from './db';
import { selectNotificationCompanyBatch } from './notificationBatch';
import type { NotificationKind } from './notificationOccurrences';
export async function getNotificationCompanyBatch(kind: NotificationKind) {
  const pool = await getDbPool();
  return pool ? selectNotificationCompanyBatch(pool, kind) : [];
}
