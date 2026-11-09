import React,{useEffect,useRef,useState} from 'react';
import {apiRequest} from '../services/authService';
import {DISPATCHER_TICK_STATES,dispatcherCursor,parseDispatcherStages} from '../../shared/dispatcher';
import {formatPlatformDateTime} from '../../shared/platformTime';
type History={history:Array<{slot:string;status:string;stages:Record<string,string>;startedAtMs:number;finishedAtMs:number|null}>;nextBefore:string|null};
export function SchedulerHistory(){
 const [data,setData]=useState<History|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const request=useRef<AbortController|null>(null);
 async function load(before?:string){
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');
  try{
   const result=await apiRequest<any>(`/api/scheduler/history?limit=20${before?`&before=${encodeURIComponent(before)}`:''}`,{signal:controller.signal});if(controller.signal.aborted)return;
   if(result.success!==true||!Array.isArray(result.history)||result.history.length>20||(result.nextBefore!==null&&!dispatcherCursor(result.nextBefore)))throw new Error();
   let previous=before?BigInt(before):null;for(const row of result.history){if(!dispatcherCursor(row.slot)||!DISPATCHER_TICK_STATES.includes(row.status)||!Number.isFinite(row.startedAtMs))throw new Error();parseDispatcherStages(row.stages);if(previous!==null&&BigInt(row.slot)>=previous)throw new Error();previous=BigInt(row.slot);}
   if(result.nextBefore!==null&&result.nextBefore!==result.history.at(-1)?.slot)throw new Error();
   setData(prior=>({history:before?[...(prior?.history||[]),...result.history]:result.history,nextBefore:result.nextBefore}));
  }catch{if(!controller.signal.aborted){setData(null);setError('Scheduler history unavailable. Refresh to retry.');}}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 useEffect(()=>{void load();return()=>request.current?.abort();},[]);
 return <section aria-label="Scheduler run history" className="border rounded-2xl p-5 space-y-3 bg-white"><h2 className="font-bold">Scheduler run history</h2><p className="text-sm text-slate-600">Dispatcher records show which stages ran or were deferred. Observed stages do not prove customer delivery or business outcomes; inspect client action history for those results.</p><button disabled={busy} onClick={()=>void load()}>Refresh scheduler history</button>{busy&&<p role="status">Loading scheduler history…</p>}{error&&<p role="alert">{error}</p>}{!busy&&!error&&data?.history.length===0&&<p>No scheduler runs recorded.</p>}{data?.history.map(row=><article key={row.slot} className="border-t pt-3 text-sm"><p>Run {row.slot} · {row.status}</p><p>{formatPlatformDateTime(row.startedAtMs)}</p><p>{Object.entries(row.stages).map(([stage,state])=>`${stage}: ${state}`).join(' · ')||'No stage checkpoint recorded.'}</p></article>)}{data?.nextBefore&&<button disabled={busy} onClick={()=>void load(data.nextBefore!)}>Load older scheduler runs</button>}</section>;
}
