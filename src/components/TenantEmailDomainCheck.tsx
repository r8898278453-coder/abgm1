import {useEffect,useRef,useState} from 'react';
import {apiRequest,ApiRequestError,getStoredToken} from '../services/authService';
import {tenantEmailDomainProof} from '../../shared/tenantEmailDomain';
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

export function TenantEmailDomainCheck({companyId}:{companyId:string}){
 const request=useRef<AbortController|null>(null);
 const [pending,setPending]=useState(false);
 const [result,setResult]=useState<{text:string;okay:boolean;token:string|null}|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function check(){
  request.current?.abort();
  const controller=new AbortController();
  request.current=controller;
  const token=getStoredToken();
  setResult(null);
  setPending(true);
  try{
   const response=await apiRequest<{success:boolean;companyId:string;domain:unknown}>(
    '/api/companies/'+encodeURIComponent(companyId)+'/tenant-email/verify-domain',
    {method:'POST',body:'{}',signal:controller.signal});
   if(controller.signal.aborted||token!==getStoredToken())return;
   if(!response.success||response.companyId!==companyId)throw new Error('Workspace mismatch');
   const proof=tenantEmailDomainProof.parse(response.domain);
   setResult({token,okay:true,text:`Resend verified ${proof.domain} at ${formatPlatformDateTime(proof.checkedAtMs)}.`});
  }catch(error){
   if(!controller.signal.aborted&&token===getStoredToken()){
    const code=error instanceof ApiRequestError?error.message:undefined;
    setResult({token,okay:false,text:code&&Object.hasOwn(messages,code)?messages[code]:'The configured domain could not be confirmed.'});
   }
  }finally{
   if(!controller.signal.aborted)setPending(false);
  }
 }
 return <div className="space-y-2 text-xs text-slate-600">
  <button type="button" className="rounded-lg border border-slate-300 px-2.5 py-1 font-semibold" disabled={pending} onClick={()=>void check()}>
   {pending?'Checking domain…':'Verify saved Resend domain'}
  </button>
  <p>Domain verification checks the saved From domain. Email sending and reply tracking are pending.</p>
  {result&&result.token===getStoredToken()&&<p role={result.okay?'status':'alert'}>{result.text}</p>}
 </div>;
}
