import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {creativeRenderInput,reelRenderInput,ownedRenderImage,canonicalRenderName} from '../server/renderInputPolicy';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'render-policy-'));
try{
 const company='client_1',dir=path.join(root,company);
 await fs.mkdir(dir);
 const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(16)]);
 await fs.writeFile(path.join(dir,'photo.png'),bytes);
 const assets=[{asset_type:'photo',url:`/uploads/${company}/photo.png`}];
 assert.equal(await ownedRenderImage(root,company,assets,'photo'),`data:image/png;base64,${bytes.toString('base64')}`);
 assert.equal(await ownedRenderImage(root,company,assets,'logo'),undefined);
 for(const url of ['https://example.com/private.png','http://127.0.0.1/metadata','/uploads/foreign/photo.png','data:image/png;base64,abc']){
  await assert.rejects(ownedRenderImage(root,company,assets,'photo',url),/RENDER_INPUT_INVALID/);
  await assert.rejects(ownedRenderImage(root,company,[{asset_type:'photo',url}],'photo',url),/RENDER_INPUT_INVALID/);
 }
 for(const suffix of ['../photo.png','%2e%2e/photo.png','photo.png?x=1','photo.png#x','nested\\photo.png']){
  const url=`/uploads/${company}/${suffix}`;
  await assert.rejects(ownedRenderImage(root,company,[{asset_type:'photo',url}],'photo',url));
 }
 await fs.writeFile(path.join(root,'outside.png'),bytes);
 await fs.symlink(path.join(root,'outside.png'),path.join(dir,'link.png'));
 await assert.rejects(ownedRenderImage(root,company,[{asset_type:'photo',url:`/uploads/${company}/link.png`}],'photo'));
 await fs.symlink(dir,path.join(root,'client_2'));
 await assert.rejects(ownedRenderImage(root,'client_2',[{asset_type:'photo',url:'/uploads/client_2/photo.png'}],'photo'));
 await fs.writeFile(path.join(dir,'evil.svg'),'<svg><script>alert(1)</script></svg>');
 await assert.rejects(ownedRenderImage(root,company,[{asset_type:'photo',url:`/uploads/${company}/evil.svg`}],'photo'));
 await fs.writeFile(path.join(dir,'large.png'),Buffer.alloc(5*1024*1024+1));
 await assert.rejects(ownedRenderImage(root,company,[{asset_type:'photo',url:`/uploads/${company}/large.png`}],'photo'));
 assert.equal(creativeRenderInput.safeParse({companyId:company,headline:'Hello',companyName:'Forged'}).success,true);
 assert.equal(canonicalRenderName({name:'Actual company'}),'Actual company');
 for(const body of [{},{companyId:'../x'},{companyId:company,headline:'x'.repeat(241)},{companyId:company,primaryColor:'url(http://127.0.0.1)'},{companyId:company,userId:'other'}])assert.equal(creativeRenderInput.safeParse(body).success,false);
 const scene={scene:1,visual:'A draft scene',audio:'Draft narration'};
 assert.equal(reelRenderInput.safeParse({companyId:company,reelScript:[scene,scene,scene]}).success,true);
 for(const reelScript of [[],[scene],Array(4).fill(scene),[{...scene,visual:42},scene,scene],[{...scene,extra:true},scene,scene]])assert.equal(reelRenderInput.safeParse({companyId:company,reelScript}).success,false);
 console.log('render input policy: ownership, raster bounds, traversal, symlinks, strict request contracts passed');
}finally{await fs.rm(root,{recursive:true,force:true});}
