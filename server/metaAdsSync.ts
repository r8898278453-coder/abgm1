import {tenantMetaAdsCredentials} from './metaAdsControl';
import {createWorkBudget} from './workBudget';
import type {AdProviderSyncResult} from './adCampaignService';
import type {DbExternalAdCampaign} from './db';
const numeric=(value:unknown,integer=false):number|null=>{
 if(typeof value!=='number'&&typeof value!=='string')return null;
 if(typeof value==='string'&&!/^\d+(?:\.\d+)?$/.test(value))return null;
 const number=Number(value);return Number.isFinite(number)&&number>=0&&(!integer||Number.isSafeInteger(number))?number:null;
};
export function metaAdMetrics(value:any){
 const pick=(rows:any,types:string[],integer=false)=>{if(!Array.isArray(rows))return null;for(const type of types){const matches=rows.filter((r:any)=>r?.action_type===type);if(matches.length){return matches.length===1?numeric(matches[0].value,integer):null;}}return null;};
 const spend=numeric(value?.spend),impressions=numeric(value?.impressions,true),clicks=numeric(value?.clicks,true);
 const conversions=pick(value?.actions,['omni_purchase','purchase','lead'],true),revenue=pick(value?.action_values,['omni_purchase','purchase']);
 const ratio=spend!==null&&spend>0&&revenue!==null?Math.round(revenue/spend*100)/100:null;
 return {spend,impressions,clicks,conversions,revenue,roas:ratio!==null&&Number.isFinite(ratio)?ratio:null,conversion_tracking_status:conversions===null?'UNAVAILABLE':'ACTIVE',revenue_attribution_status:revenue===null?'UNAVAILABLE':'VERIFIED'} as const;
}
export async function syncMetaAdCampaigns(company:string,deps:{integration:(company:string)=>Promise<any>;save:(value:any)=>Promise<DbExternalAdCampaign>;fetch:typeof fetch;canStart?:()=>boolean}):Promise<AdProviderSyncResult>{
 const fetchedAt=new Date().toISOString(),campaigns:DbExternalAdCampaign[]=[];let partial=false,reason='';
 const result=(status:AdProviderSyncResult['status'],message:string):AdProviderSyncResult=>({provider:'meta_ads',companyId:company,status,message,campaignsCount:campaigns.length,fetchedAt,campaigns});
 const budget=createWorkBudget(),canStart=()=>budget.canStart()&&(deps.canStart?.()??true);
 let credentials:ReturnType<typeof tenantMetaAdsCredentials>;
 try{credentials=tenantMetaAdsCredentials(company,await deps.integration(company));}catch{return result('PROVIDER_ERROR','Integration storage unavailable');}
 if(!credentials)return result('NOT_CONFIGURED','Configure a connected Meta Ads integration for this workspace');
 const read=async(url:string)=>{const response=await deps.fetch(url,{headers:{Authorization:`Bearer ${credentials!.token}`},signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Provider read unavailable');return response.json();};
 let cursor:string|undefined;const seen=new Set<string>(),cursors=new Set<string>();
 try{
  for(let page=0;page<3;page++){
   if(!canStart()){partial=true;reason='Read budget reached';break;}
   const url=new URL(`https://graph.facebook.com/v21.0/act_${credentials.account}/campaigns`);url.searchParams.set('fields','id,name,status,account_id');url.searchParams.set('limit','25');if(cursor)url.searchParams.set('after',cursor);
   const data=await read(url.href);
   if(!Array.isArray(data?.data)||data.data.length>25)throw new Error('Invalid campaign page');
   // Validate the complete page before persisting any row from it.
   for(const row of data.data)if(typeof row?.id!=='string'||!/^\d{1,32}$/.test(row.id)||typeof row.name!=='string'||row.name.length>255||typeof row.status!=='string'||String(row.account_id)!==credentials.account||seen.has(row.id))throw new Error('Invalid campaign scope or duplicate');else seen.add(row.id);
   for(const row of data.data){
    if(campaigns.length>=50||!canStart()){partial=true;reason='Read budget or campaign limit reached';break;}
    let metrics=metaAdMetrics(null);
    try{const insights=await read(`https://graph.facebook.com/v21.0/${row.id}/insights?fields=spend,impressions,clicks,actions,action_values&date_preset=maximum&limit=1`);if(!Array.isArray(insights?.data)||insights.data.length>1||insights.paging?.next)throw new Error('Invalid insights');metrics=metaAdMetrics(insights.data[0]);}catch{partial=true;reason='Some insight reads unavailable';}
    const saved=await deps.save({company_id:company,provider:'meta_ads',external_campaign_id:row.id,name:row.name,status:['ACTIVE','PAUSED','ARCHIVED'].includes(row.status)?row.status:'UNKNOWN',fetched_at:fetchedAt,...metrics,raw_metrics_json:JSON.stringify({source:'meta_ads',period:'maximum',metrics})});
    if(saved.company_id!==company||saved.provider!=='meta_ads'||saved.external_campaign_id!==row.id)throw new Error('Persistence acknowledgement mismatch');campaigns.push(saved);
   }
   if(!data.paging?.next)break;
   if(partial||campaigns.length>=50||page===2){partial=true;reason=reason||'More campaigns remain';break;}
   const next=data.paging?.cursors?.after;if(typeof next!=='string'||!next||next.length>2048||cursors.has(next)){partial=true;reason='Pagination cursor unavailable';break;}cursors.add(next);cursor=next;
  }
  return result(partial?'PARTIAL':'SUCCESS',partial?`${reason}. ${campaigns.length} campaign records saved; sync incomplete.`:`Synchronized ${campaigns.length} campaign records. Provider metrics do not prove business outcomes.`);
 }catch{return result(campaigns.length?'PARTIAL':'PROVIDER_ERROR',`Campaign sync incomplete; ${campaigns.length} records acknowledged. Reload stored data before retrying.`);}
}
