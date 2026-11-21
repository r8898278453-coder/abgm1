import {canonicalSnapshotReportV9,SNAPSHOT_ACTIVITY_V9,SNAPSHOT_BACKLOG_V9,SNAPSHOT_METRICS_V9} from './reportSnapshotSchemaV9';
import {canonicalSnapshotReportV8,SNAPSHOT_ACTIVITY_V8,SNAPSHOT_BACKLOG_V8,SNAPSHOT_METRICS_V8} from './reportSnapshotSchemaV8';
import {canonicalSnapshotReportV7,SNAPSHOT_ACTIVITY_V7,SNAPSHOT_BACKLOG_V7,SNAPSHOT_METRICS_V7} from './reportSnapshotSchemaV7';
import {canonicalSnapshotReportV6,SNAPSHOT_ACTIVITY_V6,SNAPSHOT_BACKLOG_V6,SNAPSHOT_METRICS_V6} from './reportSnapshotSchemaV6';
import {canonicalSnapshotReportV5,SNAPSHOT_ACTIVITY_V5,SNAPSHOT_BACKLOG_V5,SNAPSHOT_METRICS_V5} from './reportSnapshotSchemaV5';
import {canonicalSnapshotReportV4,SNAPSHOT_ACTIVITY_V4,SNAPSHOT_BACKLOG_V4,SNAPSHOT_METRICS_V4} from './reportSnapshotSchemaV4';
import {canonicalSnapshotReportV3,SNAPSHOT_ACTIVITY_V3,SNAPSHOT_BACKLOG_V3,SNAPSHOT_METRICS_V3} from './reportSnapshotSchemaV3';
import {canonicalSnapshotReportV1,SNAPSHOT_ACTIVITY_V1,SNAPSHOT_BACKLOG_V1,SNAPSHOT_METRICS_V1} from './reportSnapshotSchemaV1';
import {canonicalSnapshotReportV2,SNAPSHOT_ACTIVITY_V2,SNAPSHOT_BACKLOG_V2,SNAPSHOT_METRICS_V2} from './reportSnapshotSchemaV2';
export const CURRENT_REPORT_COVERAGE=9;
export function reportSnapshotCoverage(version:number){
 if(version===1)return{canonical:canonicalSnapshotReportV1,activity:SNAPSHOT_ACTIVITY_V1,backlog:SNAPSHOT_BACKLOG_V1,metrics:SNAPSHOT_METRICS_V1};
 if(version===2)return{canonical:canonicalSnapshotReportV2,activity:SNAPSHOT_ACTIVITY_V2,backlog:SNAPSHOT_BACKLOG_V2,metrics:SNAPSHOT_METRICS_V2};
 if(version===3)return{canonical:canonicalSnapshotReportV3,activity:SNAPSHOT_ACTIVITY_V3,backlog:SNAPSHOT_BACKLOG_V3,metrics:SNAPSHOT_METRICS_V3};
 if(version===4)return{canonical:canonicalSnapshotReportV4,activity:SNAPSHOT_ACTIVITY_V4,backlog:SNAPSHOT_BACKLOG_V4,metrics:SNAPSHOT_METRICS_V4};
 if(version===5)return{canonical:canonicalSnapshotReportV5,activity:SNAPSHOT_ACTIVITY_V5,backlog:SNAPSHOT_BACKLOG_V5,metrics:SNAPSHOT_METRICS_V5};
 if(version===6)return{canonical:canonicalSnapshotReportV6,activity:SNAPSHOT_ACTIVITY_V6,backlog:SNAPSHOT_BACKLOG_V6,metrics:SNAPSHOT_METRICS_V6};
 if(version===7)return{canonical:canonicalSnapshotReportV7,activity:SNAPSHOT_ACTIVITY_V7,backlog:SNAPSHOT_BACKLOG_V7,metrics:SNAPSHOT_METRICS_V7};
 if(version===8)return{canonical:canonicalSnapshotReportV8,activity:SNAPSHOT_ACTIVITY_V8,backlog:SNAPSHOT_BACKLOG_V8,metrics:SNAPSHOT_METRICS_V8};
 if(version===9)return{canonical:canonicalSnapshotReportV9,activity:SNAPSHOT_ACTIVITY_V9,backlog:SNAPSHOT_BACKLOG_V9,metrics:SNAPSHOT_METRICS_V9};
 throw new Error('REPORT_SNAPSHOT_COVERAGE_UNSUPPORTED');
}
