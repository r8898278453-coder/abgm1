import { ensureCalendarOAuth } from './calendarOAuth';
import crypto from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import type { Express, Request } from 'express';
import { CALENDAR_API, calendarHash, calendarProviderJson, calendarReconciliationEnabled, googleCalendarEventUrl, googleCalendarRequest, readBookingCalendarBinding } from './bookingCalendar';
import { withReadOnlySqlDeadline, type ReadOnlySql } from './readOnlySqlDeadline';
import { agencyAudit } from './agencyRoutes';
import { isGlobalEmergencyStopActive } from './executionStop';
import { SalesError, salesHash, withSalesLock } from './salesWorkspace';

const callbackPath = '/api/webhooks/google-calendar';
const lifetimeMs = 86400000;
const cooldownMs = 300000;
const resourcePattern = /^[A-Za-z0-9_.~+=/-]{1,255}$/;
const tokenPattern = /^[a-f0-9]{64}$/;
const channelPattern = /^[a-f0-9]{32}$/;
const pushEnabled = () => process.env.ENABLE_CALENDAR_PUSH === 'true' && calendarReconciliationEnabled();
function publicAddress() {
  try {
    const url = new URL(process.env.PUBLIC_APP_URL || '');
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) {
      return new URL(callbackPath,url).href;
    }
  } catch { /* A valid configured site origin is required. */ }
  return null;
}
const currentTimeSql = 'UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000';
const matchesToken = (saved: string, token: string) =>
  tokenPattern.test(saved) && crypto.timingSafeEqual(Buffer.from(saved,'hex'), Buffer.from(salesHash(token),'hex'));

function liveRenewalEnabled() {
  return pushEnabled() && process.env.ENABLE_CALENDAR_PUSH_RENEWAL==='true';
}

export async function readCalendarPushStatus(pool: Pool, company: string) {
  return withReadOnlySqlDeadline(pool, async sql => {
    const [[clock]] = await sql.query(`SELECT ${currentTimeSql} nowMs`);
    const now=Number(clock.nowMs);
    const [channels]=await sql.query('SELECT state,expires_at_ms,requested_at_ms FROM calendar_push_channels WHERE company_id=?',[company]);
    const [watches]=await sql.query("SELECT state,expires_at_ms,requested_at_ms FROM calendar_push_jobs WHERE company_id=? AND kind='WATCH' ORDER BY requested_at_ms DESC LIMIT 1",[company]);
    const [stops]=await sql.query("SELECT state,expires_at_ms FROM calendar_push_jobs WHERE company_id=? AND kind='STOP' ORDER BY requested_at_ms DESC LIMIT 1",[company]);
    const channel=channels[0], watch=watches[0], stop=stops[0];
    const pendingWatch=watch?.state==='PENDING'&&Number(watch.expires_at_ms)>now;
    const pending=pendingWatch||channel?.state==='PENDING'&&Number(channel.expires_at_ms)>now;
    const active=channel?.state==='ACTIVE'&&Number(channel.expires_at_ms)>now;
    const state=active?'ACTIVE':pending?'PENDING':channel?.state==='DISABLED'||watch?.state==='CANCELLED'?'DISABLED':
      channel||watch?'EXPIRED':'NOT_CONFIGURED';
    const expiresAtMs=active?Number(channel.expires_at_ms):pendingWatch?Number(watch.expires_at_ms):pending?Number(channel.expires_at_ms):null;
    return {state,expiresAtMs,enabled:pushEnabled(),originReady:Boolean(publicAddress()),
      automaticRenewal:liveRenewalEnabled(),renewalPending:active&&pending,
      stopState:stop&&(stop.state==='STOPPED'||Number(stop.expires_at_ms)>now)?stop.state:null,
      canRegister:!pending&&now-Math.max(Number(channel?.requested_at_ms||0),Number(watch?.requested_at_ms||0))>=cooldownMs&&
        (!active||Number(channel.expires_at_ms)-now<=3600000)};
  });
}

async function queueCalendarStop(sql: ReadOnlySql, company: string, actor: string, channel: any) {
  if (!channel?.resource_id || channel.state!=='ACTIVE') return;
  await sql.query(`INSERT IGNORE INTO calendar_push_jobs
    (channel_id,kind,company_id,manager_id,calendar_hash,resource_id,state,requested_at_ms,expires_at_ms)
    SELECT ?,'STOP',?,?,?,?,'READY',${currentTimeSql},? WHERE ?>${currentTimeSql}`,
    [channel.channel_id,company,actor,channel.calendar_hash,channel.resource_id,channel.expires_at_ms,channel.expires_at_ms]);
}

export async function registerCalendarPushChannel(
  pool: Pool, user: {id:string}, company: string, transport: typeof fetch = fetch, renewingChannel?: string,
) {
  const address = publicAddress();
  const allowed = () => pushEnabled() && (!renewingChannel || liveRenewalEnabled()) && !isGlobalEmergencyStopActive();
  if (!allowed() || !address) throw new SalesError(409, 'CALENDAR_PUSH_UNAVAILABLE');
  const id=crypto.randomBytes(16).toString('hex');
  const token=crypto.randomBytes(32).toString('hex');
  await ensureCalendarOAuth(pool,user.id,company,undefined,transport);
  const reservation=await withSalesLock(pool,user,company,'manage',async(sql,canonical)=>{
    if(canonical!==company)throw new SalesError(404,'CLIENT_NOT_FOUND');
    const connection=await readBookingCalendarBinding(sql,user.id,company);
    const [[clock]]=await sql.query(`SELECT ${currentTimeSql} nowMs`) as any;
    const now=Number(clock.nowMs);
    const [rows]=await sql.query('SELECT * FROM calendar_push_channels WHERE company_id=?',[company]) as any;
    const [requests]=await sql.query("SELECT state,requested_at_ms,expires_at_ms FROM calendar_push_jobs WHERE company_id=? AND kind='WATCH' ORDER BY requested_at_ms DESC LIMIT 1",[company]) as any;
    const current=rows[0], last=requests[0];
    const scope=calendarHash(connection.binding.calendarId);
    if(renewingChannel&&(current?.channel_id!==renewingChannel||current.state!=='ACTIVE'||current.manager_id!==user.id||
        current.calendar_hash!==scope))throw new SalesError(409,'CALENDAR_PUSH_BINDING_CHANGED');
    if(now-Math.max(Number(current?.requested_at_ms||0),Number(last?.requested_at_ms||0))<cooldownMs||
       last?.state==='PENDING'&&Number(last.expires_at_ms)>now||
       current?.state==='PENDING'&&Number(current.expires_at_ms)>now||
       current?.state==='ACTIVE'&&Number(current.expires_at_ms)>now+3600000) {
      throw new SalesError(409,'CALENDAR_PUSH_ALREADY_REGISTERED');
    }
    await sql.query(`INSERT INTO calendar_push_jobs
      (channel_id,kind,company_id,manager_id,calendar_hash,token_hash,state,requested_at_ms,expires_at_ms)
      VALUES (?,'WATCH',?,?,?,?,'PENDING',?,?)`,[id,company,user.id,scope,salesHash(token),now,now+lifetimeMs+cooldownMs]);
    await agencyAudit(sql,company,user.id,'SALES_CALENDAR_PUSH_REQUESTED',{automatic:Boolean(renewingChannel)});
    return {connection,now,scope};
  });

  if(!allowed())throw new SalesError(409,'CALENDAR_PUSH_UNAVAILABLE');
  const url=new URL(googleCalendarEventUrl(reservation.connection.binding).href+'/watch');
  let watched;
  try{
    const request=googleCalendarRequest(reservation.connection.binding);
    watched=await calendarProviderJson(await transport(url,{
      ...request,method:'POST',headers:{...request.headers,'Content-Type':'application/json'},
      body:JSON.stringify({id,type:'web_hook',token,address,params:{ttl:String(lifetimeMs/1000)}}),
    }));
  }catch{
    throw new SalesError(503,'CALENDAR_PUSH_REGISTRATION_UNCONFIRMED');
  }
  const expiresAtMs=typeof watched?.expiration==='string'&&/^\d{1,15}$/.test(watched.expiration)?Number(watched.expiration):0;
  if(watched?.id!==id||!resourcePattern.test(typeof watched.resourceId==='string'?watched.resourceId:'')||
     expiresAtMs<=reservation.now||expiresAtMs>reservation.now+lifetimeMs+cooldownMs) {
    throw new SalesError(503,'CALENDAR_PUSH_REGISTRATION_UNCONFIRMED');
  }

  return withSalesLock(pool,user,company,'manage',async sql=>{
    const currentConnection=await readBookingCalendarBinding(sql,user.id,company);
    if(currentConnection.fingerprint!==reservation.connection.fingerprint||!allowed()) {
      throw new SalesError(409,'CALENDAR_PUSH_BINDING_CHANGED');
    }
    const [confirmed]:any=await sql.query(`UPDATE calendar_push_jobs SET state='CONFIRMED',token_hash=NULL
      WHERE company_id=? AND channel_id=? AND kind='WATCH' AND state='PENDING' AND ?>${currentTimeSql}`,
      [company,id,expiresAtMs]);
    if(confirmed.affectedRows!==1)throw new SalesError(409,'CALENDAR_PUSH_BINDING_CHANGED');
    const [rows]:any=await sql.query('SELECT * FROM calendar_push_channels WHERE company_id=?',[company]);
    const previous=rows[0];
    if(previous){
      await queueCalendarStop(sql,company,user.id,previous);
      await sql.query(`UPDATE calendar_push_channels SET channel_id=?,token_hash=?,calendar_hash=?,state='ACTIVE',
        resource_id=?,expires_at_ms=?,requested_at_ms=?,manager_id=?,last_message=0,last_wake_ms=0,renew_after_ms=0 WHERE company_id=?`,
        [id,salesHash(token),reservation.scope,watched.resourceId,expiresAtMs,reservation.now,user.id,company]);
    }else{
      await sql.query(`INSERT INTO calendar_push_channels
        (company_id,channel_id,token_hash,calendar_hash,state,resource_id,expires_at_ms,requested_at_ms,manager_id)
        VALUES (?,?,?,?,'ACTIVE',?,?,?,?)`,[company,id,salesHash(token),reservation.scope,watched.resourceId,expiresAtMs,reservation.now,user.id]);
    }
    await agencyAudit(sql,company,user.id,'SALES_CALENDAR_PUSH_ACTIVE',{expiresAtMs,automatic:Boolean(renewingChannel)});
    return {state:'ACTIVE',expiresAtMs};
  });
}

export async function disableCalendarPushChannel(pool:Pool,user:{id:string},company:string) {
  return withSalesLock(pool,user,company,'manage',async sql=>{
    const [rows]:any=await sql.query('SELECT * FROM calendar_push_channels WHERE company_id=?',[company]);
    await queueCalendarStop(sql,company,user.id,rows[0]);
    const [cancelled]:any=await sql.query("UPDATE calendar_push_jobs SET state='CANCELLED',token_hash=NULL WHERE company_id=? AND kind='WATCH' AND state='PENDING'",[company]);
    const [written]:any=await sql.query("UPDATE calendar_push_channels SET state='DISABLED' WHERE company_id=? AND state<>'DISABLED'",[company]);
    if(written.affectedRows||cancelled.affectedRows)await agencyAudit(sql,company,user.id,'SALES_CALENDAR_PUSH_DISABLED',{});
    return {state:'DISABLED'};
  });
}

function parseCalendarSignal(headers: Request['headers']) {
  const { 'x-goog-channel-id':id, 'x-goog-channel-token':token, 'x-goog-resource-id':resource,
    'x-goog-resource-state':state, 'x-goog-message-number':number } = headers;
  if (typeof id!=='string'||!channelPattern.test(id)||typeof token!=='string'||!tokenPattern.test(token)||
      typeof resource!=='string'||!resourcePattern.test(resource)||!['sync','exists','not_exists'].includes(String(state))||
      typeof state!=='string'||typeof number!=='string'||!(/^[1-9]\d{0,19}$/).test(number)||BigInt(number)>18446744073709551615n) return null;
  return {id,token,resource,state,number};
}

async function admitSignal(pool:Pool, signal:NonNullable<ReturnType<typeof parseCalendarSignal>>) {
  const sql = await pool.getConnection();
  try {
    await sql.beginTransaction();
    const [rows]:any = await sql.query(`SELECT company_id,calendar_hash,token_hash,state,resource_id,expires_at_ms,
      CAST(last_message AS CHAR) lastMessage,last_wake_ms,${currentTimeSql} nowMs
      FROM calendar_push_channels WHERE channel_id=? FOR UPDATE`,[signal.id]);
    const row=rows[0];
    if(!row&&signal.state==='sync'){
      const [pending]:any=await sql.query(`SELECT token_hash FROM calendar_push_jobs WHERE channel_id=?
        AND kind='WATCH' AND state='PENDING' AND expires_at_ms>${currentTimeSql}`,[signal.id]);
      await sql.commit();
      return Boolean(pending[0]&&matchesToken(pending[0].token_hash,signal.token));
    }
    if(!row||!matchesToken(row.token_hash,signal.token)||Number(row.expires_at_ms)<=Number(row.nowMs)||
       (row.state==='ACTIVE'?row.resource_id!==signal.resource:row.state!=='PENDING'||signal.state!=='sync')) {
      await sql.rollback();
      return false;
    }
    if(row.state==='ACTIVE'&&BigInt(signal.number)>BigInt(row.lastMessage)){
      const now=Number(row.nowMs);
      const wake=signal.state!=='sync'&&now-Number(row.last_wake_ms)>=60000&&!isGlobalEmergencyStopActive();
      if(wake){
        await sql.query(`UPDATE sales_calendar_intents i SET sync_due_ms=?
          WHERE i.company_id=? AND i.calendar_hash=? AND i.operation='CREATE' AND i.state='CONFIRMED'
            AND i.sync_due_ms>? AND i.sync_claim IS NULL AND i.sync_failures=0
            AND EXISTS(SELECT 1 FROM client_operations c WHERE c.company_id=i.company_id AND c.status='ACTIVE')
            AND EXISTS(SELECT 1 FROM sales_booking_evidence b WHERE b.company_id=i.company_id AND b.lead_id=i.lead_id
              AND b.external_event_id=i.external_event_id AND b.state='CONFIRMED' AND b.end_at_ms>?
              AND NOT EXISTS(SELECT 1 FROM sales_booking_evidence newer WHERE newer.company_id=b.company_id
                AND newer.lead_id=b.lead_id AND newer.revision>b.revision))
          ORDER BY i.sync_due_ms,i.id LIMIT 25`,[now,row.company_id,row.calendar_hash,now,now]);
      }
      await sql.query('UPDATE calendar_push_channels SET last_message=?,last_wake_ms=? WHERE channel_id=?',
        [signal.number,wake?now:row.last_wake_ms,signal.id]);
    }
    await sql.commit();
    return true;
  } catch(error) {
    await sql.rollback();
    throw error;
  } finally {
    sql.release();
  }
}

export function registerCalendarPushCallback(app:Express,poolForRequest:()=>Promise<Pool|null>) {
  app.post('/api/webhooks/google-calendar', async(req,res)=>{
    res.set('Cache-Control','no-store');
    const signal=parseCalendarSignal(req.headers);
    if(!pushEnabled()||!signal||Object.keys(req.query).length||req.headers['transfer-encoding']||
       req.headers['content-length']!==undefined&&req.headers['content-length']!=='0'){res.sendStatus(404);return;}
    try {
      const pool=await poolForRequest();
      if(!pool){res.sendStatus(503);return;}
      if(await admitSignal(pool,signal))res.status(204).end();
      else res.sendStatus(404);
    } catch {
      res.sendStatus(503);
    }
  });
}

/** One stop and one renewal per dispatcher pass. Stop claims are never retransmitted after an ambiguous attempt. */
export async function runCalendarPushLifecycle(pool:Pool,canStart=()=>true,transport:typeof fetch=fetch) {
  const result={calendarPushRenewed:0,calendarPushStopped:0,calendarPushUnconfirmed:0};
  const allowed=()=>pushEnabled()&&!isGlobalEmergencyStopActive()&&canStart();
  if(!allowed())return result;
  const [staleStops]:any=await pool.query(`SELECT channel_id FROM calendar_push_jobs
    WHERE kind='STOP' AND state='IN_PROGRESS' AND requested_at_ms<=${currentTimeSql}-120000
    ORDER BY requested_at_ms,channel_id LIMIT 1`);
  if(staleStops.length&&allowed()){
    // Update the exact row so maintenance does not lock the range used by concurrent stop claims.
    const [stale]:any=await pool.query(`UPDATE calendar_push_jobs FORCE INDEX (PRIMARY) SET state='UNKNOWN'
      WHERE channel_id=? AND kind='STOP' AND state='IN_PROGRESS' AND requested_at_ms<=${currentTimeSql}-120000`,[staleStops[0].channel_id]);
    result.calendarPushUnconfirmed+=stale.affectedRows;
  }
  const [stops]:any=await pool.query(`SELECT * FROM calendar_push_jobs WHERE kind='STOP' AND state='READY' AND expires_at_ms>${currentTimeSql}
    ORDER BY requested_at_ms,channel_id LIMIT 1`);
  const stop=stops[0];
  if(stop&&allowed()){
    const [claim]:any=await pool.query(`UPDATE calendar_push_jobs FORCE INDEX (PRIMARY) SET state='IN_PROGRESS',requested_at_ms=${currentTimeSql}
      WHERE channel_id=? AND kind='STOP' AND state='READY' AND expires_at_ms>${currentTimeSql}`,[stop.channel_id]);
    if(claim.affectedRows===1){
      let outcome='UNAVAILABLE';
      try{
        await ensureCalendarOAuth(pool,stop.manager_id,stop.company_id,undefined,transport);
        const connection=await withReadOnlySqlDeadline(pool,sql=>readBookingCalendarBinding(sql,stop.manager_id,stop.company_id));
        if(allowed()&&calendarHash(connection.binding.calendarId)===stop.calendar_hash){
          outcome='UNKNOWN';
          const options=googleCalendarRequest(connection.binding);
          const response=await transport(CALENDAR_API+'/channels/stop',{
            ...options,method:'POST',headers:{...options.headers,'Content-Type':'application/json'},
            body:JSON.stringify({id:stop.channel_id,resourceId:stop.resource_id}),
          });
          if(response.status===204)outcome='STOPPED';
          await response.body?.cancel();
        }
      }catch{ /* No second stop is dispatched when provider acceptance is uncertain. */ }
      const sql=await pool.getConnection();
      try{
        await sql.beginTransaction();
        const [settled]:any=await sql.query("UPDATE calendar_push_jobs FORCE INDEX (PRIMARY) SET state=? WHERE channel_id=? AND kind='STOP' AND state='IN_PROGRESS'",[outcome,stop.channel_id]);
        if(settled.affectedRows===1)await agencyAudit(sql,stop.company_id,stop.manager_id,'SALES_CALENDAR_PUSH_STOP_'+outcome,{});
        await sql.commit();
        if(settled.affectedRows===1){
          if(outcome==='STOPPED')result.calendarPushStopped++;
          else result.calendarPushUnconfirmed++;
        }
      }catch(error){await sql.rollback();throw error;}finally{sql.release();}
    }
  }
  if(!allowed()||!liveRenewalEnabled())return result;
  const [channels]:any=await pool.query(`SELECT c.company_id,c.channel_id,c.manager_id FROM calendar_push_channels c
    JOIN client_operations o ON o.company_id=c.company_id AND o.status='ACTIVE'
    WHERE c.state='ACTIVE' AND c.manager_id IS NOT NULL AND c.renew_after_ms<=${currentTimeSql}
      AND c.expires_at_ms<=${currentTimeSql}+3600000 AND c.expires_at_ms>${currentTimeSql}-86400000
      AND NOT EXISTS(SELECT 1 FROM calendar_push_jobs j WHERE j.company_id=c.company_id AND j.kind='WATCH'
           AND j.state='PENDING' AND j.expires_at_ms>${currentTimeSql})
    ORDER BY c.renew_after_ms,c.company_id LIMIT 1`);
  const channel=channels[0];
  if(!channel||!allowed())return result;
  const [lease]:any=await pool.query(`UPDATE calendar_push_channels SET renew_after_ms=${currentTimeSql}+${cooldownMs}
    WHERE company_id=? AND channel_id=? AND state='ACTIVE' AND renew_after_ms<=${currentTimeSql}`,[channel.company_id,channel.channel_id]);
  if(lease.affectedRows===1&&allowed()){
    try{
      await registerCalendarPushChannel(pool,{id:channel.manager_id},channel.company_id,transport,channel.channel_id);
      result.calendarPushRenewed++;
    }catch{
      result.calendarPushUnconfirmed++;
    }
  }
  return result;
}
