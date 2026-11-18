import {validWorkspaceRevision} from './workspaceRevision';
export interface CalendarAttachment{model:1;state:'ATTACHED'|'DETACHED';ref:{id:string;url:string;asset_type:'photo';revision:string;hash:string};actorId:string;requestKey:string;inputHash:string;atMs:number;sourceVersion:string;resultingVersion:string}
const exact=(v:any,k:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...k].sort().join(',');
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function validateCalendarAttachment(value:any,company:string):CalendarAttachment{
 if(!exact(value,['model','state','ref','actorId','requestKey','inputHash','atMs','sourceVersion','resultingVersion'])||value.model!==1||!['ATTACHED','DETACHED'].includes(value.state)||typeof value.actorId!=='string'||!value.actorId||value.actorId.length>64||!Number.isSafeInteger(value.atMs)||value.atMs<0||value.atMs>8640000000000000||![value.requestKey,value.inputHash,value.sourceVersion,value.resultingVersion].every(hash)||!exact(value.ref,['id','url','asset_type','revision','hash']))throw Error('CALENDAR_ATTACHMENT_INVALID');const r=value.ref;
 if(typeof r.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(r.id)||r.asset_type!=='photo'||!validWorkspaceRevision(r.revision)||r.revision==='0'||!hash(r.hash)||typeof r.url!=='string'||r.url.length>512||!r.url.startsWith('/uploads/'+company+'/')||/[\\%?#]/.test(r.url)||r.url.slice(('/uploads/'+company+'/').length).split('/').some((p:string)=>!p||p==='.'||p==='..'))throw Error('CALENDAR_ATTACHMENT_REF_INVALID');return value;
}
/** Absent field keeps historical manifest bytes/hashes unchanged. */
export function calendarAttachmentFromEvidence(raw:unknown,company:string):CalendarAttachment|undefined{
 if(raw===null||raw===undefined)return undefined;if(typeof raw!=='string'||raw.length>4096)throw Error('CALENDAR_ATTACHMENT_EVIDENCE_INVALID');const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))throw Error('CALENDAR_ATTACHMENT_EVIDENCE_INVALID');return Object.hasOwn(v,'photoAttachment')?validateCalendarAttachment(v.photoAttachment,company):undefined;
}
