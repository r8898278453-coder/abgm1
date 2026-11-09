import type {Connection,Pool} from 'mysql2/promise';
/** Additive compatibility for the observed pre-canonical export. Never infer approval or provider provenance. */
export async function repairLegacyExport(db:Connection|Pool){
 const [metadata]:any=await db.query("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('autonomous_actions','reviews')");
 // Preflight every obsolete required field before any DDL. Preserve custom types rather than narrowing them.
 const obsolete:Record<string,string>={type:'varchar(64)',title:'varchar(255)',description:'text'};
 for(const [name,type] of Object.entries(obsolete)){
  const column=metadata.find((r:any)=>r.TABLE_NAME==='autonomous_actions'&&r.COLUMN_NAME===name);
  if(column&&column.IS_NULLABLE==='NO'&&String(column.COLUMN_TYPE).toLowerCase()!==type)throw new Error('LEGACY_ACTION_COLUMN_SHAPE: Manual compatibility review required');
 }
 const additions:Record<string,Record<string,string>>={
  autonomous_actions:{recommendation_id:'VARCHAR(64) DEFAULT NULL',payload:'LONGTEXT DEFAULT NULL',source_evidence:'LONGTEXT DEFAULT NULL',approval_status:"VARCHAR(32) NOT NULL DEFAULT 'pending_approval'",execution_state:"VARCHAR(32) NOT NULL DEFAULT 'idle'",provider_response:'LONGTEXT DEFAULT NULL',verification_state:"VARCHAR(32) NOT NULL DEFAULT 'unverified'",error:'TEXT DEFAULT NULL',executed_at:'VARCHAR(64) DEFAULT NULL'},
  reviews:{reply_status:'VARCHAR(32) DEFAULT NULL',external_review_id:'VARCHAR(128) DEFAULT NULL',retrieved_at:'VARCHAR(64) DEFAULT NULL',provenance_status:"VARCHAR(32) DEFAULT 'USER_ENTERED'"}
 };
 for(const [table,fields] of Object.entries(additions))for(const [name,definition] of Object.entries(fields)){
  if(!metadata.some((r:any)=>r.TABLE_NAME===table&&r.COLUMN_NAME===name))await db.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
 }
 // Older display-only fields cannot remain mandatory for new canonical inserts. Existing values are untouched.
 for(const [name,type] of Object.entries(obsolete)){
  const column=metadata.find((r:any)=>r.TABLE_NAME==='autonomous_actions'&&r.COLUMN_NAME===name);
  if(column?.IS_NULLABLE==='NO')await db.query(`ALTER TABLE autonomous_actions MODIFY COLUMN \`${name}\` ${type} NULL DEFAULT NULL`);
 }
 const [indexes]:any=await db.query('SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE()');
 const requirements:Record<string,Record<string,string>>={users:{idx_user_email:'email',idx_user_role:'role'},companies:{idx_company_user:'user_id',idx_company_city:'city'},leads:{idx_leads_stage:'stage'},reviews:{idx_rev_rating:'rating'},content_posts:{idx_cp_status:'status'},autonomous_actions:{idx_aa_company:'company_id',idx_aa_approval:'approval_status',idx_aa_execution:'execution_state'}};
 for(const [table,fields] of Object.entries(requirements))for(const [name,column] of Object.entries(fields)){
  if(indexes.some((r:any)=>r.TABLE_NAME===table&&Number(r.SEQ_IN_INDEX)===1&&r.COLUMN_NAME===column&&r.SUB_PART==null))continue;
  if(indexes.some((r:any)=>r.TABLE_NAME===table&&r.INDEX_NAME===name))throw new Error('LEGACY_INDEX_NAME_CONFLICT: Manual compatibility review required');
  await db.query(`ALTER TABLE ${table} ADD INDEX ${name} (${column})`);
 }
}
