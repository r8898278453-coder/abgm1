import {z} from 'zod';
import {isGlobalEmergencyStopActive} from './executionStop';
export function tenantMetaAdsCredentials(company:string,integration:any){
 if(!integration||integration.provider!=='meta_ads'||integration.company_id!==company||!['connected','verified'].includes(integration.status))return null;
 const value=integration.credentials||{},config=integration.config||{};
 const token=value.accessToken||value.access_token,account=value.adAccountId||value.ad_account_id||config.adAccountId||config.ad_account_id;
 const match=typeof account==='string'?/^(?:act_)?(\d{1,32})$/.exec(account):null;
 return typeof token==='string'&&token.trim()&&match?{token,account:match[1]}:null;
}
const command=z.object({externalCampaignId:z.string().regex(/^\d{1,32}$/),status:z.enum(['ACTIVE','PAUSED']),adjustmentType:z.literal('status_change'),adCampaignId:z.string().max(64).optional()}).strict();
export async function changeMetaCampaignStatus(company:string,input:unknown,integration:any,transport:typeof fetch=fetch){
 const parsed=command.safeParse(input);
 if(!parsed.success)return {status:'BLOCKED',code:'UNSUPPORTED_CAMPAIGN_COMMAND',verified:false};
 const credentials=tenantMetaAdsCredentials(company,integration);
 if(!credentials)return {status:'BLOCKED',code:'PROVIDER_NOT_CONFIGURED',verified:false};
 const target=parsed.data.externalCampaignId,url=`https://graph.facebook.com/v21.0/${target}`;
 const read=async()=>{const response=await transport(`${url}?fields=id,account_id,configured_status`,{headers:{Authorization:`Bearer ${credentials.token}`},signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Campaign inspection unavailable');const value=await response.json();if(value.id!==target||String(value.account_id)!==credentials.account)throw new Error('Campaign account mismatch');return value;};
 try{await read();}catch{return {status:'BLOCKED',code:'CAMPAIGN_SCOPE_UNCONFIRMED',verified:false};}
 if(isGlobalEmergencyStopActive())return {status:'PAUSED',code:'GLOBAL_STOP',verified:false};
 let response:Response;
 try{response=await transport(url,{method:'POST',headers:{Authorization:`Bearer ${credentials.token}`,'Content-Type':'application/json'},body:JSON.stringify({status:parsed.data.status}),signal:AbortSignal.timeout(5000)});}catch{return {status:'UNKNOWN',code:'CAMPAIGN_WRITE_UNCONFIRMED',verified:false};}
 if(!response.ok)return {status:response.status>=500?'UNKNOWN':'REJECTED',code:'CAMPAIGN_WRITE_NOT_ACCEPTED',verified:false};
 try{if((await response.json()).success!==true)return {status:'UNKNOWN',code:'CAMPAIGN_ACK_UNCONFIRMED',verified:false};}catch{return {status:'UNKNOWN',code:'CAMPAIGN_ACK_UNCONFIRMED',verified:false};}
 try{const value=await read();if(value.configured_status===parsed.data.status)return {status:'VERIFIED',code:'CAMPAIGN_STATUS_VERIFIED',verified:true,targetId:target,configuredStatus:parsed.data.status};}catch{/* Accepted write is separate from read-back verification. */}
 return {status:'API_ACCEPTED',code:'CAMPAIGN_STATUS_ACCEPTED',verified:false,targetId:target};
}
