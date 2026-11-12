import crypto from 'node:crypto';
import type {Pool,PoolConnection} from 'mysql2/promise';
import {z} from 'zod';
import {ownedRenderImage} from './renderInputPolicy';
import {agencyClientAccess} from './agencyPolicy';
import {agencyAudit} from './agencyRoutes';
export class RenderError extends Error{constructor(public status:number,public code:string){super(code);}}
export const assetReviewInput=z.object({expectedRevision:z.string().regex(/^(0|[1-9][0-9]{0,14})$/),decision:z.enum(['APPROVED','REVOKED']),licenseNote:z.string().trim().min(3).max(500)}).strict();
export type RenderAssetRef={id:string;url:string;asset_type:'photo'|'logo';revision:string;hash:string};
export const renderHash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
type Sql=Pick<Pool,'query'>;
export async function readRenderAssets(sql:Sql,company:string){const [rows]:any=await sql.query("SELECT a.id,a.url,a.asset_type,a.label,CAST(COALESCE(r.revision,0) AS CHAR) revision,COALESCE(r.status,'UNREVIEWED') status,r.content_hash,r.license_note FROM company_assets a LEFT JOIN render_asset_approvals r ON r.asset_id=a.id AND r.company_id=a.company_id WHERE a.company_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT 101",[company]);if(rows.length>100)throw new RenderError(409,'ASSET_LIBRARY_LIMIT');return rows;}
export async function reviewRenderAsset(pool:Pool,root:string,company:string,assetId:string,actor:{id:string;is_platform_admin?:boolean|number},body:z.infer<typeof assetReviewInput>){
 const c=await pool.getConnection();try{await c.beginTransaction();await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);const access=await agencyClientAccess(c,actor,company,'approve');if(!access.authorized)throw new RenderError(access.status,'ASSET_REVIEW_FORBIDDEN');
 const row=(await readRenderAssets(c,company)).find((a:any)=>a.id===assetId);if(!row)throw new RenderError(404,'ASSET_NOT_FOUND');if(String(row.revision)!==body.expectedRevision)throw new RenderError(409,'ASSET_REVIEW_CHANGED');
 let hash=row.content_hash||'0'.repeat(64);if(body.decision==='APPROVED'){const image=await ownedRenderImage(root,company,[row],row.asset_type,row.url);if(!image)throw new RenderError(409,'ASSET_FILE_UNAVAILABLE');hash=renderHash(image);}
 const revision=String(BigInt(body.expectedRevision)+1n);
 await c.query('INSERT INTO render_asset_approvals(asset_id,company_id,revision,status,content_hash,license_note,reviewer_id) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE revision=VALUES(revision),status=VALUES(status),content_hash=VALUES(content_hash),license_note=VALUES(license_note),reviewer_id=VALUES(reviewer_id)',[assetId,company,revision,body.decision,hash,body.licenseNote,actor.id]);
 await agencyAudit(c,company,actor.id,'ASSET_REVIEW',{assetId,revision,decision:body.decision,contentHash:hash});await c.commit();return{assetId,companyId:company,revision,status:body.decision};
 }catch(error){await c.rollback();throw error;}finally{c.release();}
}
export async function approvedRenderAssets(sql:Sql,root:string,company:string,requestedLogo?:string,requestedPhoto?:string){
 const rows=await readRenderAssets(sql,company),approved=rows.filter((r:any)=>r.status==='APPROVED');
 const choose=(kind:string,url?:string)=>{const row=url?approved.find((r:any)=>r.asset_type===kind&&r.url===url):approved.find((r:any)=>r.asset_type===kind);if(url&&!row)throw new RenderError(409,'ASSET_APPROVAL_REQUIRED');return row;};
 const selected=[choose('logo',requestedLogo),...(requestedPhoto?[choose('photo',requestedPhoto)]:approved.filter((r:any)=>r.asset_type==='photo').slice(0,3))].filter(Boolean);
 const refs:RenderAssetRef[]=[],images:{logoUrl?:string;photoUrls:string[]}={photoUrls:[]};
 for(const row of selected){const image=await ownedRenderImage(root,company,[row],row.asset_type,row.url);if(!image||renderHash(image)!==row.content_hash)throw new RenderError(409,'ASSET_BYTES_CHANGED');refs.push({id:row.id,url:row.url,asset_type:row.asset_type,revision:String(row.revision),hash:row.content_hash});if(row.asset_type==='logo')images.logoUrl=image;else images.photoUrls.push(image);}
 return{refs,images};
}
export async function verifyRenderAssetRefs(sql:Sql,root:string,company:string,refs:RenderAssetRef[],readBytes:boolean){
 const rows=await readRenderAssets(sql,company);const images:{logoUrl?:string;photoUrls:string[]}={photoUrls:[]};
 for(const ref of refs){const row=rows.find((r:any)=>r.id===ref.id);if(!row||row.status!=='APPROVED'||String(row.revision)!==ref.revision||row.content_hash!==ref.hash||row.url!==ref.url||row.asset_type!==ref.asset_type)throw new RenderError(409,'ASSET_APPROVAL_CHANGED');
 if(readBytes){const image=await ownedRenderImage(root,company,[row],row.asset_type,row.url);if(!image||renderHash(image)!==ref.hash)throw new RenderError(409,'ASSET_BYTES_CHANGED');if(ref.asset_type==='logo')images.logoUrl=image;else images.photoUrls.push(image);}}
 return images;
}
