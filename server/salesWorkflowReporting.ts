import {WORKFLOW_REPORT_ACTIVITY,WORKFLOW_REPORT_BACKLOG,workflowReportCounts} from '../shared/salesWorkflowReporting';
import type {ReadOnlySql} from './readOnlySqlDeadline';

export async function readSalesWorkflowReport(sql:ReadOnlySql,company:string,start:number,end:number){
 const types=Object.keys(WORKFLOW_REPORT_ACTIVITY);
 const [events]=await sql.query(
  `SELECT BINARY event_type eventType,COUNT(*) total FROM autonomous_audit_logs
    WHERE company_id=? AND timestamp>=FROM_UNIXTIME(?) AND timestamp<FROM_UNIXTIME(?)
      AND BINARY event_type IN (${types.map(()=>'?').join(',')})
    GROUP BY BINARY event_type`,
  [company,start/1000,end/1000,...types.map(type=>'AGENCY_'+type)]);
 const counts:Record<string,number>=Object.fromEntries(types.map(type=>[type,0]));
 for(const row of events)counts[String(row.eventType).slice('AGENCY_'.length)]=Number(row.total);

 const [[definitions]]=await sql.query(
  `SELECT COUNT(CASE WHEN BINARY state='DRAFT' THEN 1 END) drafts,
          COUNT(CASE WHEN BINARY state='APPROVED' THEN 1 END) approved,
          COUNT(CASE WHEN BINARY state='RETIRED' THEN 1 END) retired
   FROM sales_workflow_definitions WHERE company_id=?`,[company]);
 const [[enrollments]]=await sql.query(
  `SELECT COUNT(CASE WHEN BINARY state='ACTIVE' AND expires_at>NOW() THEN 1 END) active,
          COUNT(CASE WHEN BINARY state='WAITING_REVIEW' AND expires_at>NOW() THEN 1 END) waitingReview,
          COUNT(CASE WHEN BINARY state='WAITING_SEND' AND expires_at>NOW() THEN 1 END) waitingSend,
          COUNT(CASE WHEN expires_at<=NOW() THEN 1 END) expiredOpen
   FROM sales_workflow_enrollments WHERE company_id=? AND BINARY state IN ('ACTIVE','WAITING_REVIEW','WAITING_SEND')`,[company]);
 const backlog=Object.fromEntries(Object.entries({...definitions,...enrollments}).map(([key,value])=>[key,Number(value)]));
 return {activity:workflowReportCounts(WORKFLOW_REPORT_ACTIVITY,counts),backlog:workflowReportCounts(WORKFLOW_REPORT_BACKLOG,backlog)};
}
