import crypto from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import type { Express, Request } from 'express';
import { calendarHash, calendarProviderJson, calendarReconciliationEnabled, googleCalendarEventUrl, googleCalendarRequest, readBookingCalendarBinding } from './bookingCalendar';
import { withReadOnlySqlDeadline } from './readOnlySqlDeadline';
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

export async function readCalendarPushStatus(pool: Pool, company: string) {
  return withReadOnlySqlDeadline(pool, async sql => {
    const [rows] = await sql.query(
      `SELECT state,expires_at_ms,requested_at_ms,${currentTimeSql} nowMs FROM calendar_push_channels WHERE company_id=?`, [company]);
    const current = rows[0];
    const now = Number(current?.nowMs);
    const expiresAtMs = current ? Number(current.expires_at_ms) : null;
    const state = current?.state === 'DISABLED' ? 'DISABLED' : !current ? 'NOT_CONFIGURED' :
      expiresAtMs <= now ? 'EXPIRED' : current.state;
    return { state, expiresAtMs, enabled: pushEnabled(), originReady: Boolean(publicAddress()),
      canRegister: !current || now-Number(current.requested_at_ms)>=cooldownMs &&
        (state==='EXPIRED'||state==='DISABLED'||state==='ACTIVE'&&expiresAtMs-now<=3600000) };
  });
}

export async function registerCalendarPushChannel(
  pool: Pool, user: {id:string}, company: string, transport: typeof fetch = fetch,
) {
  const address = publicAddress();
  if (!pushEnabled() || !address || isGlobalEmergencyStopActive()) throw new SalesError(409, 'CALENDAR_PUSH_UNAVAILABLE');
  const id = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  const reservation = await withSalesLock(pool,user,company,'manage',async (sql, canonical) => {
    if(canonical!==company)throw new SalesError(404,'CLIENT_NOT_FOUND');
    const connection = await readBookingCalendarBinding(sql,user.id,company);
    const [[clock]] = await sql.query(`SELECT ${currentTimeSql} nowMs`) as any;
    const now = Number(clock.nowMs);
    const [rows] = await sql.query('SELECT state,expires_at_ms,requested_at_ms FROM calendar_push_channels WHERE company_id=?',[company]) as any;
    const current = rows[0];
    if (current && (now-Number(current.requested_at_ms)<cooldownMs || current.state==='PENDING'&&Number(current.expires_at_ms)>now ||
        current.state==='ACTIVE'&&Number(current.expires_at_ms)>now+3600000)) {
      throw new SalesError(409, 'CALENDAR_PUSH_ALREADY_REGISTERED');
    }
    const hash = salesHash(token);
    const scope = calendarHash(connection.binding.calendarId);
    const expires = now+lifetimeMs+cooldownMs;
    if (current) {
      await sql.query(`UPDATE calendar_push_channels SET channel_id=?,token_hash=?,calendar_hash=?,state='PENDING',
        resource_id=NULL,expires_at_ms=?,requested_at_ms=?,last_message=0,last_wake_ms=0 WHERE company_id=?`,
        [id,hash,scope,expires,now,company]);
    } else {
      await sql.query(`INSERT INTO calendar_push_channels
        (company_id,channel_id,token_hash,calendar_hash,state,expires_at_ms,requested_at_ms)
        VALUES (?,?,?,?,'PENDING',?,?)`, [company,id,hash,scope,expires,now]);
    }
    await agencyAudit(sql,company,user.id,'SALES_CALENDAR_PUSH_REQUESTED',{});
    return { connection, now };
  });

  // The reservation is durable before the one provider registration attempt.
  if (!pushEnabled() || isGlobalEmergencyStopActive()) throw new SalesError(409,'CALENDAR_PUSH_UNAVAILABLE');
  const url = new URL(googleCalendarEventUrl(reservation.connection.binding).href+'/watch');
  let watched;
  try {
    const request = googleCalendarRequest(reservation.connection.binding);
    watched = await calendarProviderJson(await transport(url, {
      ...request, method:'POST',headers:{...request.headers,'Content-Type':'application/json'},
      body:JSON.stringify({id,type:'web_hook',token,address,params:{ttl:String(lifetimeMs/1000)}}),
    }));
  } catch {
    throw new SalesError(503,'CALENDAR_PUSH_REGISTRATION_UNCONFIRMED');
  }
  const expiresAtMs = typeof watched?.expiration==='string' && /^\d{1,15}$/.test(watched.expiration) ? Number(watched.expiration) : 0;
  if (watched?.id!==id || !resourcePattern.test(typeof watched.resourceId==='string'?watched.resourceId:'') ||
      expiresAtMs<=reservation.now || expiresAtMs>reservation.now+lifetimeMs+cooldownMs) {
    throw new SalesError(503,'CALENDAR_PUSH_REGISTRATION_UNCONFIRMED');
  }
  return withSalesLock(pool,user,company,'manage',async sql=>{
    const current=await readBookingCalendarBinding(sql,user.id,company);
    if (current.fingerprint!==reservation.connection.fingerprint || !pushEnabled() || isGlobalEmergencyStopActive()) {
      throw new SalesError(409,'CALENDAR_PUSH_BINDING_CHANGED');
    }
    const [written]:any = await sql.query(`UPDATE calendar_push_channels SET state='ACTIVE',resource_id=?,expires_at_ms=?
      WHERE company_id=? AND channel_id=? AND state='PENDING' AND ?>${currentTimeSql}`,
      [watched.resourceId,expiresAtMs,company,id,expiresAtMs]);
    if(written.affectedRows!==1)throw new SalesError(409,'CALENDAR_PUSH_BINDING_CHANGED');
    await agencyAudit(sql,company,user.id,'SALES_CALENDAR_PUSH_ACTIVE',{expiresAtMs});
    return { state:'ACTIVE', expiresAtMs };
  });
}

export async function disableCalendarPushChannel(pool:Pool,user:{id:string},company:string) {
  return withSalesLock(pool,user,company,'manage',async sql=>{
    const [written]:any=await sql.query("UPDATE calendar_push_channels SET state='DISABLED' WHERE company_id=? AND state<>'DISABLED'",[company]);
    if(written.affectedRows)await agencyAudit(sql,company,user.id,'SALES_CALENDAR_PUSH_DISABLED',{});
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
