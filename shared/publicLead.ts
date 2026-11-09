import {z} from 'zod';
const token=z.string().trim().min(1).max(255);
const requestId=z.string().uuid().transform(value=>value.toLowerCase());
const aliases={publicFormToken:token.optional(),formToken:token.optional(),form_token:token.optional(),token:token.optional()};
const validateTokens=(value:any)=>{const supplied=[value.publicFormToken,value.formToken,value.form_token,value.token].filter(item=>item!==undefined);return supplied.length>0&&new Set(supplied).size===1;};
const fields={name:z.string().trim().min(1).max(128),company:z.string().trim().max(128).default(''),phone:z.string().trim().regex(/^[+()0-9 .-]{6,64}$/).refine(value=>{return /^\+?\d{6,20}$/.test(value.replace(/[(). -]/g,''));}),email:z.union([z.literal(''),z.string().email().max(191)]).default(''),service:z.string().trim().max(191).default(''),budget:z.string().trim().max(64).default(''),source:z.string().trim().max(64).default(''),notes:z.string().max(12000).default('')};
export const publicLeadInput=z.object({...aliases,...fields,requestId:requestId.optional(),_hp:z.string().max(1024).optional(),website_url_hp:z.string().max(1024).optional(),_gotcha:z.string().max(1024).optional()}).strict().refine(validateTokens);
export const publicLeadReceiptInput=z.object({...aliases,requestId}).strict().refine(validateTokens);
export const publicLeadToken=(value:any):string=>value.publicFormToken||value.formToken||value.form_token||value.token;
export function normalizedPublicLead(value:z.infer<typeof publicLeadInput>){return {name:value.name,company:value.company,phone:value.phone.replace(/[(). -]/g,''),email:value.email,service:value.service,budget:value.budget,source:value.source,notes:value.notes};}
export type PublicLeadDetails=ReturnType<typeof normalizedPublicLead>;
export class PublicLeadError extends Error{constructor(public status:number,public code:string,message:string){super(message);}}
