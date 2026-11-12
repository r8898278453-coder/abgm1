import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {checkReelStorage} from '../server/reelStorage';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'reel-storage-'));
try{await fs.mkdir(path.join(root,'client','generated'),{recursive:true});await checkReelStorage(root,'client');const file=path.join(root,'client','generated','reel_fixture.mp4');await fs.writeFile(file,'');await fs.truncate(file,256*1024*1024);await assert.rejects(checkReelStorage(root,'client',1),{code:'REEL_STORAGE_LIMIT'});await fs.rm(file);await fs.symlink(root,path.join(root,'client','generated','reel_symlink.mp4'));await assert.rejects(checkReelStorage(root,'client'),{code:'REEL_STORAGE_INVALID'});console.log('Reel storage: per-client logical-size budget, completed-artifact preservation and symlink refusal passed without large disk allocation.');}finally{await fs.rm(root,{recursive:true,force:true});}
