import {platformDateKey} from './dailyWorkReport';
export function nextMonthPlanDates(now=Date.now()):string[]{
 const date=platformDateKey(now);const year=Number(date.slice(0,4)),month=Number(date.slice(5,7));
 return [1,8,15].map(day=>new Date(Date.UTC(year,month,day)).toISOString().slice(0,10));
}
export interface PlanResult{date:string;status:'saved'|'generation_failed'|'save_unconfirmed'|'not_started'}
/** No automatic retry after an unconfirmed save: reconcile stored records first. */
export async function createContentDraftPlan<T>(deps:{dates:string[];signal:AbortSignal;generate:(date:string,index:number)=>Promise<T>;save:(draft:T,date:string)=>Promise<boolean>}):Promise<PlanResult[]>{
 const results:PlanResult[]=[];let stop=false;
 for(const [index,date] of deps.dates.entries()){
  if(stop||deps.signal.aborted){results.push({date,status:'not_started'});continue;}
  let draft:T;try{draft=await deps.generate(date,index);}catch{results.push({date,status:deps.signal.aborted?'not_started':'generation_failed'});continue;}
  if(deps.signal.aborted){results.push({date,status:'not_started'});continue;}
  let saved=false;try{saved=await deps.save(draft,date);}catch{}
  results.push({date,status:saved?'saved':'save_unconfirmed'});if(!saved)stop=true;
 }
 return results;
}
