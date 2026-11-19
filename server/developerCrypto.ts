import crypto from 'node:crypto';
import {developerSignatureHeaders} from '../shared/developerAccess';
export const developerHash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
export function developerToken(id:string,secret:string){return `abgm_${id}.${secret}`;}
export function parseDeveloperToken(value:unknown){if(typeof value!=='string')return null;const match=/^abgm_([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value);return match?{id:match[1],hash:developerHash(value)}:null;}
export function signDeveloperWebhook(secret:string,timestamp:string,deliveryId:string,body:string){return crypto.createHmac('sha256',secret).update(`${timestamp}.${deliveryId}.${body}`).digest('hex');}
/** Consumers must ALSO atomically deduplicate payload.event.id in durable storage before side effects. */
export function verifyDeveloperWebhook(secret:string,headers:unknown,body:string,nowMs=Date.now()){
 const p=developerSignatureHeaders.safeParse(headers);if(!p.success||Buffer.byteLength(body)>16384||!Number.isSafeInteger(nowMs))return false;
 const stamp=Number(p.data.timestamp);if(!Number.isSafeInteger(stamp)||Math.abs(nowMs-stamp)>300000)return false;
 const expected=signDeveloperWebhook(secret,p.data.timestamp,p.data.deliveryId,body);return crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(p.data.signature,'hex'));
}
