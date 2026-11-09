import crypto from 'node:crypto';
const ignored=new Set('what which when where who how are the is a an of for and to in do does can i we you your our kya hai he ka ki ke ko se me mein aur please batao tell about'.split(' '));
const tokens=(value:string)=>new Set((value.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(word=>!ignored.has(word)));
/** Extractive search only: quotes are stored text, never model-authored assertions. */
export function retrieveKnowledge(company:string,query:string,profile:any,version:string,sources:{rows:any[];truncated:boolean}){
 const terms=tokens(query),candidates:any[]=[];
 const add=(title:string,text:string,citation:any,searchText=text)=>{if(typeof text!=='string'||!text.trim())return;const words=tokens(searchText),score=[...terms].filter(term=>words.has(term)).length;if(score)candidates.push({score,title,excerpt:text.slice(0,1200),...citation});};
 const savedFaqs=Array.isArray(profile?.knowledge_base?.faqs)?profile.knowledge_base.faqs:[],faqs=savedFaqs.slice(0,200);
 for(const faq of faqs)if(typeof faq.question==='string'&&typeof faq.answer==='string')add(faq.question.slice(0,1000),faq.answer.slice(0,12000),{type:'SAVED_FAQ',sourceId:typeof faq.id==='string'?faq.id:'faq_'+crypto.createHash('sha256').update(faq.question+'\0'+faq.answer).digest('hex').slice(0,24),sourceVersion:version,page:null,contentSha:crypto.createHash('sha256').update(faq.question+'\0'+faq.answer).digest('hex')},faq.question.slice(0,1000)+' '+faq.answer.slice(0,12000));
 for(const source of sources.rows)for(const chunk of Array.isArray(source.chunks)?source.chunks.slice(0,500):[])if(typeof chunk.text==='string')add(source.filename,chunk.text,{type:'APPROVED_SOURCE',sourceId:source.id,sourceVersion:source.revision,contentSha:source.content_sha,page:chunk.page,chunkIndex:chunk.index});
 const citations=candidates.sort((a,b)=>b.score-a.score||a.sourceId.localeCompare(b.sourceId)).slice(0,5).map(({score,...row},index)=>({...row,label:'S'+(index+1)}));
 return {success:true,companyId:company,status:citations.length?'MATCHES':'NO_MATCH',mode:'EXTRACTIVE_SAVED_SOURCES',isGrounded:citations.length>0,answer:citations.length?citations.map(row=>`[${row.label}] ${row.excerpt}`).join('\n\n'):'No matching saved source was found. Add or approve source text, or refine the search.',citations,profileVersion:version,sourceWindowTruncated:sources.truncated,faqWindowTruncated:savedFaqs.length>200};
}
