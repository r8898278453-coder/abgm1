import type { Pool } from 'mysql2/promise';
import type { DbCompany } from './db';
import type { NotificationKind } from './notificationOccurrences';

/** Sliding rotation advances the head only: an unstarted tail becomes priority next turn. Effect claims deduplicate overlapping candidates. */
export async function selectNotificationCompanyBatch(pool: Pool, kind: NotificationKind, limit = 2): Promise<DbCompany[]> {
  if (!['daily_digest','review_reminder'].includes(kind) || !Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('INVALID_NOTIFICATION_BATCH');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`INSERT INTO notification_dispatch_cursors (notification_kind) VALUES (?)
      ON DUPLICATE KEY UPDATE notification_kind = VALUES(notification_kind)`, [kind]);
    const [cursor]: any = await connection.query('SELECT last_company_id FROM notification_dispatch_cursors WHERE notification_kind = ? FOR UPDATE', [kind]);
    const last = cursor[0].last_company_id;
    const eligible = `EXISTS (SELECT 1 FROM company_integrations i WHERE i.company_id = c.id AND i.provider = 'telegram_bot' AND i.status = 'connected')`;
    const [ahead]: any = await connection.query(`SELECT c.* FROM companies c WHERE ${eligible} ${last ? 'AND c.id > ?' : ''} ORDER BY c.id LIMIT ?`, last ? [last, limit] : [limit]);
    let companies: DbCompany[] = ahead;
    if (last && companies.length < limit) {
      const [wrapped]: any = await connection.query(`SELECT c.* FROM companies c WHERE ${eligible} AND c.id <= ? ORDER BY c.id LIMIT ?`, [last, limit - companies.length]);
      companies = [...companies, ...wrapped];
    }
    if (companies.length) await connection.query('UPDATE notification_dispatch_cursors SET last_company_id = ? WHERE notification_kind = ?', [companies[0].id, kind]);
    await connection.commit();
    return companies;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
