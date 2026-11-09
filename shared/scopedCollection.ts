/** Successful empty SQL collections remain empty; unavailable/foreign responses are never substitutes. */
export function validateScopedCollection(response:any,key:string,company?:string):any[]{
 if(response?.success!==true||!Array.isArray(response[key])||(company&&response.companyId!==company))throw new Error('Workspace collection unavailable');
 const ids=new Set<string>();
 for(const row of response[key]){
  if(!row||typeof row.id!=='string'||!row.id||row.id.length>64||ids.has(row.id)||(company&&row.company_id!==company))throw new Error('Workspace collection invalid');
  ids.add(row.id);
 }
 return response[key];
}
export function boundedRecordedNumber(value:unknown,min:number,max:number):number|null{
 if(value===null||value===undefined||value==='')return null;
 const number=typeof value==='number'?value:typeof value==='string'?Number(value):NaN;
 return Number.isFinite(number)&&number>=min&&number<=max?number:null;
}
