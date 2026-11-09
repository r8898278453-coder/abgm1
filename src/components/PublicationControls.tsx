import {PUBLICATION_CHANNELS,type ScopedPublicationControls as Controls} from '../../shared/publicationControls';
import React,{useEffect,useRef,useState} from 'react';
import {apiRequest,ApiRequestError} from '../services/authService';
import {formatPlatformDateTime} from '../../shared/platformTime';
const channels:readonly string[]=PUBLICATION_CHANNELS;
function valid(value:Controls){return value && /^(0|[1-9]\d{0,19})$/.test(value.version)&&BigInt(value.version)<=18446744073709551615n&&typeof value.paused==='boolean'&&Array.isArray(value.channels)&&value.channels.every(channel=>channels.includes(channel))&&(value.dailyPostLimit===null||(Number.isInteger(value.dailyPostLimit)&&value.dailyPostLimit>0&&value.dailyPostLimit<=100000))&&value.quota&&/^\d{4}-\d{2}-\d{2}$/.test(value.quota.date)&&Number.isSafeInteger(value.quota.reservedPosts)&&value.quota.reservedPosts>=0;}
export const PublicationControls:React.FC<{companyId:string}>=({companyId})=>{
 const [limited,setLimited]=useState(false),[limit,setLimit]=useState('100'),[audit,setAudit]=useState<{history:any[];nextBefore:string|null}|null>(null);
 const [stored,setStored]=useState<Controls|null>(null),[paused,setPaused]=useState(false),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const request=useRef<AbortController|null>(null);
 const path=`/api/companies/${encodeURIComponent(companyId)}/publication-controls`;
 async function load(){
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setNotice('');setStored(null);setAudit(null);
  try{const result=await apiRequest<{success:boolean;controls:Controls}>(path,{signal:controller.signal});if(controller.signal.aborted)return;if(!result.success||!valid(result.controls))throw new Error();setStored(result.controls);setPaused(result.controls.paused);setSelected(result.controls.channels);setLimited(result.controls.dailyPostLimit!==null);setLimit(String(result.controls.dailyPostLimit || 100));}
  catch{if(!controller.signal.aborted)setError('Publishing controls unavailable. Reload before changing pauses.');}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 useEffect(()=>{void load();return()=>request.current?.abort();},[companyId]);
 async function save(){
  if(!stored||busy||!limitValid)return;request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setNotice('');
  try{
   const result=await apiRequest<{success:boolean;controls:Controls}>(path,{method:'PATCH',signal:controller.signal,body:JSON.stringify({expectedVersion:stored.version,paused,channels:selected,dailyPostLimit:limited?Number(limit):null})});
   if(controller.signal.aborted)return;
   if(!result.success||!valid(result.controls)||BigInt(result.controls.version)<=BigInt(stored.version)||result.controls.dailyPostLimit!==(limited?Number(limit):null)||result.controls.paused!==paused||JSON.stringify([...result.controls.channels].sort())!==JSON.stringify([...selected].sort()))throw new Error();
   setStored(result.controls);setAudit(null);setNotice('Publishing controls saved. New publishing starts use these pauses.');
  }catch(cause){if(!controller.signal.aborted){setStored(null);setError(cause instanceof ApiRequestError&&cause.status===409?'Publishing controls changed elsewhere. Reload before saving.':'Changes unconfirmed. Reload to check the saved state before retrying.');}}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 const limitValid=!limited || (limit!=='' && Number.isInteger(Number(limit)) && Number(limit)>=1 && Number(limit)<=100000);
 const changed=stored&&((limited?Number(limit):null)!==stored.dailyPostLimit || paused!==stored.paused || JSON.stringify([...selected].sort())!==JSON.stringify([...stored.channels].sort()));
 async function loadHistory(before?:string){
  if(busy)return;request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');
  try{
   const result=await apiRequest<{success:boolean;history:any[];nextBefore:string|null}>(`${path}/history${before?`?before=${encodeURIComponent(before)}`:''}`,{signal:controller.signal});
   if(controller.signal.aborted)return;
   if(!result.success || !Array.isArray(result.history))throw new Error();
   setAudit(previous=>({history:before?[...(previous?.history || []),...result.history]:result.history,nextBefore:result.nextBefore}));
  }catch{if(!controller.signal.aborted)setError('Control history unavailable. Retry loading history.');}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 const describe=(state:any)=>`Workspace pause ${state.paused?'On':'Off'}; channels ${(state.channels || []).join(', ') || 'None'}; daily admission limit ${state.dailyPostLimit===undefined?'not recorded':state.dailyPostLimit===null?'unlimited':state.dailyPostLimit}`;
 return <section aria-label="Workspace publishing controls" className="bg-white border border-slate-200 rounded-3xl p-6 mt-6 space-y-3">
  <h2 className="text-lg font-bold">Publishing controls</h2>
  <p className="text-sm text-slate-500">Pauses apply to new manual and automatic publishing starts. Publishing already in progress may still finish. Changes take effect after a confirmed save. A post targeting a paused channel waits as a whole. Global stop and approval rules also apply.</p>
  <button onClick={()=>void load()} disabled={busy} className="text-sm text-indigo-700">Reload publishing controls</button>
  {busy&&<p role="status">Updating publishing controls…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {stored&&<p className="text-sm">Saved workspace pause: {stored.paused?'On':'Off'} · Paused channels: {stored.channels.join(', ') || 'None'}{stored.updatedAtMs && <> · {formatPlatformDateTime(stored.updatedAtMs)} · {stored.updatedBy?`Actor ${stored.updatedBy}`:'System default'}</>}</p>}
  <label className="block text-sm"><input type="checkbox" aria-label="Pause workspace publishing" checked={paused} disabled={busy||!stored} onChange={event=>setPaused(event.target.checked)}/> Pause workspace publishing</label>
  <fieldset disabled={busy||!stored}><legend className="text-sm">Pause selected publishing channels</legend><div className="flex flex-wrap gap-3">{channels.map(channel=><label key={channel} className="text-sm"><input aria-label={`Pause ${channel} publishing`} type="checkbox" checked={selected.includes(channel)} onChange={event=>setSelected(previous=>event.target.checked?[...previous,channel]:previous.filter(value=>value!==channel))}/>{channel}</label>)}</div></fieldset>
  {stored?.quota && <p className="text-sm">Admission usage snapshot — {stored.quota.date} IST: {stored.quota.reservedPosts} reserved post starts · Daily limit: {stored.dailyPostLimit===null?'Unlimited':stored.dailyPostLimit}</p>}
  <label className="block text-sm"><input aria-label="Use daily publishing admission limit" type="checkbox" checked={limited} disabled={busy||!stored} onChange={event=>setLimited(event.target.checked)}/> Use a daily publishing admission limit</label>
  {limited && <label className="block text-sm">Posts per IST day <input aria-label="Daily publishing admission limit" type="number" min={1} max={100000} step={1} value={limit} disabled={busy||!stored} onChange={event=>setLimit(event.target.value)}/></label>}
  <p className="text-sm text-slate-500">Reservations count admitted posts, not confirmed publication or API calls. Same-post retries reuse that day's reservation; failed or uncertain starts retain it.</p>
  <button disabled={busy||!stored||!changed||!limitValid} onClick={()=>void save()} className="text-sm font-semibold text-indigo-700 disabled:opacity-50">Save publishing controls</button>
  <button disabled={busy} onClick={()=>void loadHistory()} className="text-sm text-indigo-700">Load control history</button>
  {audit && <><ul aria-label="Publishing control change history">{audit.history.map(row=><li key={row.id} className="text-sm py-2">Version {row.version} · Actor {row.actor_id} · {row.recordedAtMs===null?'Time unavailable':formatPlatformDateTime(row.recordedAtMs)}<p>Before: {describe(row.before_state)}</p><p>After: {describe(row.after_state)}</p></li>)}</ul>{audit.history.length===0 && <p>No control changes recorded.</p>}{audit.nextBefore && <button disabled={busy} onClick={()=>void loadHistory(audit.nextBefore!)}>Older control changes</button>}</>}
 </section>;
};
