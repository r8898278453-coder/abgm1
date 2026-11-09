import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
/** Shared-file scope only; separate replicas need a future shared durable stop store. */
export function createFileEmergencyStop(file:string,production=process.env.NODE_ENV==='production'){
 let persistenceFault=false;
 return {
  isActive():boolean{
   if(persistenceFault)return true;
   try{const value=JSON.parse(fs.readFileSync(file,'utf8'));return typeof value?.globalEmergencyStop==='boolean'?value.globalEmergencyStop:true;}
   catch(error){return (error as NodeJS.ErrnoException).code==='ENOENT'?production:true;}
  },
  setActive(stopped:boolean):boolean{
   const temporary=`${file}.${randomUUID()}.tmp`;
   try{
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(temporary,JSON.stringify({globalEmergencyStop:stopped,updatedAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
    fs.renameSync(temporary,file);persistenceFault=false;return stopped;
   }catch{
    persistenceFault=true;try{fs.unlinkSync(temporary);}catch{}
    throw new Error('GLOBAL_STOP_PERSISTENCE_FAILED');
   }
  },
 };
}
const shared=createFileEmergencyStop(path.join(process.cwd(),'uploads','.emergency_stop.json'));
export const isGlobalEmergencyStopActive=()=>shared.isActive();
export const setGlobalEmergencyStop=(stopped:boolean)=>shared.setActive(stopped);
