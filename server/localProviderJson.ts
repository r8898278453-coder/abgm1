/** Fixed provider URLs only. Bound response bytes and refuse credential-bearing redirects. */
export async function localProviderJson(response:Response,maxBytes=1024*1024){
 if(!response.ok||response.redirected)throw Error('LOCAL_PROVIDER_HTTP_UNAVAILABLE');
 const declared=response.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))throw Error('LOCAL_PROVIDER_RESPONSE_LIMIT');
 if(!response.body)throw Error('LOCAL_PROVIDER_BODY_UNAVAILABLE');
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];let bytes=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)throw Error('LOCAL_PROVIDER_RESPONSE_LIMIT');chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
