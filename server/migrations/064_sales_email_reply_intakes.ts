import {defineSqlMigration} from './manifestV1';

export const EMAIL_REPLY_INTAKE_TABLE='sales_email_reply_intakes';
const hash='CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
export const EMAIL_REPLY_INTAKE_COLUMNS={
 id:hash,
 company_id:'VARCHAR(64) NOT NULL',
 input_hash:hash,
 secret_hash:hash,
 payload_cipher:'TEXT NULL',
 reason:'VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL',
 state:'VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
 claim_token:'CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL',
 attempts:'TINYINT UNSIGNED NOT NULL',
 due_at_ms:'BIGINT UNSIGNED NOT NULL',
 expires_at_ms:'BIGINT UNSIGNED NOT NULL',
 admitted_at_ms:'BIGINT UNSIGNED NOT NULL',
 settled_at_ms:'BIGINT UNSIGNED NULL',
} as const;
const primary=['id'];
export const EMAIL_REPLY_INTAKE_INDEXES={
 idx_email_intake_due:['state','due_at_ms','id'],
 idx_email_intake_expiry:['expires_at_ms','id'],
 idx_email_intake_client:['company_id','state','id'],
 idx_email_intake_admission:['company_id','admitted_at_ms','id'],
 idx_email_intake_settlement:['company_id','settled_at_ms'],
} as const;
export const EMAIL_REPLY_INTAKE_CHECKS=[{
 code:'MIGRATION_EMAIL_REPLY_INTAKE_COLUMNS',
 sql:`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${EMAIL_REPLY_INTAKE_TABLE}'
  AND (ENGINE<>'InnoDB' OR ${Object.entries(EMAIL_REPLY_INTAKE_COLUMNS).map(([name,definition])=>{
   const width=definition.match(/\((\d+)\)/)?.[1];
   return `NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE()
    AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='${name}' AND c.DATA_TYPE='${definition.split(/[ (]/)[0].toLowerCase()}'
    AND c.IS_NULLABLE='${definition.endsWith('NOT NULL')?'NO':'YES'}' ${width?`AND c.CHARACTER_MAXIMUM_LENGTH=${width}`:''}
    ${definition.includes('ascii_bin')?"AND c.COLLATION_NAME='ascii_bin'":''}
    ${definition.includes('UNSIGNED')?"AND c.COLUMN_TYPE LIKE '%unsigned%'":''})`;
  }).join(' OR ')})`,
},{
 code:'MIGRATION_EMAIL_REPLY_INTAKE_INDEXES',
 sql:`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${EMAIL_REPLY_INTAKE_TABLE}'
  AND INDEX_NAME IN (${['PRIMARY',...Object.keys(EMAIL_REPLY_INTAKE_INDEXES)].map(name=>"'"+name+"'").join(',')})
  GROUP BY INDEX_NAME HAVING SUM(SUB_PART IS NOT NULL)<>0 OR
  ${Object.entries({PRIMARY:primary,...EMAIL_REPLY_INTAKE_INDEXES}).map(([name,columns])=>
   `(INDEX_NAME='${name}' AND (MIN(NON_UNIQUE)<>${name==='PRIMARY'?0:1} OR GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'${columns.join(',')}'))`).join(' OR ')}`,
}];
export const salesEmailReplyIntakes=defineSqlMigration({
 name:'064_sales_email_reply_intakes',preflight:EMAIL_REPLY_INTAKE_CHECKS,
 statements:[
  `CREATE TABLE IF NOT EXISTS ${EMAIL_REPLY_INTAKE_TABLE} (
   ${Object.entries(EMAIL_REPLY_INTAKE_COLUMNS).map(([name,type])=>name+' '+type).join(',')},
   PRIMARY KEY(${primary.join(',')}),${Object.entries(EMAIL_REPLY_INTAKE_INDEXES).map(([name,columns])=>`KEY ${name}(${columns.join(',')})`).join(',')}
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ...Object.entries(EMAIL_REPLY_INTAKE_INDEXES).map(([name,columns])=>`CREATE INDEX IF NOT EXISTS ${name} ON ${EMAIL_REPLY_INTAKE_TABLE}(${columns.join(',')})`),
 ],
});
