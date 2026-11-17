// Frozen coverage V3: fixed sales activity definitions, independent of the live registry.
import {canonicalSnapshotReportV2,SNAPSHOT_ACTIVITY_V2,SNAPSHOT_BACKLOG_V2} from './reportSnapshotSchemaV2';
export const SNAPSHOT_ACTIVITY_V3={...SNAPSHOT_ACTIVITY_V2,
 prospectImportBatches:'Prospect import batches committed',
 prospectRowsImported:'Prospect rows created as new leads',
 prospectRowsNotImported:'Prospect rows not imported',
 salesInboundRecorded:'Inbound sales messages recorded',
 salesInboundAmbiguous:'Inbound sales messages with ambiguous identity',
 salesInboundOptOut:'Inbound sales opt-outs recorded',
 salesQualificationsRecorded:'Sales qualification revisions recorded',
 salesQualificationsReview:'Qualification revisions requiring human review',
 salesOpportunitiesUpdated:'Sales opportunity revisions recorded',
 salesPermissionsUpdated:'Contact permission revisions recorded',
 salesPoliciesUpdated:'Sales policy revisions recorded',
} as const;
export const SNAPSHOT_BACKLOG_V3={...SNAPSHOT_BACKLOG_V2} as const;
export const SNAPSHOT_METRICS_V3={activity:Object.keys(SNAPSHOT_ACTIVITY_V3),backlog:Object.keys(SNAPSHOT_BACKLOG_V3)} as const;
export function canonicalSnapshotReportV3(input:any){const base=canonicalSnapshotReportV2(input);const activity=Object.fromEntries(SNAPSHOT_METRICS_V3.activity.map(key=>{const n=input.activity?.[key];if(!Number.isSafeInteger(n)||n<0)throw new Error('SNAPSHOT_REPORT_V3_COUNT_INVALID');return[key,n];}));return{...base,activity};}
