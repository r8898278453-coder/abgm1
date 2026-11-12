import React,{useEffect,useRef,useState} from 'react';
import {fetchRenderAssetReviews,reviewRenderAssetApi,fetchReelJobs,cancelReelApi,type RenderAssetReview,type ReelRenderJobInfo} from '../services/authService';
const active=(job:ReelRenderJobInfo)=>job.status==='pending'||job.status==='rendering';
export function RenderOperationsPanel({companyId,refresh,selectedJobId,onJob}:{key?:string;companyId:string;refresh:number;selectedJobId?:string;onJob:(job:ReelRenderJobInfo)=>void}){
 const [assets,setAssets]=useState<RenderAssetReview[]>([]),[jobs,setJobs]=useState<ReelRenderJobInfo[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0),[note,setNote]=useState(''),[assetId,setAssetId]=useState(''),[uncertain,setUncertain]=useState(false);
 const callback=useRef(onJob);callback.current=onJob;const selected=useRef(selectedJobId);selected.current=selectedJobId;
 const epoch=useRef(0);
 useEffect(()=>{const current=++epoch.current;let disposed=false,running=false;const valid=()=>!disposed&&epoch.current===current;
  const load=async()=>{if(running)return;running=true;try{const [a,j]=await Promise.all([fetchRenderAssetReviews(companyId),fetchReelJobs(companyId)]);if(!valid())return;setAssets(a);setJobs(j);setError('');setUncertain(false);const job=j.find(x=>x.id===selected.current)||(!selected.current?j.find(active):undefined);if(job)callback.current(job);}catch{if(valid())setError('Asset reviews or render history unavailable. Completion is unconfirmed.');}finally{running=false;}};
  void load();const timer=setInterval(()=>void load(),3000);return()=>{disposed=true;epoch.current++;clearInterval(timer);};
 },[companyId,refresh,reload]);
 const review=async(decision:'APPROVED'|'REVOKED')=>{const row=assets.find(a=>a.id===assetId);if(!row||note.trim().length<3)return;const current=epoch.current;setBusy(true);setError('');try{await reviewRenderAssetApi(companyId,row.id,row.revision,decision,note.trim());if(epoch.current!==current)return;setNote('');setReload(x=>x+1);}catch{if(epoch.current===current){setError('Review not confirmed. Reload the current revision before retrying.');setUncertain(true);}}finally{setBusy(false);}};
 const cancel=async(job:ReelRenderJobInfo)=>{const current=epoch.current;setBusy(true);try{await cancelReelApi(companyId,job.id);if(epoch.current===current)setReload(x=>x+1);}catch{if(epoch.current===current){setError('Cancellation unconfirmed. Reload status before retrying.');setUncertain(true);}}finally{setBusy(false);}};
 return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" aria-label="Asset approvals and reel history">
  <h3 className="font-bold">Asset approvals and saved reel jobs</h3>
  <p className="text-xs text-slate-600">Only approved local images enter new renders. Approval records your rights/source declaration for the current file; it does not verify copyright or approve publication.</p>
  {error&&<p role="alert">{error}</p>}
  <button type="button" disabled={busy} onClick={()=>setReload(x=>x+1)}>Reload saved status</button>
  <div className="flex flex-wrap gap-2"><select aria-label="Asset to review" value={assetId} onChange={e=>setAssetId(e.target.value)}><option value="">Select an asset</option>{assets.map(a=><option key={a.id} value={a.id}>{a.label||a.id} — {a.status} (v{a.revision})</option>)}</select>
  <input aria-label="Asset rights and source declaration" placeholder="Rights/source declaration or revocation reason" value={note} maxLength={500} onChange={e=>setNote(e.target.value)}/>
  <button type="button" disabled={busy||uncertain||!assetId||note.trim().length<3} onClick={()=>void review('APPROVED')}>Approve current file</button>
  <button type="button" disabled={busy||uncertain||!assetId||note.trim().length<3} onClick={()=>void review('REVOKED')}>Revoke approval</button></div>
  {assetId&&assets.find(a=>a.id===assetId)?.url.startsWith(`/uploads/${companyId}/`)&&<img alt="Selected asset preview" className="max-h-32 max-w-48 object-contain" src={assets.find(a=>a.id===assetId)!.url}/>}
  <p className="text-xs">Reel rendering stays unavailable until a supported worker is explicitly enabled. Saved jobs can still be reviewed or cancelled.</p>
  {!jobs.length?<p className="text-xs">No saved reel jobs loaded.</p>:<ul>{jobs.map(job=><li key={job.id} className="flex flex-wrap gap-3 py-1 text-xs"><span>{new Date(job.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST — {job.status}{job.error?' — '+job.error:''}</span>{active(job)&&<button disabled={busy||uncertain} onClick={()=>void cancel(job)}>Cancel render</button>}{job.status==='completed'&&job.videoUrl&&<button onClick={()=>callback.current(job)}>Use completed video</button>}</li>)}</ul>}
 </section>;
}
