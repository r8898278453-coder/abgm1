import {randomUUID} from 'node:crypto';
import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import {decryptCredentialsObject} from './db';
import {agencyClientAccess} from './agencyPolicy';
import {agencyAudit} from './agencyRoutes';
import {SalesError,withSalesLock} from './salesWorkspace';
import {localProviderJson} from './localProviderJson';
import {tenantEmailDomainName,tenantEmailDomainProof} from '../shared/tenantEmailDomain';

const exactDomainId=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const apiKeyPattern=/^re_[A-Za-z0-9_-]{8,253}$/;
type Sender={id:string;domainId:string;domain:string;apiKey:string;fromEmail:string};
type Actor={id:string;is_platform_admin?:boolean};

async function savedSender(sql:PoolConnection,actor:Actor,company:string):Promise<Sender>{
 const [users]=await sql.query<RowDataPacket[]>('SELECT id,is_platform_admin FROM users WHERE id=?',[actor.id]);
 const current=users[0];
 if(current?.id!==actor.id||!(await agencyClientAccess(sql,{id:current.id,is_platform_admin:Number(current.is_platform_admin)===1},company,'manage')).authorized){
  throw new SalesError(403,'TENANT_EMAIL_ACCESS_DENIED');
 }
 const [rows]=await sql.query<RowDataPacket[]>(`SELECT id,company_id,provider,credentials,status
   FROM company_integrations WHERE company_id=? AND provider IN ('transactional_email','smtp') FOR UPDATE`,[company]);
 if(rows.length!==1||rows[0].company_id!==company||!['saved','connected','verified','error'].includes(rows[0].status)){
  throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_REQUIRED');
 }
 const row=rows[0];
 const credentials=decryptCredentialsObject(typeof row.credentials==='string'?JSON.parse(row.credentials):row.credentials||{});
 const {provider,resendDomainId,apiKey,fromEmail}=credentials;
 if(provider!=='resend')throw new SalesError(409,'TENANT_EMAIL_PROVIDER_UNSUPPORTED');
 if(typeof resendDomainId!=='string'||!exactDomainId.test(resendDomainId)||typeof apiKey!=='string'||!apiKeyPattern.test(apiKey)||
    typeof fromEmail!=='string'||fromEmail.length>254||!/^[-A-Za-z0-9_+]+(?:\.[-A-Za-z0-9_+]+)*@[^@]+$/.test(fromEmail)){
  throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_REQUIRED');
 }
 const [mailbox,rawDomain]=fromEmail.split('@');
 const domain=rawDomain.toLowerCase();
 if(mailbox.length>64||!tenantEmailDomainName.safeParse(domain).success)throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_REQUIRED');
 return {id:row.id,domainId:resendDomainId,apiKey,fromEmail,domain};
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
  const sender=await savedSender(sql,actor,canonical);
  const [recent]=await sql.query<RowDataPacket[]>(`SELECT id FROM autonomous_audit_logs
    WHERE company_id=? AND BINARY event_type='AGENCY_TENANT_EMAIL_DOMAIN_CHECK_STARTED'
      AND timestamp>=DATE_SUB(NOW(),INTERVAL 60 SECOND) LIMIT 1`,[company]);
  if(recent.length)throw new SalesError(429,'TENANT_EMAIL_DOMAIN_CHECK_COOLDOWN');
  await agencyAudit(sql,company,actor.id,'TENANT_EMAIL_DOMAIN_CHECK_STARTED',{checkId,provider:'resend'});
  return sender;
 });

 const state=await inspect(binding,fetcher);
 const proof=await withSalesLock(pool,actor,company,'manage',async(sql,canonical)=>{
  const current=await savedSender(sql,actor,canonical);
  if(canonical!==company||current.id!==binding.id||current.domainId!==binding.domainId||
     current.apiKey!==binding.apiKey||current.fromEmail!==binding.fromEmail){
   throw new SalesError(409,'TENANT_EMAIL_CONFIGURATION_CHANGED');
  }
  const [[clock]]=await sql.query<RowDataPacket[]>('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
  const checkedAtMs=Number(clock.nowMs);
  await agencyAudit(sql,company,actor.id,'TENANT_EMAIL_DOMAIN_CHECK_SETTLED',{checkId,provider:'resend',state});
  return state==='VERIFIED_DOMAIN'?tenantEmailDomainProof.parse({provider:'resend',domain:current.domain,state,checkedAtMs}):null;
 });
 if(!proof)throw new SalesError(state==='UNVERIFIED'?409:502,state==='UNVERIFIED'?'TENANT_EMAIL_DOMAIN_UNVERIFIED':'TENANT_EMAIL_DOMAIN_UNCONFIRMED');
 return proof;
}
