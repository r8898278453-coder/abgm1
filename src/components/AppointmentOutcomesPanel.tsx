import React,{useEffect,useRef,useState} from 'react';
import {APPOINTMENT_OUTCOME_LABELS,appointmentOutcomeCommand} from '../../shared/appointmentOutcome';
import {formatPlatformDateTime} from '../../shared/platformTime';
import {apiRequest,ApiRequestError,getStoredToken} from '../services/authService';

type Outcome=keyof typeof APPOINTMENT_OUTCOME_LABELS;
type Appointment={bookingVersion:string;version:string;startAtMs:number;endAtMs:number;outcome:Outcome|null;
  recordedAtMs:number|null;declaredSource:string|null;evidence:string|null;superseded:boolean};
type Command=ReturnType<typeof appointmentOutcomeCommand.parse>;

export const AppointmentOutcomesPanel:React.FC<{companyId:string;leadId:string;canWrite:boolean}>=({companyId,leadId,canWrite})=>{
  const [appointments,setAppointments]=useState<Appointment[]|null>(null);
  const [truncated,setTruncated]=useState(false);
  const [selected,setSelected]=useState('');
  const [outcome,setOutcome]=useState<Outcome>('HELD');
  const [evidence,setEvidence]=useState('');
  const [pending,setPending]=useState<Command|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const request=useRef<AbortController|null>(null);
  const acceptedSession=useRef<string|null|undefined>(undefined);
  const endpoint=`/api/companies/${encodeURIComponent(companyId)}/sales/leads/${encodeURIComponent(leadId)}/appointment-outcomes`;
  const current=appointments?.find(item=>item.bookingVersion===selected);
  const visible=appointments&&acceptedSession.current===getStoredToken();
  useEffect(()=>()=>request.current?.abort(),[]);

  async function load(command?:Command){
    const session=getStoredToken();
    if(command&&(!canWrite||acceptedSession.current!==session))return;
    request.current?.abort();
    const controller=new AbortController();
    request.current=controller;
    const isCurrent=()=>!controller.signal.aborted&&session===getStoredToken();
    setBusy(true);setError('');
    if(command)setPending(command);
    try{
      if(command){
        const saved=await apiRequest<{success:boolean;companyId:string}>(endpoint,{
          method:'POST',body:JSON.stringify(command),signal:controller.signal});
        if(!saved.success||saved.companyId!==companyId)throw Error();
      }
      const result=await apiRequest<{success:boolean;companyId:string;appointments:Appointment[];truncated:boolean}>(
        endpoint,{signal:controller.signal});
      if(!isCurrent())return;
      if(!result.success||result.companyId!==companyId||!Array.isArray(result.appointments))throw Error();
      acceptedSession.current=session;
      setAppointments(result.appointments);setTruncated(result.truncated);setPending(null);
      setSelected('');setEvidence('');
    }catch(cause){
      if(!isCurrent())return;
      if(cause instanceof ApiRequestError&&cause.status<500){
        setAppointments(null);setPending(null);
        setError('The appointment, outcome or access changed. Reload the saved outcomes.');
      }else setError(command?'Save unconfirmed. Retry the exact outcome or reload.':'Appointment outcomes are unavailable.');
    }finally{if(!controller.signal.aborted)setBusy(false);}
  }

  function save(){
    if(busy||pending||!current||!canWrite)return;
    const requestKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),value=>value.toString(16).padStart(2,'0')).join('');
    const command=appointmentOutcomeCommand.safeParse({requestKey,bookingVersion:current.bookingVersion,
      expectedVersion:current.version,outcome,evidence});
    if(command.success)void load(command.data);
  }

  return <section aria-label="Appointment outcomes" className="rounded-xl border p-3 space-y-2">
    <h3>Appointment outcomes</h3>
    <button disabled={busy} onClick={()=>void load()}>Load appointment outcomes</button>
    {error&&<p role="alert">{error}</p>}
    {visible&&<>
      {!appointments.length&&<p>No ended appointments available for outcome review.</p>}
      {truncated&&<p>Showing the 20 most recent ended appointments.</p>}
      <ul className="space-y-2">
        {appointments.map(item=><li key={item.bookingVersion} className="border-b pb-2">
          <p>{formatPlatformDateTime(item.startAtMs)} · {item.outcome?APPOINTMENT_OUTCOME_LABELS[item.outcome]:'Outcome unrecorded'}
            {item.superseded?' · Superseded booking version':''}</p>
          {item.outcome&&<p>Declared source {item.declaredSource} · Recorded {formatPlatformDateTime(item.recordedAtMs!)} · {item.evidence}</p>}
          {canWrite&&<button disabled={busy||Boolean(pending)} onClick={()=>{
            setSelected(item.bookingVersion);setOutcome(item.superseded?'UNDETERMINED':item.outcome||'HELD');setEvidence('');
          }}>{item.outcome?'Correct outcome':'Record outcome'}</button>}
        </li>)}
      </ul>
      {current&&canWrite&&<fieldset disabled={busy||Boolean(pending)} className="space-y-2">
        <legend>Review outcome for {formatPlatformDateTime(current.startAtMs)}</legend>
        <label>Attendance outcome
          <select value={outcome} onChange={event=>setOutcome(event.target.value as Outcome)}>
            {Object.entries(APPOINTMENT_OUTCOME_LABELS).filter(([value])=>!current.superseded||value==='UNDETERMINED')
              .map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block">Outcome evidence
          <textarea className="block w-full" maxLength={500} value={evidence} onChange={event=>setEvidence(event.target.value)}/>
        </label>
        <button disabled={evidence.trim().length<5} onClick={save}>Save appointment outcome</button>
      </fieldset>}
      {pending&&canWrite&&!busy&&<button onClick={()=>void load(pending)}>Retry exact outcome</button>}
    </>}
  </section>;
};
