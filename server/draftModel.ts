import type {ModelAttempt} from './knowledgeDrafts';
export const DEFAULT_DRAFT_MODELS=Object.freeze(['gemini-3.8-flash','gemini-flash-latest','gemini-3.1-flash-lite']);
type Client={models:{generateContent:(request:any)=>Promise<any>}};
export type DraftModelOptions={prompt:string;responseMimeType?:string;systemInstruction?:string;onAttempt?:(event:ModelAttempt)=>Promise<void>};
/** One provider adapter; audit uncertainty never becomes a reason for another paid call. */
export function createDraftModel(getClient:()=>Client|null,now:()=>number=Date.now,models:readonly string[]=DEFAULT_DRAFT_MODELS){
 let deniedUntil=0;
 return async function safeGenerateContent(options:DraftModelOptions):Promise<string|null>{
  if(now()<deniedUntil)return null;const client=getClient();if(!client)return null;
  for(const model of models){
   try{await options.onAttempt?.({model,state:'STARTED'});}catch{return null;}
   let response:any;
   try{response=await client.models.generateContent({model,contents:options.prompt,config:{...(options.responseMimeType?{responseMimeType:options.responseMimeType}:{}),...(options.systemInstruction?{systemInstruction:options.systemInstruction}:{})}});}
   catch(error:any){
    try{await options.onAttempt?.({model,state:'FAILED'});}catch{return null;}
    const message=String(error?.message||error);
    if(message.includes('403')||message.includes('PERMISSION_DENIED')){deniedUntil=now()+5*60*1000;return null;}
    if(message.includes('503')||message.includes('UNAVAILABLE'))continue;
    return null;
   }
   const usage=response?.usageMetadata||{},evidence:Partial<ModelAttempt>={};
   for(const [field,key]of [['promptTokens','promptTokenCount'],['outputTokens','candidatesTokenCount'],['totalTokens','totalTokenCount']] as const)if(Number.isSafeInteger(usage[key])&&usage[key]>=0)evidence[field]=usage[key];
   if(typeof response?.modelVersion==='string'&&/^[a-zA-Z0-9._:/-]{1,200}$/.test(response.modelVersion))evidence.responseModel=response.modelVersion;
   const text=typeof response?.text==='string'&&response.text.trim()?response.text:null;
   try{await options.onAttempt?.({model,state:text?'SUCCEEDED':'FAILED',...evidence});}catch{return null;}
   // Empty/invalid output can still have consumed tokens. Require explicit retry, not fallback.
   return text;
  }
  return null;
 };
}
