import {hasEquivalentIndex} from '../schemaIndexes';
import type {Connection,Pool} from 'mysql2/promise';
export async function addDailyWorkReportIndexes(db:Connection|Pool):Promise<void>{
 for(const [table,name,columns] of [
  ['publication_workflow_audit','idx_workflow_day','company_id,recorded_at'],
  ['job_queue','idx_job_company_status','company_id,status'],
  ['content_posts','idx_post_company_status','company_id,status'],
  ['publishing_dispatch_claims','idx_claim_company_status','company_id,status'],
 ]){
  const [rows]:any=await db.query('SELECT TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,NON_UNIQUE,SUB_PART FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',[table]);
  if(!hasEquivalentIndex(rows,table,columns.split(',')))await db.query(`ALTER TABLE ${table} ADD INDEX ${name} (${columns})`);
 }
}
