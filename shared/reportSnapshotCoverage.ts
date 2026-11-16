import {canonicalSnapshotReportV1,SNAPSHOT_ACTIVITY_V1,SNAPSHOT_BACKLOG_V1,SNAPSHOT_METRICS_V1} from './reportSnapshotSchemaV1';
import {canonicalSnapshotReportV2,SNAPSHOT_ACTIVITY_V2,SNAPSHOT_BACKLOG_V2,SNAPSHOT_METRICS_V2} from './reportSnapshotSchemaV2';
export function reportSnapshotCoverage(version:number){
 if(version===1)return{canonical:canonicalSnapshotReportV1,activity:SNAPSHOT_ACTIVITY_V1,backlog:SNAPSHOT_BACKLOG_V1,metrics:SNAPSHOT_METRICS_V1};
 if(version===2)return{canonical:canonicalSnapshotReportV2,activity:SNAPSHOT_ACTIVITY_V2,backlog:SNAPSHOT_BACKLOG_V2,metrics:SNAPSHOT_METRICS_V2};
 throw new Error('REPORT_SNAPSHOT_COVERAGE_UNSUPPORTED');
}
