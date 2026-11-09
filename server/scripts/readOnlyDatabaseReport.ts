import type {Pool} from 'mysql2/promise';
import type {VerificationResult} from '../migrator';
const states=new Set(['READY','MIGRATION_REQUIRED','DATABASE_SCHEMA_OUTDATED','UNAVAILABLE']);
const note='Schema evidence only. Runtime, providers, cron, backups and production release readiness are not established.';
/** Both operational readers share the runtime verifier. No separate presence-only readiness algorithm. */
export async function readOnlyDatabaseReport(getPool:()=>Promise<Pool|null>,verify:(pool:Pool)=>Promise<VerificationResult>){
 let pool:Pool|null=null;
 try{
  pool=await getPool();if(!pool)throw new Error('DATABASE_UNAVAILABLE');const report=await verify(pool);
  for(const flag of ['connection','migrationTable','requiredTables','requiredIndexes'] as const)if(!['PASS','FAIL'].includes(report[flag]))throw new Error('INVALID_REPORT');
  if(!states.has(report.status))throw new Error('INVALID_REPORT');
  for(const key of ['appliedMigrations','pendingMigrations','schemaVersion'] as const)if(!Number.isSafeInteger(report[key])||report[key]<0)throw new Error('INVALID_REPORT');
  const safe:Record<string,unknown>={connection:report.connection,engine:typeof report.engine==='string'&&/^[a-z0-9 ._()+-]{1,100}$/i.test(report.engine)?report.engine:'Unknown',migrationTable:report.migrationTable,appliedMigrations:report.appliedMigrations,pendingMigrations:report.pendingMigrations,requiredTables:report.requiredTables,requiredIndexes:report.requiredIndexes,schemaVersion:report.schemaVersion,status:report.status,note};
  for(const key of ['missingTables','missingColumns','missingIndexes','missingConstraints'] as const){
   const values=report[key];if(values){if(!Array.isArray(values)||values.some(value=>typeof value!=='string'||! /^[a-z0-9_]+(?:\.[a-z0-9_]+)?$/i.test(value)))throw new Error('INVALID_REPORT');safe[key]=values;}
  }
  if(report.error)safe.code=report.error.match(/^[A-Z][A-Z0-9_]*(?=:|$)/)?.[0]||'DATABASE_INSPECTION_UNAVAILABLE';
  // READY requires the verifier's complete affirmative contract; contradictory reports cannot return success.
  if(report.status==='READY'&&(report.connection!=='PASS'||report.migrationTable!=='PASS'||report.requiredTables!=='PASS'||report.requiredIndexes!=='PASS'||report.pendingMigrations!==0||['missingTables','missingColumns','missingIndexes','missingConstraints'].some(key=>(safe[key] as any[])?.length)))throw new Error('INVALID_REPORT');
  return {exitCode:report.status==='READY'?0:1,report:safe};
 }catch{return {exitCode:1,report:{connection:'FAIL',status:'UNAVAILABLE',code:'DATABASE_INSPECTION_UNAVAILABLE',note}};}
 finally{try{await pool?.end();}catch{}}
}
