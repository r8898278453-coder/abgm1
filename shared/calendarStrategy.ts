/** Planning preferences are untrusted instructions for draft style, never factual approval. */
export interface CalendarStrategy {
 model:1;
 audience:string;
 voice:'CLEAR'|'WARM'|'PROFESSIONAL';
 objective:'EDUCATE'|'SERVICE_ENQUIRY'|'OFFER';
 brandTerms:string[];
 avoidTerms:string[];
 factRefs:{id:string;version:string;role:'SERVICE'|'OFFER'}[];
 expectedKnowledgeFingerprint:string;
 confirmed:true;
}
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const phraseKey=(v:string)=>v.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export function normalizeCalendarStrategy(v:any):CalendarStrategy{
 if(!exact(v,['model','audience','voice','objective','brandTerms','avoidTerms','factRefs','expectedKnowledgeFingerprint','confirmed'])||v.model!==1||!text(v.audience,300)||!['CLEAR','WARM','PROFESSIONAL'].includes(v.voice)||!['EDUCATE','SERVICE_ENQUIRY','OFFER'].includes(v.objective)||v.confirmed!==true||typeof v.expectedKnowledgeFingerprint!=='string'||! /^[a-f0-9]{64}$/.test(v.expectedKnowledgeFingerprint))throw Error('PLAN_STRATEGY_INVALID');
 const terms=(list:any)=>{if(!Array.isArray(list)||list.length>8||list.some(t=>!text(t,40)||!/[\p{L}\p{N}]/u.test(t)))throw Error('PLAN_BRAND_TERMS_INVALID');const trimmed=list.map(t=>t.trim());if(new Set(trimmed.map(phraseKey)).size!==trimmed.length)throw Error('PLAN_BRAND_TERMS_DUPLICATE');return trimmed;};
 const brandTerms=terms(v.brandTerms),avoidTerms=terms(v.avoidTerms);if(brandTerms.some(t=>avoidTerms.some(a=>phraseKey(a)===phraseKey(t))))throw Error('PLAN_BRAND_TERMS_CONFLICT');
 if(!Array.isArray(v.factRefs)||v.factRefs.length>4||v.factRefs.some((r:any)=>!exact(r,['id','version','role'])||typeof r.id!=='string'||!/^kf_[a-f0-9]{32}$/.test(r.id)||typeof r.version!=='string'||! /^(0|[1-9][0-9]{0,19})$/.test(r.version)||BigInt(r.version)>18446744073709551615n||!['SERVICE','OFFER'].includes(r.role))||new Set(v.factRefs.map((r:any)=>r.id)).size!==v.factRefs.length)throw Error('PLAN_STRATEGY_FACT_INVALID');
 if(v.objective==='OFFER'&&!v.factRefs.some((r:any)=>r.role==='OFFER')||v.objective==='SERVICE_ENQUIRY'&&!v.factRefs.some((r:any)=>r.role==='SERVICE')||v.objective!=='OFFER'&&v.factRefs.some((r:any)=>r.role==='OFFER'))throw Error('PLAN_STRATEGY_FACT_REQUIRED');
 return{model:1,audience:v.audience.trim(),voice:v.voice,objective:v.objective,brandTerms,avoidTerms,factRefs:[...v.factRefs].sort((a,b)=>a.id.localeCompare(b.id)).map(r=>({...r})),expectedKnowledgeFingerprint:v.expectedKnowledgeFingerprint,confirmed:true};
}
const STOP_WORDS=new Set(['a','an','the','and','or','for','to','of','in','on','how','what','is','are','our','your']);
/** Bounded lexical review only. No synonym/meaning inference or automatic rejection. */
export function calendarTopicOverlap(a:string,b:string){
 const tokens=(s:string)=>new Set(s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').split(/\s+/).filter(v=>v.length>1&&!STOP_WORDS.has(v)));
 const x=tokens(a),y=tokens(b);if(x.size<2||y.size<2)return null;const common=[...x].filter(t=>y.has(t)).length,score=common/(x.size+y.size-common);return common>=2&&score>=0.5?Math.round(score*100):null;
}
export function calendarBrandViolation(strategy:CalendarStrategy,content:{headline?:string;caption?:string;callToAction?:string;hashtags?:string[]}){
 const normalize=phraseKey;
 const values=[content.headline||'',content.caption||'',content.callToAction||'',...(content.hashtags||[])];
 return strategy.avoidTerms.some(term=>{const needle=normalize(term);return needle&&values.some(value=>(' '+normalize(value)+' ').includes(' '+needle+' '));});
}
