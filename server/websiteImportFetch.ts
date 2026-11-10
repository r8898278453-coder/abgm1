import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {publicWebsiteAddress,websiteImportUrl,WebsiteImportError} from './websiteImportPolicy';
const MAX_BYTES=256*1024;
export type WebsitePage={url:string;bytes:Buffer;contentType:string};
/** Bounded HTTPS page snapshot. Pin the checked DNS result to the socket to prevent rebinding. */
async function fetchWebsitePageInternal(value:string,dependencies:{resolve?:(host:string)=>Promise<Array<{address:string;family:number}>>;request?:typeof https.request}={}):Promise<WebsitePage>{
 const initial=websiteImportUrl(value);let current=initial;
 const deadline=Date.now()+10000;
 for(let redirect=0;redirect<=3;redirect++){
  const remaining=deadline-Date.now();if(remaining<=0)throw new WebsiteImportError('WEBSITE_TIME_LIMIT');
  const addresses=await Promise.race([(dependencies.resolve||((host:string)=>lookup(host,{all:true})))(current.hostname),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new WebsiteImportError('WEBSITE_DNS_TIMEOUT')),Math.min(remaining,3000));timer.unref();})]);
  if(!addresses.length||addresses.length>32||addresses.some(row=>!publicWebsiteAddress(row.address)))throw new WebsiteImportError('WEBSITE_ADDRESS_REFUSED');
  const pinned=addresses[0];
  const response=await new Promise<{status:number;location?:string;bytes:Buffer;contentType:string}>((resolve,reject)=>{
   const request=(dependencies.request||https.request)(current,{method:'GET',autoSelectFamily:false,headers:{Accept:'text/html,text/plain;q=0.5','Accept-Encoding':'identity','User-Agent':'ABGM1-Website-Importer/1.0'},lookup:(_host,_options,callback)=>callback(null,pinned.address,pinned.family),rejectUnauthorized:true},res=>{
    const status=res.statusCode||0;
    if(status>=300&&status<400){res.destroy();resolve({status,location:res.headers.location,bytes:Buffer.alloc(0),contentType:''});return;}
    const type=String(res.headers['content-type']||'').toLowerCase();
    if(status!==200||!/^text\/(html|plain)(?:;|$)/.test(type)||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(new WebsiteImportError('WEBSITE_RESPONSE_UNSUPPORTED'));return;}
    if(Number(res.headers['content-length']||0)>MAX_BYTES){res.destroy();reject(new WebsiteImportError('WEBSITE_BYTE_LIMIT'));return;}
    const parts:Buffer[]=[];let size=0;res.on('data',(part:Buffer)=>{size+=part.length;if(size>MAX_BYTES){res.destroy();reject(new WebsiteImportError('WEBSITE_BYTE_LIMIT'));}else parts.push(part);});res.on('error',()=>reject(new WebsiteImportError('WEBSITE_READ_FAILED')));res.on('end',()=>resolve({status,bytes:Buffer.concat(parts),contentType:type}));
   });
   const timer=setTimeout(()=>{request.destroy();reject(new WebsiteImportError('WEBSITE_TIME_LIMIT'));},Math.max(1,deadline-Date.now()));request.once('close',()=>clearTimeout(timer));request.once('error',()=>reject(new WebsiteImportError('WEBSITE_FETCH_FAILED')));request.end();
  });
  if(response.status===200)return{url:current.href,bytes:response.bytes,contentType:response.contentType};
  if(!response.location||redirect===3)throw new WebsiteImportError('WEBSITE_REDIRECT_LIMIT');
  current=websiteImportUrl(new URL(response.location,current).href,initial.origin);
 }
 throw new WebsiteImportError('WEBSITE_FETCH_FAILED');
}

export async function fetchWebsitePage(value:string,dependencies:Parameters<typeof fetchWebsitePageInternal>[1]={}):Promise<WebsitePage>{
 try{return await fetchWebsitePageInternal(value,dependencies);}catch(error){if(error instanceof WebsiteImportError)throw error;throw new WebsiteImportError('WEBSITE_FETCH_FAILED');}
}
