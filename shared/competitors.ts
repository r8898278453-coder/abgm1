import {z} from 'zod';
const fields=['id','name','placeId','address','rating','reviewsCount','photosCount','postsPerWeek','localVisibilityRank','provider','lastObservedAt','dataClassification'];
/** Opaque comparison value, not authorization: caller must still own the workspace. */
export function competitorVersion(row:any):string{return JSON.stringify(['competitor-v1',...fields.map(key=>row[key]??null)]);}
export function competitorDto(row:any){return Object.fromEntries([...fields,'reviewGrowthThisMonth','reviewChangeSincePreviousObservation','isSelf'].filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));}
const details={name:z.string().trim().min(1).max(255),rating:z.number().min(0).max(5).nullable().optional(),reviewsCount:z.number().int().min(0).max(2147483647).nullable().optional(),placeId:z.string().trim().max(128).nullable().optional(),address:z.string().trim().max(512).nullable().optional()};
export const competitorAdd=z.object({...details,refreshNow:z.boolean().optional()}).strict();
export const competitorEdit=z.object({...details,name:details.name.optional(),expectedVersion:z.string().min(1).max(8192)}).strict().refine(value=>Object.keys(value).some(key=>key!=='expectedVersion'));
export const competitorDelete=z.object({expectedVersion:z.string().min(1).max(8192)}).strict();
