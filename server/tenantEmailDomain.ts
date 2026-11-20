import {createHash,randomUUID} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {decryptCredentialsObject} from './db';
import {agencyClientAccess} from './agencyPolicy';
import {agencyAudit} from './agencyRoutes';
import {SalesError,withSalesLock} from './salesWorkspace';
import {localProviderJson} from './localProviderJson';
import {tenantEmailDomainName,tenantEmailDomainProof,tenantEmailDomainStatus,TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS} from '../shared/tenantEmailDomain';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';
import {canonicalJson} from '../shared/canonicalJson';

const exactDomainId=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const CHECK_WINDOW_MS=30000;
const apiKeyPattern=/^re_[A-Za-z0-9_-]{8,253}$/;
type Sender={fingerprint:string;domainId:string;domain:string;apiKey:string};
type Actor={id:string;is_platform_admin?:boolean};

async function currentAccess(sql:ReadOnlySql,actorId:string,company:string,operation:'read'|'manage'){
 const [users]:[RowDataPacket[]]=await sql.query('SELECT id,is_platform_admin FROM users WHERE id=?',[actorId]);
 const current=users[0];
 if(current?.id!==actorId)return {authorized:false,status:403};
 return agencyClientAccess(sql,{id:current.id,is_platform_admin:Number(current.is_platform_admin)===1},company,operation);
}

async function savedSender(sql:ReadOnlySql,company:string,lock=false):Promise<Sender>{
 const [rows]:[RowDataPacket[]]=await sql.query(`SELECT id,company_id,provider,credentials,status
   FROM company_integrations WHERE company_id=? AND provider IN ('transactional_email','smtp')${lock?' FOR UPDATE':''}`,[company]);
 if(rows.length!==1||rows[0].company_id!==company||!['saved','connected','verified','error'].includes(rows[0].status)){
  throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_REQUIRED');
 }
 const row=rows[0];
 const stored=typeof row.credentials==='string'?JSON.parse(row.credentials):row.credentials||{};
 const credentials=decryptCredentialsObject(stored);
 const {provider,resendDomainId,apiKey,fromEmail}=credentials;
 if(provider!=='resend')throw new SalesError(409,'TENANT_EMAIL_PROVIDER_UNSUPPORTED');
 if(typeof resendDomainId!=='string'||!exactDomainId.test(resendDomainId)||typeof apiKey!=='string'||!apiKeyPattern.test(apiKey)||
    typeof fromEmail!=='string'||fromEmail.length>254||!/^[-A-Za-z0-9_+]+(?:\.[-A-Za-z0-9_+]+)*@[^@]+$/.test(fromEmail)){
  throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_REQUIRED');
 }
 const [mailbox,rawDomain]=fromEmail.split('@');
 const domain=rawDomain.toLowerCase();
 if(mailbox.length>64||!tenantEmailDomainName.safeParse(domain).success)throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_REQUIRED');
 const fingerprint=createHash('sha256').update(canonicalJson([company,row.id,row.provider,row.status,stored])).digest('hex');
 return {fingerprint,domainId:resendDomainId,apiKey,domain};
}

async function inspect(binding:Sender,fetcher:typeof fetch){
 try{
  const response=await fetcher('https://api.resend.com/domains/'+binding.domainId,{
   method:'GET',headers:{Authorization:'Bearer '+binding.apiKey,Accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
  });
  if(!response.ok||response.redirected||!/^application\/json\b/i.test(response.headers.get('content-type')||'')){
   await response.body?.cancel().catch(()=>{});
   return 'UNCONFIRMED';
  }
  const result=await localProviderJson(response,32768);
  if(!result||result.id!==binding.domainId||typeof result.name!=='string'||result.name.toLowerCase()!==binding.domain)return 'UNCONFIRMED';
  if(result.status==='verified')return 'VERIFIED_DOMAIN';
  if(['not_started','pending','failure','temporary_failure'].includes(result.status))return 'UNVERIFIED';
 }catch{ /* Provider response and transport error details can contain credentials. */ }
 return 'UNCONFIRMED';
}

export async function verifyTenantEmailDomain(pool:Pool,actor:Actor,company:string,fetcher:typeof fetch=fetch){
 const checkId=randomUUID();
 const binding=await withSalesLock(pool,actor,company,'manage',async(sql,canonical)=>{
  if(canonical!==company)throw new SalesError(404,'CLIENT_NOT_FOUND');
  if(!(await currentAccess(sql,actor.id,canonical,'manage')).authorized)throw new SalesError(403,'TENANT_EMAIL_ACCESS_DENIED');
  const sender=await savedSender(sql,canonical,true);
  const [recent]=await sql.query<RowDataPacket[]>(`SELECT id FROM autonomous_audit_logs
    WHERE company_id=? AND BINARY event_type='AGENCY_TENANT_EMAIL_DOMAIN_CHECK_STARTED'
      AND timestamp>=DATE_SUB(NOW(),INTERVAL 60 SECOND) LIMIT 1`,[company]);
  if(recent.length)throw new SalesError(429,'TENANT_EMAIL_DOMAIN_CHECK_COOLDOWN');
  const startedAtMs=await databaseTime(sql);
  await agencyAudit(sql,company,actor.id,'TENANT_EMAIL_DOMAIN_CHECK_STARTED',{checkId,provider:'resend',fingerprint:sender.fingerprint});
  return {...sender,startedAtMs};
 });

 const state=await inspect(binding,fetcher);
 const proof=await withSalesLock(pool,actor,company,'manage',async(sql,canonical)=>{
  if(!(await currentAccess(sql,actor.id,canonical,'manage')).authorized)throw new SalesError(403,'TENANT_EMAIL_ACCESS_DENIED');
  const current=await savedSender(sql,canonical,true);
  if(canonical!==company||current.fingerprint!==binding.fingerprint){
   throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_CHANGED');
  }
  const checkedAtMs=await databaseTime(sql);
  if(checkedAtMs<binding.startedAtMs||checkedAtMs-binding.startedAtMs>=CHECK_WINDOW_MS)throw new SalesError(409,'TENANT_EMAIL_DOMAIN_CHECK_EXPIRED');
  await agencyAudit(sql,company,actor.id,'TENANT_EMAIL_DOMAIN_CHECK_SETTLED',{checkId,provider:'resend',state,checkedAtMs});
  return state==='VERIFIED_DOMAIN'?tenantEmailDomainProof.parse({provider:'resend',domain:current.domain,state,checkedAtMs}):null;
 });
 if(!proof)throw new SalesError(state==='UNVERIFIED'?409:502,state==='UNVERIFIED'?'TENANT_EMAIL_DOMAIN_UNVERIFIED':'TENANT_EMAIL_DOMAIN_UNCONFIRMED');
 return proof;
}

async function databaseTime(sql:ReadOnlySql){
 const [[clock]]:[RowDataPacket[]]=await sql.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
 const value=Number(clock.nowMs);
 if(!Number.isSafeInteger(value)||value<=0)throw new Error('TENANT_EMAIL_CLOCK_INVALID');
 return value;
}

export async function readTenantEmailDomainStatus(pool:Pool,actor:Actor,company:string){
 return withReadOnlySqlDeadline(pool,async sql=>{
  const access=await currentAccess(sql,actor.id,company,'read');
  if(!access.authorized)throw new SalesError(access.status,'TENANT_EMAIL_ACCESS_DENIED');
  let sender:Sender;
  try{sender=await savedSender(sql,company);}catch(error){
   if(error instanceof SalesError&&error.status===409)return tenantEmailDomainStatus.parse({state:'NOT_CONFIGURED'});
   throw error;
  }
  const [starts]:[RowDataPacket[]]=await sql.query(`SELECT actor,details,UNIX_TIMESTAMP(timestamp)*1000 startedAtMs
   FROM autonomous_audit_logs WHERE company_id=? AND BINARY event_type='AGENCY_TENANT_EMAIL_DOMAIN_CHECK_STARTED'
   ORDER BY timestamp DESC,id DESC LIMIT 1`,[company]);
  const start=starts[0];
  const details=start&&(typeof start.details==='string'?JSON.parse(start.details):start.details);
  if(!details?.fingerprint)return tenantEmailDomainStatus.parse({state:'UNCHECKED'});
  if(details.fingerprint!==sender.fingerprint)return tenantEmailDomainStatus.parse({state:'RECHECK_REQUIRED'});

  const now=await databaseTime(sql),startedAtMs=Number(start.startedAtMs);
  if(!Number.isSafeInteger(startedAtMs)||startedAtMs<=0||startedAtMs>now||
     typeof details.checkId!=='string'||!exactDomainId.test(details.checkId))throw new Error('TENANT_EMAIL_CHECK_START_INVALID');
  if(now-startedAtMs>=TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS+CHECK_WINDOW_MS||
     !(await currentAccess(sql,start.actor,company,'manage')).authorized){
   return tenantEmailDomainStatus.parse({state:'RECHECK_REQUIRED'});
  }
  const [settlements]:[RowDataPacket[]]=await sql.query(`SELECT actor,details
   FROM autonomous_audit_logs WHERE company_id=? AND BINARY event_type='AGENCY_TENANT_EMAIL_DOMAIN_CHECK_SETTLED'
     AND timestamp>=FROM_UNIXTIME(?) AND JSON_UNQUOTE(JSON_EXTRACT(details,'$.checkId'))=? LIMIT 2`,
   [company,startedAtMs/1000,details.checkId]);
  if(!settlements.length)return tenantEmailDomainStatus.parse({state:now-startedAtMs<CHECK_WINDOW_MS?'CHECKING':'UNCONFIRMED'});
  if(settlements.length!==1||settlements[0].actor!==start.actor)throw new Error('TENANT_EMAIL_CHECK_SETTLEMENT_INVALID');
  const settled=typeof settlements[0].details==='string'?JSON.parse(settlements[0].details):settlements[0].details;
  if(settled?.provider!=='resend'||!Number.isSafeInteger(settled.checkedAtMs)||settled.checkedAtMs<startedAtMs||settled.checkedAtMs>now){
   throw new Error('TENANT_EMAIL_CHECK_SETTLEMENT_INVALID');
  }
  const expiresAtMs=settled.checkedAtMs+TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS;
  if(expiresAtMs<=now)return tenantEmailDomainStatus.parse({state:'RECHECK_REQUIRED'});
  if(settled.state==='UNVERIFIED'||settled.state==='UNCONFIRMED')return tenantEmailDomainStatus.parse({state:settled.state});
  return tenantEmailDomainStatus.parse({state:settled.state,expiresAtMs,proof:{provider:'resend',domain:sender.domain,state:settled.state,checkedAtMs:settled.checkedAtMs}});
 });
}
