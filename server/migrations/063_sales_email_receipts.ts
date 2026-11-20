import {defineSqlMigration} from './manifestV1';

export const EMAIL_RECEIPT_TABLE='sales_email_receipts';
const hash='CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
export const EMAIL_RECEIPT_COLUMNS={
 company_id:'VARCHAR(64) NOT NULL',
 event_hash:hash,
 input_hash:hash,
 dispatch_key:hash,
 contact_hash:hash,
 event_type:'VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
 occurred_at_ms:'BIGINT UNSIGNED NOT NULL',
 suppresses:'TINYINT UNSIGNED NOT NULL',
} as const;
const primary=['company_id','event_hash'];
export const EMAIL_RECEIPT_INDEXES={
 idx_email_receipt_dispatch:['company_id','dispatch_key','occurred_at_ms'],
 idx_email_receipt_day:['company_id','occurred_at_ms'],
 idx_email_receipt_suppression:['company_id','contact_hash','suppresses'],
} as const;
export const EMAIL_RECEIPT_CHECKS=[{
 code:'MIGRATION_EMAIL_RECEIPT_COLUMNS',
 sql:`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${EMAIL_RECEIPT_TABLE}'
  AND (ENGINE<>'InnoDB' OR ${Object.entries(EMAIL_RECEIPT_COLUMNS).map(([name,definition])=>{
   const width=definition.match(/\((\d+)\)/)?.[1];
   return `NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE()
    AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='${name}' AND c.DATA_TYPE='${definition.split(/[ (]/)[0].toLowerCase()}'
    AND c.IS_NULLABLE='NO' ${width?`AND c.CHARACTER_MAXIMUM_LENGTH=${width}`:''}
    ${definition.includes('ascii_bin')?"AND c.COLLATION_NAME='ascii_bin'":''}
    ${definition.includes('UNSIGNED')?"AND c.COLUMN_TYPE LIKE '%unsigned%'":''})`;
  }).join(' OR ')})`,
},{
 code:'MIGRATION_EMAIL_RECEIPT_INDEXES',
 sql:`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${EMAIL_RECEIPT_TABLE}'
  AND INDEX_NAME IN (${['PRIMARY',...Object.keys(EMAIL_RECEIPT_INDEXES)].map(name=>"'"+name+"'").join(',')})
  GROUP BY INDEX_NAME HAVING SUM(SUB_PART IS NOT NULL)<>0 OR
  ${Object.entries({PRIMARY:primary,...EMAIL_RECEIPT_INDEXES}).map(([name,columns])=>
   `(INDEX_NAME='${name}' AND (MIN(NON_UNIQUE)<>${name==='PRIMARY'?0:1} OR GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'${columns.join(',')}'))`).join(' OR ')}`,
}];
export const salesEmailReceipts=defineSqlMigration({
 name:'063_sales_email_receipts',preflight:EMAIL_RECEIPT_CHECKS,
 statements:[
  `CREATE TABLE IF NOT EXISTS ${EMAIL_RECEIPT_TABLE} (
   ${Object.entries(EMAIL_RECEIPT_COLUMNS).map(([name,type])=>name+' '+type).join(',')},
   PRIMARY KEY(${primary.join(',')}),${Object.entries(EMAIL_RECEIPT_INDEXES).map(([name,columns])=>`KEY ${name}(${columns.join(',')})`).join(',')}
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ...Object.entries(EMAIL_RECEIPT_INDEXES).map(([name,columns])=>`CREATE INDEX IF NOT EXISTS ${name} ON ${EMAIL_RECEIPT_TABLE}(${columns.join(',')})`),
 ],
});
