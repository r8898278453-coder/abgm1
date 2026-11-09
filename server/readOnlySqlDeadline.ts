import type { Pool, PoolConnection } from 'mysql2/promise';
export class ReadOnlySqlTimeout extends Error {
  readonly code = 'READ_ONLY_SQL_TIMEOUT';
  constructor() { super('Read-only SQL deadline exceeded'); }
}
export interface ReadOnlySql { query(sql: string, values?: unknown[]): Promise<any> }

/** Owns a read-only connection: timed-out sockets are discarded, never returned to the pool. */
export async function withReadOnlySqlDeadline<T>(pool: Pool, read: (sql: ReadOnlySql) => Promise<T>, timeoutMs = 5000): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('INVALID_READ_ONLY_SQL_DEADLINE');
  let connection: PoolConnection | undefined;
  let expired = false, discarded = false;
  const timeoutError = new ReadOnlySqlTimeout();
  const discard = () => {
    if (discarded) return;
    discarded = true;
    try { connection?.destroy(); } catch { /* preserve the original safe failure */ }
  };
  let timer: ReturnType<typeof setTimeout>;
  const work = (async () => {
    const acquired = await pool.getConnection();
    // Pool acquisition can finish after the caller has timed out; never use that connection.
    if (expired) { acquired.release(); throw timeoutError; }
    connection = acquired;
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      if (expired) throw timeoutError;
      await connection.query('START TRANSACTION READ ONLY');
      const result = await read({ query: async (sql, values) => {
        if (expired) throw timeoutError;
        if (!/^\s*SELECT\b/i.test(sql) || sql.includes(';')) throw new Error('READ_ONLY_SQL_STATEMENT_REQUIRED');
        return acquired.query(sql,values);
      } });
      if (expired) throw timeoutError;
      await connection.commit();
      if (expired) throw timeoutError;
      return result;
    } catch (error) {
      if (!expired) {
        try { await acquired.rollback(); }
        catch { discard(); }
      }
      throw error;
    } finally {
      if (!expired && !discarded) acquired.release();
    }
  })();
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      expired = true;
      if (connection) discard();
      reject(timeoutError);
    }, timeoutMs);
  });
  try { return await Promise.race([work,deadline]); }
  finally { clearTimeout(timer!); }
}
