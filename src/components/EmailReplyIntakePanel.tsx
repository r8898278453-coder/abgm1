import React,{useEffect,useRef,useState} from 'react';
import {apiRequest,getStoredToken} from '../services/authService';
import {emailIntakePage} from '../../shared/salesEmailReplyIntakes';
import {formatPlatformDateTime} from '../../shared/platformTime';

type Page=ReturnType<typeof emailIntakePage.parse>;
export function EmailReplyIntakePanel({companyId}:{companyId:string}){
 const [page,setPage]=useState<Page|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function load(before?:string){
  request.current?.abort();
  const controller=new AbortController();
  const token=getStoredToken();
  request.current=controller;
  setPage(null);setBusy(true);setError(false);
  try{
   const response=await apiRequest<{success:boolean;companyId:string;intake:unknown}>(
    '/api/companies/'+encodeURIComponent(companyId)+'/sales/email-reply-intake'+(before?'?before='+encodeURIComponent(before):''),
    {signal:controller.signal});
   if(controller.signal.aborted||token!==getStoredToken())return;
   if(!response.success||response.companyId!==companyId)throw new Error('Workspace changed');
   setPage(emailIntakePage.parse(response.intake));
  }catch{if(!controller.signal.aborted)setError(true);}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 return <section aria-label="Email reply intake history" className="border p-3 space-y-2">
  <h3>Email reply intake history</h3>
  <button type="button" disabled={busy} onClick={()=>void load()}>Load email intake history</button>
  {error&&<p role="alert">Email intake history is unavailable.</p>}
  {page&&<>
   <p>Background recovery {page.enabled?'enabled':'off'}.</p>
   {page.items.length?<ul>{page.items.map(row=><li key={row.id}>
    {formatPlatformDateTime(row.admittedAtMs)} · {row.state.toLowerCase()} · Attempts {row.attempts}
    {row.reason?' · '+row.reason.toLowerCase().replaceAll('_',' '):''}
   </li>)}</ul>:<p>No saved email intake records.</p>}
   {page.nextBefore&&<button type="button" disabled={busy} onClick={()=>void load(page.nextBefore!)}>Older email intake records</button>}
  </>}
 </section>;
}
