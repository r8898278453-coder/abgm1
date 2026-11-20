import {useEffect,useRef,useState} from 'react';
import {apiRequest,ApiRequestError,getStoredToken} from '../services/authService';
import {salesEmailCommand,salesEmailDispatch,salesEmailReadiness} from '../../shared/tenantSalesEmail';

type Command=ReturnType<typeof salesEmailCommand.parse>;
type Readiness=ReturnType<typeof salesEmailReadiness.parse>;
const blockedLabels:Record<string,string>={
 SALES_EMAIL_DISABLED:'Client email sending is disabled.',
 SALES_EMAIL_REVIEW_CHANGED:'The saved recipient or sender check changed. Reload readiness and review the email again.',
 SALES_EMAIL_ACCESS_DENIED:'Sending requires both approval and execution permissions.',
 SALES_EMAIL_RECIPIENT_REQUIRED:'Add a valid email address to this lead.',
 SALES_EMAIL_IDENTITY_REVIEW_REQUIRED:'Review the lead’s email identity before sending.',
 SALES_EMAIL_SUPPRESSED:'Delivery evidence blocks email to this contact.',
 CONTACT_PERMISSION_REQUIRED:'Save explicit email consent for this lead before sending.',
 SALES_EMAIL_VERIFICATION_REQUIRED:'Verify the sender domain in Integrations first.',
 GLOBAL_EMERGENCY_STOP:'The global stop is active.',
 SALES_PAUSED:'Sales execution is paused.',
 SALES_QUIET_HOURS:'The client’s sales quiet hours are active.',
 SALES_DAILY_CAP:'The client’s sales message allowance has been reached.',
};
const requestKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');

export function SalesEmailPanel({companyId,leadId}:{companyId:string;leadId:string}){
 const [readiness,setReadiness]=useState<Readiness|null>(null);
 const [command,setCommand]=useState<Command|null>(null);
 const [subject,setSubject]=useState(''),[text,setText]=useState('');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[review,setReview]=useState(false);
 const request=useRef<AbortController|null>(null);
 const base='/api/companies/'+encodeURIComponent(companyId)+'/sales/leads/'+encodeURIComponent(leadId);
 useEffect(()=>()=>request.current?.abort(),[]);

 async function call(operation:'read'|'send',approved?:Command){
  if(busy)return;
  const controller=new AbortController();
  request.current?.abort();
  request.current=controller;
  const token=getStoredToken();
  setBusy(true);
  setMessage('');
  if(operation==='read')setReadiness(null);
  try{
   const response=await apiRequest<{success:boolean;companyId:string;email?:unknown;dispatch?:unknown}>(
    base+(operation==='read'?'/email-readiness':'/send-email'),{
     signal:controller.signal,...(approved?{method:'POST',body:JSON.stringify(approved)}:{}),
    });
   if(controller.signal.aborted||token!==getStoredToken())return;
   if(!response.success||response.companyId!==companyId)throw new Error('Workspace changed');
   if(operation==='read'){
    setReadiness(salesEmailReadiness.parse(response.email));
    return;
   }
   const dispatch=salesEmailDispatch.parse(response.dispatch);
   if(dispatch.requestKey!==approved?.requestKey)throw new Error('Receipt mismatch');
   if(dispatch.status==='API_ACCEPTED'){
    setMessage('Resend accepted this email. Delivery is unconfirmed.');
    setCommand(null);setReview(false);setReadiness(null);setSubject('');setText('');
   }else if(dispatch.status==='PAUSED'){
    setMessage('Sending paused before the provider request. Check current sales permissions and retry this approval if appropriate.');
   }else{
    setMessage('This request is unconfirmed. Rechecking this request preserves the same approval and will not resend an uncertain email.');
   }
  }catch(error){
   if(!controller.signal.aborted&&token===getStoredToken()){
    const code=error instanceof ApiRequestError?error.message:'';
    if(operation==='send'&&!command&&Object.hasOwn(blockedLabels,code)){
     setCommand(null);
     setReview(false);
     setReadiness(null);
     setMessage(blockedLabels[code]);
    }else{
     setMessage(operation==='send'?'Result unavailable. Retry the same approval to recover the result before sending another email.':'Email readiness is unavailable.');
    }
   }
  }finally{if(!controller.signal.aborted)setBusy(false);}
 }

 function approve(){
  if(command||!readiness?.recipient||!readiness.sender)return;
  const parsed=salesEmailCommand.safeParse({recipient:readiness.recipient,senderCheckedAtMs:readiness.sender.checkedAtMs,subject,text,requestKey:requestKey()});
  if(!parsed.success){setMessage('Enter a valid subject and plain-text message.');return;}
  setCommand(parsed.data);
  void call('send',parsed.data);
 }

 return <section aria-label="Client sales email" className="border rounded-xl p-3 space-y-2">
  <h3>Client sales email</h3>
  <button type="button" disabled={busy||Boolean(command)||review} onClick={()=>void call('read')}>Check email readiness</button>
  {readiness?.blocked&&<p>{blockedLabels[readiness.blocked]||'Email sending is currently unavailable.'}</p>}
  {readiness&&!readiness.blocked&&readiness.sender&&<>
   <p>To {readiness.recipient} · Sender domain {readiness.sender.domain}</p>
   {review?<><p className="font-semibold break-words">{subject}</p><p className="whitespace-pre-wrap break-words">{text}</p></>:
    <div className="grid gap-2">
     <label>Subject <input value={subject} maxLength={160} onChange={e=>setSubject(e.target.value)}/></label>
     <label>Plain-text email <textarea value={text} maxLength={4000} onChange={e=>setText(e.target.value)}/></label>
     <button type="button" disabled={busy||!subject.trim()||!text.trim()} onClick={()=>{setSubject(subject.trim());setText(text.trim());setReview(true);}}>Review exact email</button>
    </div>}
   {review&&!command&&<div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setReview(false)}>Edit email</button>
    <button type="button" disabled={busy} onClick={approve}>Approve and send email</button></div>}
   {command&&<button type="button" disabled={busy} onClick={()=>void call('send',command)}>Retry same email approval</button>}
  </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
