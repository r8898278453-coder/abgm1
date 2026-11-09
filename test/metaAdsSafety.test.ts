import {hasAutonomousProviderVerification} from '../shared/autonomousEvidence';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const original=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'meta-ads-'));process.chdir(dir);
try{
 const {tenantMetaAdsCredentials,changeMetaCampaignStatus}=await import('../server/metaAdsControl');
 const {syncMetaAdCampaigns,metaAdMetrics}=await import('../server/metaAdsSync');
 const legacy={action_type:'send_whatsapp',verification_state:'verified',provider_response:{verified:true}};assert.equal(hasAutonomousProviderVerification(legacy),false);assert.equal(hasAutonomousProviderVerification({...legacy,action_type:'review_reply',provider_response:{verified:true,replyStatus:'LOCAL_ONLY'}}),false);assert.equal(hasAutonomousProviderVerification({...legacy,action_type:'adjust_campaign',provider_response:{provider:'meta_marketing_api',verified:true,status:'VERIFIED',code:'CAMPAIGN_STATUS_VERIFIED',targetId:'456',configuredStatus:'PAUSED'}}),true);
 const stop=await import('../server/executionStop');stop.setGlobalEmergencyStop(false);
 const integration={provider:'meta_ads',company_id:'A',status:'connected',credentials:{accessToken:'private-token',adAccountId:'act_123'}};
 assert.equal(tenantMetaAdsCredentials('B',integration),null);assert.equal(tenantMetaAdsCredentials('A',{...integration,status:'disconnected'}),null);assert.equal(tenantMetaAdsCredentials('A',null),null);
 let mode='valid',posts=0;const urls:string[]=[];
 const transport:typeof fetch=async(input,options)=>{
  const url=String(input);urls.push(url);assert.ok(!url.includes('private-token'));assert.equal((options?.headers as any).Authorization,'Bearer private-token');
  if(options?.method==='POST'){posts++;if(mode==='network')throw new Error('private-provider-error');return new Response(mode==='bad-ack'?'{}':'{"success":true}',{status:mode==='server-error'?500:mode==='rejected'?403:200});}
  if(mode==='paused')stop.setGlobalEmergencyStop(true);
  return new Response(JSON.stringify({id:'456',account_id:mode==='foreign'?'999':'123',configured_status:mode==='mismatch'?'ACTIVE':'PAUSED'}));
 };
 const command={externalCampaignId:'456',status:'PAUSED',adjustmentType:'status_change'};
 assert.equal((await changeMetaCampaignStatus('A',{externalCampaignId:'456',adjustmentType:'budget_reallocation'},integration,transport)).status,'BLOCKED');assert.equal(urls.length,0);
 assert.equal((await changeMetaCampaignStatus('A',command,integration,transport)).status,'VERIFIED');assert.equal(posts,1);
 for(const [state,expected] of [['foreign','BLOCKED'],['paused','PAUSED'],['network','UNKNOWN'],['bad-ack','UNKNOWN'],['server-error','UNKNOWN'],['rejected','REJECTED'],['mismatch','API_ACCEPTED']]){
  mode=state;const before=posts;const outcome=await changeMetaCampaignStatus('A',command,integration,transport);assert.equal(outcome.status,expected);assert.ok(!JSON.stringify(outcome).includes('private-'));if(['foreign','paused'].includes(state))assert.equal(posts,before);stop.setGlobalEmergencyStop(false);
 }
 const metrics=metaAdMetrics({spend:'100',impressions:'12bad',clicks:-1,actions:[{action_type:'lead',value:'99'},{action_type:'purchase',value:'2'}],action_values:[{action_type:'purchase',value:'250'}]});assert.equal(metrics.conversions,2);assert.equal(metrics.roas,2.5);assert.equal(metrics.clicks,null);assert.equal(metrics.impressions,null);
 assert.equal(metaAdMetrics({spend:'0',actions:[{action_type:'lead',value:'0'}]}).conversions,0);assert.equal(metaAdMetrics({spend:'0',revenue:'100'}).roas,null);
 assert.equal(metaAdMetrics({spend:'1e3'}).spend,null);assert.equal(metaAdMetrics({actions:[{action_type:'purchase',value:'2'},{action_type:'purchase',value:'3'}]}).conversions,null);
 let syncMode='valid',saved:any[]=[],reads=0;
 const syncFetch:typeof fetch=async(input,options)=>{assert.notEqual(options?.method,'POST');const url=new URL(String(input));assert.equal(url.hostname,'graph.facebook.com');assert.ok(!url.searchParams.has('access_token'));reads++;
  if(url.pathname.endsWith('/campaigns')){
   if(syncMode==='invalid-list')return new Response('{}');
   return new Response(JSON.stringify({data:[{id:'456',name:'Fixture',status:'NEW_STATUS',account_id:syncMode==='foreign'?'999':'123'},...(syncMode==='second-save-error'?[{id:'457',name:'Second',status:'ACTIVE',account_id:'123'}]:[])],...(syncMode==='pagination'?{paging:{next:'https://evil.invalid/steal?token=private',cursors:{after:'safe-cursor'}}}:{})}));
  }
  if(syncMode==='insight-error')return new Response('{"error":{"message":"private-error"}}',{status:500});
  return new Response(JSON.stringify({data:[{spend:'10',clicks:'0',actions:[{action_type:'lead',value:'0'}]}]}));
 };
 const deps={integration:async()=>integration,save:async(value:any)=>{if(syncMode==='storage-error'||syncMode==='second-save-error'&&value.external_campaign_id==='457')throw new Error('private-db-error');saved.push(value);return {id:'saved',...value};},fetch:syncFetch};
 let result=await syncMetaAdCampaigns('A',deps);assert.equal(result.status,'SUCCESS');assert.equal(result.campaignsCount,1);assert.equal(saved[0].status,'UNKNOWN');assert.equal(saved[0].clicks,0);assert.ok(!JSON.stringify(result).includes('private-'));
 for(const [state,expected] of [['invalid-list','PROVIDER_ERROR'],['foreign','PROVIDER_ERROR'],['insight-error','PARTIAL'],['storage-error','PROVIDER_ERROR'],['pagination','PARTIAL'],['second-save-error','PARTIAL']]){syncMode=state;saved=[];result=await syncMetaAdCampaigns('A',deps);assert.equal(result.status,expected);assert.ok(!JSON.stringify(result).includes('private-'));if(state==='second-save-error')assert.equal(result.campaignsCount,1);if(['invalid-list','foreign'].includes(state))assert.equal(saved.length,0);}
 const before=reads;assert.equal((await syncMetaAdCampaigns('B',deps)).status,'NOT_CONFIGURED');assert.equal(reads,before);
 assert.equal((await syncMetaAdCampaigns('A',{...deps,canStart:()=>false})).status,'PARTIAL');assert.equal(reads,before);
 console.log('Meta Ads safety: explicit status intent, tenant/account preflight, write-boundary stop, read-back vs acceptance, unknown/rejection, bounded read-only sync, partial/persistence errors, safe metrics and no token URLs/raw errors passed.');
}finally{process.chdir(original);fs.rmSync(dir,{recursive:true,force:true});}
