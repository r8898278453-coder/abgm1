import type {Pool} from 'mysql2/promise';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
/** Default boundary for legacy adapters without a stronger actor/config-bound callback. */
export async function clientActiveForExecution(company:string,poolOverride?:Pool){if(typeof company!=='string'||!company||company.length>64)return false;try{let pool=poolOverride;if(!pool){const db=await import('./db');pool=await db.getDbPool()||undefined;if(!pool)return !db.getDbStatus().configured;}return withReadOnlySqlDeadline(pool,async sql=>{const [rows]:any=await sql.query('SELECT status FROM client_operations WHERE company_id=?',[company]);return rows.length===1&&rows[0].status==='ACTIVE';});}catch{return false;}}
