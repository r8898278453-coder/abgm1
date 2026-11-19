import type {Express,Request} from 'express';
import type {Pool} from 'mysql2/promise';
import {CrmError} from './crmErrors';
import {crmId} from '../shared/crmIdentity';
import {readIdentityContacts} from './crmIdentity';
import {readSalesReport} from './salesWorkspace';
import {platformDayBounds} from '../shared/dailyWorkReport';
import {readDeveloperSettings,createDeveloperKey,changeDeveloperKey,authorizeDeveloper,currentDeveloperPermit,createDeveloperSubscription,changeDeveloperSubscription,readDeveloperEvents,readDeveloperDeliveries} from './developerStore';
import {replayDeveloperEvent,deliverDeveloperWebhook} from './developerDelivery';
export function registerDeveloperRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;pool:()=>Promise<Pool|null>}){
 const controls=[['get','/api/companies/:companyId/developer/settings'],['post','/api/companies/:companyId/developer/keys'],['post','/api/companies/:companyId/developer/keys/:keyId/rotate'],['post','/api/companies/:companyId/developer/keys/:keyId/revoke'],['post','/api/companies/:companyId/developer/subscriptions'],['post','/api/companies/:companyId/developer/subscriptions/:subscriptionId/rotate'],['post','/api/companies/:companyId/developer/subscriptions/:subscriptionId/revoke'],['post','/api/companies/:companyId/developer/subscriptions/:subscriptionId/replay'],['get','/api/companies/:companyId/developer/deliveries'],['post','/api/companies/:companyId/developer/deliveries/:deliveryId/attempt']] as const;
 for(const[method,path]of controls)app[method](path,async(req,res)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});try{
 const params=req.params as Record<string,string>;const user=await deps.auth(req);if(!user)throw new CrmError(401,'DEVELOPER_AUTH_REQUIRED');if(Object.values(req.params).some(v=>!crmId.safeParse(v).success)||Object.keys(req.query).some(k=>!(path.endsWith('/deliveries')&&k==='before'))||Object.values(req.query).some(v=>typeof v!=='string'))throw new CrmError(400,'DEVELOPER_REQUEST_INVALID');const pool=await deps.pool();if(!pool)throw new CrmError(503,'DEVELOPER_STORAGE_UNAVAILABLE');const company=String(req.params.companyId);let result:any;
 if(path.endsWith('/settings'))result=await readDeveloperSettings(pool,user,company);
 else if(path.endsWith('/keys'))result=await createDeveloperKey(pool,user,company,req.body);
 else if(params.keyId)result=await changeDeveloperKey(pool,user,company,String(params.keyId),path.endsWith('/rotate')?'rotate':'revoke',req.body);
 else if(path.endsWith('/subscriptions'))result=await createDeveloperSubscription(pool,user,company,req.body);
 else if(path.endsWith('/replay'))result=await replayDeveloperEvent(pool,user,company,String(params.subscriptionId),req.body);
 else if(params.subscriptionId)result=await changeDeveloperSubscription(pool,user,company,String(params.subscriptionId),path.endsWith('/rotate')?'rotate':'revoke',req.body);
 else if(path.endsWith('/attempt')){if(!req.body||Object.keys(req.body).length||Array.isArray(req.body))throw new CrmError(400,'DEVELOPER_REQUEST_INVALID');result=await deliverDeveloperWebhook(pool,user,company,String(params.deliveryId));}
 else result=await readDeveloperDeliveries(pool,user,company,req.query.before as string|undefined);
 res.json({success:true,companyId:company,...result});
 }catch(e){res.status(e instanceof CrmError?e.status:503).json({success:false,error:e instanceof CrmError?e.code:'DEVELOPER_OPERATION_UNCONFIRMED'});}});
 const facade=[['/api/developer/v1/companies/:companyId/contacts','contacts:read'],['/api/developer/v1/companies/:companyId/sales-report','sales:read'],['/api/developer/v1/companies/:companyId/events','events:read']] as const;
 for(const[path,scope]of facade)app.get(path,async(req,res)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});try{
 if(!crmId.safeParse(req.params.companyId).success||Object.keys(req.query).some(k=>k!==(scope==='sales:read'?'date':'before'))||Object.values(req.query).some(v=>typeof v!=='string'))throw new CrmError(400,'DEVELOPER_REQUEST_INVALID');if(scope==='sales:read'){try{platformDayBounds(req.query.date as string);}catch{throw new CrmError(400,'DEVELOPER_DATE_INVALID');}}
 const pool=await deps.pool();if(!pool)throw new CrmError(503,'DEVELOPER_STORAGE_UNAVAILABLE');const bearer=/^Bearer (abgm_\S+)$/.exec(String(req.headers.authorization||''));const company=String(req.params.companyId),permit=await authorizeDeveloper(pool,bearer?.[1],company,scope);let result:any;
 if(scope==='contacts:read'){const records=await readIdentityContacts(pool,company,req.query.before as string|undefined,permit.user);result={contacts:records.contacts.map((r:any)=>({id:r.id,name:r.name,phone:r.phone,email:r.email,stage:r.stage,state:r.state,canonicalLeadId:r.state==='ACTIVE'?r.target_lead_id:r.id})),nextBefore:records.nextBefore};}
 else if(scope==='sales:read')result={report:await readSalesReport(pool,company,req.query.date as string)};
 else result=await readDeveloperEvents(pool,permit.user,company,req.query.before as string|undefined);
 await currentDeveloperPermit(pool,company,permit);res.json({success:true,version:1,companyId:company,...result});
 }catch(e){if(e instanceof CrmError&&e.status===429)res.set('Retry-After','60');res.status(e instanceof CrmError?e.status:503).json({success:false,error:e instanceof CrmError?e.code:'DEVELOPER_OPERATION_UNCONFIRMED'});}});
}
