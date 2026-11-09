import {getDbPool,decryptCredentialsObject} from './db';
import {PublishingReviewError} from './publishingReview';
import {prepareMetaVerification,recordMetaVerification,type MetaVerificationInput} from './metaVerificationStore';
import {verifyMetaPublication} from './metaPublicationVerification';
export async function checkCompanyMetaPublication(company:string,post:string,actor:string,input:MetaVerificationInput){
  const pool=await getDbPool();if(!pool)throw new PublishingReviewError(503,'Durable verification storage unavailable');
  const snapshot=await prepareMetaVerification(pool,company,post,input,decryptCredentialsObject);
  const result=await verifyMetaPublication({company,platform:input.platform,providerId:input.providerPostId,startedAtMs:snapshot.context.startedAtMs,post:snapshot.post,connection:snapshot.connection});
  return recordMetaVerification(pool,snapshot,actor,result);
}
