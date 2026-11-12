import {createHash} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {dispatchMessageIntent,type DispatchResult} from './messageDispatchIntents';
export function autonomousMessageKey(actionId:string){return createHash('sha256').update(`autonomous-whatsapp:${actionId}`).digest('hex');}
export async function dispatchAutonomousMessage(pool:Pool,company:string,actionId:string,sender:string,recipient:unknown,message:unknown,send:(phone:string,message:string)=>Promise<DispatchResult>,actor:string){
 if(typeof recipient!=='string'||typeof message!=='string'||!message.trim()||message.length>4096)throw new Error('Invalid WhatsApp action payload');
 let phone=recipient.replace(/[^0-9]/g,'');if(phone.length===10)phone='91'+phone;if(phone.startsWith('0')&&phone.length===11)phone='91'+phone.slice(1);
 if(!/^\d{6,20}$/.test(phone)||!/^\d{1,64}$/.test(sender))throw new Error('Invalid WhatsApp sender or recipient');
 return dispatchMessageIntent(pool,company,autonomousMessageKey(actionId),{sender,to:phone,message,mode:'automatic'},()=>send(phone,message),actor);
}
