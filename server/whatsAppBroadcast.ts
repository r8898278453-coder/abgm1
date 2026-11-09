import {summarizeWhatsAppOutcomes,type WhatsAppOutcome} from '../shared/whatsAppOutcomes';
export async function runWhatsAppBroadcast(recipients:Array<string|{phone:string;name?:string}>,send:(phone:string,name?:string)=>Promise<WhatsAppOutcome&{error?:string}>,canStart?:()=>boolean){
 if(!recipients.length||recipients.length>100)throw new Error('BROADCAST_SIZE_INVALID');
 const deadline=performance.now()+20000;const allowed=()=>performance.now()<deadline&&(!canStart||canStart());
 const seen=new Set<string>();
 const results:Array<WhatsAppOutcome&{recipient:string;error?:string}>=[];let halted=false;
 for(const item of recipients){
  const raw=typeof item==='string'?item:item.phone;
  if(halted||!allowed()){results.push({recipient:raw,success:false,status:'NOT_ATTEMPTED',error:'Earlier dispatch paused, became uncertain or exhausted the batch time budget'});continue;}
  let phone=String(raw).replace(/[^0-9]/g,'');if(phone.length===10)phone='91'+phone;if(phone.startsWith('0')&&phone.length===11)phone='91'+phone.slice(1);
  if(phone.length<10||phone.length>15){results.push({recipient:raw,success:false,status:'REJECTED',error:'Invalid phone number format'});continue;}
  if(seen.has(phone)){results.push({recipient:raw,success:false,status:'REJECTED',error:'Duplicate recipient'});continue;}seen.add(phone);
  let outcome:WhatsAppOutcome&{error?:string};try{outcome=await send(phone,typeof item==='string'?undefined:item.name);}catch{outcome={success:false,status:'UNKNOWN',error:'Dispatch unconfirmed'};}
  if(outcome.success===true&&(typeof outcome.messageId!=='string'||!outcome.messageId.trim()))outcome={success:false,status:'UNKNOWN',error:'Provider acceptance unconfirmed'};
  if(!outcome.success&&!['REJECTED','PAUSED'].includes(outcome.status||''))outcome={...outcome,status:'UNKNOWN'};
  results.push({recipient:phone,success:outcome.success,status:outcome.success?'API_ACCEPTED':outcome.status,...(outcome.messageId?{messageId:outcome.messageId}:{}),...(outcome.requestKey&&/^[a-f0-9]{64}$/.test(outcome.requestKey)?{requestKey:outcome.requestKey}:{}),...(outcome.error?{error:outcome.error}:{})});if(outcome.status==='UNKNOWN'||outcome.status==='PAUSED')halted=true;
 }
 const summary=summarizeWhatsAppOutcomes(results);
 return {...summary,success:summary.acceptedCount>0,totalRecipients:recipients.length,successCount:summary.acceptedCount,failCount:recipients.length-summary.acceptedCount,results};
}
