export interface TelegramIdentityProof { botId:string;username:string|null;checkedAtMs:number;expiresAtMs:number;recipientDeliveryVerified:false }
export function validateTelegramIdentityProof(v:any,botId:string,now:number){
 if(!v||v.botId!==botId||!/^\d{1,32}$/.test(v.botId)||v.username!==null&&!(typeof v.username==='string'&&/^[A-Za-z0-9_]{5,32}$/.test(v.username))||!Number.isSafeInteger(v.checkedAtMs)||!Number.isSafeInteger(v.expiresAtMs)||v.checkedAtMs<0||v.checkedAtMs>now||v.expiresAtMs-v.checkedAtMs!==600000||v.expiresAtMs<=now||v.recipientDeliveryVerified!==false)throw new Error('TELEGRAM_IDENTITY_PROOF_INVALID');return v as TelegramIdentityProof;
}
