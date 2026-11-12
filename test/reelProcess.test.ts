import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {renderReelInProcess} from '../server/reelProcess';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'reel-process-')),old=process.cwd(),saved=process.env.REEL_BROWSER_EXECUTABLE;
try{
 await fs.mkdir(path.join(root,'dist'));process.chdir(root);process.env.REEL_BROWSER_EXECUTABLE=process.execPath;
 const worker=path.join(root,'dist/reel-worker.cjs');
 await fs.writeFile(worker,`const fs=require('fs');process.on('message',m=>{if(process.env.DB_PASSWORD||process.env.AUTH_SECRET)process.exit(2);fs.writeFileSync(m.outputPath,'fixture only');process.exit(0);});process.send({type:'ready'});`);
 const outputPath=path.join(root,'output');await renderReelInProcess({inputProps:{},outputPath,signal:new AbortController().signal});assert.equal(await fs.readFile(outputPath,'utf8'),'fixture only');
 await fs.writeFile(worker,`const fs=require('fs'),{spawn}=require('child_process');process.on('message',m=>{const child=spawn(process.execPath,['-e',"setInterval(()=>{},10)"],{stdio:'ignore'});fs.writeFileSync(m.outputPath,JSON.stringify({parent:process.pid,child:child.pid}));setInterval(()=>{},10);});process.send({type:'ready'});`);
 const controller=new AbortController(),render=renderReelInProcess({inputProps:{},outputPath:path.join(root,'pids'),signal:controller.signal});
 for(let i=0;i<100;i++){if(await fs.stat(path.join(root,'pids')).catch(()=>null))break;await new Promise(r=>setTimeout(r,10));}
 const pids=JSON.parse(await fs.readFile(path.join(root,'pids'),'utf8'));controller.abort();await assert.rejects(render,/REEL_RENDER_ABORTED/);
 for(const pid of [pids.parent,pids.child]){let alive=false;for(let i=0;i<100;i++){const stat=await fs.readFile(`/proc/${pid}/stat`,'utf8').catch(()=>null);alive=Boolean(stat&&!stat.slice(stat.lastIndexOf(')')+2).startsWith('Z'));if(!alive)break;await new Promise(r=>setTimeout(r,10));}assert.equal(alive,false,'Renderer process group must stop');}
 console.log('Reel process: IPC ready handshake, credential-isolated child, confirmed exit and abort of renderer plus descendant passed with fixture worker; no actual MP4 claim.');
}finally{process.chdir(old);if(saved===undefined)delete process.env.REEL_BROWSER_EXECUTABLE;else process.env.REEL_BROWSER_EXECUTABLE=saved;await fs.rm(root,{recursive:true,force:true});}
