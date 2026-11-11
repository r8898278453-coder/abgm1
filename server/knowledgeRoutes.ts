import {enqueueKnowledgeExtraction} from './knowledgeIngestion';
import {readKnowledgeHistory} from './knowledgeHistory';
import {validWorkspaceRevision} from '../shared/workspaceRevision';
import crypto from 'node:crypto';
import {previewWebsiteImport} from './websiteImportService';
import {websiteImportUrl} from './websiteImportPolicy';
import type {Express,Request,RequestHandler} from 'express';
import type {Pool} from 'mysql2/promise';
import multer from 'multer';
import {SOURCE_MAX_BYTES,knowledgeQueryInput,sourceRevisionInput} from '../shared/knowledge';
import {KnowledgeError,listKnowledgeSources,storeKnowledgeSource,approveKnowledgeSource,withdrawKnowledgeApproval,deleteKnowledgeSource,downloadKnowledgeSource,previewKnowledgeSource,readKnowledgeExcerpts} from './knowledgeStore';
import {retrieveKnowledge} from './knowledgeRetrieval';
const multipart=multer({storage:multer.memoryStorage(),limits:{fileSize:SOURCE_MAX_BYTES,files:1,fields:0,parts:1}}).single('file');
export function registerKnowledgeRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;access:(user:any,company:string)=>Promise<any>;pool:()=>Promise<Pool|null>;profile:(company:string)=>Promise<{data:any;version:string}>;rateLimit:RequestHandler;registeredWebsite?:(company:string)=>Promise<string|null>;websitePreview?:typeof previewWebsiteImport;runExtraction?:typeof enqueueKnowledgeExtraction}){
 const run=deps.runExtraction||enqueueKnowledgeExtraction;
 const route=(method:'get'|'post'|'delete',path:string,handler:(req:Request,res:any,company:string,pool:Pool,user:any)=>Promise<void>)=>app[method](path,deps.rateLimit,async(req,res)=>{
  res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const params=req.params as Record<string,string>,company=params.id;if(!company||company.length>64||params.sourceId&&params.sourceId.length>64||(Object.keys(req.query).length&&!path.endsWith('/history')))throw new KnowledgeError(400,'KNOWLEDGE_SCOPE_INVALID');
   const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Knowledge workspace access denied'});return;}const pool=await deps.pool();if(!pool)throw new KnowledgeError(503,'KNOWLEDGE_STORAGE_UNAVAILABLE');await handler(req,res,company,pool,user);
  }catch(error){res.status(error instanceof KnowledgeError?error.status:503).json({success:false,error:error instanceof KnowledgeError?error.code:'Knowledge operation unavailable or unconfirmed'});}
 });
 route('post','/api/companies/:id/knowledge/import-website',async(req,res,company,pool,user)=>{
  if(!req.body||Array.isArray(req.body)||Object.keys(req.body).length)throw new KnowledgeError(400,'WEBSITE_IMPORT_BODY_INVALID');
  const registered=await deps.registeredWebsite?.(company);if(!registered)throw new KnowledgeError(409,'REGISTERED_WEBSITE_REQUIRED');
  let root:URL;try{root=websiteImportUrl(registered);}catch{throw new KnowledgeError(409,'REGISTERED_WEBSITE_UNSUPPORTED');}const result=await(deps.websitePreview||previewWebsiteImport)(root.href);const imported:string[]=[];
  for(const page of result.pages){websiteImportUrl(page.url,root.origin);const name='website-'+crypto.createHash('sha256').update(page.url).digest('hex').slice(0,20)+'.html';const source=await storeKnowledgeSource(pool,company,name,page.originalBytes,{url:page.url,fetchedAtMs:Date.parse(page.fetchedAt),mediaType:page.contentType},user.id);if(!source.reused)await run(company,source.id,pool,undefined,user.id);imported.push(source.id);}
  res.json({success:true,companyId:company,importedSourceIds:imported,status:result.status,failures:result.failures,truncated:result.truncated,sources:await listKnowledgeSources(pool,company)});
 });
 route('get','/api/companies/:id/knowledge/sources/:sourceId/history',async(req,res,company,pool)=>{const before=req.query.beforeVersion;if(Object.keys(req.query).some(key=>key!=='beforeVersion')||before!==undefined&&(typeof before!=='string'||!validWorkspaceRevision(before)))throw new KnowledgeError(400,'SOURCE_HISTORY_CURSOR_INVALID');res.json({success:true,companyId:company,sourceId:req.params.sourceId,...await readKnowledgeHistory(pool,company,req.params.sourceId as string,before as string|undefined)});});
 route('get','/api/companies/:id/knowledge/sources',async(_,res,company,pool)=>res.json({success:true,companyId:company,sources:await listKnowledgeSources(pool,company)}));
 route('post','/api/companies/:id/knowledge/sources',async(req,res,company,pool,user)=>{
  try{await new Promise<void>((resolve,reject)=>multipart(req,res,error=>error?reject(error):resolve()));}catch{throw new KnowledgeError(400,'SOURCE_UPLOAD_INVALID_OR_TOO_LARGE');}
  if(!req.file)throw new KnowledgeError(400,'SOURCE_FILE_REQUIRED');const stored=await storeKnowledgeSource(pool,company,req.file.originalname,req.file.buffer,undefined,user.id);if(!stored.reused)await run(company,stored.id,pool,undefined,user.id);res.status(stored.reused?200:201).json({success:true,companyId:company,sourceId:stored.id,reused:stored.reused,sources:await listKnowledgeSources(pool,company)});
 });
 route('post','/api/companies/:id/knowledge/sources/:sourceId/retry',async(req,res,company,pool,user)=>{const parsed=sourceRevisionInput.safeParse(req.body);if(!parsed.success)throw new KnowledgeError(400,'SOURCE_REVISION_REQUIRED');await run(company,req.params.sourceId as string,pool,parsed.data.expectedVersion,user.id);res.json({success:true,companyId:company,sources:await listKnowledgeSources(pool,company)});});
 route('post','/api/companies/:id/knowledge/sources/:sourceId/approve',async(req,res,company,pool,user)=>{const parsed=sourceRevisionInput.safeParse(req.body);if(!parsed.success)throw new KnowledgeError(400,'SOURCE_REVISION_REQUIRED');await approveKnowledgeSource(pool,company,req.params.sourceId as string,user.id,parsed.data.expectedVersion);res.json({success:true,companyId:company,sources:await listKnowledgeSources(pool,company)});});
 route('post','/api/companies/:id/knowledge/sources/:sourceId/withdraw-approval',async(req,res,company,pool,user)=>{const parsed=sourceRevisionInput.safeParse(req.body);if(!parsed.success)throw new KnowledgeError(400,'SOURCE_REVISION_REQUIRED');await withdrawKnowledgeApproval(pool,company,req.params.sourceId as string,parsed.data.expectedVersion,user.id);res.json({success:true,companyId:company,sources:await listKnowledgeSources(pool,company)});});
 route('delete','/api/companies/:id/knowledge/sources/:sourceId',async(req,res,company,pool,user)=>{const parsed=sourceRevisionInput.safeParse(req.body);if(!parsed.success)throw new KnowledgeError(400,'SOURCE_REVISION_REQUIRED');await deleteKnowledgeSource(pool,company,req.params.sourceId as string,parsed.data.expectedVersion,user.id);res.json({success:true,companyId:company,sources:await listKnowledgeSources(pool,company)});});
 route('get','/api/companies/:id/knowledge/sources/:sourceId/download',async(req,res,company,pool)=>{const source=await downloadKnowledgeSource(pool,company,req.params.sourceId as string);res.set({'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="source"; filename*=UTF-8''${encodeURIComponent(source.filename).replace(/'/g,'%27')}`,'Content-Security-Policy':"default-src 'none'; sandbox"}).send(source.content_bytes);});
 route('get','/api/companies/:id/knowledge/sources/:sourceId/preview',async(req,res,company,pool)=>res.json({success:true,companyId:company,...await previewKnowledgeSource(pool,company,req.params.sourceId as string)}));
 app.post('/api/ai/knowledge/query',deps.rateLimit,async(req,res)=>{
  res.set('Cache-Control','no-store');try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}const parsed=knowledgeQueryInput.safeParse(req.body);if(!parsed.success)throw new KnowledgeError(400,'KNOWLEDGE_QUERY_INVALID');const {companyId,query}=parsed.data,access=await deps.access(user,companyId);if(!access.authorized){res.status(access.status).json({success:false,error:'Knowledge workspace access denied'});return;}const pool=await deps.pool();if(!pool)throw new KnowledgeError(503,'KNOWLEDGE_STORAGE_UNAVAILABLE');const profile=await deps.profile(companyId),sources=await readKnowledgeExcerpts(pool,companyId);res.json(retrieveKnowledge(companyId,query,profile.data,profile.version,sources));}
  catch(error){res.status(error instanceof KnowledgeError?error.status:503).json({success:false,error:error instanceof KnowledgeError?error.code:'Saved knowledge unavailable'});}
 });
}
