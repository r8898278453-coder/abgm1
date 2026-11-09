import {validWorkspaceRevision} from '../../shared/workspaceRevision';
/** Per-loaded-workspace queue. Any uncertain/conflicting acknowledgement pauses subsequent writes. */
export function createWorkspaceSaver(initial:string,isCurrent:()=>boolean,send:(data:any,expected:string)=>Promise<{version:string}>){
 if(!validWorkspaceRevision(initial))throw new Error('Workspace revision unavailable');
 let pending=0;
 let version:string|null=initial,tail:Promise<unknown>=Promise.resolve();
 return {get pendingCount(){return pending;},enqueue(data:any):Promise<{version:string}>{
  const snapshot=JSON.parse(JSON.stringify(data));
  pending++;
  const work=tail.then(async()=>{
   if(!isCurrent())throw new Error('Obsolete workspace save');
   if(version===null)throw new Error('Workspace saves paused. Reload before saving.');
   const expected=version;
   try{const result=await send(snapshot,expected);if(!validWorkspaceRevision(result?.version)||BigInt(result.version)!==BigInt(expected)+1n)throw new Error('Workspace save acknowledgement unconfirmed');version=result.version;return result;}
   catch(error){version=null;throw error;}
  });
  const settled=work.finally(()=>{pending--;});tail=settled.catch(()=>{});return settled;
 }};
}
