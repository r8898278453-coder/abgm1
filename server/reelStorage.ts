import fs from 'node:fs/promises';
import path from 'node:path';
import {RenderError} from './renderAssets';
export const REEL_MAX_BYTES=50*1024*1024;
/** Called under the single renderer slot; does not delete completed or referenced videos. */
export async function checkReelStorage(root:string,company:string,additionalBytes=REEL_MAX_BYTES){
 const disk=await fs.statfs(root);if(disk.bavail*disk.bsize<100*1024*1024)throw new RenderError(409,'REEL_DISK_RESERVE');
 const directories=await fs.readdir(root,{withFileTypes:true});if(directories.length>2000)throw new RenderError(409,'REEL_STORAGE_SCAN_LIMIT');let total=0,own=0;
 for(const directory of directories){if(!directory.isDirectory()||!/^[A-Za-z0-9_-]{1,64}$/.test(directory.name))continue;const generated=path.join(root,directory.name,'generated');const stat=await fs.lstat(generated).catch(()=>null);if(!stat)continue;if(!stat.isDirectory()||stat.isSymbolicLink())throw new RenderError(409,'REEL_STORAGE_INVALID');const files=await fs.readdir(generated,{withFileTypes:true});if(files.length>2000)throw new RenderError(409,'REEL_STORAGE_SCAN_LIMIT');
  for(const file of files){if(!/^reel_[A-Za-z0-9_-]+\.mp4$/.test(file.name))continue;if(!file.isFile())throw new RenderError(409,'REEL_STORAGE_INVALID');const size=(await fs.stat(path.join(generated,file.name))).size;total+=size;if(directory.name===company)own+=size;}
 }
 if(own+additionalBytes>256*1024*1024||total+additionalBytes>2*1024*1024*1024)throw new RenderError(409,'REEL_STORAGE_LIMIT');
}
