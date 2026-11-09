import {validWorkspaceRevision} from '../../shared/workspaceRevision';
/** Per-loaded-workspace queue. Any uncertain/conflicting acknowledgement pauses subsequent writes. */
export function createWorkspaceSaver(initial:string,isCurrent:()=>boolean,send:(data:any,expected:string)=>Promise<{version:string}>){
 if(!validWorkspaceRevision(initial))throw new Error('Workspace revision unavailable');
 let pending=0;
 let version:string|null=initial,tail:Promise<unknown>=Promise.resolve();
 return {observe(previous:string|undefined,next:string|undefined,delta=1){if(pending||version!==previous||!Number.isInteger(delta)||delta<1||delta>25||!validWorkspaceRevision(next)||BigInt(next)!==BigInt(previous)+BigInt(delta)){version=null;return false;}version=next;return true;},get pendingCount(){return pending;},enqueue(data:any):Promise<{version:string}>{
  const snapshot=JSON.parse(JSON.stringify(data));
  pending++;
  const work=tail.then(async()=>{
   if(!isCurrent())throw new Error('Obsolete workspace save');
   if(version===null)throw new Error('Workspace saves paused. Reload before saving.');
   const expected=version;
   try{const result=await send(snapshot,expected);if(version===null||!validWorkspaceRevision(result?.version)||BigInt(result.version)!==BigInt(expected)+1n)throw new Error('Workspace save acknowledgement unconfirmed');version=result.version;return result;}
   catch(error){version=null;throw error;}
  });
  const settled=work.finally(()=>{pending--;});tail=settled.catch(()=>{});return settled;
 }};
}
