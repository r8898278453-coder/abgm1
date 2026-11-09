import {readPublicationQuota} from './publicationQuota';
import {PUBLICATION_CHANNELS,type ScopedPublicationControls} from '../shared/publicationControls';
export type {ScopedPublicationControls} from '../shared/publicationControls';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';
import {PublishingReviewError} from './publishingReview';
export const publicationChannels=PUBLICATION_CHANNELS;
export const scopedControlInput=z.object({expectedVersion:z.string().regex(/^(0|[1-9]\d{0,19})$/).refine(v=>BigInt(v)<=18446744073709551615n),paused:z.boolean(),channels:z.array(z.enum(publicationChannels)).max(5).refine(v=>new Set(v).size===v.length),dailyPostLimit:z.number().int().min(1).max(100000).nullable().optional()}).strict();
function decode(row:any):ScopedPublicationControls{
 if(!row)return {version:'0',paused:false,dailyPostLimit:null,channels:[],updatedBy:null,updatedAtMs:null};
 let channels:any;try{channels=typeof row.paused_channels==='string'?JSON.parse(row.paused_channels):row.paused_channels;}catch{throw new PublishingReviewError(503,'Stored publication controls unavailable');}
 if(!Array.isArray(channels)||channels.length>5||channels.some(v=>!publicationChannels.includes(v))||![0,1].includes(Number(row.paused)))throw new PublishingReviewError(503,'Stored publication controls unavailable');
 const dailyPostLimit=row.daily_post_limit===null?null:Number(row.daily_post_limit);if(dailyPostLimit!==null&&(!Number.isInteger(dailyPostLimit)||dailyPostLimit<1||dailyPostLimit>100000))throw new PublishingReviewError(503,'Stored admission limit unavailable');
 return {dailyPostLimit,version:String(row.version),paused:Number(row.paused)===1,channels:[...new Set<string>(channels)].sort(),updatedBy:row.updated_by || null,updatedAtMs:row.updated_ms===null?null:Number(row.updated_ms)};
}
const columns='daily_post_limit,paused,paused_channels,CAST(revision AS CHAR) AS version,updated_by,UNIX_TIMESTAMP(updated_at)*1000 AS updated_ms';
export async function readScopedPublicationControlsFromSql(sql:ReadOnlySql,company:string):Promise<ScopedPublicationControls>{
 const [companies]:any=await sql.query('SELECT id FROM companies WHERE id = ?',[company]);if(!companies.length)throw new PublishingReviewError(404,'Workspace not found');
 const [rows]:any=await sql.query(`SELECT ${columns} FROM publication_execution_controls WHERE company_id = ?`,[company]);return decode(rows[0]);
}
export async function readScopedPublicationControls(pool:Pool,company:string):Promise<ScopedPublicationControls>{return withReadOnlySqlDeadline(pool,async sql=>{const controls=await readScopedPublicationControlsFromSql(sql,company);return {...controls,quota:await readPublicationQuota(sql,company,controls.dailyPostLimit)};});}
export async function updateScopedPublicationControls(pool:Pool,company:string,actor:string,input:z.infer<typeof scopedControlInput>){
 const parsed=scopedControlInput.parse(input);if(!actor||actor.length>64)throw new PublishingReviewError(400,'Invalid actor');
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  const [companies]:any=await connection.query('SELECT id FROM companies WHERE id = ? FOR UPDATE',[company]);if(!companies.length)throw new PublishingReviewError(404,'Workspace not found');
  await connection.query("INSERT INTO publication_execution_controls (company_id,paused_channels) VALUES (?,'[]') ON DUPLICATE KEY UPDATE company_id = VALUES(company_id)",[company]);
  const [rows]:any=await connection.query(`SELECT ${columns} FROM publication_execution_controls WHERE company_id = ? FOR UPDATE`,[company]);const previous=decode(rows[0]);
  if(previous.version!==parsed.expectedVersion)throw new PublishingReviewError(409,'Publication controls changed. Reload before saving.');
  const dailyPostLimit=parsed.dailyPostLimit===undefined?previous.dailyPostLimit:parsed.dailyPostLimit;
  const channels=[...parsed.channels].sort(),version=(BigInt(previous.version)+1n).toString();
  await connection.query('UPDATE publication_execution_controls SET paused = ?,paused_channels = ?,daily_post_limit = ?,revision = ?,updated_by = ? WHERE company_id = ?',[parsed.paused,JSON.stringify(channels),dailyPostLimit,version,actor,company]);
  await connection.query('INSERT INTO publication_control_audit (id,company_id,revision,actor_id,before_state,after_state) VALUES (?,?,?,?,?,?)',[randomUUID(),company,version,actor,JSON.stringify({paused:previous.paused,channels:previous.channels,dailyPostLimit:previous.dailyPostLimit}),JSON.stringify({paused:parsed.paused,channels,dailyPostLimit})]);
  const [updated]:any=await connection.query(`SELECT ${columns} FROM publication_execution_controls WHERE company_id = ?`,[company]);
  const controls=decode(updated[0]);const quota=await readPublicationQuota(connection,company,controls.dailyPostLimit);
  await connection.commit();return {...controls,quota};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export function scopedPublicationBlock(controls:ScopedPublicationControls,platforms:string[]):import('./queueSql').PauseReason|null{
 if(controls.paused)return 'PUBLICATION_PAUSED';
 return platforms.some(platform=>controls.channels.includes(platform.trim().toLowerCase()))?'PUBLICATION_CHANNEL_PAUSED':null;
}
export async function checkScopedPublicationControls(pool:Pool,company:string,platforms:string[]){return scopedPublicationBlock(await readScopedPublicationControls(pool,company),platforms);}
