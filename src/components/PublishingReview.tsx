import React,{useEffect,useRef,useState} from 'react';
import { apiRequest,ApiRequestError } from '../services/authService';
import { formatPlatformDateTime } from '../../shared/platformTime';
interface ReviewState{
  version:string;status:string;needsReview:boolean;platforms:string[];nextBefore:string|null;
  providerRecords:Array<{id:string;platform:string;status:string;provider_post_id:string|null}>;
  providerRecordsTruncated:boolean;
  verifications?:Array<{id:string;status:string;reason:string;platform:string;provider_object_id:string;contextCurrent:boolean;recordedAtMs:number}>;
  history:Array<{id:string;actor_id:string;decision:string;platform:string|null;provider_post_id:string|null;evidence_reference:string;note:string;recordedAtMs:number}>;
}
export const PublishingReview:React.FC<{companyId:string}>=({companyId})=>{
  const [postId,setPostId]=useState(''),[loadedPost,setLoadedPost]=useState('');
  const [data,setData]=useState<ReviewState|null>(null),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const [decision,setDecision]=useState('UNRESOLVED'),[platform,setPlatform]=useState('');
  const [providerId,setProviderId]=useState(''),[reference,setReference]=useState(''),[note,setNote]=useState('');
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  const path=(id:string)=>`/api/companies/${encodeURIComponent(companyId)}/posts/${encodeURIComponent(id)}/publishing-review`;
  async function load(before?:string){
    const id=before?loadedPost:postId.trim();if(!id || id.length>64)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(true);setError('');
    try{
      const response=await apiRequest<{success:boolean;review:ReviewState}>(path(id)+(before?`?before=${encodeURIComponent(before)}`:''),{signal:controller.signal});
      if(controller.signal.aborted)return;
      const review=response.review;
      if(!response.success || !/^[a-f0-9]{64}$/.test(review?.version) || !Array.isArray(review.history))throw new Error();
      setData(previous=>before && previous ? {...previous,history:[...previous.history,...review.history],nextBefore:review.nextBefore}:review);
      setLoadedPost(id);setPlatform(current=>review.platforms.includes(current)?current:review.platforms[0] || '');
    }catch(cause){if(!controller.signal.aborted){setData(null);setError(cause instanceof ApiRequestError?cause.message:'Publishing review could not be loaded.');}}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  async function save(event:React.FormEvent){
    event.preventDefault();if(!data?.needsReview || busy || !loadedPost)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(true);setError('');setNotice('');
    try{
      const acknowledgment=await apiRequest<{success:boolean;recorded:boolean;id:string}>(path(loadedPost),{method:'POST',signal:controller.signal,body:JSON.stringify({expectedVersion:data.version,decision,
        ...(platform?{platform}:{}),...(decision==='OBSERVED_PUBLISHED'?{providerPostId:providerId}:{}),evidenceReference:reference,note})});
      if(controller.signal.aborted)return;
      if(!acknowledgment.success || !acknowledgment.recorded || !acknowledgment.id)throw new Error('Unconfirmed acknowledgment');
      setNotice('Observation recorded. Dispatch state and resend permissions are unchanged.');
      await load();
    }catch(cause){if(!controller.signal.aborted)setError(cause instanceof ApiRequestError && cause.status===409?'Evidence changed. Reload this review before submitting again.':cause instanceof ApiRequestError?cause.message:'Review submission unconfirmed. Reload before retrying.');}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  async function verify(){
    if(!data?.needsReview || busy || !loadedPost)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(true);setError('');setNotice('');
    try{
      const result=await apiRequest<{success:boolean;id:string;verification:{status:string}}>(path(loadedPost).replace('publishing-review','publishing-verification'),{method:'POST',signal:controller.signal,body:JSON.stringify({expectedVersion:data.version,platform,providerPostId:providerId})});
      if(controller.signal.aborted)return;
      if(!result.success || !result.id || !['MATCHED','MISMATCH','UNAVAILABLE'].includes(result.verification?.status))throw new Error();
      setNotice(`Provider check recorded: ${result.verification.status}. Dispatch state and resend permissions are unchanged.`);
      await load();
    }catch(cause){if(!controller.signal.aborted)setError(cause instanceof ApiRequestError && cause.status===409?'Evidence or connection changed. Reload before checking again.':cause instanceof ApiRequestError && cause.status===429?'Verification busy or rate limited. Wait before checking again.':'Provider check unconfirmed. Reload before retrying.');}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <section aria-label="Publishing outcome review" className="bg-white border border-slate-200 rounded-3xl p-6 mt-6 space-y-4">
    <h2 className="text-lg font-bold">Publishing outcome review</h2>
    <p className="text-sm text-slate-500">Record an operator observation for an uncertain or stale publication. This does not verify provider delivery, change dispatch state or enable resend.</p>
    <form onSubmit={event=>{event.preventDefault();void load();}} className="flex gap-3">
      <input aria-label="Publishing review post ID" placeholder="Stored post ID" maxLength={64} value={postId} onChange={event=>{
        request.current?.abort();setPostId(event.target.value);setLoadedPost('');setData(null);setBusy(false);setError('');setNotice('');setReference('');setNote('');setProviderId('');setDecision('UNRESOLVED');setPlatform('');
      }} className="border rounded px-3 py-2 text-sm"/>
      <button type="submit" disabled={busy || !postId.trim()} className="text-sm font-semibold text-indigo-600 disabled:opacity-50">Load publishing review</button>
    </form>
    {busy && <p role="status">Updating publishing review…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {data && <>
      <p className="text-sm">Post {loadedPost} · Dispatch state: {data.status}</p>
      <ul className="text-sm">{data.providerRecords.map(row=><li key={row.id}>{row.platform}: {row.status} · {row.provider_post_id || 'No confirmed provider ID'}</li>)}</ul>
      {data.providerRecordsTruncated && <p className="text-sm">Showing the 20 most recent provider records.</p>}
      {data.needsReview ? <form onSubmit={save} className="space-y-3 text-sm">
        <label className="block">Operator observation <select aria-label="Operator observation" value={decision} disabled={busy} onChange={event=>setDecision(event.target.value)} className="border rounded p-2 ml-2">
          <option value="UNRESOLVED">Still uncertain</option><option value="NOT_FOUND">Not found during manual check</option><option value="OBSERVED_PUBLISHED">Publication observed externally</option>
        </select></label>
        <label className="block">Platform <select aria-label="Review platform" value={platform} disabled={busy} onChange={event=>setPlatform(event.target.value)} className="border rounded p-2 ml-2">{data.platforms.map(value=><option key={value}>{value}</option>)}</select></label>
        {(decision==='OBSERVED_PUBLISHED' || ['facebook','instagram'].includes(platform)) && <input aria-label="Observed provider post ID" maxLength={128} placeholder="Observed provider post ID" value={providerId} disabled={busy} onChange={event=>setProviderId(event.target.value)} className="border rounded p-2 block w-full"/>}
        {['facebook','instagram'].includes(platform) && <><button type="button" disabled={busy || !/^\d+(?:_\d+)?$/.test(providerId)} onClick={()=>void verify()} className="text-indigo-600 font-semibold disabled:opacity-50">Check Meta publication</button><p>Read-only account, published-object, text and time check. Media contents and exact dispatch attribution are not verified. This never enables resend.</p></>}
        <input aria-label="Review evidence reference" placeholder="Public provider post link or manual-check reference" maxLength={512} value={reference} disabled={busy} onChange={event=>setReference(event.target.value)} className="border rounded p-2 block w-full"/>
        <textarea aria-label="Review note" placeholder="Short observation; exclude credentials and raw API payloads" maxLength={1000} value={note} disabled={busy} onChange={event=>setNote(event.target.value)} className="border rounded p-2 block w-full"/>
        <button type="submit" disabled={busy || reference.trim().length<5 || (decision==='OBSERVED_PUBLISHED' && !providerId.trim())} className="text-indigo-600 font-semibold disabled:opacity-50">Record observation only</button>
      </form>:<p className="text-sm">Current dispatch does not require an uncertain-outcome observation.</p>}
      <ul aria-label="Provider verification history" className="text-sm">{(data.verifications || []).map(row=><li key={row.id}>{row.platform} · {row.provider_object_id} · {row.status} · {row.reason} · {row.contextCurrent?'Checked against current local context':'Historical context; reload and check again'} · {formatPlatformDateTime(row.recordedAtMs)}</li>)}</ul>
      <ul className="divide-y text-sm">{data.history.map(row=><li key={row.id} className="py-2"><strong>Operator observation: {row.decision.replaceAll('_',' ')}</strong><p>{row.platform} {row.provider_post_id}</p><p>{row.evidence_reference}</p><p>{row.note}</p><p>{formatPlatformDateTime(row.recordedAtMs)} · Actor {row.actor_id}</p></li>)}</ul>
      {data.nextBefore && <button disabled={busy} onClick={()=>void load(data.nextBefore!)} className="text-indigo-600 text-sm">Load older observations</button>}
    </>}
  </section>;
};
