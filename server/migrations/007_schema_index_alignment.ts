import type { Connection, Pool } from 'mysql2/promise';

// Forward repair only. Existing migration definitions and ledger checksums stay intact.
export async function alignSchemaIndexes(db: Connection | Pool): Promise<void> {
  // Keep migration behavior self-contained so its source checksum covers this logic.
  const hasIndex = (rows: any[], table: string, column: string, unique = false) => {
    const groups = new Map<string, any[]>();
    for (const row of rows.filter(r => r.TABLE_NAME === table)) {
      groups.set(row.INDEX_NAME, [...(groups.get(row.INDEX_NAME) || []), row]);
    }
    return [...groups.values()].some(group => {
      const ordered = [...group].sort((a, b) => a.SEQ_IN_INDEX - b.SEQ_IN_INDEX);
      return ordered[0]?.COLUMN_NAME === column && ordered[0]?.SUB_PART == null &&
        (!unique || (ordered.length === 1 && Number(ordered[0].NON_UNIQUE) === 0));
    });
  };
  const [metadata]: any = await db.query(`SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE, SUB_PART
    FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE()`);
  const rows = metadata as any[];
  const needsDomainKey = !hasIndex(rows, 'custom_domains', 'domain', true);
  if (needsDomainKey) {
    const [duplicates]: any = await db.query('SELECT domain FROM custom_domains GROUP BY domain HAVING COUNT(*) > 1 LIMIT 1');
    if (duplicates.length) throw new Error('DOMAIN_OWNERSHIP_CONFLICT: Resolve duplicate domain ownership before migration');
  }
  if (!hasIndex(rows, 'reviews', 'source')) {
    await db.query('ALTER TABLE reviews ADD INDEX idx_rev_source (source)');
  }
  if (needsDomainKey) {
    await db.query('ALTER TABLE custom_domains ADD UNIQUE KEY idx_custom_domains_domain (domain)');
  }
}
