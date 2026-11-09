import type {Connection,Pool} from 'mysql2/promise';
export async function addQueuePauseDeferrals(db:Connection|Pool):Promise<void>{
 const [columns]:any=await db.query("SHOW COLUMNS FROM job_queue LIKE 'deferrals'");
 if(!columns.length)await db.query('ALTER TABLE job_queue ADD COLUMN deferrals INT UNSIGNED NOT NULL DEFAULT 0');
}
