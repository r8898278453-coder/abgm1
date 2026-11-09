import {canonicalJson} from '../../shared/canonicalJson';
const cache=new Map<string,string>();
export async function messageRequestKey(scope:string,payload:unknown){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJson(payload)));
 const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 const slot=`abgm:message-intent:${scope}:${hash}`;let key=cache.get(slot);
 try{const stored=sessionStorage.getItem(slot);if(stored&&/^[a-f0-9]{64}$/.test(stored))key=stored;}catch{throw new Error('Retry identity storage unavailable. Enable session storage before sending.');}
 if(!key){key=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');}
 cache.set(slot,key);try{sessionStorage.setItem(slot,key);if(sessionStorage.getItem(slot)!==key)throw new Error();}catch{throw new Error('Retry identity could not be saved. No dispatch was started.');}
 return {key,clear:()=>{cache.delete(slot);try{sessionStorage.removeItem(slot);}catch{}}};
}
