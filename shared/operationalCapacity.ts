import {IST_OFFSET_MS} from './platformTime';
export const OPERATIONAL_LIMITS={retainedRows:1000,pendingCaptureRuns:7,manualTelegramPerDay:100} as const;
export const CAPACITY_RESOURCES={
 snapshots:{label:'Retained frozen report revisions',limit:OPERATIONAL_LIMITS.retainedRows},
 captureRuns:{label:'Retained capture runs',limit:OPERATIONAL_LIMITS.retainedRows},
 capturePending:{label:'Capture runs awaiting settlement',limit:OPERATIONAL_LIMITS.pendingCaptureRuns},
 dailyNotifications:{label:'Retained daily digest attempts',limit:OPERATIONAL_LIMITS.retainedRows},
 reviewNotifications:{label:'Retained review reminder attempts',limit:OPERATIONAL_LIMITS.retainedRows},
 criticalNotifications:{label:'Retained critical alert attempts',limit:OPERATIONAL_LIMITS.retainedRows},
 criticalReservations:{label:'Retained critical stage reservations',limit:OPERATIONAL_LIMITS.retainedRows},
 manualRequests:{label:'Retained manual Telegram requests',limit:OPERATIONAL_LIMITS.retainedRows},
 manualToday:{label:'Manual Telegram requests recorded today (IST)',limit:OPERATIONAL_LIMITS.manualTelegramPerDay},
} as const;
export const CAPACITY_KEYS=Object.keys(CAPACITY_RESOURCES) as (keyof typeof CAPACITY_RESOURCES)[];
export function capacityRows(counts:Record<string,unknown>){return CAPACITY_KEYS.map(key=>{const used=counts[key];if(typeof used!=='number'||!Number.isSafeInteger(used)||used<0)throw new Error('OPERATIONAL_CAPACITY_COUNT_INVALID');const limit=CAPACITY_RESOURCES[key].limit;return{key,used,limit,remaining:Math.max(0,limit-used),state:used>=limit?'FULL':used>=Math.ceil(limit*0.9)?'NEAR_LIMIT':'AVAILABLE'};});}
export function validateOperationalCapacity(v:any,company:string){if(v?.companyId!==company||v.modelVersion!==1||v.timeZone!=='Asia/Kolkata'||!Number.isSafeInteger(v.checkedAtMs)||v.checkedAtMs<0||v.checkedAtMs>8640000000000000||!/^\d{4}-\d{2}-\d{2}$/.test(v.dayIST)||!Array.isArray(v.resources)||v.resources.length!==CAPACITY_KEYS.length)throw new Error('OPERATIONAL_CAPACITY_INVALID');if(new Date(v.checkedAtMs+IST_OFFSET_MS).toISOString().slice(0,10)!==v.dayIST)throw new Error('OPERATIONAL_CAPACITY_DAY_INVALID');const counts:Record<string,unknown>={};for(const r of v.resources){if(!CAPACITY_KEYS.includes(r.key)||r.key in counts)throw new Error('OPERATIONAL_CAPACITY_INVALID');counts[r.key]=r.used;}const expected=capacityRows(counts);for(const r of v.resources){const e=expected.find(x=>x.key===r.key)!;if(r.limit!==e.limit||r.remaining!==e.remaining||r.state!==e.state)throw new Error('OPERATIONAL_CAPACITY_INVALID');}return v;}
