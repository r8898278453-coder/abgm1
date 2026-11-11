import {fetchWebsitePage,type WebsitePage} from './websiteImportFetch';
import {extractWebsitePage} from './websiteImportExtract';
import {websiteImportUrl,WebsiteImportError} from './websiteImportPolicy';
/** Internal preview/run foundation. Callers must authorize the registered client website first. */
async function previewWebsiteImportInternal(value:string,deps:{fetchPage?:(url:string)=>Promise<WebsitePage>;now?:()=>number}={}){
 const root=websiteImportUrl(value),now=deps.now||Date.now,started=now(),pages:Array<ReturnType<typeof extractWebsitePage>&{originalBytes:Buffer;fetchedAt:string;contentType:string}>=[],failures:Array<{url:string;code:string}>=[];
 const pending=[root.href],seen=new Set<string>();let discoveredMore=false;
 while(pending.length&&pages.length+failures.length<3){
  if(now()-started>20000){failures.push({url:pending[0],code:'WEBSITE_RUN_TIME_LIMIT'});break;}
  const url=pending.shift()!;if(seen.has(url))continue;seen.add(url);
  try{
   const snapshot=await(deps.fetchPage||fetchWebsitePage)(url);websiteImportUrl(snapshot.url,root.origin);seen.add(snapshot.url);
   const extracted=extractWebsitePage(snapshot);pages.push({...extracted,originalBytes:Buffer.from(snapshot.bytes),contentType:snapshot.contentType,fetchedAt:new Date(now()).toISOString()});
   for(const link of extracted.links)if(!seen.has(link)&&!pending.includes(link))pending.push(link);
   if(pending.length)discoveredMore=true;
  }catch(error){failures.push({url,code:error instanceof WebsiteImportError?error.code:'WEBSITE_IMPORT_UNAVAILABLE'});}
 }
 const truncated=pending.length>0;return{status:!pages.length?'UNAVAILABLE':failures.length||truncated||pages.some(page=>!page.text)?'PARTIAL':'STATIC_PREVIEW',pages,failures,truncated,discoveredRelevantPages:discoveredMore,approved:false as const,note:'Unapproved static website preview. No scripts executed; hidden CSS, JavaScript content and completeness are not verified. No source persistence or business-fact verification is implied.'};
}

let activePreviews=0;
export async function previewWebsiteImport(value:string,deps:Parameters<typeof previewWebsiteImportInternal>[1]={}){
 if(activePreviews>=1)throw new WebsiteImportError('WEBSITE_IMPORT_CAPACITY');activePreviews++;
 try{return await previewWebsiteImportInternal(value,deps);}finally{activePreviews--;}
}
