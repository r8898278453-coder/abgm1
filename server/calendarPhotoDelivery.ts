import fs from 'node:fs/promises';import path from 'node:path';
import type {Pool} from 'mysql2/promise';
import {verifyCalendarAttachmentForPost} from './calendarAttachmentProof';
import {ownedRenderImage} from './renderInputPolicy';
import {renderHash} from './renderAssets';
export function calendarPhotoOrigin(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('CALENDAR_PHOTO_PUBLIC_ORIGIN_REQUIRED');return u.origin;}
/** Called only after durable publishing admission. Does not call a provider or mutate source media. */
export async function prepareCalendarPhotoDelivery(post:{id:string;company_id:string;image_url?:string|null;video_url?:string|null},deps:{pool?:Pool;origin?:string}={}){
 const db=await import('./db'),pool=deps.pool||await db.getDbPool();if(!pool){if(db.getDbStatus().configured)throw Error('CALENDAR_PHOTO_STORAGE_UNAVAILABLE');return post.image_url;}
 const c=await pool.getConnection();try{await c.beginTransaction();await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[post.company_id]);const a=await verifyCalendarAttachmentForPost(c,post);if(!a){await c.commit();return post.image_url;}const origin=calendarPhotoOrigin(deps.origin??process.env.PUBLIC_APP_URL??''),root=path.join(process.cwd(),'uploads'),image=await ownedRenderImage(root,post.company_id,[a.ref],'photo',a.ref.url);if(!image||renderHash(image)!==a.ref.hash)throw Error('CALENDAR_PHOTO_BYTES_CHANGED');const match=image.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!match)throw Error('CALENDAR_PHOTO_FORMAT_INVALID');
 const rootPath=await fs.realpath(root),companyPath=await fs.realpath(path.join(rootPath,post.company_id));if(companyPath!==path.join(rootPath,post.company_id))throw Error('CALENDAR_PHOTO_PATH_INVALID');const dir=path.join(companyPath,'publication-media');await fs.mkdir(dir,{recursive:true});if(await fs.realpath(dir)!==dir)throw Error('CALENDAR_PHOTO_PATH_INVALID');const filename=a.ref.hash+'.'+(match[1]==='jpeg'?'jpg':match[1]),url='/uploads/'+post.company_id+'/publication-media/'+filename,file=path.join(dir,filename);const entries:string[]=[];for await(const entry of await fs.opendir(dir)){entries.push(entry.name);if(entries.length>100)break;}if(entries.length>=100&&!entries.includes(filename))throw Error('CALENDAR_PHOTO_DELIVERY_CAPACITY');
 try{await fs.writeFile(file,Buffer.from(match[2],'base64'),{flag:'wx',mode:0o600});}catch(e:any){if(e.code!=='EEXIST')throw e;}
 const frozen=await ownedRenderImage(root,post.company_id,[{url,asset_type:'photo'}],'photo',url);if(!frozen||renderHash(frozen)!==a.ref.hash)throw Error('CALENDAR_PHOTO_DELIVERY_CHANGED');await c.commit();return origin+url;
 }catch(e){await c.rollback();throw e;}finally{c.release();}}
