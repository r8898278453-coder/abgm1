/** Called in the canonical report's read-only consistent transaction/deadline. */
export async function readGrowthReporting(sql:{query:Function},company:string,start:number,end:number,observedAtMs:number){const [rows]:any=await sql.query(`SELECT
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_CREATED' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(details,'$.kind'))='ASSESSMENT' THEN 1 END) growthAssessmentsSaved,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_CREATED' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(details,'$.kind'))='SIGNAL' THEN 1 END) growthSignalsSaved,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_CREATED' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(details,'$.kind'))='ENRICHMENT' THEN 1 END) growthEnrichmentsSaved,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_CREATED' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(details,'$.kind'))='EXPERIMENT' THEN 1 END) growthExperimentsDrafted,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_CREATED' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(details,'$.kind'))='COST' THEN 1 END) growthCostsRecorded,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_EDIT' THEN 1 END) growthExperimentEdits,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_APPROVE' THEN 1 END) growthExperimentApprovals,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_START' THEN 1 END) growthExperimentsStarted,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_OBSERVE' THEN 1 END) growthObservationsRecorded,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_STOP' THEN 1 END) growthExperimentsStopped,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_COMPLETE' THEN 1 END) growthExperimentsCompleted,
 COUNT(CASE WHEN BINARY event_type='AGENCY_SALES_GROWTH_VOID' THEN 1 END) growthCostsVoided
 FROM autonomous_audit_logs WHERE company_id=? AND timestamp>=FROM_UNIXTIME(?) AND timestamp<FROM_UNIXTIME(?) AND event_type IN ('AGENCY_SALES_GROWTH_CREATED','AGENCY_SALES_GROWTH_EDIT','AGENCY_SALES_GROWTH_APPROVE','AGENCY_SALES_GROWTH_START','AGENCY_SALES_GROWTH_OBSERVE','AGENCY_SALES_GROWTH_STOP','AGENCY_SALES_GROWTH_COMPLETE','AGENCY_SALES_GROWTH_VOID')`,[company,start/1000,end/1000]);
 const [backlog]:any=await sql.query(`SELECT
 COUNT(CASE WHEN BINARY kind='EXPERIMENT' AND BINARY state='DRAFT' THEN 1 END) growthExperimentsDraft,
 COUNT(CASE WHEN BINARY kind='EXPERIMENT' AND BINARY state='APPROVED' THEN 1 END) growthExperimentsApproved,
 COUNT(CASE WHEN BINARY kind='EXPERIMENT' AND BINARY state='RUNNING' THEN 1 END) growthExperimentsRunning,
 COUNT(CASE WHEN BINARY kind IN ('SIGNAL','ENRICHMENT') AND CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json,'$.expiresAtMs')) AS UNSIGNED)<=? THEN 1 END) growthEvidenceStale,
 COUNT(CASE WHEN BINARY kind NOT IN ('ASSESSMENT','SIGNAL','ENRICHMENT','EXPERIMENT','COST') OR(BINARY kind IN ('ASSESSMENT','SIGNAL','ENRICHMENT') AND BINARY state<>'RECORDED') OR(BINARY kind='EXPERIMENT' AND BINARY state NOT IN ('DRAFT','APPROVED','RUNNING','COMPLETED','STOPPED')) OR(BINARY kind='COST' AND BINARY state NOT IN ('RECORDED','VOIDED')) OR(BINARY kind IN ('SIGNAL','ENRICHMENT') AND (JSON_EXTRACT(payload_json,'$.expiresAtMs') IS NULL OR JSON_TYPE(JSON_EXTRACT(payload_json,'$.expiresAtMs'))<>'INTEGER' OR JSON_UNQUOTE(JSON_EXTRACT(payload_json,'$.expiresAtMs')) NOT REGEXP '^(0|[1-9][0-9]{0,15})$' OR CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json,'$.expiresAtMs')) AS UNSIGNED)>8640000000000000)) THEN 1 END) invalidStates
 FROM growth_operation_records WHERE company_id=?`,[observedAtMs,company]);if(Number(backlog[0].invalidStates)!==0)throw new Error('GROWTH_REPORT_STATE_INVALID');const {invalidStates,...b}=backlog[0];return{activity:rows[0],backlog:b};}
