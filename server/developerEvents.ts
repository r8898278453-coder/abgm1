import crypto from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {DEVELOPER_EVENT_TYPES} from '../shared/developerAccess';
/** Same transaction as the canonical audit. No original body, PII, actor or audit details leave this boundary. */
export async function recordDeveloperEvent(c:PoolConnection,company:string,eventId:string,eventType:string){
 if(!DEVELOPER_EVENT_TYPES.has(eventType))return;
 const now=Date.now();
 await c.query('INSERT INTO developer_events(id,company_id,event_type,created_at_ms) VALUES (?,?,?,?)',[eventId,company,eventType,now]);
 await c.query(`INSERT INTO developer_deliveries(id,company_id,subscription_id,event_id,subscription_revision,state,attempts,next_at_ms,created_at_ms,updated_at_ms)
 SELECT REPLACE(UUID(),'-',''),company_id,id,?,revision,'PENDING',0,?,?,? FROM developer_subscriptions WHERE company_id=? AND state='ACTIVE' AND topic='crm.activity'`,[eventId,now,now,now,company]);
}
export const developerId=()=>crypto.randomBytes(16).toString('hex');
