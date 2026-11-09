import {isGlobalEmergencyStopActive} from './executionStop';
import type {DbReview} from './db';
export interface AutonomousReviewOutcome{
 replyStatus:'LOCAL_ONLY'|'GOOGLE_PUBLISHED'|'GOOGLE_VERIFIED';
 publication:'LOCAL_ONLY'|'API_ACCEPTED'|'VERIFIED'|'UNKNOWN'|'REJECTED';
 verified:boolean;
}
/** Public verification requires a matching provider read-back, never just a local save or PUT acknowledgement. */
export async function dispatchAutonomousReviewReply(company:string,review:DbReview|null,reply:unknown,integration:{credentials?:Record<string,any>}|null,transport:typeof fetch=fetch):Promise<AutonomousReviewOutcome>{
 if(!review||review.company_id!==company)throw new Error('Review workspace mismatch');
 if(typeof reply!=='string'||!reply.trim()||reply.length>4096)throw new Error('Invalid review reply');
 const credentials=integration?.credentials||{};
 const account=/^(?:accounts\/)?([A-Za-z0-9_-]{1,128})$/.exec(credentials.accountId||'')?.[1];
 const location=/^(?:locations\/)?([A-Za-z0-9_-]{1,128})$/.exec(credentials.locationId||'')?.[1];
 const reviewId=review.external_review_id;
 if(!credentials.oauthToken||!account||!location||typeof reviewId!=='string'||!reviewId||reviewId.length>255)return {replyStatus:'LOCAL_ONLY',publication:'LOCAL_ONLY',verified:false};
 if(isGlobalEmergencyStopActive())throw new Error('Global execution stop is active');
 const url=`https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(account)}/locations/${encodeURIComponent(location)}/reviews/${encodeURIComponent(reviewId)}/reply`;
 const options={headers:{Authorization:`Bearer ${credentials.oauthToken}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(6000)};
 let accepted:Response;
 try{accepted=await transport(url,{...options,method:'PUT',body:JSON.stringify({comment:reply})});}catch{return {replyStatus:'LOCAL_ONLY',publication:'UNKNOWN',verified:false};}
 if(!accepted.ok)return {replyStatus:'LOCAL_ONLY',publication:accepted.status>=500?'UNKNOWN':'REJECTED',verified:false};
 try{
  const observed=await transport(url.slice(0,-6),{headers:options.headers,signal:AbortSignal.timeout(6000)});
  if(observed.ok){const body=await observed.json();if(body?.reviewReply?.comment===reply)return {replyStatus:'GOOGLE_VERIFIED',publication:'VERIFIED',verified:true};}
 }catch{/* A failed read must not turn API acceptance into verified publication. */}
 return {replyStatus:'GOOGLE_PUBLISHED',publication:'API_ACCEPTED',verified:false};
}
