import React,{useEffect,useRef,useState} from 'react';
import {listFacts,createFact,factCommand} from '../services/knowledgeFacts';
import {governedFactGroups,type KnowledgeFact} from '../../shared/knowledgeFacts';
import type {KnowledgeSource} from '../../shared/knowledge';
export function KnowledgeFactsView({companyId,sources,disabled,onBusy,onChange}:{companyId:string;sources:KnowledgeSource[];disabled:boolean;onBusy:(busy:boolean)=>void;onChange:()=>void}){
 const mounted=useRef(true),sequence=useRef(0);const [facts,setFacts]=useState<KnowledgeFact[]>([]),[key,setKey]=useState(''),[value,setValue]=useState(''),[sourceId,setSourceId]=useState(''),[error,setError]=useState(''),[uncertain,setUncertain]=useState(true),[reviewed,setReviewed]=useState<Record<string,boolean>>({});
 const reload=async()=>{const request=++sequence.current;setError('');setUncertain(true);try{const rows=await listFacts(companyId);if(mounted.current&&request===sequence.current){setFacts(rows);setReviewed({});setUncertain(false);}}catch{if(mounted.current&&request===sequence.current)setError('Saved facts unavailable. Reload before making changes.');}};
 useEffect(()=>{mounted.current=true;void reload();return()=>{mounted.current=false;sequence.current++;};},[companyId,sources]);
 const mutate=async(work:()=>Promise<KnowledgeFact[]>,created=false)=>{if(disabled||uncertain)return;const request=++sequence.current;onBusy(true);onChange();setError('');try{const rows=await work();if(mounted.current&&request===sequence.current){setFacts(rows);setReviewed({});if(created){setKey('');setValue('');setSourceId('');}}}catch{if(mounted.current&&request===sequence.current){setUncertain(true);setError('Fact change unconfirmed or conflicting. Reload facts and review the current candidates before retrying.');}}finally{if(mounted.current)onBusy(false);}};
 const groups=governedFactGroups(facts);
 return <section aria-label="Reviewed business facts" className="bg-white border rounded-2xl p-5 space-y-3">
  <h2 className="font-bold">Reviewed business facts</h2><p className="text-xs">Use one stable key per business claim, for example pricing.annual. New facts require approval. Approved manual facts take precedence; conflicting source candidates need review. Facts are used in saved-source search, not automatically in campaigns or replies.</p>
  <button disabled={disabled} onClick={()=>{onChange();void reload();}}>Reload facts</button>{error&&<p role="alert">{error}</p>}
  <form onSubmit={event=>{event.preventDefault();const source=sources.find(row=>row.id===sourceId&&row.companyId===companyId&&row.state==='EXTRACTED'&&row.approved);if(sourceId&&!source){setError('Selected source changed. Reload sources and choose again.');return;}void mutate(()=>createFact(companyId,{key,value,...(source?{source:{id:source.id,version:source.version}}:{})}),true);}} className="space-y-2">
   <label className="block">Fact key<input aria-label="Fact key" value={key} onChange={e=>setKey(e.target.value)} pattern="[a-z0-9][a-z0-9._ -]*" minLength={2} maxLength={120} required className="border block"/></label>
   <label className="block">Fact value<textarea aria-label="Fact value" value={value} onChange={e=>setValue(e.target.value)} maxLength={4000} required className="border block"/></label>
   <label className="block">Provenance<select aria-label="Fact provenance" value={sourceId} onChange={e=>setSourceId(e.target.value)}><option value="">Manual business statement</option>{sourceId&&!sources.some(s=>s.id===sourceId&&s.companyId===companyId&&s.state==='EXTRACTED'&&s.approved)&&<option value={sourceId}>Source changed — choose again</option>}{sources.filter(s=>s.companyId===companyId&&s.state==='EXTRACTED'&&s.approved).map(s=><option key={s.id} value={s.id}>{s.filename}</option>)}</select></label>
   <p className="text-xs">For a source-derived fact, paste an exact excerpt from the selected approved source. Approval records your review; it is not independent verification.</p><button disabled={disabled||uncertain}>Save fact candidate</button>
  </form>
  {!uncertain&&!facts.length&&<p>No saved fact candidates.</p>}
  {facts.map(fact=>{const conflicts=facts.filter(row=>row.id!==fact.id&&row.key===fact.key&&row.status==='APPROVED'&&row.value!==fact.value),manualBlock=fact.origin==='SOURCE'&&conflicts.some(row=>row.origin==='MANUAL');return <article key={fact.id} aria-label={'Fact '+fact.key+' '+fact.version} className="border-t pt-3 space-y-1">
   <h3 className="font-bold">{fact.key}</h3><p className="whitespace-pre-wrap text-sm">{fact.value}</p><p className="text-xs">{fact.origin} · {fact.status} · revision {fact.version}{!fact.eligible?' · Source changed, unavailable or approval withdrawn':''}{fact.page?' · page '+fact.page:''}</p>
   {groups.find(group=>group.key===fact.key)?.conflict&&<p className="text-amber-700 text-xs">Conflicting candidates: source-derived answers are blocked until reviewed.</p>}
   {manualBlock&&<p className="text-xs">An approved manual fact takes precedence. Withdraw it before approving a different source value.</p>}
   {fact.status==='DRAFT'&&conflicts.length>0&&!manualBlock&&<label className="block text-xs"><input type="checkbox" checked={reviewed[fact.id]||false} onChange={e=>setReviewed({...reviewed,[fact.id]:e.target.checked})}/> Replace the approved conflicting values shown here</label>}
   {fact.status==='DRAFT'&&<><button disabled={disabled||uncertain||!fact.eligible||manualBlock||conflicts.length>0&&!reviewed[fact.id]} onClick={()=>void mutate(()=>factCommand(companyId,fact,'approve',conflicts.map(row=>({id:row.id,version:row.version}))))}>Approve fact</button><button disabled={disabled||uncertain} onClick={()=>void mutate(()=>factCommand(companyId,fact,'reject'))}>Reject candidate</button></>}
   {fact.status==='APPROVED'&&<button disabled={disabled||uncertain} onClick={()=>void mutate(()=>factCommand(companyId,fact,'withdraw'))}>Withdraw fact</button>}
   <button disabled={disabled||uncertain} onClick={()=>void mutate(()=>factCommand(companyId,fact,'delete'))}>Delete fact</button>
  </article>;})}
 </section>;
}
