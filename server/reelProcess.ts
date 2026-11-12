import {fork} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {ReelRenderAdapter} from './reelJobs';

/** Render in an isolated Linux process group; never release capacity before descendants stop. */
export const renderReelInProcess:ReelRenderAdapter=async({inputProps,outputPath,signal})=>{
 if(process.platform!=='linux'||!process.env.REEL_BROWSER_EXECUTABLE||!path.isAbsolute(process.env.REEL_BROWSER_EXECUTABLE))throw new Error('REEL_BROWSER_UNAVAILABLE');
 await fs.access(process.env.REEL_BROWSER_EXECUTABLE);
 const compiled=path.join(process.cwd(),'dist','reel-worker.cjs');await fs.access(compiled);
 if(signal.aborted)throw new Error('REEL_RENDER_ABORTED');
 const child=fork(compiled,[],{detached:true,execArgv:['--max-old-space-size=512'],stdio:['ignore','ignore','ignore','ipc'],env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||'/tmp',TMPDIR:path.dirname(outputPath),NODE_ENV:'production',REEL_BROWSER_EXECUTABLE:process.env.REEL_BROWSER_EXECUTABLE}});
 let killed=false,checking=false,reason='REEL_PROCESS_FAILED';
 const kill=()=>{killed=true;if(child.pid)try{process.kill(-child.pid,'SIGKILL');}catch{}};
 const monitor=setInterval(async()=>{if(checking||!child.pid)return;checking=true;try{
  let rss=0;for(const entry of await fs.readdir('/proc')){if(!/^\d+$/.test(entry))continue;const stat=await fs.readFile(`/proc/${entry}/stat`,'utf8').catch(()=>null);if(!stat)continue;const fields=stat.slice(stat.lastIndexOf(')')+2).split(' ');if(Number(fields[2])!==child.pid)continue;const status=await fs.readFile(`/proc/${entry}/status`,'utf8').catch(()=>null);rss+=Number(status?.match(/^VmRSS:\s+(\d+)/m)?.[1]||0);}if(rss>768*1024){reason='REEL_MEMORY_LIMIT';kill();}
 }catch{kill();}finally{checking=false;}},500);monitor.unref();signal.addEventListener('abort',kill,{once:true});
 try{await new Promise<void>((resolve,reject)=>{child.once('error',()=>reject(new Error('REEL_PROCESS_UNAVAILABLE')));child.once('exit',(code)=>{const failed=killed||signal.aborted||code!==0;kill();failed?reject(new Error(signal.aborted?'REEL_RENDER_ABORTED':reason)):resolve();});child.on('message',(message:any)=>{if(message?.type==='ready')child.send({inputProps,outputPath},error=>{if(error)kill();});if(message?.type==='failed'&&['REEL_BROWSER_UNAVAILABLE','REEL_COMPOSITION_FAILED','REEL_RENDER_FAILED'].includes(message.code))reason=message.code;});});}
 finally{clearInterval(monitor);signal.removeEventListener('abort',kill);kill();}
};
