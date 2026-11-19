export class CrmError extends Error{constructor(public status:number,public code:string){super(code);}}
export function crmNext(v:string){if(!/^(0|[1-9][0-9]{0,19})$/.test(v)||BigInt(v)>=18446744073709551615n)throw new CrmError(409,'CRM_REVISION_EXHAUSTED');return String(BigInt(v)+1n);}
