import type {PoolConnection} from 'mysql2/promise';
import type {VerifiedWhatsAppEvent} from '../shared/whatsAppEvents';
import {salesHash} from './salesWorkspace';
import {exitSalesWorkflows} from './salesWorkflowLifecycle';
import {agencyAudit} from './agencyRoutes';
/** Caller owns the canonical company lock/transaction. Candidate content is never persisted or promoted. */
export async function observeWhatsAppConflict(c:PoolConnection,company:string,original:any,hash:string,candidate:{source:VerifiedWhatsAppEvent;contact:string;body:string;kind:string;mediaId:string|null}){
 const current=BigInt(original.conflict_revision),resolved=BigInt(original.resolved_revision);
 const [seen]:any=await c.query('SELECT CAST(conflict_revision AS CHAR) version FROM whatsapp_conflict_observations WHERE company_id=? AND event_key=? AND conflict_hash=?',[company,original.event_key,hash]);
 if(seen.length){return !Number(original.conflict_overflow)&&BigInt(seen[0].version)<=resolved?'REVIEWED':'OPEN';}
 if(Number(original.conflict_overflow))return'OPEN';
 const [count]:any=await c.query('SELECT COUNT(*) total FROM whatsapp_conflict_observations WHERE company_id=? AND event_key=?',[company,original.event_key]);
 const overflow=Number(count[0].total)>=100;if(current>=999999999999999n)throw new Error('CONFLICT_VERSION_EXHAUSTED');const revision=String(current+1n);
 if(!overflow){const [messages]:any=await c.query('SELECT body,metadata_json FROM sales_inbox_messages WHERE company_id=? AND id=?',[company,salesHash('inbound:'+company+':'+original.provider_ref)]);const message=messages[0],metadata=message?(typeof message.metadata_json==='string'?JSON.parse(message.metadata_json):message.metadata_json):null;const changes={sourceChanged:original.phone_number_id!==candidate.source.phoneNumberId||original.waba_id!==candidate.source.wabaId,contactChanged:original.contact_hash!==candidate.contact,timeChanged:Number(original.occurred_at_ms)!==candidate.source.occurredAtMs,bodyChanged:message?message.body!==candidate.body:null,kindChanged:metadata?(metadata.kind||'text')!==candidate.kind:null,mediaChanged:metadata?(metadata.mediaId||null)!==candidate.mediaId:null,canonicalMissing:!message};await c.query('INSERT INTO whatsapp_conflict_observations(company_id,event_key,conflict_hash,conflict_revision,changes_json) VALUES (?,?,?,?,?)',[company,original.event_key,hash,revision,JSON.stringify(changes)]);}
 await c.query('UPDATE whatsapp_inbound_events SET conflicted=1,conflict_revision=?,conflict_overflow=?,conflict_at=NOW() WHERE company_id=? AND event_key=?',[revision,overflow?1:0,company,original.event_key]);await exitSalesWorkflows(c,company,'INBOUND_PROVIDER_EVENT_CONFLICT','webhook',{contactHash:original.contact_hash});await agencyAudit(c,company,'webhook','SALES_INBOUND_EVENT_CONFLICT',{eventKey:original.event_key,conflictVersion:revision,overflow});return'OPEN';
}
