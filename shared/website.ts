import {z} from 'zod';
export function normalizeWebsiteDomain(value:string):string{
 const raw=value.trim().toLowerCase().replace(/\.$/,'');
 if(!raw||/[\s/@:#?\\]/.test(raw))throw new Error('INVALID_DOMAIN');
 const host=new URL('https://'+raw).hostname;
 if(host.length>253||!host.includes('.')||/^\d+(?:\.\d+){3}$/.test(host)||!host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||!/[a-z]/.test(host.split('.').at(-1)!))throw new Error('INVALID_DOMAIN');
 return host;
}
export const websiteDomainInput=z.object({domain:z.string().max(253).transform((value,ctx)=>{try{return normalizeWebsiteDomain(value);}catch{ctx.addIssue({code:'custom',message:'A bare public domain is required'});return z.NEVER;}})}).strict();
const text=(max:number)=>z.string().max(max);
export const websiteConfigPatch=z.object({
 primary_color:z.string().regex(/^#[0-9a-fA-F]{6}$/),secondary_color:z.string().regex(/^#[0-9a-fA-F]{6}$/),
 tagline:text(255),hero_title:text(255),hero_subtitle:text(4000),meta_description:text(4000),keywords:text(2000),
 google_analytics_id:z.string().regex(/^(?:G-[A-Z0-9]{4,32})?$/),
 enable_whatsapp_cta:z.boolean(),enable_direct_call_cta:z.boolean(),enable_inquiry_form:z.boolean()
}).partial().strict().refine(value=>Object.keys(value).length>0);
export const WEBSITE_EDITABLE_FIELDS=['primary_color','secondary_color','tagline','hero_title','hero_subtitle','meta_description','keywords','google_analytics_id','enable_whatsapp_cta','enable_direct_call_cta','enable_inquiry_form'] as const;
export class WebsiteError extends Error{constructor(public status:number,public code:string,message:string){super(message);}}

export type DomainDnsSnapshot={domain:string;cname_target:string;a_record_target:string;dns_txt_record:string};
