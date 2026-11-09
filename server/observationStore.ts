import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import type {DbRankObservation,DbCompetitorObservation} from './db';
export class ObservationError extends Error{constructor(public code:string,public status=400){super(code);}}
const fail=():never=>{throw new ObservationError('OBSERVATION_INVALID');};
const text=(value:unknown,max:number,required=false):string=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())return fail();return value;};
const optional=(value:unknown,max:number)=>value==null?null:text(value,max);
const number=(value:unknown,min:number,max:number,integer=false):number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max&&(!integer||Number.isInteger(value))?value:fail();
const nullable=(value:unknown,min:number,max:number,integer=false)=>value==null?null:number(value,min,max,integer);
const scope=(value:unknown)=>text(value,64,true);
export function observationTime(value:unknown):string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.test(value))return fail();
 const [year,month,day]=value.slice(0,10).split('-').map(Number),calendar=new Date(Date.UTC(year,month-1,day));
 if(calendar.getUTCFullYear()!==year||calendar.getUTCMonth()!==month-1||calendar.getUTCDate()!==day||Number(value.slice(11,13))>23)return fail();
 const ms=Date.parse(value);if(!Number.isFinite(ms))return fail();return new Date(Math.floor(ms/1000)*1000).toISOString();
}
const timeRow=(row:any)=>new Date(Number(row.stamp_ms)).toISOString();
const nullNumber=(value:any)=>value==null?null:Number(value);
export const rankRow=(row:any):DbRankObservation=>({id:row.id,company_id:row.company_id,keyword:row.keyword,latitude:Number(row.latitude),longitude:Number(row.longitude),grid_index:Number(row.grid_index),grid_label:row.grid_label,timestamp:timeRow(row),provider:row.provider,position:nullNumber(row.position),status:row.status,source_evidence:row.source_evidence,top_competitors_json:row.top_competitors_json});
export const competitorRow=(row:any):DbCompetitorObservation=>({id:row.id,company_id:row.company_id,competitor_id:row.competitor_id,name:row.name,place_id:row.place_id,address:row.address,rating:nullNumber(row.rating),reviews_count:nullNumber(row.reviews_count),photos_count:nullNumber(row.photos_count),posts_per_week:nullNumber(row.posts_per_week),rank_position:nullNumber(row.rank_position),provider:row.provider,timestamp:timeRow(row),status:row.status,raw_payload:row.raw_payload});
export function normalizeRanks(source:unknown,company?:string,keyword?:string):DbRankObservation[]{
 if(!Array.isArray(source)||source.length>100)return fail();if(!source.length)return [];
 const owner=scope(company??source[0]?.company_id??source[0]?.companyId),key=keyword===undefined?undefined:text(keyword.trim(),191,true),now=new Date().toISOString();
 const records=source.map((row:any)=>{
  if(!row||row.company_id!==undefined&&row.company_id!==owner||row.companyId!==undefined&&row.companyId!==owner)return fail();
  if(key!==undefined&&row.keyword!==undefined&&(typeof row.keyword!=='string'||row.keyword.trim().toLowerCase()!==key.toLowerCase()))return fail();
  const provider=row.provider==null?'unknown':text(row.provider,64,true);let status=row.status??'UNAVAILABLE';if(!['LIVE','VERIFIED','UNAVAILABLE','FAILED'].includes(status))return fail();
  if(provider==='unknown')status='UNAVAILABLE';if(['LIVE','VERIFIED'].includes(status)&&!row.timestamp)return fail();
  const position=nullable(row.position,1,2147483647,true);
  const top=row.top_competitors_json??(row.topCompetitors==null?null:JSON.stringify(row.topCompetitors));
  return {id:row.id==null?'obs_'+crypto.randomUUID().replaceAll('-',''):scope(row.id),company_id:owner,keyword:key??text(row.keyword?.trim(),191,true),latitude:Number(number(row.latitude??row.lat,-90,90).toFixed(7)),longitude:Number(number(row.longitude??row.lng,-180,180).toFixed(7)),grid_index:number(row.grid_index??row.gridIndex,0,8,true),grid_label:optional(row.grid_label??row.gridLabel,128),timestamp:observationTime(row.timestamp??now),provider,position:['LIVE','VERIFIED'].includes(status)?position:null,status,source_evidence:optional(row.source_evidence??row.sourceEvidence,4096),top_competitors_json:optional(top,262144)} as DbRankObservation;
 });
 if(new Set(records.map(row=>row.id)).size!==records.length||new Set(records.map(row=>JSON.stringify([row.keyword,row.grid_index,row.timestamp]))).size!==records.length||Buffer.byteLength(JSON.stringify(records))>2*1024*1024)return fail();return records;
}
export function normalizeCompetitor(row:DbCompetitorObservation):DbCompetitorObservation{
 if(!row||!['LIVE','VERIFIED','USER_ENTERED','UNAVAILABLE','ESTIMATED'].includes(row.status))return fail();
 return {id:scope(row.id),company_id:scope(row.company_id),competitor_id:scope(row.competitor_id),name:text(row.name,255,true),place_id:optional(row.place_id,128),address:optional(row.address,512),rating:row.rating==null?null:Number(number(row.rating,0,5).toFixed(2)),reviews_count:nullable(row.reviews_count,0,2147483647,true),photos_count:nullable(row.photos_count,0,2147483647,true),posts_per_week:row.posts_per_week==null?null:Number(number(row.posts_per_week,0,99.99).toFixed(2)),rank_position:nullable(row.rank_position,1,2147483647,true),provider:text(row.provider,64,true),timestamp:observationTime(row.timestamp),status:row.status,raw_payload:optional(row.raw_payload,262144)};
}
export function observationLimit(value:number){return number(value,1,500,true);}
const comparable=(row:Record<string,any>,fields:string[])=>JSON.stringify(fields.map(key=>row[key]??null));
const rankFields=['id','company_id','keyword','latitude','longitude','grid_index','grid_label','timestamp','provider','position','status','source_evidence','top_competitors_json'];
const competitorFields=['id','company_id','competitor_id','name','place_id','address','rating','reviews_count','photos_count','posts_per_week','rank_position','provider','timestamp','status','raw_payload'];
export async function saveRanksSql(pool:Pool,records:DbRankObservation[]){
 if(!records.length)return;if(records.length>100||records.some(row=>row.company_id!==records[0].company_id))return fail();const conn=await pool.getConnection();try{
  await conn.beginTransaction();const [owner]:any=await conn.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[records[0].company_id]);if(owner.length!==1)throw new ObservationError('OBSERVATION_WORKSPACE_NOT_FOUND',404);
  const [existing]:any=await conn.query('SELECT *,UNIX_TIMESTAMP(timestamp)*1000 stamp_ms FROM rank_observations WHERE id IN (?) FOR UPDATE',[records.map(row=>row.id)]);const byId=new Map(existing.map((row:any)=>[row.id,rankRow(row)]));
  const fresh=records.filter(row=>{const old=byId.get(row.id) as any;if(!old)return true;if(comparable(old,rankFields)!==comparable(row,rankFields))throw new ObservationError('OBSERVATION_IDENTITY_CONFLICT',409);return false;});
  if(fresh.length){const tuples=fresh.map(()=>'(?,?,?,?,?,?,?,FROM_UNIXTIME(?),?,?,?,?,?)').join(',');const values=fresh.flatMap(row=>[row.id,row.company_id,row.keyword,row.latitude,row.longitude,row.grid_index,row.grid_label??null,Date.parse(row.timestamp)/1000,row.provider,row.position,row.status,row.source_evidence??null,row.top_competitors_json??null]);await conn.query('INSERT INTO rank_observations(id,company_id,keyword,latitude,longitude,grid_index,grid_label,timestamp,provider,position,status,source_evidence,top_competitors_json) VALUES '+tuples,values);}
  await conn.commit();
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
export async function saveCompetitorSql(pool:Pool,row:DbCompetitorObservation){
 const conn=await pool.getConnection();try{
  await conn.beginTransaction();const [owner]:any=await conn.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[row.company_id]);if(owner.length!==1)throw new ObservationError('OBSERVATION_WORKSPACE_NOT_FOUND',404);
  const [existing]:any=await conn.query('SELECT *,UNIX_TIMESTAMP(timestamp)*1000 stamp_ms FROM competitor_observations WHERE id=? FOR UPDATE',[row.id]);
  if(existing.length){if(comparable(competitorRow(existing[0]),competitorFields)!==comparable(row,competitorFields))throw new ObservationError('OBSERVATION_IDENTITY_CONFLICT',409);await conn.commit();return;}
  await conn.query('INSERT INTO competitor_observations(id,company_id,competitor_id,name,place_id,address,rating,reviews_count,photos_count,posts_per_week,rank_position,provider,timestamp,status,raw_payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,FROM_UNIXTIME(?),?,?)',[row.id,row.company_id,row.competitor_id,row.name,row.place_id??null,row.address??null,row.rating,row.reviews_count,row.photos_count,row.posts_per_week,row.rank_position,row.provider,Date.parse(row.timestamp)/1000,row.status,row.raw_payload??null]);await conn.commit();
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
export async function readRanksSql(pool:Pool,company:string,keyword?:string,limit?:number){
 scope(company);if(keyword!==undefined)text(keyword,191,true);if(limit!==undefined)observationLimit(limit);
 return withReadOnlySqlDeadline(pool,async sql=>{
  const query=limit!==undefined?'SELECT ro.*,UNIX_TIMESTAMP(ro.timestamp)*1000 stamp_ms FROM rank_observations ro WHERE ro.company_id=? AND ro.keyword=? ORDER BY ro.timestamp DESC,ro.grid_index,ro.id DESC LIMIT ?':keyword!==undefined?'SELECT ro.*,UNIX_TIMESTAMP(ro.timestamp)*1000 stamp_ms FROM rank_observations ro WHERE ro.company_id=? AND ro.keyword=? AND ro.timestamp=(SELECT MAX(timestamp) FROM rank_observations WHERE company_id=? AND keyword=?) ORDER BY ro.grid_index,ro.id DESC':'SELECT ro.*,UNIX_TIMESTAMP(ro.timestamp)*1000 stamp_ms FROM rank_observations ro JOIN (SELECT keyword,MAX(timestamp) stamp FROM rank_observations WHERE company_id=? GROUP BY keyword) latest ON latest.keyword=ro.keyword AND latest.stamp=ro.timestamp WHERE ro.company_id=? ORDER BY ro.keyword,ro.grid_index,ro.id DESC';
  const [rows]:any=await sql.query(query,limit!==undefined?[company,keyword,limit]:keyword!==undefined?[company,keyword,company,keyword]:[company,company]);const mapped=rows.map(rankRow);if(limit!==undefined)return mapped;
  const unique=new Map<string,DbRankObservation>();for(const row of mapped){const key=JSON.stringify([row.keyword,row.grid_index]);if(!unique.has(key))unique.set(key,row);}return [...unique.values()];
 });
}
export async function readCompetitorsSql(pool:Pool,company:string,competitor?:string,limit=50){
 scope(company);if(competitor!==undefined)scope(competitor);observationLimit(limit);
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [rows]:any=await sql.query(competitor!==undefined?'SELECT co.*,UNIX_TIMESTAMP(co.timestamp)*1000 stamp_ms FROM competitor_observations co WHERE co.company_id=? AND co.competitor_id=? ORDER BY co.timestamp DESC,co.id DESC LIMIT ?':'SELECT co.*,UNIX_TIMESTAMP(co.timestamp)*1000 stamp_ms FROM competitor_observations co JOIN (SELECT competitor_id,MAX(timestamp) stamp FROM competitor_observations WHERE company_id=? GROUP BY competitor_id) latest ON latest.competitor_id=co.competitor_id AND latest.stamp=co.timestamp WHERE co.company_id=? ORDER BY co.competitor_id,co.id DESC',competitor!==undefined?[company,competitor,limit]:[company,company]);const mapped=rows.map(competitorRow);if(competitor!==undefined)return mapped;
  const unique=new Map<string,DbCompetitorObservation>();for(const row of mapped)if(!unique.has(row.competitor_id))unique.set(row.competitor_id,row);return [...unique.values()];
 });
}
export async function rankTrendSql(pool:Pool,company:string,keyword:string,current:number|null){
 scope(company);text(keyword,191,true);if(current!==null)number(current,1,2147483647,true);
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [times]:any=await sql.query('SELECT DISTINCT UNIX_TIMESTAMP(timestamp)*1000 stamp_ms FROM rank_observations WHERE company_id=? AND keyword=? ORDER BY stamp_ms DESC LIMIT 5',[company,keyword]);
  const empty={previousRank:null,diff:null,historyCount:times.length};if(times.length<2)return empty;
  const [rows]:any=await sql.query('SELECT *,UNIX_TIMESTAMP(timestamp)*1000 stamp_ms FROM rank_observations WHERE company_id=? AND keyword=? AND grid_index=4 AND timestamp IN (FROM_UNIXTIME(?),FROM_UNIXTIME(?)) ORDER BY timestamp DESC,id DESC',[company,keyword,Number(times[0].stamp_ms)/1000,Number(times[1].stamp_ms)/1000]);
  const latest=rows.find((row:any)=>Number(row.stamp_ms)===Number(times[0].stamp_ms)),previous=rows.find((row:any)=>Number(row.stamp_ms)===Number(times[1].stamp_ms));
  if(!latest||!previous||![latest,previous].every(row=>['LIVE','VERIFIED'].includes(row.status))||latest.provider!==previous.provider||Number(latest.latitude)!==Number(previous.latitude)||Number(latest.longitude)!==Number(previous.longitude)||nullNumber(latest.position)!==current)return empty;
  const previousRank=nullNumber(previous.position);return {previousRank,diff:previousRank!==null&&current!==null?previousRank-current:null,historyCount:times.length};
 });
}
