import type { Pool } from 'mysql2/promise';
export interface UnconfirmedPublishingEvidence { company_id: string; attempt_count: number; status: string }
export async function findUnconfirmedPublishingEvidence(pool: Pool, postId: string, platform: string): Promise<UnconfirmedPublishingEvidence | null> {
  const [rows]: any = await pool.query(`SELECT company_id, attempt_count, status FROM publishing_records
    WHERE post_id = ? AND platform = ? AND status IN ('UNKNOWN','RETRYING') ORDER BY created_at DESC, id DESC LIMIT 1`, [postId,platform]);
  return rows[0] || null;
}
