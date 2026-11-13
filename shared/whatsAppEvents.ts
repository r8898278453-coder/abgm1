import {z} from 'zod';
export const verifiedWhatsAppEvent=z.object({phoneNumberId:z.string().regex(/^\d{1,64}$/),wabaId:z.string().regex(/^\d{1,64}$/),occurredAtMs:z.number().int().nonnegative().max(8640000000000000)}).strict();
export type VerifiedWhatsAppEvent=z.infer<typeof verifiedWhatsAppEvent>;
export const INBOUND_DISPOSITIONS=['CURRENT','STALE','EXPIRED','OPT_OUT'] as const;
export type InboundDisposition=typeof INBOUND_DISPOSITIONS[number];
export const isWhatsAppOptOut=(body:string)=>/^(stop|unsubscribe|opt out|cancel|band karo)$/i.test(body.trim());
export function inboundDisposition(occurredAtMs:number,latestAtMs:number|null,nowMs:number,optOut:boolean):InboundDisposition{if(optOut)return'OPT_OUT';if(nowMs-occurredAtMs>=86400000)return'EXPIRED';if(latestAtMs!==null&&occurredAtMs<latestAtMs)return'STALE';return'CURRENT';}
export function parseWhatsAppTimestamp(value:unknown,nowMs=Date.now()){if(typeof value!=='string'||!/^\d{1,13}$/.test(value))throw new Error('INVALID_PROVIDER_TIMESTAMP');const result=Number(value)*1000;if(!Number.isSafeInteger(result)||result<0||result>nowMs+300000)throw new Error('INVALID_PROVIDER_TIMESTAMP');return result;}
