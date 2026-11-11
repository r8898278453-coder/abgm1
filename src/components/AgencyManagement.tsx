import React, {useEffect, useRef, useState} from 'react';
import {apiRequest} from '../services/authService';
import {clientRoleWithin} from '../../shared/agency';

type Member = {user_id:string;role:string};
type Agency = {id:string;name:string;canManage:boolean};
const roles = ['ADMIN','STAFF','APPROVER','VIEWER'];
/** Remounted per client/agency; requests and retained forms never cross scopes. */
export const AgencyManagement:React.FC<{companyId:string;agencyId:string}>=({companyId,agencyId})=> {
 const [agency,setAgency]=useState<Agency|null>(null),[members,setMembers]=useState<Member[]>([]),[assignments,setAssignments]=useState<Member[]>([]);
 const [name,setName]=useState(''),[userId,setUserId]=useState(''),[role,setRole]=useState('VIEWER'),[assignmentUser,setAssignmentUser]=useState(''),[assignmentRole,setAssignmentRole]=useState('VIEWER');
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const mounted=useRef(true),sequence=useRef(0),writing=useRef(false);
 const root=`/api/agencies/${encodeURIComponent(agencyId)}`,client=`/api/companies/${encodeURIComponent(companyId)}`;
 async function load() {
  const request=++sequence.current;setReady(false);setError('');
  try {
   const list=await apiRequest<any>('/api/agencies');
   if(list.success!==true||!Array.isArray(list.agencies))throw new Error('Invalid agency list');
   const selected=list.agencies.find((a:Agency)=>a.id===agencyId);
   if(!selected)throw new Error('Agency scope unavailable');
   if(!mounted.current||request!==sequence.current)return;
   setAgency(selected);
   if(!selected.canManage){setMembers([]);setAssignments([]);return;}
   const [people,grants]=await Promise.all([apiRequest<any>(root+'/members'),apiRequest<any>(client+'/assignments')]);
   if(people.success!==true||people.agencyId!==agencyId||!Array.isArray(people.members)||grants.success!==true||grants.companyId!==companyId||!Array.isArray(grants.assignments))throw new Error('Invalid management scope');
   if(mounted.current&&request===sequence.current){setMembers(people.members);setAssignments(grants.assignments);setName(selected.name);setReady(true);}
  }catch{if(mounted.current&&request===sequence.current)setError('Team data unavailable. Reload before changing access.');}
 }
 useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;sequence.current++;};},[companyId,agencyId]);
 async function mutate(path:string,method:string,body:unknown,scope:'agency'|'client',onSaved?:()=>void){
  if(!ready||writing.current)return;writing.current=true;setBusy(true);setError('');const request=++sequence.current;
  try{const result=await apiRequest<any>(path,{method,...(body===undefined?{}:{body:JSON.stringify(body)})});if(result.success!==true||(scope==='agency'?result.agencyId!==agencyId:result.companyId!==companyId))throw new Error('Unconfirmed');if(mounted.current&&request===sequence.current){onSaved?.();await load();}}
  catch{if(mounted.current&&request===sequence.current){setReady(false);setError('Team change unconfirmed or denied. Reload before retrying; your form is retained.');}}
  finally{writing.current=false;if(mounted.current)setBusy(false);}
 }
 const disabled=busy||!ready;
 return <section aria-label="Agency team management" className="border rounded-xl p-4 space-y-4">
  <h2 className="font-bold">Agency team and client access</h2>
  <button disabled={busy} onClick={()=>void load()}>Reload team access</button>{error&&<p role="alert">{error}</p>}
  {agency&&!agency.canManage&&<p>Agency management requires owner or admin access.</p>}
  {agency?.canManage&&<>
   <form onSubmit={e=>{e.preventDefault();void mutate(root,'PUT',{expectedName:agency.name,name},'agency');}}>
    <label>Agency name<input aria-label="Agency name" required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label><button disabled={disabled}>Save agency name</button>
   </form>
   <p>Add an existing account by its user ID. OWNER is protected. ADMIN grants agency-wide access; other roles also need a client assignment.</p>
   <form onSubmit={e=>{e.preventDefault();void mutate(root+'/members','PUT',{userId:userId.trim(),role},'agency',()=>setUserId(''));}}>
    <label>Member user ID<input aria-label="Member user ID" required maxLength={64} value={userId} onChange={e=>setUserId(e.target.value)}/></label>
    <label>Member role<select aria-label="Member role" value={role} onChange={e=>setRole(e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select></label><button disabled={disabled}>Save member</button>
   </form>
   <ul>{members.map(member=><li key={member.user_id} className="py-2"><span>{member.user_id} · {member.role}</span>{member.role!=='OWNER'&&<><button disabled={disabled} onClick={()=>{setUserId(member.user_id);setRole(member.role);}}>Edit member {member.user_id}</button><button disabled={disabled} onClick={()=>void mutate(root+'/members/'+encodeURIComponent(member.user_id),'DELETE',undefined,'agency')}>Remove member {member.user_id}</button></>}</li>)}</ul>
   <h3 className="font-bold">Assignments for this client</h3>
   <form onSubmit={e=>{e.preventDefault();void mutate(client+'/assignments','PUT',{userId:assignmentUser,role:assignmentRole},'client');}}>
    <label>Assigned member<select aria-label="Assigned member" required value={assignmentUser} onChange={e=>{setAssignmentUser(e.target.value);setAssignmentRole('VIEWER');}}><option value="">Select member</option>{members.filter(m=>m.role!=='OWNER').map(m=><option key={m.user_id} value={m.user_id}>{m.user_id}</option>)}</select></label>
    <label>Client role<select aria-label="Client role" value={assignmentRole} onChange={e=>setAssignmentRole(e.target.value)}>{roles.filter(r=>clientRoleWithin(members.find(m=>m.user_id===assignmentUser)?.role,r)).map(r=><option key={r}>{r}</option>)}</select></label>
    <button disabled={disabled||!assignmentUser}>Save client assignment</button>
   </form>
   {!assignments.length&&ready&&<p>No explicit client assignments. Owners and agency admins retain agency-wide access.</p>}
   <ul>{assignments.map(grant=><li key={grant.user_id}>{grant.user_id} · {grant.role}<button disabled={disabled} onClick={()=>void mutate(client+'/assignments/'+encodeURIComponent(grant.user_id),'DELETE',undefined,'client')}>Revoke client access {grant.user_id}</button></li>)}</ul>
   <p className="text-xs">Revoking an assignment does not remove agency-wide OWNER/ADMIN access. Membership removal revokes that user's assignments across the agency. Role changes preserve narrower grants.</p>
  </>}
 </section>;
}
