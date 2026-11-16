/** Called inside the canonical report's read-only deadline and transaction. */
export async function readCaptureReporting(sql:{query:Function},company:string,start:number,end:number){
 const [activity]:any=await sql.query(`SELECT
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_SNAPSHOT_CAPTURED' THEN 1 END) reportSnapshotsStored,
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_SNAPSHOT_CAPTURED' AND JSON_UNQUOTE(JSON_EXTRACT(details,'$.reason')) IN ('LATE_RECORDS','CORRECTION','REVIEW') THEN 1 END) reportSnapshotAmendments,
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_CAPTURE_ADMITTED' THEN 1 END) reportCapturesAdmitted,
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_CAPTURE_SUCCEEDED' THEN 1 END) reportCapturesCompleted,
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_CAPTURE_SKIPPED' THEN 1 END) reportCapturesSkipped,
 COALESCE(SUM(CASE WHEN BINARY event_type='AGENCY_REPORT_CAPTURE_POLICY_SAVED' THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(details,'$.cancelled')) AS UNSIGNED) ELSE 0 END),0) reportCapturesCancelled,
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_CAPTURE_RECOVERY_REQUIRED' THEN 1 END) reportCapturesRecoveryFailed,
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_CAPTURE_POLICY_SAVED' THEN 1 END) reportCapturePolicyChanges,
 COUNT(CASE WHEN BINARY event_type='AGENCY_REPORT_CAPTURE_POLICY_SAVED' AND (JSON_EXTRACT(details,'$.cancelled') IS NULL OR JSON_TYPE(JSON_EXTRACT(details,'$.cancelled'))<>'INTEGER' OR JSON_UNQUOTE(JSON_EXTRACT(details,'$.cancelled')) NOT REGEXP '^(0|[1-9][0-9]*)$') THEN 1 END) invalidPolicyCounts
 FROM autonomous_audit_logs WHERE company_id=? AND timestamp>=FROM_UNIXTIME(?) AND timestamp<FROM_UNIXTIME(?) AND event_type IN ('AGENCY_REPORT_SNAPSHOT_CAPTURED','AGENCY_REPORT_CAPTURE_ADMITTED','AGENCY_REPORT_CAPTURE_SUCCEEDED','AGENCY_REPORT_CAPTURE_SKIPPED','AGENCY_REPORT_CAPTURE_POLICY_SAVED','AGENCY_REPORT_CAPTURE_RECOVERY_REQUIRED')`,[company,start/1000,end/1000]);
 const [backlog]:any=await sql.query(`SELECT
 COUNT(CASE WHEN BINARY r.state='QUEUED' THEN 1 END) reportCapturesPending,
 COUNT(CASE WHEN BINARY r.state='QUEUED' AND j.status='RUNNING' THEN 1 END) reportCapturesRunning,
 COUNT(CASE WHEN BINARY r.state='FAILED' THEN 1 END) reportCapturesFailed,
 COUNT(CASE WHEN BINARY r.state='QUEUED' AND (j.id IS NULL OR j.status IN ('FAILED','CANCELLED','SUCCEEDED')) THEN 1 END) reportCapturesRecoveryNeeded,
 COUNT(CASE WHEN BINARY r.state NOT IN ('QUEUED','SUCCEEDED','SKIPPED','FAILED') THEN 1 END) invalidStates
 FROM report_capture_runs r LEFT JOIN job_queue j ON j.id=r.job_id AND j.company_id=r.company_id AND j.job_type='report_snapshot_capture' WHERE r.company_id=?`,[company]);
 if(Number(activity[0].invalidPolicyCounts)!==0||Number(backlog[0].invalidStates)!==0)throw new Error('REPORT_CAPTURE_REPORTING_INVALID');
 const {invalidPolicyCounts,...a}=activity[0],{invalidStates,...b}=backlog[0];return{activity:a,backlog:b};
}
