export const DISPATCHER_STAGES=['autoPublish','queue','outbox','digest','reminders'] as const;
export type DispatcherStage=typeof DISPATCHER_STAGES[number];
export const DISPATCHER_STAGE_STATES=['STARTED','OBSERVED','FAILED','UNAVAILABLE','DEFERRED'] as const;
export type DispatcherStageState=typeof DISPATCHER_STAGE_STATES[number];
export const DISPATCHER_TICK_STATES=['RUNNING','COMPLETED','PARTIAL','UNKNOWN'] as const;
export function dispatcherOrder(first:number):DispatcherStage[]{
 const groups:DispatcherStage[][]=[['autoPublish','queue'],['outbox'],['digest'],['reminders']];
 if(!Number.isInteger(first)||first<0||first>=groups.length)throw new Error('Invalid dispatcher rotation');
 return Array.from({length:groups.length},(_,i)=>groups[(first+i)%groups.length]).flat();
}
export function parseDispatcherStages(value:unknown):Partial<Record<DispatcherStage,DispatcherStageState>>{
 const object=typeof value==='string'?JSON.parse(value):value;
 if(!object||typeof object!=='object'||Array.isArray(object)||Object.entries(object).some(([key,state])=>!DISPATCHER_STAGES.includes(key as any)||!DISPATCHER_STAGE_STATES.includes(state as any)))throw new Error('Invalid dispatcher evidence');
 return object as Partial<Record<DispatcherStage,DispatcherStageState>>;
}
export function dispatcherCursor(value:unknown):string|null{
 if(value===undefined)return null;
 if(typeof value!=='string'||!/^[1-9]\d{0,19}$/.test(value)||BigInt(value)>18446744073709551615n)throw new Error('Invalid dispatcher cursor');return value;
}
