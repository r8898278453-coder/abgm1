import {z} from 'zod';
import {isIntegrationSecret} from '../shared/integrationCredentials';
export class IntegrationAccessError extends Error{constructor(public status:number,public code:string){super(code);}}
const credentials=z.record(z.string().min(1).max(64),z.string().max(16384)).refine(value=>Object.keys(value).length<=32&&Buffer.byteLength(JSON.stringify(value))<=65536);
export const integrationInput=z.object({companyId:z.string().min(1).max(64),provider:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),credentials,config:z.record(z.string(),z.unknown()).optional()}).strict();
export function explicitIntegrationCompany(query:unknown){
 const field=z.string().min(1).max(64),parsed=z.object({companyId:field.optional(),company_id:field.optional()}).strict().safeParse(query);
 if(!parsed.success||!parsed.data.companyId&&!parsed.data.company_id||parsed.data.companyId&&parsed.data.company_id&&parsed.data.companyId!==parsed.data.company_id)throw new IntegrationAccessError(400,'INTEGRATION_WORKSPACE_REQUIRED');
 return (parsed.data.companyId||parsed.data.company_id)!;
}
export async function resolveIntegrationInput(input:unknown,user:any,deps:{access:(user:any,company:string)=>Promise<any>;read:(company:string,provider:string)=>Promise<any>}){
 const parsed=integrationInput.safeParse(input);if(!parsed.success)throw new IntegrationAccessError(400,'INTEGRATION_INPUT_INVALID');
 const {companyId,provider}=parsed.data,access=await deps.access(user,companyId);if(!access.authorized)throw new IntegrationAccessError(access.status,'INTEGRATION_WORKSPACE_DENIED');
 const existing=await deps.read(companyId,provider);if(existing&&(existing.company_id!==companyId||existing.provider!==provider))throw new IntegrationAccessError(503,'INTEGRATION_STORAGE_INVALID');
 const merged:Record<string,string>=Object.fromEntries(Object.entries(existing?.credentials||{}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));for(const [key,value]of Object.entries(parsed.data.credentials)){
  if(value.includes('••••')){if(!isIntegrationSecret(key)||typeof existing?.credentials?.[key]!=='string'||!existing.credentials[key])throw new IntegrationAccessError(400,'INTEGRATION_SECRET_REQUIRED');merged[key]=existing.credentials[key];}
  else{if(value.startsWith('enc:v1:'))throw new IntegrationAccessError(400,'INTEGRATION_CIPHERTEXT_REJECTED');merged[key]=value.trim();}
 }
 if(!credentials.safeParse(merged).success)throw new IntegrationAccessError(400,'INTEGRATION_CREDENTIALS_TOO_LARGE');
 return {...parsed.data,credentials:merged,existing};
}
