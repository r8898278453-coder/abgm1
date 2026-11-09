import {createHash} from 'node:crypto';
import type {DbContentPost} from './db';
export function publicationPolicy(company:string,payload:unknown){
 let data:any;try{data=typeof payload==='string'?JSON.parse(payload):payload;}catch{data=null;}
 const settings=data?.engine_settings?.approvalSettings;
 const mode=(key:string)=>settings?.[key]==='auto'?'auto':'approval';
 const rules={googlePosts:mode('googlePosts'),socialPosts:mode('socialPosts'),promotionalOffers:mode('promotionalOffers')};
 const version=createHash('sha256').update(JSON.stringify([company,rules])).digest('hex');
 return {rules,version};
}
export function publicationNeedsApproval(post:Partial<DbContentPost>,policy:ReturnType<typeof publicationPolicy>):boolean{
 let targets:any=post.platforms;
 try{if(typeof targets==='string')targets=JSON.parse(targets);}catch{return true;}
 if(!Array.isArray(targets) || !targets.length)targets=[post.channel || 'google'];
 if(targets.some((target:unknown)=>typeof target!=='string'||!target.trim()))return true;
 const normalized=targets.map((target:string)=>target.trim().toLowerCase());
 return (String(post.type || '').trim().toLowerCase()==='offer' && policy.rules.promotionalOffers!=='auto') ||
   (normalized.includes('google') && policy.rules.googlePosts!=='auto') ||
   (normalized.some((target:string)=>target!=='google') && policy.rules.socialPosts!=='auto');
}

/** Select only bounded rule values; knowledge documents stay in SQL storage. */
export async function loadPublicationPolicy(sql:import('mysql2/promise').PoolConnection,company:string){
 const field=(key:string)=>`CASE WHEN BINARY JSON_UNQUOTE(JSON_EXTRACT(data_payload,'$.engine_settings.approvalSettings.${key}')) = BINARY 'auto' THEN 'auto' ELSE 'approval' END`;
 const [rows]:any=await sql.query(`SELECT CASE WHEN JSON_VALID(data_payload) THEN
  JSON_OBJECT('engine_settings',JSON_OBJECT('approvalSettings',JSON_OBJECT(
   'googlePosts',${field('googlePosts')},'socialPosts',${field('socialPosts')},'promotionalOffers',${field('promotionalOffers')}
  ))) ELSE NULL END AS policy_payload FROM company_profiles_data WHERE company_id = ? FOR UPDATE`,[company]);
 return publicationPolicy(company,rows[0]?.policy_payload);
}
