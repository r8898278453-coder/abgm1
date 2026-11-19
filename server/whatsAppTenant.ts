export function resolveWhatsAppTenant(integrations:Array<{company_id:string;status:string;credentials?:Record<string,any>}>,phoneNumberId?:string,wabaId?:string):string|null{
 if(!phoneNumberId)return null;
 const companies=new Set(integrations.filter(row=>['connected','verified'].includes(row.status)&&String(row.credentials?.phoneNumberId||'').trim()===phoneNumberId&&(!wabaId||!row.credentials?.wabaId||String(row.credentials.wabaId).trim()===wabaId)).map(row=>row.company_id));
 return companies.size===1?[...companies][0]:null;
}

/** Shared tenant-only credential projection; never falls back to platform bindings. */
export function tenantWhatsAppCredentials(integration:any){const c=integration?.credentials;if(!c||!['connected','verified','saved'].includes(integration.status))return{phoneNumberId:'',accessToken:'',wabaId:'',appSecret:'',webhookSecret:'',configured:false};const phoneNumberId=String(c.phoneNumberId||'').trim(),accessToken=String(c.accessToken||'').trim();return{phoneNumberId,accessToken,wabaId:String(c.wabaId||'').trim(),appSecret:String(c.appSecret||'').trim(),webhookSecret:String(c.webhookSecret||'').trim(),configured:Boolean(phoneNumberId&&accessToken)};}
