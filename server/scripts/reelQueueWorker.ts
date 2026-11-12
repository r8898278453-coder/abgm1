import path from 'node:path';
import fs from 'node:fs/promises';
import {getDbPool} from '../db';
import {verifySchema} from '../migrator';
import {claimSqlJob} from '../queueSql';
import {executeJob} from '../jobQueueService';
async function main(){
let pool:Awaited<ReturnType<typeof getDbPool>>=null;
try{
 if(process.env.ENABLE_REEL_RENDERING!=='true'||process.platform!=='linux'||!process.env.REEL_BROWSER_EXECUTABLE||!path.isAbsolute(process.env.REEL_BROWSER_EXECUTABLE))throw new Error('REEL_WORKER_NOT_ENABLED');
 await fs.access(process.env.REEL_BROWSER_EXECUTABLE);await fs.access(path.join(process.cwd(),'dist','reel-worker.cjs'));
 pool=await getDbPool();if(!pool||(await verifySchema(pool)).status!=='READY')throw new Error('REEL_SCHEMA_NOT_READY');
 const job=await claimSqlJob(pool,'reel-cli-'+process.pid,['reel_render']);const result=job?await executeJob(job):null;
 console.log(JSON.stringify({worker:'reels',processed:job?1:0,status:result?.status||'IDLE',jobId:job?.id||null}));if(result?.status==='FAILED')process.exitCode=1;
}catch{console.log(JSON.stringify({worker:'reels',status:'UNAVAILABLE',message:'Verify explicit enablement, Linux browser/worker capability and canonical schema before retrying.'}));process.exitCode=1;}
finally{if(pool)await pool.end();}

}
void main();
