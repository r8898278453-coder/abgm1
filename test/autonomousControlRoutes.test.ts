import assert from 'node:assert/strict';
import express from 'express';
import {registerAutonomousControlRoutes} from '../server/autonomousControlRoutes';
const app=express();app.use(express.json());let writes=0,stops=0,admin=false,allow=true,fail=false,stopped=false;
registerAutonomousControlRoutes(app,{auth:async req=>req.headers.authorization?{id:'actor',is_platform_admin:admin} as any:null,access:async()=>({authorized:allow,status:403}),autopilot:async()=>{writes++;if(fail)throw new Error('private-storage-detail');return true;},stop:value=>{stops++;if(fail)throw new Error('private-file-path');stopped=value;},isStopped:()=>stopped});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function post(body:any,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/autonomous/kill-switch`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(response.status,status);return response.json();}
 await post({companyId:'A',autopilotEnabled:true},401,false);
 for(const body of [{companyId:'A',autopilotEnabled:'false'},{companyId:'A',autopilotEnabled:true,emergencyStop:true},{autopilotEnabled:true},{emergencyStop:1},{companyId:'A',autopilotEnabled:true,actor:'x'}])await post(body,400);
 await post({emergencyStop:true},403);allow=false;await post({companyId:'B',autopilotEnabled:true},403);assert.equal(writes,0);assert.equal(stops,0);allow=true;
 assert.deepEqual(await post({companyId:'A',autopilotEnabled:false},200),{success:true,companyId:'A',autopilotEnabled:false,globalEmergencyStop:false});
 fail=true;assert.ok(!JSON.stringify(await post({companyId:'A',autopilotEnabled:true},503)).includes('private-storage'));admin=true;
 assert.ok(!JSON.stringify(await post({emergencyStop:true},503)).includes('private-file'));fail=false;allow=false;await post({companyId:'B',emergencyStop:true},403);assert.equal(stops,1);allow=true;
 assert.equal((await post({companyId:'A',emergencyStop:true},200)).globalEmergencyStop,true);
 console.log('Autonomous controls: strict boolean/single command, auth/admin/workspace validation before effects, storage failures never acknowledge success and explicit stop state passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
