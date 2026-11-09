import type { DbContentPost } from './db';
import { metaPublishingText } from './metaPublishingText';
export type MetaCheckStatus='MATCHED'|'MISMATCH'|'UNAVAILABLE'|'STALE';
export interface MetaCheckResult {
  status:MetaCheckStatus;reason:string;platform:'facebook'|'instagram';providerObjectId:string;
  publicationId?:string;accountId?:string;providerCreatedAtMs?:number;
  mediaCompared:false;dispatchAttributionVerified:false;
}
export interface MetaCheckConnection {company_id:string;provider:string;status:string;credentials?:Record<string,any>}
export async function verifyMetaPublication(input:{company:string;platform:'facebook'|'instagram';providerId:string;startedAtMs:number;post:DbContentPost;connection:MetaCheckConnection|null},fetcher:typeof fetch=fetch,now=Date.now()):Promise<MetaCheckResult>{
  const base={platform:input.platform,providerObjectId:input.providerId,mediaCompared:false as const,dispatchAttributionVerified:false as const};
  const result=(status:MetaCheckStatus,reason:string,extra:Partial<MetaCheckResult>={}):MetaCheckResult=>({...base,status,reason,...extra});
  if(input.post.company_id!==input.company || input.providerId.length>128 || !/^\d+(?:_\d+)?$/.test(input.providerId) || (input.platform==='instagram'&&!/^\d+$/.test(input.providerId)))return result('UNAVAILABLE','INVALID_SCOPE_OR_ID');
  const connection=input.connection;
  const token=connection?.credentials?.accessToken;
  const account=String(connection?.credentials?.[input.platform==='facebook'?'pageId':'instagramId'] || '').trim();
  if(!connection || connection.company_id!==input.company || connection.provider!=='meta_social' || connection.status!=='connected' || typeof token!=='string'||!token.trim()||account.length>64||!/^\d+$/.test(account))return result('UNAVAILABLE','WORKSPACE_CONNECTION_REQUIRED');
  if(!Number.isFinite(input.startedAtMs)||input.startedAtMs<=0)return result('UNAVAILABLE','ATTEMPT_TIME_UNAVAILABLE');
  const signal=AbortSignal.timeout(5000);
  async function get(id:string,fields:string){
    const response=await fetcher(`https://graph.facebook.com/v21.0/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`,{method:'GET',headers:{Authorization:`Bearer ${token}`},signal,redirect:'error'});
    if(!response.ok)throw new Error('PROVIDER_UNAVAILABLE');
    const body=await response.json();
    if(!body || body.error || typeof body!=='object')throw new Error('PROVIDER_UNAVAILABLE');
    return body;
  }
  try{
    let object:any;
    if(input.platform==='facebook'){
      let publicationId=input.providerId;
      if(input.post.image_url&&!input.providerId.includes('_')){
        const photo=await get(input.providerId,'id,from,page_story_id');
        if(photo.id!==input.providerId)return result('MISMATCH','OBJECT_ID_MISMATCH');
        if(typeof photo.from?.id!=='string')return result('UNAVAILABLE','OWNER_EVIDENCE_MISSING');
        if(photo.from.id!==account)return result('MISMATCH','ACCOUNT_MISMATCH');
        if(typeof photo.page_story_id!=='string'||photo.page_story_id.length>128||!/^\d+(?:_\d+)?$/.test(photo.page_story_id))return result('UNAVAILABLE','PUBLISHED_STORY_EVIDENCE_MISSING');
        publicationId=photo.page_story_id;
      }
      object=await get(publicationId,'id,from,message,is_published,created_time');
      if(object.id!==publicationId)return result('MISMATCH','OBJECT_ID_MISMATCH');
      if(typeof object.from?.id!=='string')return result('UNAVAILABLE','OWNER_EVIDENCE_MISSING');
      if(object.from.id!==account)return result('MISMATCH','ACCOUNT_MISMATCH');
      if(object.is_published===false)return result('MISMATCH','OBJECT_NOT_PUBLISHED');
      if(object.is_published!==true)return result('UNAVAILABLE','PUBLISHED_STATE_UNCONFIRMED');
    }else{
      object=await get(input.providerId,'id,owner,caption,media_type,permalink,timestamp');
      if(object.id!==input.providerId)return result('MISMATCH','OBJECT_ID_MISMATCH');
      if(typeof object.owner?.id!=='string')return result('UNAVAILABLE','OWNER_EVIDENCE_MISSING');
      if(object.owner.id!==account)return result('MISMATCH','ACCOUNT_MISMATCH');
      let validLink=false;
      try{const link=new URL(object.permalink);validLink=link.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(link.hostname)&&!link.username&&!link.password&&/^\/(p|reel|tv)\/[^/]+\/?$/.test(link.pathname);}catch{/* no published-object proof */}
      if(!['IMAGE','VIDEO','CAROUSEL_ALBUM'].includes(object.media_type)||!validLink)return result('UNAVAILABLE','PUBLISHED_STATE_UNCONFIRMED');
    }
    const timestamp=input.platform==='facebook'?object.created_time:object.timestamp;
    if(typeof timestamp!=='string'||!/(Z|[+-]\d{2}:?\d{2})$/.test(timestamp)||!Number.isFinite(Date.parse(timestamp)))return result('UNAVAILABLE','PUBLICATION_TIME_MISSING');
    const created=Date.parse(timestamp);
    if(created<input.startedAtMs-60000||created>now+60000)return result('MISMATCH','PUBLICATION_TIME_MISMATCH');
    const text=input.platform==='facebook'?object.message:object.caption;
    if(typeof text!=='string')return result('UNAVAILABLE','TEXT_EVIDENCE_MISSING');
    const normalize=(value:string)=>value.normalize('NFC').replace(/\r\n/g,'\n').trim();
    if(normalize(text)!==normalize(metaPublishingText(input.post)))return result('MISMATCH','TEXT_MISMATCH');
    return result('MATCHED','PUBLISHED_ACCOUNT_TEXT_TIME_MATCH',{publicationId:object.id,accountId:account,providerCreatedAtMs:created});
  }catch{return result('UNAVAILABLE','PROVIDER_UNAVAILABLE');}
}
