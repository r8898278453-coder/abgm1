import { getDbPool } from './db';
import { readPublishingReview,appendPublishingReview,PublishingReviewError,type PublishingReviewInput } from './publishingReview';
async function pool(){const value=await getDbPool();if(!value)throw new PublishingReviewError(503,'Durable publishing review storage unavailable');return value;}
export async function getCompanyPublishingReview(company:string,post:string,before?:string){return readPublishingReview(await pool(),company,post,before);}
export async function recordCompanyPublishingReview(company:string,post:string,actor:string,input:PublishingReviewInput){return appendPublishingReview(await pool(),company,post,actor,input);}
