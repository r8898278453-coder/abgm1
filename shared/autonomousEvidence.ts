/** Legacy booleans and local saves are not independent provider read-back evidence. */
export function hasAutonomousProviderVerification(action:any):boolean{
 const evidence=action?.provider_response;
 if(action?.verification_state!=='verified'||evidence?.verified!==true)return false;
 if(action.action_type==='review_reply')return evidence.provider==='google_business_profile_oauth'&&evidence.replyStatus==='GOOGLE_VERIFIED'&&evidence.publication==='VERIFIED';
 if(action.action_type==='adjust_campaign')return evidence.provider==='meta_marketing_api'&&evidence.status==='VERIFIED'&&evidence.code==='CAMPAIGN_STATUS_VERIFIED'&&/^\d{1,32}$/.test(evidence.targetId||'')&&['ACTIVE','PAUSED'].includes(evidence.configuredStatus);
 return false;
}
