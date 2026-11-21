// Fixed V10 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV9,SNAPSHOT_ACTIVITY_V9,SNAPSHOT_BACKLOG_V9} from './reportSnapshotSchemaV9';

export const SNAPSHOT_ACTIVITY_V10={...SNAPSHOT_ACTIVITY_V9,
 googlePublished:'Google Business recorded API successes',
 googleFailed:'Google Business recorded failures',
 googleUnknown:'Google Business unconfirmed outcomes',
 facebookPublished:'Facebook recorded API successes',
 facebookFailed:'Facebook recorded failures',
 facebookUnknown:'Facebook unconfirmed outcomes',
 instagramPublished:'Instagram recorded API successes',
 instagramFailed:'Instagram recorded failures',
 instagramUnknown:'Instagram unconfirmed outcomes',
 whatsappPublished:'WhatsApp recorded API successes',
 whatsappFailed:'WhatsApp recorded failures',
 whatsappUnknown:'WhatsApp unconfirmed outcomes',
 telegramPublished:'Telegram recorded API successes',
 telegramFailed:'Telegram recorded failures',
 telegramUnknown:'Telegram unconfirmed outcomes',
 publishPartialFailed:'Publishing claims with success and failure',
 publishPartialUnknown:'Publishing claims with success and an unconfirmed target',
} as const;

export const SNAPSHOT_BACKLOG_V10=SNAPSHOT_BACKLOG_V9;
export const SNAPSHOT_METRICS_V10={activity:Object.keys(SNAPSHOT_ACTIVITY_V10),backlog:Object.keys(SNAPSHOT_BACKLOG_V10)} as const;

export function canonicalSnapshotReportV10(input:any){
 const base=canonicalSnapshotReportV9(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V10_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V10.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V10.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
