import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {websiteImportUrl,publicWebsiteAddress} from './websiteImportPolicy';
/** No redirects. Validate every resolved address and pin DNS to the TLS socket. No response body is retained. */
export async function postDeveloperWebhook(urlValue:string,headers:Record<string,string>,body:string,deps:{resolve?:(host:string)=>Promise<Array<{address:string;family:number}>>;request?:typeof https.request}={}){
 const url=websiteImportUrl(urlValue);if(Buffer.byteLength(body)>16384)throw Error('DEVELOPER_BODY_LIMIT');
 let dnsTimer:ReturnType<typeof setTimeout>|undefined;
 const addresses=await Promise.race([(deps.resolve||((host:string)=>lookup(host,{all:true})))(url.hostname),new Promise<never>((_,reject)=>{dnsTimer=setTimeout(()=>reject(Error('DEVELOPER_DNS_TIMEOUT')),3000);})]).finally(()=>clearTimeout(dnsTimer));
 if(!addresses.length||addresses.length>32||addresses.some(v=>!publicWebsiteAddress(v.address)))throw Error('DEVELOPER_ADDRESS_REFUSED');const pinned=addresses[0];
 return new Promise<number>((resolve,reject)=>{
 const options:https.RequestOptions&{autoSelectFamily:boolean}={method:'POST',autoSelectFamily:false,lookup:(_host,_options,cb)=>cb(null,pinned.address,pinned.family),rejectUnauthorized:true,headers:{...headers,'Content-Type':'application/json','Content-Length':String(Buffer.byteLength(body)),'User-Agent':'ABGM1-CRM-Webhook/1.0'}};const req=(deps.request||https.request)(url,options,res=>{const status=res.statusCode||0;res.destroy();resolve(status);});
 const timer=setTimeout(()=>{req.destroy();reject(Error('DEVELOPER_NETWORK_TIMEOUT'));},10000);req.once('close',()=>clearTimeout(timer));req.once('error',()=>{clearTimeout(timer);reject(Error('DEVELOPER_NETWORK_UNCONFIRMED'));});req.end(body);
 });
}
