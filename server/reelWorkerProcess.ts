// This entrypoint is launched only as a detached renderer process-group leader.
// Install parent-death and time-budget guards before loading the rendering libraries.
const stop=()=>{try{process.kill(-process.pid,'SIGKILL');}catch{process.exit(1);}};
process.once('disconnect',stop);
setTimeout(stop,180000).unref();
let started=false;
process.on('message',async(message:any)=>{
 if(started){stop();return;}started=true;
 try{const {renderReelVideo}=await import('./reelRenderer');await renderReelVideo({inputProps:message.inputProps,outputPath:message.outputPath,browserExecutable:process.env.REEL_BROWSER_EXECUTABLE});process.exit(0);}
 catch(error:any){const message=String(error?.message||'');const code=/browser|chrome|chromium|lib.*\.so/i.test(message)?'REEL_BROWSER_UNAVAILABLE':/bundle|composition|module/i.test(message)?'REEL_COMPOSITION_FAILED':'REEL_RENDER_FAILED';process.send?.({type:'failed',code},()=>process.exit(1));}
});
setTimeout(()=>{if(!started)stop();},5000).unref();
process.send?.({type:'ready'});
