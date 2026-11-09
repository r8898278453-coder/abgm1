export interface WhatsAppOutcome{success:boolean;status?:string;messageId?:string;requestKey?:string}
export function summarizeWhatsAppOutcomes(rows:WhatsAppOutcome[]){
 const acceptedCount=rows.filter(row=>row.success===true&&!!row.messageId).length;
 const rejectedCount=rows.filter(row=>!row.success&&row.status==='REJECTED').length;
 const pausedCount=rows.filter(row=>!row.success&&row.status==='PAUSED').length;
 const notAttemptedCount=rows.filter(row=>!row.success&&row.status==='NOT_ATTEMPTED').length;
 const unknownCount=rows.length-acceptedCount-rejectedCount-pausedCount-notAttemptedCount;
 const status=acceptedCount===rows.length&&rows.length?'API_ACCEPTED':acceptedCount?'PARTIAL':unknownCount?'UNKNOWN':pausedCount?'PAUSED':'NOT_ACCEPTED';
 return {acceptedCount,rejectedCount,pausedCount,notAttemptedCount,unknownCount,status};
}

export function isConfirmedMessageAcceptance(value:any,key:string):boolean{
 return value?.success===true&&value.status==='API_ACCEPTED'&&value.requestKey===key&&typeof value.messageId==='string'&&!!value.messageId.trim();
}
