import {getDbPool} from './db';
import {enqueueReel,readReels,cancelReel} from './reelJobs';
import {approvedRenderAssets,readRenderAssets,reviewRenderAsset,assetReviewInput,RenderError} from './renderAssets';
import type {Express,Request,RequestHandler} from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import type {DbUser,DbCompany} from './db';
import {getCompanyById,getCompanyDataPayload,getCompanyAssets} from './db';
import {renderTemplateToImage as defaultCreative} from './templateRenderer';
import {pickThemeForCompany as defaultTheme} from './themeSelector';
import {creativeRenderInput,reelRenderInput,ownedRenderImage,canonicalRenderName,RenderInputError} from './renderInputPolicy';

type Dependencies={
 auth:(req:Request)=>Promise<DbUser|null>;
 resolve:(user:DbUser,companyId?:string)=>Promise<{companyId?:string;error?:string;status:number}>;
 access:(user:DbUser,companyId:string)=>Promise<{authorized:boolean;company?:DbCompany;error?:string;status:number}>;
 limiter:RequestHandler;uploadsRoot:string;
 company?:typeof getCompanyById;data?:typeof getCompanyDataPayload;assets?:typeof getCompanyAssets;
 pool?:typeof getDbPool;
 theme?:typeof defaultTheme;creative?:typeof defaultCreative;
};
export function registerRenderRoutes(app:Express,deps:Dependencies){
 const {auth:getAuthUserFromRequest,resolve:resolveUserCompanyId,access:verifyCompanyWorkspaceAccess,limiter:aiRateLimiter,uploadsRoot:UPLOADS_BASE_DIR}=deps;
 const loadCompany=deps.company||getCompanyById,loadData=deps.data||getCompanyDataPayload,loadAssets=deps.assets||getCompanyAssets;
 const pickThemeForCompany=deps.theme||defaultTheme,renderTemplateToImage=deps.creative||defaultCreative;
// AI Template Creative Rendering Engine (Satori + Resvg) with Combinatorial Theme Rotation
app.post('/api/ai/render-creative', aiRateLimiter, async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required to render branded creatives' });
      return;
    }

    const parsed = creativeRenderInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({success:false,error:'RENDER_INPUT_INVALID'}); return; }
    req.body = parsed.data;

    const {
      templateId,
      paletteId,
      headline,
      caption,
      ctaText,
      companyId,
      photoUrl: explicitPhotoUrl,
      tag,
      contentType,
    } = req.body;

    const resolved = await resolveUserCompanyId(user, companyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const targetCompanyId = resolved.companyId;

    const authCheck = await verifyCompanyWorkspaceAccess(user, targetCompanyId);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const [company, companyData, assets] = await Promise.all([
      loadCompany(targetCompanyId),
      loadData(targetCompanyId),
      loadAssets(targetCompanyId),
    ]);

    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    // Extract brandKit colors, name and logo with fallback hierarchy
    const brandKit = (companyData as any)?.brandKit || (companyData as any)?.business?.brandKit || (company as any)?.brandKit;
    const baseBrandPrimary = req.body.primaryColor || (typeof brandKit?.primaryColor==='string' && /^#[a-fA-F0-9]{6}$/.test(brandKit.primaryColor) ? brandKit.primaryColor : '#4f46e5');

    const sql=await (deps.pool||getDbPool)();if(!sql)throw new RenderError(503,'RENDER_STORAGE_UNAVAILABLE');
    const approved=await approvedRenderAssets(sql,UPLOADS_BASE_DIR,targetCompanyId,req.body.logoUrl,explicitPhotoUrl);
    const logoUrl=approved.images.logoUrl,photoUrl=approved.images.photoUrls[0];

    // Combinatorial Theme Rotation Engine:
    // Intelligently picks a template + palette combo that NEVER repeats within any 5-generation window for this company
    const selectedTheme = await pickThemeForCompany({
      companyId: targetCompanyId,
      contentType: contentType || (tag ? String(tag).toLowerCase() : undefined),
      brandPrimaryColor: baseBrandPrimary,
      requestedTemplateId: templateId,
      requestedPaletteId: paletteId,
    });

    const chosenTemplateId = selectedTheme.templateId;
    const template = selectedTheme.template;
    const chosenPalette = selectedTheme.palette;

    // Palette colors applied to the template zones
    const primaryColor = chosenPalette.primaryColor;
    const secondaryColor = chosenPalette.secondaryColor;
    const accentColor = chosenPalette.accentColor;
    const textColor = chosenPalette.textColor;

    const businessName = canonicalRenderName(company);

    // Render high-res PNG Buffer via Satori + Resvg
    const pngBuffer = await renderTemplateToImage(chosenTemplateId, {
      headline: (headline && typeof headline === 'string' && headline.trim()) ? headline.trim() : company.name || 'Business',
      caption: (caption && typeof caption === 'string' && caption.trim()) ? caption.trim() : '',
      ctaText: (ctaText && typeof ctaText === 'string' && ctaText.trim()) ? ctaText.trim() : 'Learn more',
      logoUrl: logoUrl || undefined,
      photoUrl: photoUrl || undefined,
      primaryColor,
      secondaryColor,
      accentColor,
      textColor,
      businessName,
      tag: (tag && typeof tag === 'string') ? tag.trim() : undefined,
    });

    // Save PNG into company's generated uploads folder
    const safeCompId = targetCompanyId.replace(/[^a-zA-Z0-9_-]/g, '');
    const generatedDir = path.join(UPLOADS_BASE_DIR, safeCompId, 'generated');
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    const filename = `creative_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`;
    const fullFilePath = path.join(generatedDir, filename);
    await fs.promises.writeFile(fullFilePath, pngBuffer);

    const publicUrl = `/uploads/${safeCompId}/generated/${filename}`;

    res.json({
      success: true,
      imageUrl: publicUrl,
      templateId: chosenTemplateId,
      templateName: template.name,
      paletteId: chosenPalette.id,
      paletteName: chosenPalette.name,
      paletteCategory: chosenPalette.category,
      paletteColors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        text: textColor,
      },
      companyId: targetCompanyId,
      filename,
      sizeBytes: pngBuffer.length,
    });
  } catch (err: any) {
    res.status(err instanceof RenderError ? err.status : err instanceof RenderInputError ? 400 : 503).json({ success: false, error: err instanceof RenderError ? err.code : err instanceof RenderInputError ? err.message : 'CREATIVE_RENDER_UNAVAILABLE' });
  }
});


 const pool=async()=>{const p=await (deps.pool||getDbPool)();if(!p)throw new RenderError(503,'REEL_STORAGE_UNAVAILABLE');return p;};
 const scope=async(req:Request,res:any,company:unknown)=>{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return null;}if(typeof company!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(company)){res.status(400).json({success:false,error:'COMPANY_REQUIRED'});return null;}const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return null;}return user;};
 const unavailable=(res:any,error:unknown)=>res.status(error instanceof RenderError?error.status:503).json({success:false,error:error instanceof RenderError?error.code:'RENDER_STORAGE_UNAVAILABLE'});
 app.post('/api/ai/render-reel',aiRateLimiter,async(req,res)=>{res.setHeader('Cache-Control','no-store');try{
  const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return;}
  const input=reelRenderInput.safeParse(req.body);if(!input.success){res.status(400).json({success:false,error:'RENDER_INPUT_INVALID'});return;}
  const allowed=await deps.access(user,input.data.companyId);if(!allowed.authorized){res.status(allowed.status).json({success:false,error:allowed.error});return;}
  if(process.env.ENABLE_REEL_RENDERING!=='true'){res.status(409).json({success:false,error:'REEL_RENDERING_UNAVAILABLE'});return;}
  const result=await enqueueReel(await pool(),UPLOADS_BASE_DIR,user.id,input.data,typeof req.headers['idempotency-key']==='string'?req.headers['idempotency-key']:'');
  res.status(202).json({success:true,jobId:result.job.id,status:result.job.status,job:result.job,reused:result.reused,message:'Reel queued; rendering has not been confirmed',checkStatusUrl:`/api/ai/render-reel/${result.job.id}/status?companyId=${encodeURIComponent(input.data.companyId)}`});
 }catch(error){unavailable(res,error);}});
 app.get('/api/ai/render-reel/:jobId/status',async(req,res)=>{res.setHeader('Cache-Control','no-store');try{if(!await scope(req,res,req.query.companyId))return;const jobs=await readReels(await pool(),String(req.query.companyId),String(req.params.jobId));if(!jobs.length){res.status(404).json({success:false,error:'REEL_JOB_NOT_FOUND'});return;}res.json({success:true,job:jobs[0]});}catch(error){unavailable(res,error);}});
 app.get('/api/companies/:companyId/reel-jobs',async(req,res)=>{res.setHeader('Cache-Control','no-store');try{if(!await scope(req,res,req.params.companyId))return;res.json({success:true,jobs:await readReels(await pool(),String(req.params.companyId))});}catch(error){unavailable(res,error);}});
 app.post('/api/ai/render-reel/:jobId/cancel',async(req,res)=>{res.setHeader('Cache-Control','no-store');try{if(!req.body||Object.keys(req.body).length!==1){res.status(400).json({success:false,error:'COMPANY_REQUIRED'});return;}const user=await scope(req,res,req.body.companyId);if(!user)return;await cancelReel(await pool(),req.body.companyId,String(req.params.jobId),user.id);res.json({success:true,jobId:req.params.jobId,companyId:req.body.companyId,status:'cancelled'});}catch(error){unavailable(res,error);}});
 app.get('/api/companies/:companyId/asset-approvals',async(req,res)=>{res.setHeader('Cache-Control','no-store');try{if(!await scope(req,res,req.params.companyId))return;const assets=await readRenderAssets(await pool(),String(req.params.companyId));res.json({success:true,companyId:req.params.companyId,assets:assets.map(({content_hash,...row}:any)=>row)});}catch(error){unavailable(res,error);}});
 app.post('/api/companies/:companyId/asset-approvals/:assetId',async(req,res)=>{res.setHeader('Cache-Control','no-store');try{const user=await scope(req,res,req.params.companyId);if(!user)return;const body=assetReviewInput.safeParse(req.body);if(!body.success){res.status(400).json({success:false,error:'ASSET_REVIEW_INVALID'});return;}const result=await reviewRenderAsset(await pool(),UPLOADS_BASE_DIR,String(req.params.companyId),String(req.params.assetId),user,body.data);res.json({success:true,...result});}catch(error){unavailable(res,error);}});
}
