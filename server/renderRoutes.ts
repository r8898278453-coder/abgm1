import type {Express,Request,RequestHandler} from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import type {DbUser,DbCompany} from './db';
import {getCompanyById,getCompanyDataPayload,getCompanyAssets} from './db';
import {renderTemplateToImage as defaultCreative} from './templateRenderer';
import {pickThemeForCompany as defaultTheme} from './themeSelector';
import {renderReelVideo} from './reelRenderer';
import {createReelJob,getReelJob,updateReelJob} from './reelJobManager';
import {creativeRenderInput,reelRenderInput,ownedRenderImage,canonicalRenderName,RenderInputError} from './renderInputPolicy';

type Dependencies={
 auth:(req:Request)=>Promise<DbUser|null>;
 resolve:(user:DbUser,companyId?:string)=>Promise<{companyId?:string;error?:string;status:number}>;
 access:(user:DbUser,companyId:string)=>Promise<{authorized:boolean;company?:DbCompany;error?:string;status:number}>;
 limiter:RequestHandler;uploadsRoot:string;
 company?:typeof getCompanyById;data?:typeof getCompanyDataPayload;assets?:typeof getCompanyAssets;
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

    const logoUrl = await ownedRenderImage(UPLOADS_BASE_DIR, targetCompanyId, assets, 'logo', req.body.logoUrl);
    const photoUrl = await ownedRenderImage(UPLOADS_BASE_DIR, targetCompanyId, assets, 'photo', explicitPhotoUrl);

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
    res.status(err instanceof RenderInputError ? 400 : 503).json({ success: false, error: err instanceof RenderInputError ? err.message : 'CREATIVE_RENDER_UNAVAILABLE' });
  }
});

// AI 15-Second Viral Local Reel Video Rendering Engine (Remotion Server-Side)
// Accepts reelScript from text generation flow, renders full 1080x1920 MP4 with Ken Burns photo motion & on-screen captions
app.post('/api/ai/render-reel', aiRateLimiter, async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required to render reel videos.' });
      return;
    }

    const parsed = reelRenderInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({success:false,error:'RENDER_INPUT_INVALID'}); return; }
    req.body = parsed.data;
    const { reelScript, companyId } = parsed.data;
    if (!Array.isArray(reelScript) || reelScript.length === 0) {
      res.status(400).json({ success: false, error: 'reelScript must be a non-empty array of scenes ({ scene, visual, audio }).' });
      return;
    }

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

    if (process.env.ENABLE_REEL_RENDERING !== 'true') {
      res.status(409).json({success:false,error:'REEL_RENDERING_UNAVAILABLE'}); return;
    }

    // Extract brandKit colors, name and logo with fallback hierarchy
    const brandKit = (companyData as any)?.brandKit || (companyData as any)?.business?.brandKit || (company as any)?.brandKit;
    const primaryColor = req.body.primaryColor || (typeof brandKit?.primaryColor==='string' && /^#[a-fA-F0-9]{6}$/.test(brandKit.primaryColor) ? brandKit.primaryColor : '#4f46e5');

    const logoUrl = await ownedRenderImage(UPLOADS_BASE_DIR, targetCompanyId, assets, 'logo', req.body.logoUrl);
    const companyPhotos = (await Promise.all(assets.filter(a=>a.asset_type==='photo').slice(0,3).map(a=>ownedRenderImage(UPLOADS_BASE_DIR,targetCompanyId,assets,'photo',a.url)))).filter((url):url is string=>!!url);
    const businessName = canonicalRenderName(company);

    // Unique filename and destination path under /uploads/{companyId}/generated/
    const safeCompId = targetCompanyId.replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `reel_${timestamp}_${randomSuffix}.mp4`;
    const generatedDir = path.join(UPLOADS_BASE_DIR, safeCompId, 'generated');
    const outputPath = path.join(generatedDir, filename);
    const publicUrl = `/uploads/${safeCompId}/generated/${filename}`;

    // Normalize up to 3 scenes
    const normalizedScenes = reelScript.slice(0, 3).map((s: any, idx: number) => ({
      scene: s.scene || `Scene ${idx + 1}`,
      visual: s.visual || '',
      audio: s.audio || '',
    }));

    // Register job in in-memory queue
    const job = createReelJob(targetCompanyId, user.id, normalizedScenes.length);

    // Asynchronously render video in background without blocking HTTP response
    (async () => {
      try {
        updateReelJob(job.id, { status: 'rendering', progress: 0 });

        const result = await renderReelVideo({
          inputProps: {
            scenes: normalizedScenes,
            logoUrl: logoUrl || undefined,
            primaryColor,
            businessName,
            photoUrls: companyPhotos.length > 0 ? companyPhotos : undefined,
          },
          outputPath,
          onProgress: (progressPercent) => {
            updateReelJob(job.id, {
              status: 'rendering',
              progress: Math.max(0, Math.min(99, progressPercent)),
            });
          },
        });

        updateReelJob(job.id, {
          status: 'completed',
          progress: 100,
          videoUrl: publicUrl,
          filename,
          sizeBytes: result.sizeBytes,
          durationSeconds: result.durationInSeconds,
        });
        console.log(`[Remotion Reel] Render job ${job.id} completed: ${publicUrl} (${result.sizeBytes} bytes)`);
      } catch (renderErr: any) {
        console.error('[Remotion Reel] Render failed');
        updateReelJob(job.id, {
          status: 'failed',
          error: 'REEL_RENDER_FAILED',
        });
      }
    })();

    // 202 Accepted response with tracking job ID
    res.status(202).json({
      success: true,
      jobId: job.id,
      status: 'pending',
      message: 'Reel render accepted; waiting for renderer',
      checkStatusUrl: `/api/ai/render-reel/${job.id}/status`,
    });
  } catch (err: any) {
    res.status(err instanceof RenderInputError ? 400 : 503).json({ success: false, error: err instanceof RenderInputError ? err.message : 'REEL_RENDER_UNAVAILABLE' });
  }
});

// Query Reel Render Job Status
app.get('/api/ai/render-reel/:jobId/status', async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { jobId } = req.params;
    const job = getReelJob(jobId);
    if (!job) {
      res.status(404).json({ success: false, error: 'Render job not found or expired' });
      return;
    }

    // Ownership check: user must own the job or be platform admin
    if (job.userId !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Unauthorized to view this render job' });
      return;
    }

    res.json({
      success: true,
      job,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'REEL_STATUS_UNAVAILABLE' });
  }
});


}
