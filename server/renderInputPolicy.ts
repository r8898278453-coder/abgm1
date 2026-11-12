import {z} from 'zod';
import path from 'node:path';
import fs from 'node:fs/promises';

const text=(max:number)=>z.string().trim().max(max).optional();
const common={companyId:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),companyName:text(200),logoUrl:text(2048),primaryColor:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional()};
export const creativeRenderInput=z.object({...common,templateId:text(80),paletteId:text(80),headline:text(240),caption:text(2000),ctaText:text(100),photoUrl:text(2048),tag:text(80),contentType:text(80),secondaryColor:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional()}).strict();
export const reelRenderInput=z.object({...common,reelScript:z.array(z.object({scene:z.union([z.string().trim().min(1).max(80),z.number().int().min(1).max(3)]),visual:z.string().trim().max(1000),audio:z.string().trim().max(1000)}).strict()).length(3)}).strict();
export class RenderInputError extends Error { readonly status=400; constructor(){super('RENDER_INPUT_INVALID');} }

/** Only registered, same-company raster files may enter renderers. Never performs a URL fetch. */
export async function ownedRenderImage(root:string,company:string,assets:readonly {url:string;asset_type:string}[],kind:'logo'|'photo',requested?:string):Promise<string|undefined>{
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(company))throw new RenderInputError();
 const asset=requested?assets.find(a=>a.asset_type===kind&&a.url===requested):assets.find(a=>a.asset_type===kind);
 if(requested&&!asset)throw new RenderInputError();
 if(!asset)return undefined;
 const prefix=`/uploads/${company}/`;
 if(!asset.url.startsWith(prefix)||asset.url.includes('\\')||asset.url.includes('%')||asset.url.includes('?')||asset.url.includes('#'))throw new RenderInputError();
 const relative=asset.url.slice(prefix.length);
 if(!relative||relative.split('/').some(s=>!s||s==='.'||s==='..'))throw new RenderInputError();
 try{
  const rootPath=await fs.realpath(root);
  const base=await fs.realpath(path.join(rootPath,company));
  if(base!==path.join(rootPath,company))throw new RenderInputError();
  const file=await fs.realpath(path.join(base,relative));
  if(!file.startsWith(base+path.sep))throw new RenderInputError();
  const handle=await fs.open(file,'r');
  try{
   const stat=await handle.stat();
   if(!stat.isFile()||stat.size<12||stat.size>5*1024*1024)throw new RenderInputError();
   // Bound the read even if the file grows after stat.
   const bytes=Buffer.alloc(5*1024*1024+1);
   const {bytesRead}=await handle.read(bytes,0,bytes.length,0);
   if(bytesRead!==stat.size||bytesRead>5*1024*1024)throw new RenderInputError();
   const data=bytes.subarray(0,bytesRead);
   const mime=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':data[0]===255&&data[1]===216&&data[2]===255?'image/jpeg':data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'?'image/webp':undefined;
   if(!mime)throw new RenderInputError();
   return `data:${mime};base64,${data.toString('base64')}`;
  }finally{await handle.close();}
 }catch{throw new RenderInputError();}
}
export function canonicalRenderName(company:{name?:string|null}):string{return (company.name||'Business').trim().slice(0,200)||'Business';}
