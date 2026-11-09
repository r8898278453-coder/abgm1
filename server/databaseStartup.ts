/** Startup is read-only. Operators run db:setup/db:migrate/admin:create explicitly. */
export async function inspectDatabaseStartup(deps:{production:boolean;getDbPool:()=>Promise<any>;verifySchema:(pool:any)=>Promise<{status:string;schemaVersion?:number}>}){
 let pool:any;
 try{pool=await deps.getDbPool();}catch{throw new Error('DATABASE_STARTUP_UNAVAILABLE');}
 if(!pool){if(deps.production)throw new Error('DATABASE_STARTUP_UNAVAILABLE');return {status:'DEVELOPMENT_MEMORY',schemaVersion:0};}
 let report:{status:string;schemaVersion?:number};
 try{report=await deps.verifySchema(pool);}catch{throw new Error('DATABASE_SCHEMA_CHECK_UNAVAILABLE');}
 if(report.status!=='READY'){
  if(deps.production)throw new Error('DATABASE_SCHEMA_NOT_READY: run approved database migration/setup before starting this build');
  return {status:'SCHEMA_NOT_READY',schemaVersion:0};
 }
 return {status:'READY',schemaVersion:report.schemaVersion??0};
}
