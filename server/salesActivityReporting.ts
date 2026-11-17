/** Run only within the canonical report's company-scoped read-only deadline/transaction. */
export async function readSalesActivity(sql:{query:Function},company:string,start:number,end:number){
 const imported="JSON_UNQUOTE(JSON_EXTRACT(details,'$.imported'))",excluded="JSON_UNQUOTE(JSON_EXTRACT(details,'$.excluded'))";
 // Writer journals one audit row in the same transaction; replays do not add another row.
 // Validate JSON types before trusting sums; missing/forged counters must not become zeros.
 const valid=`JSON_TYPE(JSON_EXTRACT(details,'$.imported'))='INTEGER' AND JSON_TYPE(JSON_EXTRACT(details,'$.excluded'))='INTEGER' AND ${imported} REGEXP '^(0|[1-9][0-9]{0,2})$' AND ${excluded} REGEXP '^(0|[1-9][0-9]{0,2})$' AND CAST(${imported} AS UNSIGNED)+CAST(${excluded} AS UNSIGNED) BETWEEN 1 AND 100`;
 const [rows]:any=await sql.query(`SELECT
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_PROSPECTS_IMPORTED' THEN 1 END) prospectImportBatches,
 COALESCE(SUM(CASE WHEN BINARY event_type='AGENCY_SALES_PROSPECTS_IMPORTED' AND (${valid}) THEN CAST(${imported} AS UNSIGNED) ELSE 0 END),0) prospectRowsImported,
 COALESCE(SUM(CASE WHEN BINARY event_type='AGENCY_SALES_PROSPECTS_IMPORTED' AND (${valid}) THEN CAST(${excluded} AS UNSIGNED) ELSE 0 END),0) prospectRowsNotImported,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_PROSPECTS_IMPORTED' AND COALESCE((${valid}),0)=0 THEN 1 END) invalidImportCounts,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_INBOUND_SAVED' THEN 1 END) salesInboundRecorded,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_INBOUND_SAVED' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(details,'$.identity'))='AMBIGUOUS' THEN 1 END) salesInboundAmbiguous,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_INBOUND_SAVED' AND JSON_TYPE(JSON_EXTRACT(details,'$.optOut'))='BOOLEAN' AND JSON_UNQUOTE(JSON_EXTRACT(details,'$.optOut'))='true' THEN 1 END) salesInboundOptOut,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_QUALIFICATION_SAVED' THEN 1 END) salesQualificationsRecorded,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_QUALIFICATION_SAVED' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(details,'$.outcome'))='HUMAN_REVIEW' THEN 1 END) salesQualificationsReview,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_OPPORTUNITY_SAVED' THEN 1 END) salesOpportunitiesUpdated,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_PERMISSION_SAVED' THEN 1 END) salesPermissionsUpdated,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_POLICY_SAVED' THEN 1 END) salesPoliciesUpdated
 FROM autonomous_audit_logs WHERE company_id=? AND timestamp>=FROM_UNIXTIME(?) AND timestamp<FROM_UNIXTIME(?) AND event_type IN ('AGENCY_SALES_PROSPECTS_IMPORTED','AGENCY_SALES_INBOUND_SAVED','AGENCY_SALES_QUALIFICATION_SAVED','AGENCY_SALES_OPPORTUNITY_SAVED','AGENCY_SALES_PERMISSION_SAVED','AGENCY_SALES_POLICY_SAVED')`,[company,start/1000,end/1000]);
 if(Number(rows[0].invalidImportCounts)!==0)throw new Error('SALES_REPORT_IMPORT_COUNTS_INVALID');
 const {invalidImportCounts,...activity}=rows[0];return activity;
}
