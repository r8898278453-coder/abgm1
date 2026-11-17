import type {Pool} from 'mysql2/promise';
import type {Express,Request} from 'express';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {platformDateKey,platformDayBounds} from '../shared/dailyWorkReport';
import {CAPACITY_KEYS,capacityRows,validateOperationalCapacity} from '../shared/operationalCapacity';
export async function readOperationalCapacity(pool:Pool,company:string){if(typeof company!=='string'||!company||company.length>64)throw new Error('OPERATIONAL_CAPACITY_SCOPE_INVALID');return withReadOnlySqlDeadline(pool,async sql=>{
 const [clock]:any=await sql.query('SELECT UNIX_TIMESTAMP()*1000 checkedAtMs');const checkedAtMs=Number(clock[0].checkedAtMs);if(!Number.isSafeInteger(checkedAtMs)||checkedAtMs<0)throw new Error('OPERATIONAL_CAPACITY_CLOCK_INVALID');const dayIST=platformDateKey(checkedAtMs),{start,end}=platformDayBounds(dayIST);
 const [rows]:any=await sql.query(`SELECT
 (SELECT COUNT(*) FROM daily_report_snapshots WHERE company_id=?) snapshots,
 (SELECT COUNT(*) FROM report_capture_runs WHERE company_id=?) captureRuns,
 (SELECT COUNT(*) FROM report_capture_runs WHERE company_id=? AND BINARY state='QUEUED') capturePending,
 (SELECT COUNT(*) FROM notification_occurrences WHERE company_id=? AND BINARY notification_kind='daily_digest') dailyNotifications,
 (SELECT COUNT(*) FROM notification_occurrences WHERE company_id=? AND BINARY notification_kind='review_reminder') reviewNotifications,
 (SELECT COUNT(*) FROM notification_occurrences WHERE company_id=? AND BINARY notification_kind='critical_alert') criticalNotifications,
 (SELECT COUNT(*) FROM critical_alert_reservations WHERE company_id=?) criticalReservations,
 (SELECT COUNT(*) FROM telegram_manual_intents WHERE company_id=?) manualRequests,
 (SELECT COUNT(*) FROM telegram_manual_intents WHERE company_id=? AND created_at>=FROM_UNIXTIME(?) AND created_at<FROM_UNIXTIME(?)) manualToday`,[...Array(9).fill(company),start/1000,end/1000]);
 const counts=Object.fromEntries(CAPACITY_KEYS.map(key=>{const raw=rows[0]?.[key];if(raw===null||raw===undefined||typeof raw!=='number'&&!(typeof raw==='string'&&/^(0|[1-9][0-9]*)$/.test(raw)))throw new Error('OPERATIONAL_CAPACITY_COUNT_INVALID');return[key,Number(raw)];}));
 return validateOperationalCapacity({companyId:company,modelVersion:1,timeZone:'Asia/Kolkata',checkedAtMs,dayIST,resources:capacityRows(counts)},company);
 });}
export function registerOperationalCapacity(app:Express,deps:{auth:(req:Request)=>Promise<any>;access:(user:any,company:string)=>Promise<{authorized:boolean;status:number}>;read:(company:string)=>Promise<any>}){app.get('/api/companies/:companyId/operational-capacity',async(req,res)=>{res.set('Cache-Control','no-store');try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return;}const company=req.params.companyId;if(!company||company.length>64||Object.keys(req.query).length){res.status(400).json({success:false,error:'OPERATIONAL_CAPACITY_SCOPE_INVALID'});return;}const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'OPERATIONAL_CAPACITY_ACCESS_DENIED'});return;}const data=await deps.read(company);validateOperationalCapacity(data,company);res.json({success:true,...data});}catch{res.status(503).json({success:false,error:'OPERATIONAL_CAPACITY_UNAVAILABLE'});}});}
