import {useEffect,useRef,useState} from 'react';
import {apiRequest,ApiRequestError,getStoredToken} from '../services/authService';
import {tenantEmailDomainProof,tenantEmailDomainStatus,TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS} from '../../shared/tenantEmailDomain';
import {formatPlatformDateTime} from '../../shared/platformTime';

const messages:Record<string,string>={
 TENANT_EMAIL_CONFIGURATION_REQUIRED:'Save the client’s Resend API key, domain ID and From address, then check again.',
 TENANT_EMAIL_PROVIDER_UNSUPPORTED:'The saved provider must be Resend for this check.',
 TENANT_EMAIL_ACCESS_DENIED:'A workspace manager can verify this domain.',
 SALES_ACCESS_DENIED:'A workspace manager can verify this domain.',
 TENANT_EMAIL_DOMAIN_CHECK_COOLDOWN:'Wait one minute between domain checks.',
 TENANT_EMAIL_CONFIGURATION_CHANGED:'The saved sender changed. Check the current configuration again.',
 TENANT_EMAIL_DOMAIN_UNVERIFIED:'Resend reports that the configured domain is unverified.',
};
const statusText={
 NOT_CONFIGURED:'Save the Resend settings to check the sender domain.',
 UNCHECKED:'The saved Resend domain is awaiting its first check.',
 CHECKING:'A domain check was started. Refresh its status for the result.',
 UNVERIFIED:messages.TENANT_EMAIL_DOMAIN_UNVERIFIED,
 UNCONFIRMED:'The configured domain could not be confirmed.',
 RECHECK_REQUIRED:'Run a new domain check to refresh the saved verification.',
};
type Result={text:string;okay:boolean;token:string|null;expiresAtMs?:number};

export function TenantEmailDomainCheck({companyId,saved}:{companyId:string;saved:boolean}){
 const request=useRef<AbortController|null>(null);
 const [pending,setPending]=useState<'read'|'verify'|null>(null);
 const [result,setResult]=useState<Result|null>(null);
 const base='/api/companies/'+encodeURIComponent(companyId)+'/tenant-email/';

 async function load(operation:'read'|'verify'){
  request.current?.abort();
  const controller=new AbortController();
  request.current=controller;
  const token=getStoredToken();
  setResult(null);
  setPending(operation);
  try{
   const response=await apiRequest<{success:boolean;companyId:string;domain:unknown}>(
    base+(operation==='verify'?'verify-domain':'domain-status'),{
     ...(operation==='verify'?{method:'POST',body:'{}'}:{}),signal:controller.signal,
    });
   if(controller.signal.aborted||token!==getStoredToken())return;
   if(!response.success||response.companyId!==companyId)throw new Error('Workspace mismatch');
   const status=operation==='read'?tenantEmailDomainStatus.parse(response.domain):
     {state:'VERIFIED_DOMAIN' as const,proof:tenantEmailDomainProof.parse(response.domain)};
   if(status.state==='VERIFIED_DOMAIN'){
    const expiresAtMs='expiresAtMs' in status?status.expiresAtMs:status.proof.checkedAtMs+TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS;
    setResult({token,okay:true,expiresAtMs,text:`Resend verified ${status.proof.domain} at ${formatPlatformDateTime(status.proof.checkedAtMs)}.`});
   }else setResult({token,okay:true,text:statusText[status.state]});
  }catch(error){
   if(!controller.signal.aborted&&token===getStoredToken()){
    const code=error instanceof ApiRequestError?error.message:undefined;
    setResult({token,okay:false,text:code&&Object.hasOwn(messages,code)?messages[code]:'The configured domain could not be confirmed.'});
   }
  }finally{
   if(!controller.signal.aborted)setPending(null);
  }
 }
 useEffect(()=>{
  if(saved)void load('read');
  return ()=>request.current?.abort();
 },[companyId,saved]);
 useEffect(()=>{
  if(!result?.expiresAtMs)return;
  const timer=setTimeout(()=>setResult(current=>current===result?
    {token:result.token,okay:true,text:statusText.RECHECK_REQUIRED}:current),Math.max(0,Math.min(TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS,result.expiresAtMs-Date.now())));
  return ()=>clearTimeout(timer);
 },[result]);

 return <div className="space-y-2 text-xs text-slate-600">
  <div className="flex flex-wrap gap-2">
   <button type="button" className="rounded-lg border border-slate-300 px-2.5 py-1 font-semibold" disabled={!saved||pending!==null} onClick={()=>void load('verify')}>
    {pending==='verify'?'Checking domain…':'Verify saved Resend domain'}
   </button>
   {saved&&<button type="button" className="rounded-lg border border-slate-300 px-2.5 py-1" disabled={pending!==null} onClick={()=>void load('read')}>
    {pending==='read'?'Loading saved check…':'Refresh saved check'}
   </button>}
  </div>
  <p>Review individual emails in the Sales workspace. Delivery and reply tracking are pending.</p>
  {result&&result.token===getStoredToken()&&<p role={result.okay?'status':'alert'}>{result.text}</p>}
 </div>;
}
