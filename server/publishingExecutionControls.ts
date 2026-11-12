import {readScopedPublicationControlsFromSql,scopedPublicationBlock} from './publicationScopedControls';
import type {PauseReason} from './queueSql';
import {getDbPool,getCompanyById,getCompanyDataPayload} from './db';
import {isGlobalEmergencyStopActive} from './executionStop';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';
export type PublicationExecutionMode='manual'|'automatic';
export async function publishingExecutionBlock(company:string,mode:PublicationExecutionMode,platforms:string[]=[]):Promise<PauseReason|null>{
 if(isGlobalEmergencyStopActive())return 'GLOBAL_EMERGENCY_STOP';
 try{
  const pool=await getDbPool();
  if(pool){const block=await readPublicationExecutionBlock(pool,company,mode,platforms);return isGlobalEmergencyStopActive()?'GLOBAL_EMERGENCY_STOP':block;}
  if(mode==='manual')return null;
  let enabled=false,holiday=false;
  {
   const client=await getCompanyById(company);enabled=client?.autopilot_enabled===true || Number(client?.autopilot_enabled)===1;
   const data=await getCompanyDataPayload(company);
   if(data!==null && (typeof data!=='object' || Array.isArray(data)))return 'EXECUTION_CONTROLS_UNAVAILABLE';
   const settings=(data as {engine_settings?:unknown})?.engine_settings;
   if(settings!==undefined && (settings===null || typeof settings!=='object' || Array.isArray(settings)))return 'EXECUTION_CONTROLS_UNAVAILABLE';
   const flag=(settings as {isHolidayPaused?:unknown})?.isHolidayPaused;
   holiday=flag!==undefined && flag!==false;
  }
  return !enabled?'CLIENT_AUTOPILOT_PAUSED':holiday?'CLIENT_HOLIDAY_PAUSED':null;
 }catch{return 'EXECUTION_CONTROLS_UNAVAILABLE';}
}

export async function readAutomaticPublishingControlsFromSql(sql:ReadOnlySql,company:string){
    const [rows]:any=await sql.query(`SELECT c.autopilot_enabled,
     CASE WHEN p.company_id IS NULL THEN 0 WHEN NOT JSON_VALID(p.data_payload) THEN 1
      WHEN JSON_TYPE(p.data_payload) <> 'OBJECT' THEN 1
      WHEN JSON_EXTRACT(p.data_payload,'$.engine_settings') IS NOT NULL AND JSON_TYPE(JSON_EXTRACT(p.data_payload,'$.engine_settings')) <> 'OBJECT' THEN 1
      WHEN JSON_EXTRACT(p.data_payload,'$.engine_settings.isHolidayPaused') IS NULL THEN 0
      WHEN JSON_TYPE(JSON_EXTRACT(p.data_payload,'$.engine_settings.isHolidayPaused')) = 'BOOLEAN'
       AND JSON_UNQUOTE(JSON_EXTRACT(p.data_payload,'$.engine_settings.isHolidayPaused')) = 'false' THEN 0 ELSE 1 END AS holiday_paused
     FROM companies c LEFT JOIN company_profiles_data p ON p.company_id = c.id WHERE c.id = ?`,[company]);return {enabled:Number(rows[0]?.autopilot_enabled)===1,holiday:Number(rows[0]?.holiday_paused)===1};

}
export async function readAutomaticPublishingControls(pool:import('mysql2/promise').Pool,company:string){return withReadOnlySqlDeadline(pool,sql=>readAutomaticPublishingControlsFromSql(sql,company));}
export async function readPublicationExecutionBlock(pool:import('mysql2/promise').Pool,company:string,mode:PublicationExecutionMode,platforms:string[]):Promise<PauseReason|null>{
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [clients]:any=await sql.query('SELECT status FROM client_operations WHERE company_id=?',[company]);if(clients[0]?.status==='ARCHIVED')return 'CLIENT_ARCHIVED';if(clients.length&&clients[0].status!=='ACTIVE')return 'EXECUTION_CONTROLS_UNAVAILABLE';
  const scoped=scopedPublicationBlock(await readScopedPublicationControlsFromSql(sql,company),platforms);
  if(scoped || mode==='manual')return scoped;
  const state=await readAutomaticPublishingControlsFromSql(sql,company);
  return !state.enabled?'CLIENT_AUTOPILOT_PAUSED':state.holiday?'CLIENT_HOLIDAY_PAUSED':null;
 });
}
