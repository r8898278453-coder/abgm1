import type {Express,Request} from 'express';
import type {Pool} from 'mysql2/promise';
import {agencyClientAccess} from './agencyPolicy';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {readDeclaredCostEvidence} from './growthOperations';
import {readOperationalCapacity} from './operationalCapacity';
import {validateAgencyOperationsDetail} from '../shared/agencyOperationsDetail';
export async function readAgencyOperationsDetail(pool:Pool,user:any,company:string){
 const read=await withReadOnlySqlDeadline(pool,async sql=>{
 const[u]:any=await sql.query('SELECT id,is_platform_admin FROM users WHERE id=?',[user?.id]);if(u.length!==1)throw Error('ACCESS_DENIED');const actor={id:u[0].id,is_platform_admin:Number(u[0].is_platform_admin)===1};if(!(await agencyClientAccess(sql,actor,company,'read')).authorized)throw Error('ACCESS_DENIED');
 const[clock]:any=await sql.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
 const[rows]:any=await sql.query('SELECT provider,status FROM company_integrations WHERE company_id=? ORDER BY provider,id LIMIT 101',[company]);if(rows.length>100)throw Error('CONNECTION_CAPACITY');
 const costs=await readDeclaredCostEvidence(sql,company),declaredCostMinor:Record<string,string>={};for(const c of costs)declaredCostMinor[c.currency]=(BigInt(declaredCostMinor[c.currency]||'0')+BigInt(c.amountMinor)).toString();
 return{companyId:company,checkedAtMs:Number(clock[0].nowMs),connections:rows.map((r:any)=>({provider:r.provider,status:r.status})),declaredCostMinor,actor};
 });
 const capacity=await readOperationalCapacity(pool,company);const[current]:any=await pool.query('SELECT id,is_platform_admin FROM users WHERE id=?',[read.actor.id]);if(current.length!==1||!(await agencyClientAccess(pool,{id:current[0].id,is_platform_admin:Number(current[0].is_platform_admin)===1},company,'read')).authorized)throw Error('ACCESS_DENIED');
 const{actor,...data}=read;return validateAgencyOperationsDetail({...data,modelVersion:1,timeZone:'Asia/Kolkata',capacity,providerHealth:'UNVERIFIED',costEvidence:'DECLARED_UNVERIFIED',revenue:null,roi:null},company);
}
export function registerAgencyOperationsDetail(app:Express,deps:{auth:(req:Request)=>Promise<any>;pool:()=>Promise<Pool|null>}){app.get('/api/companies/:companyId/agency-operations-detail',async(req,res)=>{res.set('Cache-Control','no-store');try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return;}const company=String(req.params.companyId);if(!/^[A-Za-z0-9_-]{1,64}$/.test(company)||Object.keys(req.query).length){res.status(400).json({success:false,error:'SCOPE_INVALID'});return;}const pool=await deps.pool();if(!pool)throw Error('STORAGE_UNAVAILABLE');if(!(await agencyClientAccess(pool,user,company,'read')).authorized){res.status(403).json({success:false,error:'ACCESS_DENIED'});return;}res.json({success:true,...await readAgencyOperationsDetail(pool,user,company)});}catch{res.status(503).json({success:false,error:'AGENCY_DETAIL_UNAVAILABLE'});}});}
