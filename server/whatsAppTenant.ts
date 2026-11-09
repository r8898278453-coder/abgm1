export function resolveWhatsAppTenant(integrations:Array<{company_id:string;status:string;credentials?:Record<string,any>}>,phoneNumberId?:string,wabaId?:string):string|null{
 if(!phoneNumberId)return null;
 const companies=new Set(integrations.filter(row=>['connected','verified'].includes(row.status)&&String(row.credentials?.phoneNumberId||'').trim()===phoneNumberId&&(!wabaId||!row.credentials?.wabaId||String(row.credentials.wabaId).trim()===wabaId)).map(row=>row.company_id));
 return companies.size===1?[...companies][0]:null;
}
