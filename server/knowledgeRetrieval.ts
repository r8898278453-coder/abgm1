import {governedFactGroups,type KnowledgeFact} from '../shared/knowledgeFacts';
import crypto from 'node:crypto';
const ignored=new Set('what which when where who how are the is a an of for and to in do does can i we you your our kya hai he ka ki ke ko se me mein aur please batao tell about'.split(' '));
const termAliases:Record<string,string>={pricing:'price',prices:'price',cost:'price',costs:'price',rates:'price',rate:'price',keemat:'price',kimat:'price',yearly:'annual',annually:'annual'};
const tokens=(value:string)=>new Set((value.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(word=>!ignored.has(word)).map(word=>termAliases[word]||word));
/** Preserve an exact source substring around the first answer-side query match. */
function matchingExcerpt(text:string,terms:Set<string>){
 let offset=0;
 for(const match of text.matchAll(/[\p{L}\p{N}]{2,}/gu))if(terms.has(termAliases[match[0].toLocaleLowerCase()]||match[0].toLocaleLowerCase())){offset=match.index!;break;}
 let start=Math.max(0,offset-200);
 // Do not split a UTF-16 surrogate pair at either quote boundary.
 if(start>0&&/[\uDC00-\uDFFF]/.test(text[start]))start--;
 let end=Math.min(text.length,start+1200);
 if(end<text.length&&/[\uDC00-\uDFFF]/.test(text[end]))end--;
 return {excerpt:text.slice(start,end),excerptStart:start,excerptEnd:end};
}
/** Extractive search only: quotes are stored text, never model-authored assertions. */
export function retrieveKnowledge(company:string,query:string,profile:any,version:string,sources:{rows:any[];truncated:boolean},facts:KnowledgeFact[]=[]){
 const terms=tokens(query),candidates:any[]=[];
 const add=(title:string,text:string,citation:any,searchText=text)=>{if(typeof text!=='string'||!text.trim())return;const words=tokens(searchText),score=[...terms].filter(term=>words.has(term)).length;if(score)candidates.push({score,title,...matchingExcerpt(text,terms),...citation});};
 if(facts.some(fact=>fact.companyId!==company))throw new Error('KNOWLEDGE_FACT_SCOPE_MISMATCH');
 const governance=governedFactGroups(facts),matching=governance.filter(group=>[...terms].some(term=>tokens(group.key.replace(/[._-]/g,' ')).has(term)||facts.some(fact=>fact.key===group.key&&tokens(fact.value).has(term))));
 if(matching.some(group=>group.conflict))return{success:true,companyId:company,status:'CONFLICT_REVIEW_REQUIRED',mode:'GOVERNED_FACTS',isGrounded:false,answer:'Conflicting saved facts need review before this question can be answered.',citations:[],profileVersion:version,sourceWindowTruncated:sources.truncated,faqWindowTruncated:false};
 const governed=matching.flatMap(group=>group.approved);
 if(governed.length){const citations=governed.slice(0,5).map((fact,index)=>({label:'S'+(index+1),title:fact.key,type:fact.origin==='MANUAL'?'APPROVED_MANUAL_FACT':'APPROVED_SOURCE_FACT',sourceId:fact.sourceId||fact.id,sourceVersion:fact.sourceVersion||fact.version,factId:fact.id,factVersion:fact.version,chunkIndex:fact.chunkIndex,page:fact.page,excerpt:fact.value,excerptStart:fact.excerptStart,excerptEnd:fact.excerptEnd,contentSha:fact.contentSha}));return{success:true,companyId:company,status:'MATCHES',mode:'GOVERNED_FACTS',isGrounded:true,answer:citations.map(row=>`[${row.label}] ${row.excerpt}`).join('\n\n'),citations,profileVersion:version,sourceWindowTruncated:sources.truncated,faqWindowTruncated:false};}
 if(matching.length)return{success:true,companyId:company,status:'FACT_APPROVAL_REQUIRED',mode:'GOVERNED_FACTS',isGrounded:false,answer:'No eligible approved fact is available for this question. Review the saved fact candidates.',citations:[],profileVersion:version,sourceWindowTruncated:sources.truncated,faqWindowTruncated:false};
 const savedFaqs=Array.isArray(profile?.knowledge_base?.faqs)?profile.knowledge_base.faqs:[],faqs=savedFaqs.slice(0,200);
 for(const faq of faqs)if(typeof faq.question==='string'&&typeof faq.answer==='string')add(faq.question.slice(0,1000),faq.answer.slice(0,12000),{type:'SAVED_FAQ',sourceId:typeof faq.id==='string'?faq.id:'faq_'+crypto.createHash('sha256').update(faq.question+'\0'+faq.answer).digest('hex').slice(0,24),sourceVersion:version,page:null,contentSha:crypto.createHash('sha256').update(faq.question+'\0'+faq.answer).digest('hex')},faq.question.slice(0,1000)+' '+faq.answer.slice(0,12000));
 for(const source of sources.rows)for(const chunk of Array.isArray(source.chunks)?source.chunks.slice(0,500):[])if(typeof chunk.text==='string')add(source.filename,chunk.text,{type:'APPROVED_SOURCE',sourceUrl:source.source_url||null,fetchedAtMs:source.fetched_at_ms==null?null:Number(source.fetched_at_ms),sourceId:source.id,sourceVersion:source.revision,contentSha:source.content_sha,page:chunk.page,chunkIndex:chunk.index});
 const citations=candidates.sort((a,b)=>b.score-a.score||a.sourceId.localeCompare(b.sourceId)).slice(0,5).map(({score,...row},index)=>({...row,label:'S'+(index+1)}));
 return {success:true,companyId:company,status:citations.length?'MATCHES':'NO_MATCH',mode:'EXTRACTIVE_SAVED_SOURCES',isGrounded:citations.length>0,answer:citations.length?citations.map(row=>`[${row.label}] ${row.excerpt}`).join('\n\n'):'No matching saved source was found. Add or approve source text, or refine the search.',citations,profileVersion:version,sourceWindowTruncated:sources.truncated,faqWindowTruncated:savedFaqs.length>200};
}
