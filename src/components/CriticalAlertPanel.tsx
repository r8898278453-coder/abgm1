import {OPERATIONAL_LIMITS} from '../../shared/operationalCapacity';
import React,{useEffect,useRef,useState} from 'react';
import {apiRequest,getStoredToken} from '../services/authService';
import {CRITICAL_ALERT_SIGNALS,validateCriticalAlertHistory} from '../../shared/criticalAlerts';
import {formatPlatformDateTime} from '../../shared/platformTime';

const stageLabels=['Initial alert','Escalation after 1 hour','Escalation after 24 hours'];
const statusLabels:Record<string,string>={RUNNING:'Provider boundary recorded; outcome pending',SENT:'Telegram API accepted',UNKNOWN:'Outcome unconfirmed'};
/** A new client starts closed. Evidence reads never observe sources or send alerts. */
export const CriticalAlertPanel:React.FC<{companyId:string}>=p=><Panel key={p.companyId} {...p}/>;
const Panel:React.FC<{companyId:string}>=({companyId})=>{
 const [open,setOpen]=useState(false);
 return <section aria-label="Critical alert evidence" className="border rounded-xl p-3 space-y-2"><h3>Critical alert evidence</h3><p>Initial alerts and unresolved-incident escalations use the same explicitly approved Telegram destination. Maximum three stages per incident: initial, after 1 hour and after 24 hours. An uncertain stage is not retried.</p>{open?<Evidence companyId={companyId}/>:<button onClick={()=>setOpen(true)}>Inspect critical alert evidence</button>}</section>;
};
const Evidence:React.FC<{companyId:string}>=({companyId})=>{
 const [data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef<AbortController|null>(null),alive=useRef(false),generation=useRef(0),acceptedToken=useRef<string|null>(null);
 const load=async()=>{
  active.current?.abort();const controller=new AbortController();active.current=controller;
  const id=++generation.current,token=getStoredToken(),current=()=>alive.current&&!controller.signal.aborted&&generation.current===id&&token===getStoredToken();
  setBusy(true);setError('');setData(null);acceptedToken.current=null;
  try{const result=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/critical-alerts`,{signal:controller.signal});if(!current())return;if(!result.success)throw new Error();validateCriticalAlertHistory(result,companyId);acceptedToken.current=token;setData(result);}catch{if(current())setError('Critical alert evidence unavailable. Reload to retry; unavailable evidence does not mean zero incidents.');}finally{if(alive.current&&!controller.signal.aborted&&generation.current===id){setBusy(false);if(token!==getStoredToken()){setData(null);setError('Session changed. Reload critical alert evidence.');}}}
 };
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;generation.current++;active.current?.abort();};},[]);
 const visible=data&&acceptedToken.current===getStoredToken();
 return <div className="space-y-3"><button disabled={busy} onClick={()=>void load()}>Reload critical alert evidence</button>{busy&&<p role="status">Loading critical alert evidence…</p>}{error&&<p role="alert">{error}</p>}{visible&&<><p>Observed operational records are shown below. Counts can overlap and reflect the recorded observation time, not current business health or recipient delivery. Reloading reads saved evidence; it does not contact Telegram or trigger an alert.</p><section aria-label="Observed critical incidents"><h4>Last recorded observations</h4>{data.incidents.length===0?<p>No critical incident observations recorded. Disabled delivery or an unavailable scheduler may leave no observations.</p>:data.incidents.map((r:any)=><article key={r.signal} className="border p-2"><h5>{CRITICAL_ALERT_SIGNALS[r.signal as keyof typeof CRITICAL_ALERT_SIGNALS]}</h5><p>{r.count>0?`${r.count} records at last observation`:'No matching records at last observation'} · episode {r.episode}.</p><p>Observed {formatPlatformDateTime(r.lastSeenMs)}.</p>{r.firstSeenMs!==null&&<p>Episode first observed {formatPlatformDateTime(r.firstSeenMs)}.</p>}{r.lastResolvedMs!==null&&<p>Last observed resolution {formatPlatformDateTime(r.lastResolvedMs)}.</p>}</article>)}</section>{data.reservationCount!==undefined&&<p>Retained reserved stages: {data.reservationCount} /{OPERATIONAL_LIMITS.retainedRows}.</p>}{data.reservationCapacityReached===true&&<p role="status">Critical alert reservation capacity reached. New stages are blocked pending operator review; retained evidence is preserved.</p>}<section aria-label="Critical alert stages"><h4>Recorded alert stages</h4>{data.reservations.length===0?<p>No alert stages reserved. This is not a delivery confirmation.</p>:data.reservations.map((r:any)=><article key={`${r.signal}:${r.episode}:${r.level}`} className="border p-2"><h5>{CRITICAL_ALERT_SIGNALS[r.signal as keyof typeof CRITICAL_ALERT_SIGNALS]} · {stageLabels[r.level]}</h5><p>Episode {r.episode} · {r.status===null?'Delivery record unavailable':statusLabels[r.status]}.</p><p>Scheduled cutoff {formatPlatformDateTime(r.dueAt)}; stage recorded {formatPlatformDateTime(r.createdAtMs)}.</p>{r.providerId&&<p>Telegram API message reference: {r.providerId}.</p>}{r.reasonCode&&<p>Recorded reason: {r.reasonCode}.</p>}</article>)}{data.truncated&&<p>Latest 25 reserved alert stages are shown.</p>}</section></>}</div>;
};
