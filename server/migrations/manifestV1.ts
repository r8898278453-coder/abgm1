import {createHash} from 'node:crypto';
import type {Connection,Pool,PoolConnection} from 'mysql2/promise';
import {MANIFEST_V1_SOURCE_HASH} from './identities';

export type SqlMigrationPlan={
 name:string;
 preflight?:readonly {sql:string;code:string}[];
 statements:readonly string[];
};
export type ManifestMigration={readonly name:string;readonly up:(db:Connection|Pool)=>Promise<void>};
const checksums=new WeakMap<object,string>();

/** Immutable v1 executor. New semantics require a new version/file. SQL is reviewed repository code, never uploaded input. */
export function defineSqlMigration(plan:SqlMigrationPlan):ManifestMigration{
 if(!plan||typeof plan.name!=='string'||!/^\d{3}_[a-z][a-z0-9_]*$/.test(plan.name)||
  Number(plan.name.slice(0,3))<30||plan.name.length>255||
  !Array.isArray(plan.statements)||!plan.statements.length||plan.statements.length>256||
  plan.preflight!==undefined&&(!Array.isArray(plan.preflight)||plan.preflight.length>256)||
  Object.keys(plan).some(key=>!['name','preflight','statements'].includes(key))){
  throw new Error('MIGRATION_MANIFEST_INVALID');
 }
 const sql=(value:unknown)=>{
  if(typeof value!=='string'||!value.trim()||value.length>1024*1024||value.includes('\0'))throw new Error('MIGRATION_MANIFEST_INVALID');
  return value;
 };
 const preflight=Object.freeze(Array.from(plan.preflight??[],step=>{
  if(!step||Object.keys(step).some(key=>!['sql','code'].includes(key))||
   !/^MIGRATION_[A-Z0-9_]+$/.test(step.code)||typeof step.sql!=='string'||!/^SELECT\s/i.test(step.sql.trim())){
   throw new Error('MIGRATION_PREFLIGHT_INVALID');
  }
  return Object.freeze({sql:sql(step.sql),code:step.code});
 }));
 const statements=Object.freeze(Array.from(plan.statements,sql));
 const name=plan.name;
 // Ordered arrays define canonical bytes independently of key order, Function.toString and compiler transforms.
 const bytes=JSON.stringify(['abgm-sql-manifest-v1',MANIFEST_V1_SOURCE_HASH,name,preflight.map(step=>[step.sql,step.code]),statements]);
 const checksum=createHash('sha256').update(bytes).digest('hex');
 const migration=Object.freeze({name,up:Object.freeze(async(db:Connection|Pool)=>{
  const connection=typeof (db as Pool).getConnection==='function'?await (db as Pool).getConnection():db;
  try{
   // Preflights finish before the statements list. No returned row values enter diagnostics.
   for(const step of preflight){
    const [rows]=await connection.query(step.sql);
    if(!Array.isArray(rows)||rows.length)throw new Error(step.code);
   }
   for(const statement of statements)await connection.query(statement);
  }finally{
   if(connection!==db)(connection as PoolConnection).release();
  }
 })});
 checksums.set(migration,checksum);
 return migration;
}
export function sqlMigrationChecksum(migration:object):string|undefined{return checksums.get(migration);}
