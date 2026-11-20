import {defineSqlMigration} from './manifestV1';
const id='VARCHAR(64) NOT NULL',stamp='BIGINT UNSIGNED NOT NULL',hash='CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',state='VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
export const BOOKING_TABLES={
 sales_booking_evidence:{
  columns:{id,company_id:id,lead_id:id,actor_id:id,request_key:hash,input_hash:hash,revision:stamp,state,external_event_id:'VARCHAR(255) NOT NULL',start_at_ms:stamp,end_at_ms:stamp,confirmed_at_ms:stamp},
  indexes:{uq_booking_request:['company_id','request_key'],uq_booking_revision:['company_id','lead_id','revision']},
 },
} as const;
export const BOOKING_CHECKS=Object.entries(BOOKING_TABLES).flatMap(([table,{columns,indexes}])=>[
 {code:'MIGRATION_BOOKING_SHAPE',sql:`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}' AND(ENGINE<>'InnoDB' OR NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS s WHERE s.TABLE_SCHEMA=DATABASE() AND s.TABLE_NAME=t.TABLE_NAME AND s.INDEX_NAME='PRIMARY' GROUP BY s.INDEX_NAME HAVING GROUP_CONCAT(s.COLUMN_NAME ORDER BY s.SEQ_IN_INDEX)='id' AND MIN(s.NON_UNIQUE)=0 AND SUM(s.SUB_PART IS NOT NULL)=0) OR ${Object.entries(columns).map(([name,definition])=>{const match=definition.match(/^(VARCHAR|CHAR)\((\d+)\)/);return`NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='${name}' AND c.DATA_TYPE='${definition.split(/[ (]/)[0].toLowerCase()}' AND c.IS_NULLABLE='${definition.endsWith('NOT NULL')?'NO':'YES'}' ${match?`AND c.CHARACTER_MAXIMUM_LENGTH=${match[2]}`:''} ${definition.includes('ascii_bin')?"AND c.COLLATION_NAME='ascii_bin'":''} ${definition.includes('UNSIGNED')?"AND c.COLUMN_TYPE LIKE '%unsigned%'":''})`;}).join(' OR ')})`},
 {code:'MIGRATION_BOOKING_INDEX',sql:`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}' AND INDEX_NAME IN (${Object.keys(indexes).map(n=>"'"+n+"'").join(',')}) GROUP BY INDEX_NAME HAVING SUM(SUB_PART IS NOT NULL)<>0 OR ${Object.entries(indexes).map(([n,c])=>`(INDEX_NAME='${n}' AND(MIN(NON_UNIQUE)<>${n.startsWith('uq_')?0:1} OR GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'${c.join(',')}'))`).join(' OR ')}`}
]);
export const bookingEvidenceMigration=defineSqlMigration({name:'056_booking_evidence',preflight:BOOKING_CHECKS,statements:Object.entries(BOOKING_TABLES).flatMap(([table,{columns,indexes}])=>[
 `CREATE TABLE IF NOT EXISTS ${table}(${Object.entries(columns).map(([n,d])=>n+' '+d).join(',')},PRIMARY KEY(id),${Object.entries(indexes).map(([n,c])=>`${n.startsWith('uq_')?'UNIQUE ':''}KEY ${n}(${c.join(',')})`).join(',')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
 ...Object.entries(indexes).map(([n,c])=>`CREATE ${n.startsWith('uq_')?'UNIQUE ':''}INDEX IF NOT EXISTS ${n} ON ${table}(${c.join(',')})`)
])});
