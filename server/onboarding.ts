import type {Pool} from 'mysql2/promise';
import crypto from 'node:crypto';
import {onboardingCommand,onboardingProfile,classifyLegacyKnowledge} from '../shared/onboarding';
import {readCompanyProfile} from './companyProfileStore';
import {agencyClientAccess,AgencyError} from './agencyPolicy';
import {WorkspaceConflict} from '../shared/workspaceRevision';
import {storeKnowledgeSourceInTransaction} from './knowledgeStore';
import {enqueueKnowledgeExtractionInTransaction} from './knowledgeIngestion';
import {z} from 'zod';
import {validWorkspaceRevision} from '../shared/workspaceRevision';

export async function readOnboarding(pool:Pool,company:string,user:any){
 const snapshot=await readCompanyProfile(pool,company);const [rows]:any=await pool.query('SELECT id,name,category,city,phone,website FROM companies WHERE id=?',[company]);if(rows.length!==1)throw new AgencyError(404,'CLIENT_NOT_FOUND');
 const business=snapshot.data?.business||{},brand=business.brandKit||{},saved=snapshot.data?.onboarding;
 const fallback={name:rows[0].name,category:rows[0].category||'',city:rows[0].city||'',phone:rows[0].phone||'',website:rows[0].website||'',brandTone:brand.brandTone||'Professional',preferredLanguage:['English','Hindi','Hinglish','Marathi'].includes(brand.preferredLanguage)?brand.preferredLanguage:'English',targetAudience:brand.targetAudience||''};
 if(saved&&(saved.schemaVersion!==1||![1,2,3,4].includes(saved.step)||!['DRAFT','COMPLETED'].includes(saved.status)||!onboardingProfile.safeParse(saved.profile).success))throw new AgencyError(503,'ONBOARDING_STATE_INVALID');
 const [integrations]:any=await pool.query('SELECT provider,status,last_tested_at FROM company_integrations WHERE company_id=? ORDER BY provider LIMIT 101',[company]);if(integrations.length>100)throw new AgencyError(503,'ONBOARDING_INTEGRATIONS_LIMIT');
 const management=await agencyClientAccess(pool,user,company,'manage');
 const legacy=classifyLegacyKnowledge(snapshot.data),kb=snapshot.data?.knowledge_base,legacyTotal=(Array.isArray(kb?.documents)?kb.documents.length:0)+(Array.isArray(kb?.faqs)?kb.faqs.length:0);
 return{companyId:company,canManage:management.authorized,legacyTotal,legacyTruncated:legacyTotal>legacy.length,version:snapshot.version,step:saved?.step||1,status:saved?.status||'NOT_STARTED',profile:saved?.status==='DRAFT'?saved.profile:fallback,legacy:legacy.map(({text,...row})=>({...row,textBytes:text?Buffer.byteLength(text,'utf8'):0})),integrations:integrations.map((r:any)=>({provider:r.provider,status:r.status==='error'?'CHECK_FAILED':'SAVED_UNVERIFIED',lastCheckedAt:r.last_tested_at||null}))};
}
export async function saveOnboarding(pool:Pool,company:string,user:any,input:unknown){
 const parsed=onboardingCommand.safeParse(input);if(!parsed.success)throw new AgencyError(400,'ONBOARDING_INPUT_INVALID');const p=parsed.data,c=await pool.getConnection();
 try{await c.beginTransaction();const [known]:any=await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(known.length!==1)throw new AgencyError(404,'CLIENT_NOT_FOUND');const permission=await agencyClientAccess(c,user,company,'manage');if(!permission.authorized)throw new AgencyError(permission.status,'ONBOARDING_ACCESS_DENIED');
 const snapshot=await readCompanyProfile(c,company);if(snapshot.version!==p.expectedVersion)throw new WorkspaceConflict();if(BigInt(snapshot.version)>=18446744073709551615n)throw new AgencyError(409,'WORKSPACE_REVISION_EXHAUSTED');const version=String(BigInt(snapshot.version)+1n),existing=snapshot.data||{},profile=p.profile;
 const data:any={...existing,onboarding:{schemaVersion:1,step:p.step,status:p.complete?'COMPLETED':'DRAFT',profile,updatedAtMs:Date.now()}};
 if(p.complete){await c.query('UPDATE companies SET name=?,category=?,city=?,phone=?,website=? WHERE id=?',[profile.name,profile.category,profile.city,profile.phone||null,profile.website||null,company]);data.business={...(existing.business||{}),id:company,name:profile.name,category:profile.category,city:profile.city,phone:profile.phone,website:profile.website,brandKit:{...(existing.business?.brandKit||{}),brandTone:profile.brandTone,preferredLanguage:profile.preferredLanguage,targetAudience:profile.targetAudience}};}
 await c.query('INSERT INTO company_profiles_data(company_id,data_payload,revision) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data_payload=VALUES(data_payload),revision=VALUES(revision)',[company,JSON.stringify(data),version]);
 await c.query('INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details) VALUES (?,?,?,?,?,?)',[crypto.randomUUID(),company,company,user.id,p.complete?'ONBOARDING_COMPLETED':'ONBOARDING_DRAFT_SAVED',JSON.stringify({step:p.step,version})]);await c.commit();return{companyId:company,version,status:p.complete?'COMPLETED':'DRAFT',step:p.step};
 }catch(error){await c.rollback();throw error;}finally{c.release();}
}

export async function importLegacyKnowledge(pool:Pool,company:string,user:any,input:unknown){
 const parsed=z.object({expectedVersion:z.string().refine(validWorkspaceRevision),recordId:z.string().regex(/^(document|faq):(?:0|[1-9]\d{0,2})$/)}).strict().safeParse(input);if(!parsed.success)throw new AgencyError(400,'LEGACY_INPUT_INVALID');const c=await pool.getConnection();
 try{await c.beginTransaction();await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);const permission=await agencyClientAccess(c,user,company,'manage');if(!permission.authorized)throw new AgencyError(permission.status,'ONBOARDING_ACCESS_DENIED');const snapshot=await readCompanyProfile(c,company);if(snapshot.version!==parsed.data.expectedVersion)throw new WorkspaceConflict();const row=classifyLegacyKnowledge(snapshot.data).find(r=>r.id===parsed.data.recordId);if(!row)throw new AgencyError(404,'LEGACY_RECORD_NOT_FOUND');if(!row.text)throw new AgencyError(409,'LEGACY_ORIGINAL_REQUIRED');if(Buffer.byteLength(row.text,'utf8')>512*1024)throw new AgencyError(409,'LEGACY_TEXT_TOO_LARGE');
 const bytes=Buffer.from(`User-entered legacy statement. Original PDF/document extraction is unverified.\nRecord: ${row.name}\n\n${row.text}`,'utf8');if(bytes.length>512*1024)throw new AgencyError(409,'LEGACY_TEXT_TOO_LARGE');const result=await storeKnowledgeSourceInTransaction(c,company,'legacy-user-statement-'+row.id.replace(':','-')+'.txt',bytes,undefined,user.id);if(!result.reused)await enqueueKnowledgeExtractionInTransaction(c,company,result.id,undefined,user.id);
 await c.query('INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details) VALUES (?,?,?,?,?,?)',[crypto.randomUUID(),company,result.id,user.id,'LEGACY_KNOWLEDGE_IMPORTED',JSON.stringify({recordId:row.id,profileVersion:snapshot.version,sourceId:result.id,reused:result.reused})]);await c.commit();return{companyId:company,sourceId:result.id,reused:result.reused};
 }catch(error){await c.rollback();throw error;}finally{c.release();}
}
