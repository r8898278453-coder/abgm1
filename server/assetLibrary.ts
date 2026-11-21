import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {canonicalJson} from '../shared/canonicalJson';
import {validateAssetLibrary,ASSET_INSPECTION_PAGE_SIZE,type InspectedAsset} from '../shared/assetLibrary';
import {validWorkspaceRevision} from '../shared/workspaceRevision';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {readRenderAssets,renderHash,RenderError,requireRenderActor} from './renderAssets';
import {ownedRenderImage} from './renderInputPolicy';
const hash=(v:unknown)=>crypto.createHash('sha256').update(canonicalJson(v)).digest('hex');
function metadata(rows:any[]){for(const a of rows)if(typeof a.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(a.id)||typeof a.url!=='string'||a.url.length>512||a.label!==null&&(typeof a.label!=='string'||a.label.length>255)||!['photo','logo'].includes(a.asset_type)||!validWorkspaceRevision(a.revision)||!['UNREVIEWED','APPROVED','REVOKED'].includes(a.status)||a.license_note!==null&&(typeof a.license_note!=='string'||a.license_note.length>500)||a.status!=='UNREVIEWED'&&(typeof a.content_hash!=='string'||!/^[a-f0-9]{64}$/.test(a.content_hash)))throw new RenderError(503,'ASSET_LIBRARY_METADATA_INVALID');return rows;}
/** SQL is released during local file reads. Recheck metadata/authority before admitting the observation. */
export async function inspectAssetLibrary(pool:Pool,root:string,user:{id:string},company:string,before?:string){
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(company))throw new RenderError(400,'ASSET_LIBRARY_SCOPE_INVALID');
 const load=()=>withReadOnlySqlDeadline(pool,async sql=>{await requireRenderActor(sql,user,company,'read');return metadata(await readRenderAssets(sql,company));});
 const rows=await load(),catalogVersion=hash(rows);let start=0;
 if(before!==undefined){try{if(!/^[A-Za-z0-9_-]{1,512}$/.test(before))throw Error();const c=JSON.parse(Buffer.from(before,'base64url').toString());if(Buffer.from(JSON.stringify(c)).toString('base64url')!==before||Object.keys(c).sort().join(',')!=='company,id,v,version'||c.v!==1||c.company!==company||c.version!==catalogVersion||typeof c.id!=='string')throw Error();const index=rows.findIndex(a=>a.id===c.id);if(index<0)throw Error();start=index+1;}catch{throw new RenderError(409,'ASSET_LIBRARY_CURSOR_CHANGED');}}
 const selected=rows.slice(start,start+ASSET_INSPECTION_PAGE_SIZE),assets:InspectedAsset[]=[];
 for(const a of selected){let observedHash:string|null=null;try{const image=await ownedRenderImage(root,company,[a],a.asset_type,a.url);if(image)observedHash=renderHash(image);}catch{/* Path/format/size/missing failures are unavailable, never remote fetches. */}
 const fileState=observedHash===null?'FILE_UNAVAILABLE':a.status==='APPROVED'?(observedHash===a.content_hash?'MATCHES_REVIEWED_FILE':'BYTES_CHANGED'):a.status;
 assets.push({id:a.id,label:a.label||'',url:a.url,assetType:a.asset_type,revision:a.revision,reviewStatus:a.status,licenseNote:a.license_note,licenseThrough:a.license_through??null,licenseSource:a.license_source??null,fileState,observedHash,checkedAtMs:Date.now(),duplicateIds:[],recordedDuplicateIds:a.status==='APPROVED'?rows.filter(b=>b.id!==a.id&&b.status==='APPROVED'&&b.content_hash===a.content_hash).map(b=>b.id):[]});}
 for(const a of assets)if(a.observedHash)a.duplicateIds=assets.filter(b=>b.id!==a.id&&b.observedHash===a.observedHash).map(b=>b.id);
 if(hash(await load())!==catalogVersion)throw new RenderError(409,'ASSET_LIBRARY_CHANGED');const last=selected.at(-1),nextCursor=start+selected.length<rows.length?Buffer.from(JSON.stringify({v:1,company,id:last.id,version:catalogVersion})).toString('base64url'):null;
 return validateAssetLibrary({model:1,companyId:company,catalogVersion,catalogSize:rows.length,checkedAtMs:Date.now(),assets,nextCursor},company);
}
