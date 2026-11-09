import type { Pool } from 'mysql2/promise';
import type { DbContentPost } from './db';
type Post = Pick<DbContentPost, 'id' | 'company_id' | 'status' | 'scheduled_date' | 'scheduled_time' | 'time_slot' | 'workflow_revision'>;

/** Two-level sliding rotation. Only the priority client advances its first post, so unstarted secondary candidates retain their next turn. */
export async function selectScheduledPostBatch(pool: Pool, companyLimit = 2, postLimit = 5): Promise<Post[]> {
  if (!Number.isInteger(companyLimit) || companyLimit < 1 || companyLimit > 5 || !Number.isInteger(postLimit) || postLimit < 1 || postLimit > 20) throw new Error('INVALID_POST_BATCH');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    async function cursor(key: string): Promise<string | null> {
      await connection.query(`INSERT INTO scheduled_post_dispatch_cursors (cursor_key) VALUES (?) ON DUPLICATE KEY UPDATE cursor_key = VALUES(cursor_key)`, [key]);
      const [rows]: any = await connection.query('SELECT last_id FROM scheduled_post_dispatch_cursors WHERE cursor_key = ? FOR UPDATE', [key]);
      return rows[0].last_id;
    }
    const lastCompany = await cursor('companies');
    const eligible = `c.autopilot_enabled = 1 AND EXISTS (SELECT 1 FROM content_posts p WHERE p.company_id = c.id AND p.status = 'scheduled')`;
    const [ahead]: any = await connection.query(`SELECT c.id FROM companies c WHERE ${eligible} ${lastCompany ? 'AND c.id > ?' : ''} ORDER BY c.id LIMIT ?`, lastCompany ? [lastCompany, companyLimit] : [companyLimit]);
    let companies: Array<{id: string}> = ahead;
    if (lastCompany && companies.length < companyLimit) {
      const [wrapped]: any = await connection.query(`SELECT c.id FROM companies c WHERE ${eligible} AND c.id <= ? ORDER BY c.id LIMIT ?`, [lastCompany, companyLimit - companies.length]);
      companies = [...companies, ...wrapped];
    }
    const posts: Post[] = [];
    for (const company of companies) {
      const key = `posts:${company.id}`;
      const lastPost = await cursor(key);
      const columns = 'id, company_id, status, scheduled_date, scheduled_time, time_slot, workflow_revision';
      const [next]: any = await connection.query(`SELECT ${columns} FROM content_posts WHERE company_id = ? AND status = 'scheduled' ${lastPost ? 'AND id > ?' : ''} ORDER BY id LIMIT ?`, lastPost ? [company.id, lastPost, postLimit] : [company.id, postLimit]);
      let selected: Post[] = next;
      if (lastPost && selected.length < postLimit) {
        const [wrapped]: any = await connection.query(`SELECT ${columns} FROM content_posts WHERE company_id = ? AND status = 'scheduled' AND id <= ? ORDER BY id LIMIT ?`, [company.id, lastPost, postLimit - selected.length]);
        selected = [...selected, ...wrapped];
      }
      if (selected.length && company.id===companies[0].id) await connection.query('UPDATE scheduled_post_dispatch_cursors SET last_id = ? WHERE cursor_key = ?', [selected[0].id, key]);
      posts.push(...selected);
    }
    if (companies.length) await connection.query("UPDATE scheduled_post_dispatch_cursors SET last_id = ? WHERE cursor_key = 'companies'", [companies[0].id]);
    await connection.commit();
    return posts;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
