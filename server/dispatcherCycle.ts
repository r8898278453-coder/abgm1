import {dispatcherOrder,type DispatcherStage,type DispatcherStageState} from '../shared/dispatcher';
import {createWorkBudget,type WorkGate} from './workBudget';
/** Cron responses expose operation counts, never per-job payloads/provider bodies or customer details. */
export function dispatcherSummary(value:any){
 const summary:Record<string,unknown>={};
 for(const key of ['processed','admitted','skipped','failed','processedCount','succeededCount','failedCount','companiesProcessed','digestsSent','companiesSelected','companiesDeferred','failedCompanies','readTimeouts','workReportsUnavailable','companiesChecked','remindersSent','totalPendingReviews'])if(Number.isSafeInteger(value?.[key])&&value[key]>=0)summary[key]=value[key];
 for(const key of ['available','deferred'])if(typeof value?.[key]==='boolean')summary[key]=value[key];
 if(value?.reason==='TICK_BUDGET_EXHAUSTED')summary.reason=value.reason;
 if(value?.error==='STAGE_FAILED')summary.error=value.error;
 return summary;
}
export async function runDispatcherCycle(first:number,stages:Record<DispatcherStage,(gate:WorkGate)=>Promise<any>>,checkpoint:(stage:DispatcherStage,state:DispatcherStageState)=>Promise<void>,budget=createWorkBudget()){
 const results:Partial<Record<DispatcherStage,any>>={},states:Partial<Record<DispatcherStage,DispatcherStageState>>={},deferredStages:DispatcherStage[]=[];
 for(const key of dispatcherOrder(first)){
  if(!budget.canStart()){
   states[key]='DEFERRED';results[key]={deferred:true,reason:'TICK_BUDGET_EXHAUSTED'};deferredStages.push(key);await checkpoint(key,'DEFERRED');continue;
  }
  // Persist before work. A storage failure must not start another unrecorded stage.
  await checkpoint(key,'STARTED');
  if(!budget.canStart()){states[key]='DEFERRED';results[key]={deferred:true,reason:'TICK_BUDGET_EXHAUSTED'};deferredStages.push(key);await checkpoint(key,'DEFERRED');continue;}
  try{
   results[key]=await stages[key](budget.canStart);
   states[key]=results[key]?.available===false?'UNAVAILABLE':results[key]?.deferred===true?'DEFERRED':'OBSERVED';
  }catch{states[key]='FAILED';results[key]={available:false,error:'STAGE_FAILED'};}
  await checkpoint(key,states[key]!);
 }
 return {results,states,partial:Object.values(states).some(state=>state!=='OBSERVED')||Object.values(results).some(result=>['failed','failedCount','failedCompanies','workReportsUnavailable','readTimeouts','companiesDeferred'].some(key=>Number.isSafeInteger(result?.[key])&&result[key]>0)),budget:{...budget.report(),deferredStages}};
}
