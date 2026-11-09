import {randomUUID} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {DISPATCHER_STAGES,DISPATCHER_STAGE_STATES,DISPATCHER_TICK_STATES,dispatcherCursor,parseDispatcherStages,type DispatcherStage,type DispatcherStageState} from '../shared/dispatcher';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
export interface DispatcherClaim{slot:string;token:string;firstGroup:number}
/** A minute slot coalesces internal/external overlap; effect ownership remains with each action adapter. */
export async function claimDispatcherTick(pool:Pool):Promise<DispatcherClaim|null>{
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  await connection.query("INSERT INTO dispatcher_state(cursor_key) VALUES ('universal') ON DUPLICATE KEY UPDATE cursor_key=VALUES(cursor_key)");
  const [state]:any=await connection.query("SELECT next_group FROM dispatcher_state WHERE cursor_key='universal' FOR UPDATE");
  const firstGroup=Number(state[0]?.next_group);if(!Number.isInteger(firstGroup)||firstGroup<0||firstGroup>3)throw new Error('Dispatcher state unavailable');
  const [clock]:any=await connection.query('SELECT CAST(FLOOR(UNIX_TIMESTAMP()/60) AS CHAR) AS slot');
  const slot=dispatcherCursor(clock[0]?.slot);if(!slot)throw new Error('Dispatcher clock unavailable');
  await connection.query("UPDATE dispatcher_ticks SET status='UNKNOWN' WHERE status='RUNNING' AND started_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE) LIMIT 100");
  const [existing]:any=await connection.query('SELECT slot_key FROM dispatcher_ticks WHERE slot_key=?',[slot]);
  if(existing.length){await connection.commit();return null;}
  const token=randomUUID();
  await connection.query("INSERT INTO dispatcher_ticks(slot_key,owner_token,first_group,status,stage_states) VALUES (?,?,?,'RUNNING','{}')",[slot,token,firstGroup]);
  await connection.query("UPDATE dispatcher_state SET next_group=? WHERE cursor_key='universal'",[(firstGroup+1)%4]);
  await connection.commit();return {slot,token,firstGroup};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
export async function checkpointDispatcherStage(pool:Pool,claim:DispatcherClaim,stage:DispatcherStage,state:DispatcherStageState){
 if(!DISPATCHER_STAGES.includes(stage)||!DISPATCHER_STAGE_STATES.includes(state))throw new Error('Invalid dispatcher checkpoint');
 const [result]:any=await pool.query("UPDATE dispatcher_ticks SET stage_states=JSON_SET(stage_states,?,?) WHERE slot_key=? AND owner_token=? AND status='RUNNING'",[`$.${stage}`,state,claim.slot,claim.token]);
 if(result.affectedRows!==1)throw new Error('Dispatcher checkpoint unconfirmed');
}
export async function settleDispatcherTick(pool:Pool,claim:DispatcherClaim,partial:boolean){
 const [result]:any=await pool.query("UPDATE dispatcher_ticks SET status=?,finished_at=NOW() WHERE slot_key=? AND owner_token=? AND status='RUNNING'",[partial?'PARTIAL':'COMPLETED',claim.slot,claim.token]);
 if(result.affectedRows!==1)throw new Error('Dispatcher settlement unconfirmed');
}
export async function readDispatcherHistory(pool:Pool,before:string|null,limit=20){
 if(before!==null)dispatcherCursor(before);if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Invalid history limit');
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [rows]:any=await sql.query(`SELECT CAST(slot_key AS CHAR) AS slot,first_group,status,stage_states,UNIX_TIMESTAMP(started_at)*1000 AS startedAtMs,UNIX_TIMESTAMP(finished_at)*1000 AS finishedAtMs FROM dispatcher_ticks ${before?'WHERE slot_key<?':''} ORDER BY slot_key DESC LIMIT ?`,before?[before,limit+1]:[limit+1]);
  const history=rows.slice(0,limit).map((row:any)=>{if(!DISPATCHER_TICK_STATES.includes(row.status)||!dispatcherCursor(row.slot)||!Number.isInteger(Number(row.first_group))||Number(row.first_group)<0||Number(row.first_group)>3||row.startedAtMs===null||!Number.isFinite(Number(row.startedAtMs)))throw new Error('Invalid dispatcher state');return {slot:row.slot,firstGroup:Number(row.first_group),status:row.status,stages:parseDispatcherStages(row.stage_states),startedAtMs:Number(row.startedAtMs),finishedAtMs:row.finishedAtMs===null?null:Number(row.finishedAtMs)};});
  return {history,nextBefore:rows.length>limit?history.at(-1)!.slot:null};
 });
}
