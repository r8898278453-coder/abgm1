import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {competitorVersion,competitorDto} from '../shared/competitors';
import {normalizeCompetitor,ObservationError} from './observationStore';
import {validWorkspaceRevision} from '../shared/workspaceRevision';
export type CompetitorCommand={kind:'add'|'edit'|'delete'|'refresh';id:string;expectedVersion?:string;input?:any;observation?:any};
/** Profile projection and its observation share the same connection/transaction. */
export async function mutateCompetitorSql(pool:Pool,company:string,command:CompetitorCommand){
 const connection=await pool.getConnection();try{
  await connection.beginTransaction();const [owners]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(owners.length!==1)throw new ObservationError('WORKSPACE_NOT_FOUND',404);
  const [rows]:any=await connection.query('SELECT data_payload,CAST(revision AS CHAR) revision FROM company_profiles_data WHERE company_id=? FOR UPDATE',[company]);
  const previousVersion=rows.length?rows[0].revision:'0',data=rows.length?(typeof rows[0].data_payload==='string'?JSON.parse(rows[0].data_payload):rows[0].data_payload):{};
  if(!validWorkspaceRevision(previousVersion)||BigInt(previousVersion)>=18446744073709551615n||!data||typeof data!=='object'||Array.isArray(data)||data.competitors!==undefined&&!Array.isArray(data.competitors))throw new Error('INVALID_WORKSPACE');
  const competitors:any[]=data.competitors||[],index=competitors.findIndex(row=>row.id===command.id),existing=competitors[index];
  if(competitors.length>100||command.kind==='add'&&competitors.length>=100)throw new ObservationError('COMPETITOR_LIMIT',409);
  if(command.kind==='add'&&existing)throw new ObservationError('COMPETITOR_CONFLICT',409);
  if(command.kind!=='add'&&!existing)throw new ObservationError('COMPETITOR_NOT_FOUND',404);
  if(existing&&command.expectedVersion!==competitorVersion(existing))throw new ObservationError('COMPETITOR_CHANGED',409);
  let next:any=null;
  if(command.kind==='delete')competitors.splice(index,1);
  else{
   if(command.kind==='refresh'){
    const obs=command.observation;if(!obs||obs.companyId!==company||obs.competitorId!==command.id||!['LIVE','VERIFIED'].includes(obs.dataClassification)||obs.candidate)throw new ObservationError('COMPETITOR_OBSERVATION_UNAVAILABLE',503);
    const comparable=existing?.provider===obs.provider&&existing?.placeId&&existing.placeId===obs.placeId&&['LIVE','VERIFIED'].includes(existing?.dataClassification)&&Date.parse(obs.timestamp)>Date.parse(existing.lastObservedAt);
    next={...existing,name:existing.name,placeId:obs.placeId,address:obs.address,rating:obs.rating,reviewsCount:obs.reviewsCount,photosCount:obs.photosCount,postsPerWeek:obs.postsPerWeek,localVisibilityRank:obs.rankPosition,provider:obs.provider,lastObservedAt:obs.timestamp,dataClassification:obs.dataClassification,reviewGrowthThisMonth:null,reviewChangeSincePreviousObservation:comparable&&typeof existing.reviewsCount==='number'&&typeof obs.reviewsCount==='number'?obs.reviewsCount-existing.reviewsCount:null};
   }else{
    next={...(existing||{}),...command.input,id:command.id,provider:'manual',dataClassification:'USER_ENTERED',lastObservedAt:new Date().toISOString(),reviewGrowthThisMonth:null,reviewChangeSincePreviousObservation:null,photosCount:null,postsPerWeek:null,localVisibilityRank:null};
    for(const field of ['rating','reviewsCount','placeId','address'])if(next[field]===undefined)next[field]=null;
   }
   if(competitors.some(row=>row.id!==command.id&&row.name.toLowerCase().trim()===next.name.toLowerCase().trim()))throw new ObservationError('COMPETITOR_DUPLICATE',409);
   const obs=normalizeCompetitor({id:'cobs_'+crypto.randomUUID().replaceAll('-',''),company_id:company,competitor_id:command.id,name:next.name,place_id:next.placeId,address:next.address,rating:next.rating,reviews_count:next.reviewsCount,photos_count:next.photosCount,posts_per_week:next.postsPerWeek,rank_position:next.localVisibilityRank,provider:next.provider,timestamp:next.lastObservedAt,status:next.dataClassification} as any);
   Object.assign(next,{rating:obs.rating,reviewsCount:obs.reviews_count,photosCount:obs.photos_count,postsPerWeek:obs.posts_per_week,localVisibilityRank:obs.rank_position,lastObservedAt:obs.timestamp});
   await connection.query('INSERT INTO competitor_observations(id,company_id,competitor_id,name,place_id,address,rating,reviews_count,photos_count,posts_per_week,rank_position,provider,timestamp,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,FROM_UNIXTIME(?),?)',[obs.id,company,command.id,obs.name,obs.place_id,obs.address,obs.rating,obs.reviews_count,obs.photos_count,obs.posts_per_week,obs.rank_position,obs.provider,Date.parse(obs.timestamp)/1000,obs.status]);
   if(index<0)competitors.push(next);else competitors[index]=next;
  }
  data.competitors=competitors;const version=String(BigInt(previousVersion)+1n);
  if(rows.length)await connection.query('UPDATE company_profiles_data SET data_payload=?,revision=? WHERE company_id=?',[JSON.stringify(data),version,company]);
  else await connection.query('INSERT INTO company_profiles_data(company_id,data_payload,revision) VALUES (?,?,?)',[company,JSON.stringify(data),version]);
  await connection.commit();return {companyId:company,competitors:competitors.map(competitorDto),competitor:next?competitorDto(next):null,previousVersion,version};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
