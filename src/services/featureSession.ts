import {storedSessionToken} from './sessionTransport';
export const FEATURE_SESSION_EVENT='abgm:feature-session-changed';
export const USER_SESSION_KEY='abga_user_profile',ACTIVE_COMPANY_STORAGE_KEY='abga_active_company_id';
let previous:{token:string|null;actor:string|null}|undefined,revision=0;
/** Numeric, memory-only identity: credentials are never exposed in DOM keys or events. */
export function featureSessionRevision(){
 let token:string|null=null,actor:string|null=null;
 try{token=storedSessionToken();const user=JSON.parse(localStorage.getItem(USER_SESSION_KEY)||'null');actor=typeof user?.id==='string'?user.id:null;}catch{}
 if(!previous||previous.token!==token||previous.actor!==actor){previous={token,actor};revision++;}
 return revision;
}
export function notifyFeatureSessionChanged(){if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function')window.dispatchEvent(new Event(FEATURE_SESSION_EVENT));}
export function subscribeFeatureSession(listener:()=>void){
 if(typeof window==='undefined')return()=>{};
 const storage=(event:StorageEvent)=>{if(event.storageArea===localStorage&&(event.key===null||['abga_auth_token',USER_SESSION_KEY].includes(event.key)))listener();};
 window.addEventListener('storage',storage);window.addEventListener(FEATURE_SESSION_EVENT,listener);
 return()=>{window.removeEventListener('storage',storage);window.removeEventListener(FEATURE_SESSION_EVENT,listener);};
}
