import {validWorkspaceRevision} from './workspaceRevision';
import {formatPlatformDateTime} from './platformTime';
export const CRITICAL_ALERT_SIGNALS={
 uncertainMessages:'Unconfirmed outbound messages',
 uncertainPublications:'Unconfirmed publishing attempts',
 intakeFailures:'Failed or dead-letter inbound intakes',
 captureRecovery:'Capture runs needing queue reconciliation',
 inboundConflicts:'Unresolved inbound event conflicts',
 failedJobs:'Retained failed queue jobs',
} as const;
export type CriticalAlertSignal=keyof typeof CRITICAL_ALERT_SIGNALS;
export const CRITICAL_ALERT_KEYS=Object.keys(CRITICAL_ALERT_SIGNALS) as CriticalAlertSignal[];
export interface CriticalAlertCandidate {signal:CriticalAlertSignal;episode:string;level:0|1|2;count:number;firstSeenMs:number;observedAtMs:number}
const time=(v:any)=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000;
export function criticalAlertLevel(firstSeenMs:number,nowMs:number):0|1|2{if(!time(firstSeenMs)||!time(nowMs)||nowMs<firstSeenMs)throw new Error('CRITICAL_ALERT_CLOCK_INVALID');return nowMs-firstSeenMs>=86400000?2:nowMs-firstSeenMs>=3600000?1:0;}
export function validateCriticalAlertCandidate(v:any):CriticalAlertCandidate{if(!v||!CRITICAL_ALERT_KEYS.includes(v.signal)||!validWorkspaceRevision(v.episode)||v.episode==='0'||![0,1,2].includes(v.level)||!Number.isSafeInteger(v.count)||v.count<=0||!time(v.firstSeenMs)||!time(v.observedAtMs)||v.level!==criticalAlertLevel(v.firstSeenMs,v.observedAtMs))throw new Error('CRITICAL_ALERT_CANDIDATE_INVALID');return v;}
export function formatCriticalAlertMessage(candidates:CriticalAlertCandidate[]){if(!Array.isArray(candidates)||!candidates.length||candidates.length>6||new Set(candidates.map(c=>c.signal)).size!==candidates.length)throw new Error('CRITICAL_ALERT_CANDIDATES_INVALID');candidates.forEach(validateCriticalAlertCandidate);return ['Critical operational review — observed evidence',...candidates.map(c=>`${CRITICAL_ALERT_SIGNALS[c.signal]}: ${c.count} · ${c.level===0?'initial alert':`escalation ${c.level}`} · episode ${c.episode} · observed ${formatPlatformDateTime(c.observedAtMs)}`),'Counts can overlap and may change after observation. Review current records; this alert does not authorize resend or prove customer delivery.'].join('\n');}
export function validateCriticalAlertHistory(v:any,company:string){
 if(v?.companyId!==company||!Array.isArray(v.incidents)||v.incidents.length>6||!Array.isArray(v.reservations)||v.reservations.length>25||typeof v.truncated!=='boolean')throw new Error('CRITICAL_ALERT_HISTORY_INVALID');if(v.reservationCount!==undefined||v.reservationCapacityReached!==undefined){if(!Number.isSafeInteger(v.reservationCount)||v.reservationCount<0||typeof v.reservationCapacityReached!=='boolean'||v.reservationCapacityReached!==(v.reservationCount>=1000))throw new Error('CRITICAL_ALERT_CAPACITY_INVALID');}const signals=new Set<string>();
 for(const r of v.incidents){if(!CRITICAL_ALERT_KEYS.includes(r.signal)||signals.has(r.signal)||!validWorkspaceRevision(r.episode)||!Number.isSafeInteger(r.count)||r.count<0||!time(r.lastSeenMs)||r.firstSeenMs!==null&&!time(r.firstSeenMs)||r.lastResolvedMs!==null&&!time(r.lastResolvedMs)||r.firstSeenMs!==null&&r.firstSeenMs>r.lastSeenMs||r.lastResolvedMs!==null&&r.lastResolvedMs>r.lastSeenMs||r.count>0&&(r.episode==='0'||r.firstSeenMs===null)||r.episode==='0'&&r.firstSeenMs!==null)throw new Error('CRITICAL_ALERT_INCIDENT_INVALID');signals.add(r.signal);}
 const ids=new Set<string>();for(const r of v.reservations){const key=[r.signal,r.episode,r.level].join(':');if(!CRITICAL_ALERT_KEYS.includes(r.signal)||!validWorkspaceRevision(r.episode)||r.episode==='0'||![0,1,2].includes(r.level)||ids.has(key)||typeof r.dueAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(r.dueAt)||!Number.isFinite(Date.parse(r.dueAt))||new Date(r.dueAt).toISOString().slice(0,19)+'Z'!==r.dueAt||!time(r.createdAtMs)||r.status!==null&&!['RUNNING','SENT','UNKNOWN'].includes(r.status)||r.providerId!==null&&!(typeof r.providerId==='string'&&/^[1-9][0-9]{0,31}$/.test(r.providerId))||r.reasonCode!==null&&!(typeof r.reasonCode==='string'&&/^[A-Z0-9_]{1,64}$/.test(r.reasonCode)))throw new Error('CRITICAL_ALERT_RESERVATION_INVALID');ids.add(key);}return v;
}
