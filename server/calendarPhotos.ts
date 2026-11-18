import path from 'node:path';
import {readRenderAssets,verifyRenderAssetRefs,type RenderAssetRef} from './renderAssets';
import type {CalendarPhotoPlan} from '../shared/calendarPhotos';
export async function calendarPhotoReferences(sql:{query:Function},company:string,plan:CalendarPhotoPlan,slot?:number){
 const rows=await readRenderAssets(sql,company);return plan.selections.filter(s=>slot===undefined||s.slot===slot).map(s=>{const r=rows.find((r:any)=>r.id===s.assetId&&r.asset_type==='photo'&&r.status==='APPROVED'&&r.revision===s.revision&&r.content_hash===s.hash);return r?{id:r.id,url:r.url,asset_type:'photo',revision:s.revision,hash:s.hash}as RenderAssetRef:null;});
}
export async function calendarPhotoApprovalsCurrent(sql:{query:Function},company:string,plan:CalendarPhotoPlan){return(await calendarPhotoReferences(sql,company,plan)).every(Boolean);}
export async function verifyCalendarPhotos(sql:{query:Function},company:string,plan:CalendarPhotoPlan,slot?:number){const refs=await calendarPhotoReferences(sql,company,plan,slot);if(refs.some(r=>!r))throw Error('PLAN_PHOTO_APPROVAL_CHANGED');for(const ref of new Map((refs as RenderAssetRef[]).map(r=>[r.id,r])).values())await verifyRenderAssetRefs(sql,path.join(process.cwd(),'uploads'),company,[ref],true);}
