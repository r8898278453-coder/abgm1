import type {Connection,Pool} from 'mysql2/promise';
export async function addPublicationScheduleHistory(db:Connection|Pool):Promise<void>{
 const [rows]:any=await db.query('SHOW COLUMNS FROM publication_workflow_audit');
 const columns=new Set(rows.map((row:any)=>row.Field));
 if(!columns.has('change_kind'))await db.query("ALTER TABLE publication_workflow_audit ADD COLUMN change_kind VARCHAR(32) NOT NULL DEFAULT 'STATUS'");
 if(!columns.has('schedule_before'))await db.query('ALTER TABLE publication_workflow_audit ADD COLUMN schedule_before JSON DEFAULT NULL');
 if(!columns.has('schedule_after'))await db.query('ALTER TABLE publication_workflow_audit ADD COLUMN schedule_after JSON DEFAULT NULL');
 if(!columns.has('audit_sequence'))await db.query('ALTER TABLE publication_workflow_audit ADD COLUMN audit_sequence BIGINT UNSIGNED DEFAULT NULL');
 const [sequenceColumns]:any=await db.query("SHOW COLUMNS FROM publication_workflow_audit LIKE 'audit_sequence'");
 if(!String(sequenceColumns[0]?.Extra || '').includes('auto_increment')){
  // Migration runs before the new application is served; historical timestamps are retained.
  await db.query(`UPDATE publication_workflow_audit a JOIN
    (SELECT id,ROW_NUMBER() OVER (ORDER BY recorded_at,id) AS ordinal FROM publication_workflow_audit) ordered_rows
    ON ordered_rows.id = a.id SET a.audit_sequence = ordered_rows.ordinal`);
  const [unique]:any=await db.query("SHOW INDEX FROM publication_workflow_audit WHERE Key_name = 'uq_workflow_sequence'");
  if(!unique.length)await db.query('ALTER TABLE publication_workflow_audit ADD UNIQUE KEY uq_workflow_sequence (audit_sequence)');
  await db.query('ALTER TABLE publication_workflow_audit MODIFY audit_sequence BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
 }
 const [indexes]:any=await db.query("SHOW INDEX FROM publication_workflow_audit WHERE Key_name = 'idx_workflow_sequence'");
 if(!indexes.length)await db.query('ALTER TABLE publication_workflow_audit ADD INDEX idx_workflow_sequence (company_id,post_id,audit_sequence)');
}
