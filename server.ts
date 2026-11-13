import {registerSalesRoutes} from './server/salesRoutes';
import {registerRenderRoutes} from './server/renderRoutes';
import {registerClientPolicyRoutes} from './server/clientPolicyRoutes';
import {registerIntegrationMetadataRoutes} from './server/integrationMetadataRoutes';
import {registerAuthRoutes} from './server/authRoutes';
import {issueLoginSession} from './server/authResponse';
import {browserSessionGuard} from './server/browserSession';
import {registerOnboardingRoutes} from './server/onboardingRoutes';
import {registerCompanyRoutes} from './server/companyRoutes';
import {verifyAuthToken} from './server/auth';
import {registerSessionRoutes,persistentLoginLimit} from './server/sessionRoutes';
import {registerAgencyRoutes} from './server/agencyRoutes';
import {agencyClientAccess,agencyRequestContext} from './server/agencyPolicy';
import {createDraftModel} from './server/draftModel';
import {generateKnowledgeDraft,KnowledgeDraftError,knowledgeDraftInput} from './server/knowledgeDrafts';
import {registerInternalCampaignRoutes} from './server/internalCampaignRoutes';
import {registerKnowledgeRoutes} from './server/knowledgeRoutes';
import {publicIntegrationCheck} from './server/integrationCheckResult';
import {maskIntegrationCredentials} from './shared/integrationCredentials';
import {resolveIntegrationInput,IntegrationAccessError,explicitIntegrationCompany} from './server/integrationAccess';
import {inspectDomainIntegration} from './server/domainIntegrationEvidence';
import {registerPasswordRecoveryRoutes} from './server/passwordRecoveryRoutes';
import {consumePasswordReset} from './server/db';
import {registerCompetitorRoutes} from './server/competitorRoutes';
import {WorkspaceConflict} from './shared/workspaceRevision';
import {mutateCompetitorSql} from './server/competitorCommands';
import {registerObservationHistoryRoutes} from './server/observationHistoryRoutes';
import {registerPublicLeadRoutes} from './server/publicLeadRoutes';
import {resolvePublicLeadCompany,savePublicLeadIntake,readPublicLeadReceipt,notifyPublicLeadOnce} from './server/publicLeadStore';
import {registerWebsiteRoutes} from './server/websiteRoutes';
import {readDispatcherHistory} from './server/dispatcherStore';
import {registerCompanyDataRoutes} from './server/companyDataRoutes';
import {registerAdCampaignRoutes} from './server/adCampaignRoutes';
import {inspectDatabaseStartup} from './server/databaseStartup';
import {recordWhatsAppInboundLead,describeWhatsAppInbound} from './server/whatsAppInbound';
import {registerWhatsAppWebhook,whatsAppWebhookBodyParser} from './server/whatsAppWebhook';
import {recordMessageReceipt} from './server/messageDeliveryReceipts';
import {registerMessageDispatchStatus,readMessageDispatchStatus} from './server/messageDispatchStatus';
import {dispatchMessageIntent,DispatchIntentError} from './server/messageDispatchIntents';
import {createHash} from 'node:crypto';
import {runWhatsAppBroadcast} from './server/whatsAppBroadcast';
import {registerAutonomousControlRoutes} from './server/autonomousControlRoutes';
import {requireAiWorkspace} from './server/aiWorkspace';
import {registerLeadStageRoutes} from './server/leadStageRoutes';
import {registerContentMutationRoutes} from './server/contentMutationRoutes';
import {registerAuditRoutes} from './server/auditRoutes';
import {registerReviewReplyRoutes} from './server/reviewReplyRoutes';
import {contentSchema} from './shared/aiGeneration';
import {readPublicationControlHistory} from './server/publicationControlHistory';
import {registerPublicationControls} from './server/publicationControlRoutes';
import {readScopedPublicationControls,updateScopedPublicationControls} from './server/publicationScopedControls';
import {registerDailyWorkReport} from './server/dailyWorkReportRoutes';
import {readDailyWorkReport} from './server/dailyWorkReport';
import {readPublicationWorkflowHistory} from './server/publicationWorkflowHistory';
import {registerPublicationWorkflow} from './server/publicationWorkflowRoutes';
import {transitionPublication} from './server/publicationWorkflow';
import {publishingSourceVersion} from './server/publishingSource';
import {registerPublicationDrafts} from './server/publicationDraftRoutes';
import {preparePublicationDraft} from './server/publicationDraftIntents';
import {PublishingReviewError} from './server/publishingReview';
import {registerMetaVerification} from './server/metaVerificationRoutes';
import {checkCompanyMetaPublication} from './server/metaVerificationService';
import { registerPublishingReview } from './server/publishingReviewRoutes';
import { getCompanyPublishingReview,recordCompanyPublishingReview } from './server/publishingReviewService';
import { registerMetaPublishing } from './server/metaPublishingRoutes';
import { registerNotificationStatus } from './server/notificationStatusRoutes';
import { getCompanyNotificationStatus } from './server/notificationStatusService';
import { registerTenantNotificationRoutes } from './server/tenantNotificationRoutes';
import { sendTenantTelegram } from './server/tenantNotifications';
import { registerSchedulerRoutes } from './server/schedulerRoutes';
import { registerActionFeed } from './server/actionFeedRoutes';
import { getCompanyActionFeed } from './server/actionFeedService';
import { registerQueueAdmission } from './server/queueRoutes';
import { registerHealthRoutes } from './server/health';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLeadStatus,
  sendTelegramPushAlert,
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  upgradeUserPassword,
  createPasswordResetToken,
  getAllCompanies,
  getUserCompanies,
  getCompanyById,
  createCompany,
  findCompanyByPublicFormToken,
  getCompanyDataPayload,
  saveCompanyDataPayload,
  companyDataVersion,
  getDbStatus,
  getCompanyIntegrations,
  getCompanyIntegration,
  saveCompanyIntegration,
  deleteCompanyIntegration,
  DbUser,
  DbCompany,
  getCompanyReviews,
  getReviewById,
  getReviewCompanyId,
  createReview,
  updateReviewReply,
  deleteReview,
  getCompanyPosts,
  getPostById,
  getContentPostCompanyId,
  createContentPost,
  updateContentPostStatus,
  deleteContentPost,
  getPublishingRecordsByPostId,
  getGoogleProfileCache,
  saveGoogleProfileCache,
  syncGoogleReviewsToDatabase,
  createCompanyAsset,
  getCompanyAssets,
  getCompanyAssetById,
  deleteCompanyAsset,
  getInvoicesByCompany,
  getInvoiceById,
  createInvoice,
  getSubscriptionByCompany,
  upsertSubscription,
  getCustomDomainsByCompany,
  getCustomDomainById,
  createCustomDomain,
  updateCustomDomainStatus,
  deleteCustomDomain,
  getWebsiteConfigByCompany,
  upsertWebsiteConfig,
  saveRankObservations,
  getLatestKeywordObservations,
  getKeywordObservationHistory,
  calculateHistoricalTrend,
  saveCompetitorObservation,
  saveCompetitorObservations,
  getCompetitorObservationHistory,
  getLatestCompetitorObservations,
  getCompetitorHistoricalBaseline,
  DbCompetitorObservation,
  getInternalCampaigns,
  createInternalCampaign,
  updateInternalCampaign,
  deleteInternalCampaign,
  getExternalAdCampaigns,
  upsertExternalAdCampaign,
  getAutonomousRecommendationsByCompany,
  updateAutonomousRecommendationStatus,
  getAutonomousActionsByCompany,
  getAutonomousActionById,
  updateAutonomousAction,
  getAutonomousAuditLogsByCompany,
  recordAutonomousAuditLog,
  getCompanyPostsByCampaignId,
  enqueueJob,
  getJobsByCompany,
  getPendingJobsCount,
  getDbPool,
} from './server/db';
import { runSchedulerTick } from './server/scheduler';
import { tickJobQueue } from './server/jobQueueService';
import {
  verifySchema,
} from './server/migrator';
import {
  runAutonomousCycle,
  executeAutonomousAction,
  setGlobalEmergencyStop,
  isGlobalEmergencyStopActive,
} from './server/autonomousEngine';
import {
  syncExternalAdCampaigns,
  getCompanyExternalAdCampaigns,
} from './server/adCampaignService';
import {
  resolveCenterCoordinates,
  generate3x3GridCoordinates,
  resolveRankProvider,
  RankObservation,
  RankScanContext,
  RankScanResult,
} from './server/localSeoProvider';
import {
  resolveCompetitorProvider,
  calculateCompetitorChanges,
  NormalizedCompetitorObservation,
  CompetitorFetchContext,
} from './server/competitorProvider';
import {
  calculateGrowthIntelligenceScore,
  toGrowthScorePayload,
} from './server/growthScoreEngine';
import { generateEvidenceBasedAudit } from './server/auditEngine';
import {
  buildStructuredEvidence,
  buildEvidenceGroundedPrompt,
  generateDeterministicSummary,
  StructuredEvidenceItem,
  ExecutiveSummaryResult,
} from './server/aiExecutiveSummary';
import {
  calculateRevenueAttribution,
  normalizeSource,
  isProviderVerifiedPayment,
  SUPPORTED_SOURCES,
} from './server/revenueAttribution';
import {
  verifyRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  mapRazorpayEventToSubscriptionState,
  activateSubscriptionIdempotent,
  isProductionEnvironment,
} from './server/billingService';
import {
  resolveWhatsAppCredentials,
  resolveMetaSocialCredentials,
  findCompanyByWhatsAppIdentifier,
  verifyWhatsAppWebhookSignature,
  verifyMetaWebhookHandshake,
  sendWhatsAppCloudMessage,
} from './server/metaWhatsAppService';
import {
  generateStorefrontHtml,
  generateStaticExportZip,
  verifyDomainDns,
} from './server/websiteService';
import {
  sendPasswordResetEmail,
  isEmailServiceConfigured,
  getEmailProviderConfig,
  testEmailConnection,
  sendTransactionalEmail,
} from './server/emailService';
import { startScheduler, stopScheduler } from './server/scheduler';
import { executePublishingJob } from './server/publishingEngine';
import { calculateMessageIntent } from './server/intentScoring';
import { generateAuthToken, getAuthUserFromRequest, getAuthSecret } from './server/auth';
import { getAllTemplates, getTemplateById } from './server/templates/definitions';
import { getAllPalettes } from './server/templates/palettes';
import {
  loginProtectionMiddleware,
  recordFailedLogin,
  recordSuccessfulLogin,
  registerRateLimiter,
  aiRateLimiter,
  leadsRateLimiter,
  telegramAlertLimiter,
  forgotPasswordRateLimiter,
} from './server/rateLimiter';
import {
  corsMiddleware,
  securityHeadersMiddleware,
  requestAuditLogger,
} from './server/security';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createLeadSchema,
  updateLeadStageSchema,
  replyReviewSchema,
  createReviewSchema,
  createCompanySchema,
  createPostSchema,
  verifyRazorpayPaymentSchema,
  generateAiContentSchema,
  rankScanSchema,
  whatsappSendSchema,
  whatsappBroadcastSchema,
  createInvoiceSchema,
  upgradeSubscriptionSchema,
  validateBody,
} from './server/validation';

const app = express();

// Configure Express reverse proxy trust settings:
// Trust exactly 1 reverse proxy hop (e.g., Hostinger LiteSpeed/Node reverse proxy, Nginx, or Cloud Run ingress).
// CRITICAL SECURITY NOTE: This setting must match the actual reverse proxy topology. Setting it too high
// (or setting it to `true`, which trusts all upstream hops) would re-introduce the IP spoofing vulnerability
// by allowing untrusted external clients to prepend arbitrary spoofed IPs to X-Forwarded-For headers.
// If an additional proxy layer or CDN (e.g., Cloudflare) is placed in front of this server, this value
// must be updated to match the exact hop count (e.g., 2).
const trustProxyHops = process.env.TRUST_PROXY_HOPS ? parseInt(process.env.TRUST_PROXY_HOPS, 10) : 1;
app.set('trust proxy', trustProxyHops);

// Server Port: Dev server must run on port 3000 (AI Studio Nginx reverse proxy routes to 3000).
// In standalone production, use process.env.PORT if specified.
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enterprise Security & Monitoring Middlewares
app.use(securityHeadersMiddleware);
app.use(corsMiddleware);
app.use('/api',browserSessionGuard(verifyAuthToken,getAuthSecret));
app.use(requestAuditLogger);

// Enforce fail-fast cryptographic secret verification on boot
try {
  getAuthSecret();
} catch (secErr: any) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL PRODUCTION SECURITY ERROR:', secErr?.message);
    process.exit(1);
  }
}
app.use('/api/whatsapp/webhook',whatsAppWebhookBodyParser);
app.use(
  express.json({
    limit: '5mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(agencyRequestContext);
registerAgencyRoutes(app,{auth:getAuthUserFromRequest,pool:getDbPool});

// Ensure /uploads directory exists gracefully on startup
const UPLOADS_BASE_DIR = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(UPLOADS_BASE_DIR)) {
    fs.mkdirSync(UPLOADS_BASE_DIR, { recursive: true });
  }
} catch (dirErr: any) {
  console.warn('[Storage] Warning ensuring uploads root directory:', dirErr?.message);
}

// Serve /uploads as public-read static assets for marketing and social media previews
app.use('/uploads', express.static(UPLOADS_BASE_DIR));

// Multer storage engine for per-company asset directories
const assetStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const rawCompId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || 'general');
    const safeCompId = String(rawCompId).replace(/[^a-zA-Z0-9_-]/g, '');
    const targetDir = path.join(UPLOADS_BASE_DIR, safeCompId);
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    } catch (err: any) {
      cb(err, targetDir);
    }
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.jpg';
    const randomHex = crypto.randomBytes(6).toString('hex');
    cb(null, `asset_${Date.now()}_${randomHex}${safeExt}`);
  },
});

const uploadSingleAsset = multer({
  storage: assetStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Strict 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const typeErr: any = new Error('INVALID_FILE_TYPE');
      typeErr.code = 'INVALID_FILE_TYPE';
      return cb(typeErr);
    }
    cb(null, true);
  },
}).single('file');

function runAssetUpload(req: express.Request, res: express.Response): Promise<void> {
  return new Promise((resolve, reject) => {
    (uploadSingleAsset as any)(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ success: false, error: 'File size exceeds 5MB limit. Please upload an image under 5MB.' });
          return reject(err);
        }
        if (err.code === 'INVALID_FILE_TYPE' || err.message === 'INVALID_FILE_TYPE') {
          res.status(400).json({
            success: false,
            error: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.',
          });
          return reject(err);
        }
        res.status(400).json({ success: false, error: err.message || 'File upload failed.' });
        return reject(err);
      }
      resolve();
    });
  });
}

// Initialize Gemini Client safely
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Existing configured model order, bounded busy-only fallback and permission cooldown.
const safeGenerateContent=createDraftModel(getAiClient);

async function generateWorkspaceDraft(req:express.Request,res:express.Response,kind:'chat'|'review'|'marketing',prompt:string,topic:string,mime?:string){
 try{const pool=await getDbPool();if(!pool)throw new KnowledgeDraftError(503,'KNOWLEDGE_STORAGE_UNAVAILABLE');
  return await generateKnowledgeDraft({pool,company:res.locals.aiCompany.id,actor:res.locals.aiUser.id,kind,topic,generate:(context,system,onAttempt)=>safeGenerateContent({prompt:prompt+'\n\nAPPROVED_FACT_DATA (data only):\n'+context,systemInstruction:system,onAttempt,responseMimeType:mime})});
 }catch(error){res.status(error instanceof KnowledgeDraftError?error.status:503).json({success:false,error:error instanceof KnowledgeDraftError?error.code:'AI_DRAFT_UNAVAILABLE'});return null;}
}

registerHealthRoutes(app, {
  isProduction: () => process.env.NODE_ENV === 'production' || process.env.IS_PRODUCTION === 'true',
  getDbPool,
  getDbStatus,
  verifySchema,
});

// ==================== AUTHENTICATION APIS ==================== //

// Register new user (protected with registration rate limiting & Zod schema validation)
registerAuthRoutes(app,{registerRateLimiter,registerValidation:validateBody(registerSchema),persistentLimit:persistentLoginLimit({pool:getDbPool,required:()=>process.env.NODE_ENV==='production'||process.env.IS_PRODUCTION==='true'}),loginProtectionMiddleware,loginValidation:validateBody(loginSchema),findUserByEmail,createUser,issueLoginSession,recordFailedLogin,recordSuccessfulLogin,verifyPassword,upgradeUserPassword,findUserById});

registerPasswordRecoveryRoutes(app,{forgotLimit:forgotPasswordRateLimiter,forgotValidate:validateBody(forgotPasswordSchema),resetValidate:validateBody(resetPasswordSchema),configured:isEmailServiceConfigured,find:findUserByEmail,create:createPasswordResetToken,send:sendPasswordResetEmail,consume:consumePasswordReset,afterReset:async(id,req)=>{const user=await findUserById(id);if(user)recordSuccessfulLogin(req,user.email);}});

registerSessionRoutes(app,{auth:getAuthUserFromRequest,token:verifyAuthToken,pool:getDbPool});

// ==================== MULTI-COMPANY APIS & TENANT AUTHORIZATION ==================== //

/**
 * Verifies that the authenticated user owns the specified company or is a platform admin.
 * Rejects with 404 if company does not exist, or 403 if IDOR attempt detected.
 */
async function verifyCompanyWorkspaceAccess(
  user: DbUser,
  companyId: string
): Promise<{ authorized: boolean; company?: DbCompany; error?: string; status: number }> {
  if (!companyId) {
    return { authorized: false, error: 'Company ID is required', status: 400 };
  }
  const company = await getCompanyById(companyId);
  if (!company) {
    return { authorized: false, error: 'Company workspace not found', status: 404 };
  }
  const pool=await getDbPool();if(pool){const policy=await agencyClientAccess(pool,user,companyId);return {...policy,company};}
  if (company.user_id !== user.id && !user.is_platform_admin) {
    return { authorized: false, error: 'Access denied to this company workspace', status: 403 };
  }
  return { authorized: true, company, status: 200 };
}

/**
 * Resolves the effective company ID for tenant-scoped operations:
 * - If explicit requestedCompanyId is supplied: verifies tenant authorization (returns 403/404 if unauthorized).
 * - If no company ID supplied: resolves to the authenticated user's primary company.
 * - If user owns 0 companies: returns 400 Bad Request instead of silently falling back to a global default company.
 */
async function resolveUserCompanyId(
  user: DbUser,
  requestedCompanyId?: string
): Promise<{ companyId?: string; error?: string; status: number }> {
  if (requestedCompanyId) {
    const check = await verifyCompanyWorkspaceAccess(user, requestedCompanyId);
    if (!check.authorized) {
      return { error: check.error, status: check.status };
    }
    return { companyId: requestedCompanyId, status: 200 };
  }

  const userCompanies = await getUserCompanies(user.id);
  if (!userCompanies || userCompanies.length === 0) {
    return {
      error: 'No company workspace associated with authenticated user. Please specify or create a company.',
      status: 400,
    };
  }
  return { companyId: userCompanies[0].id, status: 200 };
}

registerCompanyRoutes(app,{auth:getAuthUserFromRequest,all:getAllCompanies,owned:getUserCompanies,create:createCompany,validate:validateBody(createCompanySchema),created:async(user,company)=>{const alertMsg=`🏢 *NEW COMPANY ONBOARDED TO ABGA!*\n\n👑 *Owner:* ${user.full_name} (${user.email})\n🏢 *Business:* ${company.name}\n🏷️ *Category:* ${company.category}\n📍 *City:* ${company.city}\n🌐 *Domain:* bga.aaditechs.in`;return sendTelegramPushAlert(alertMsg);}});

registerClientPolicyRoutes(app,{auth:getAuthUserFromRequest,pool:getDbPool});
registerOnboardingRoutes(app,{auth:getAuthUserFromRequest,pool:getDbPool,access:verifyCompanyWorkspaceAccess});
registerCompanyDataRoutes(app,{auth:getAuthUserFromRequest,company:getCompanyById,access:verifyCompanyWorkspaceAccess,read:async(company)=>{const data=await getCompanyDataPayload(company);return {data,version:companyDataVersion(data)};},save:async(company,data,version)=>{if(!await saveCompanyDataPayload(company,data,version))throw new Error('Workspace save unconfirmed');return companyDataVersion(data);}});

// ==================== GROWTH INTELLIGENCE SCORE APIS ==================== //

// Retrieve centralized calculated growth score with full formula telemetry and data classification
app.get('/api/companies/:id/growth-score', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const payload: any = (await getCompanyDataPayload(id)) || {};
    const [dbReviews, dbPosts, dbLeads, dbDomains, latestObs] = await Promise.all([
      getCompanyReviews(id).catch(() => []),
      getCompanyPosts(id).catch(() => []),
      getAllLeads(id).catch(() => []),
      getCustomDomainsByCompany(id).catch(() => []),
      getLatestKeywordObservations(id).catch(() => []),
    ]);

    const activeReviews = dbReviews;
    const activePosts = dbPosts;
    const activeLeads = dbLeads;
    const isDomainVerified = dbDomains.some((d: any) => d.status === 'verified');

    const result = calculateGrowthIntelligenceScore({
      businessProfile: payload.business || {
        id: company.id,
        name: company.name,
        category: company.category,
        city: company.city,
        phone: company.phone || '',
        website: company.website || '',
        address: '',
        subCategory: company.category,
        state: '',
        country: '',
        email: '',
        whatsapp: company.phone || '',
        description: '',
        services: [],
        products: [],
        priceRange: '',
        openingHours: '',
        serviceAreas: [company.city],
        brandKit: {
          logoUrl: '',
          primaryColor: '#4f46e5',
          secondaryColor: '#0f172a',
          fontFamily: 'Plus Jakarta Sans',
          tagline: '',
          brandTone: '',
          preferredLanguage: 'English',
        },
        connectedAccounts: {
          googleBusiness: Boolean(company.google_place_id),
          metaFacebook: false,
          metaInstagram: false,
          whatsappBusiness: false,
          telegramBot: false,
          website: Boolean(company.website),
        },
      },
      reviews: activeReviews,
      rankObservations: latestObs as any,
      keywordRanks: payload.keywords || [],
      contentPosts: activePosts,
      leads: activeLeads,
      campaigns: payload.campaigns || [],
      auditItems: payload.audit_items || [],
      customDomainVerified: isDomainVerified,
      rankPosition: company.rank_position,
    });

    const growthPayload = toGrowthScorePayload(result);

    res.json({
      success: true,
      growthScore: growthPayload,
      telemetry: result.telemetry,
      status: result.status,
      statusLabel: result.statusLabel,
      insufficientDataReason: result.insufficientDataReason,
      availablePillarsCount: result.availablePillarsCount,
      totalPillarsCount: result.totalPillarsCount,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Explicitly trigger recalculation and save snapshot
app.post('/api/companies/:id/growth-score/recalculate', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const payload: any = (await getCompanyDataPayload(id)) || {};
    const [dbReviews, dbPosts, dbLeads, dbDomains, latestObs] = await Promise.all([
      getCompanyReviews(id).catch(() => []),
      getCompanyPosts(id).catch(() => []),
      getAllLeads(id).catch(() => []),
      getCustomDomainsByCompany(id).catch(() => []),
      getLatestKeywordObservations(id).catch(() => []),
    ]);

    const activeReviews = dbReviews;
    const activePosts = dbPosts;
    const activeLeads = dbLeads;
    const isDomainVerified = dbDomains.some((d: any) => d.status === 'verified');

    const result = calculateGrowthIntelligenceScore({
      businessProfile: payload.business,
      reviews: activeReviews,
      rankObservations: latestObs as any,
      keywordRanks: payload.keywords || [],
      contentPosts: activePosts,
      leads: activeLeads,
      campaigns: payload.campaigns || [],
      auditItems: payload.audit_items || [],
      customDomainVerified: isDomainVerified,
      rankPosition: company.rank_position,
    });

    const growthPayload = toGrowthScorePayload(result);

    // Persist updated score into company data payload
    payload.growth_score = growthPayload;
    await saveCompanyDataPayload(id, payload);

    res.json({
      success: true,
      growthScore: growthPayload,
      telemetry: result.telemetry,
      status: result.status,
      statusLabel: result.statusLabel,
      insufficientDataReason: result.insufficientDataReason,
      availablePillarsCount: result.availablePillarsCount,
      totalPillarsCount: result.totalPillarsCount,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// AI Grounded Executive Summary (Strict evidence-grounded summarization)
app.get('/api/companies/:id/ai/executive-summary', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const payload: any = (await getCompanyDataPayload(id)) || {};
    const [dbReviews, dbPosts, dbLeads, dbDomains, latestObs, latestCompetitors] = await Promise.all([
      getCompanyReviews(id).catch(() => []),
      getCompanyPosts(id).catch(() => []),
      getAllLeads(id).catch(() => []),
      getCustomDomainsByCompany(id).catch(() => []),
      getLatestKeywordObservations(id).catch(() => []),
      getLatestCompetitorObservations(id).catch(() => []),
    ]);

    const activeReviews = dbReviews;
    const activePosts = dbPosts;
    const activeLeads = dbLeads;
    const isDomainVerified = dbDomains.some((d: any) => d.status === 'verified');

    const calculatedGrowthScore = calculateGrowthIntelligenceScore({
      businessProfile: payload.business,
      reviews: activeReviews,
      rankObservations: latestObs as any,
      keywordRanks: payload.keywords || [],
      contentPosts: activePosts,
      leads: activeLeads,
      campaigns: payload.campaigns || [],
      auditItems: payload.audit_items || [],
      customDomainVerified: isDomainVerified,
      rankPosition: company.rank_position,
    });

    const isDemoMode = Boolean(payload.isDemoMode || company.name?.includes('Demo'));

    const evidence = buildStructuredEvidence({
      businessProfile: payload.business || {
        id: company.id,
        name: company.name,
        category: company.category,
        city: company.city,
        connectedAccounts: {
          googleBusiness: Boolean(company.google_place_id),
        },
      },
      reviews: activeReviews,
      posts: activePosts,
      leads: activeLeads,
      rankObservations: latestObs,
      competitors: payload.competitors || latestCompetitors,
      customDomainVerified: isDomainVerified,
      growthScore: toGrowthScorePayload(calculatedGrowthScore),
      isDemoMode,
    });

    // Try AI generation with grounded prompt
    const prompt = buildEvidenceGroundedPrompt(
      company.name,
      company.city || '',
      company.category || '',
      evidence
    );

    const aiText = await safeGenerateContent({
      prompt,
      responseMimeType: 'application/json',
    });

    if (aiText) {
      try {
        const parsed = JSON.parse(aiText);
        if (parsed.headline && parsed.summary) {
          const overallStatus = isDemoMode
            ? 'DEMO'
            : evidence.some((e) => e.status === 'VERIFIED')
            ? 'VERIFIED'
            : evidence.some((e) => e.status === 'CALCULATED')
            ? 'CALCULATED'
            : 'UNAVAILABLE';

          res.json({
            success: true,
            headline: parsed.headline,
            summary: parsed.summary,
            keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
            evidence,
            overallStatus,
            source: 'Gemini AI (Evidence-Grounded)',
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } catch {
        // Fall back to deterministic grounded generator
      }
    }

    // Deterministic fallback
    const result = generateDeterministicSummary(company.name, company.city || '', evidence);
    res.json({
      success: true,
      ...result,
      source: 'Deterministic Grounded Engine',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ==================== REVENUE ATTRIBUTION & LIFECYCLE ENGINE ==================== //

// GET /api/companies/:id/revenue-attribution - Real provider-verified revenue attribution
app.get('/api/companies/:id/revenue-attribution', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company workspace not found' });
      return;
    }

    // Strict Tenant Isolation: Only owner or platform_admin can access
    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    // Fetch verified CRM leads and provider-verified invoices for this isolated tenant
    const [leads, invoices, payload] = await Promise.all([
      getAllLeads(id).catch(() => []),
      getInvoicesByCompany(id).catch(() => []),
      getCompanyDataPayload(id).catch(() => null),
    ]);

    // Extract optional verified marketing cost/spend data if available in company payload
    const campaigns = (payload as any)?.campaigns || [];
    const costBySource: Partial<Record<string, number | null>> = {};
    let totalCost: number | null = null;

    if (campaigns.length > 0) {
      let sumBudget = 0;
      let hasValidBudget = false;
      for (const camp of campaigns) {
        if (typeof camp.budget === 'number' && camp.budget > 0) {
          sumBudget += camp.budget;
          hasValidBudget = true;
          if (camp.channels && Array.isArray(camp.channels)) {
            for (const ch of camp.channels) {
              const normSrc = normalizeSource(ch);
              costBySource[normSrc] = (costBySource[normSrc] || 0) + (camp.budget / camp.channels.length);
            }
          }
        }
      }
      if (hasValidBudget) {
        totalCost = sumBudget;
      }
    }

    const attribution = calculateRevenueAttribution({
      companyId: id,
      leads,
      invoices,
      costBySource: costBySource as any,
      totalCost,
    });

    res.json({
      success: true,
      attribution,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/revenue-attribution - Retrieve attribution for current user's company
app.get('/api/revenue-attribution', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const targetCompanyId = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, targetCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const effectiveCompanyId = resolved.companyId;

    const [leads, invoices] = await Promise.all([
      getAllLeads(effectiveCompanyId).catch(() => []),
      getInvoicesByCompany(effectiveCompanyId).catch(() => []),
    ]);

    const attribution = calculateRevenueAttribution({
      companyId: effectiveCompanyId,
      leads,
      invoices,
    });

    res.json({
      success: true,
      attribution,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ==================== COMPANY BRAND ASSETS APIS ==================== //

// Upload new brand asset (logo or business photo)
app.post('/api/companies/:id/assets', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    try {
      await runAssetUpload(req, res);
    } catch {
      // response already dispatched inside runAssetUpload on multer validation error
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file uploaded' });
      return;
    }

    const rawType = (req.body?.asset_type || 'photo').toString().toLowerCase().trim();
    const assetType: 'logo' | 'photo' = rawType === 'logo' ? 'logo' : 'photo';
    const label = req.body?.label ? String(req.body.label).trim() : (req.file.originalname || null);

    const safeCompanyId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const assetUrl = `/uploads/${safeCompanyId}/${req.file.filename}`;

    const asset = await createCompanyAsset(id, assetType, assetUrl, label);

    res.status(201).json({
      success: true,
      asset,
      message: `${assetType === 'logo' ? 'Brand logo' : 'Business photo'} uploaded successfully`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// List all brand assets for a company
app.get('/api/companies/:id/assets', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const assets = await getCompanyAssets(id);
    res.json({ success: true, assets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Delete a brand asset
app.delete('/api/companies/:id/assets/:assetId', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id, assetId } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const asset = await getCompanyAssetById(assetId);
    if (!asset || asset.company_id !== id) {
      res.status(404).json({ success: false, error: 'Asset not found for this company' });
      return;
    }

    // Delete local file from disk if present
    if (asset.url && asset.url.startsWith('/uploads/')) {
      const relPath = asset.url.replace(/^\//, '');
      const filePath = path.join(process.cwd(), relPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fErr: any) {
          console.warn('[Asset Delete] File unlink error:', fErr?.message);
        }
      }
    }

    await deleteCompanyAsset(assetId);
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Real Google Business Profile & Places API data sync with 6-hour caching
app.get('/api/companies/:id/google-profile', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const integration = await getCompanyIntegration(id, 'google_business');
    const placeId = (integration?.credentials?.placeId || '').trim();
    const apiKey = (integration?.credentials?.apiKey || '').trim();

    if (!placeId || !apiKey) {
      res.json({
        success: true,
        configured: false,
        status: 'PROVIDER_NOT_CONFIGURED',
        hasPlaceId: Boolean(placeId),
        hasApiKey: Boolean(apiKey),
        message: 'Google Places API integration not configured for this tenant. Provide Place ID and API key in Integrations tab.',
      });
      return;
    }

    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
    const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';
    const cached = await getGoogleProfileCache(id);

    if (!forceRefresh && cached && cached.place_id === placeId) {
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      if (cacheAge < CACHE_TTL_MS) {
        res.json({
          success: true,
          configured: true,
          cached: true,
          cachedAt: cached.cached_at,
          data: cached.data,
        });
        return;
      }
    }

    // Call Google Places Details API
    const gUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    gUrl.searchParams.set('place_id', placeId);
    gUrl.searchParams.set('key', apiKey);
    gUrl.searchParams.set(
      'fields',
      'name,rating,user_ratings_total,opening_hours,formatted_phone_number,international_phone_number,formatted_address,website,url,reviews,photos,business_status'
    );

    try {
      const gRes = await fetch(gUrl.toString(), { signal: AbortSignal.timeout(9000) });
      const gData = await gRes.json();

      if (gData.status === 'OK' && gData.result) {
        const result = gData.result;
        const profileData = {
          place_id: placeId,
          name: result.name,
          rating: typeof result.rating === 'number' ? result.rating : null,
          user_ratings_total: typeof result.user_ratings_total === 'number' ? result.user_ratings_total : 0,
          formatted_phone_number: result.formatted_phone_number || result.international_phone_number || null,
          formatted_address: result.formatted_address || null,
          website: result.website || null,
          url: result.url || null,
          opening_hours: result.opening_hours
            ? {
                open_now: result.opening_hours.open_now,
                weekday_text: result.opening_hours.weekday_text || [],
                periods: result.opening_hours.periods || [],
              }
            : null,
          business_status: result.business_status || 'OPERATIONAL',
          photos_count: Array.isArray(result.photos) ? result.photos.length : 0,
          photos: Array.isArray(result.photos)
            ? result.photos.slice(0, 10).map((p: any) => ({
                photo_reference: p.photo_reference,
                width: p.width,
                height: p.height,
              }))
            : [],
          reviews: Array.isArray(result.reviews)
            ? result.reviews.slice(0, 10).map((r: any) => ({
                author_name: r.author_name,
                author_url: r.author_url,
                profile_photo_url: r.profile_photo_url,
                rating: r.rating,
                text: r.text,
                relative_time_description: r.relative_time_description,
                time: r.time,
              }))
            : [],
        };

        await saveGoogleProfileCache(id, placeId, profileData);

        // Ingest any real reviews into tenant's reviews table
        let newReviewsSynced = 0;
        if (profileData.reviews && profileData.reviews.length > 0) {
          try {
            newReviewsSynced = await syncGoogleReviewsToDatabase(id, profileData.reviews);
          } catch (syncErr: any) {
            console.warn('[google-profile] Failed to sync reviews to database:', syncErr?.message);
          }
        }

        res.json({
          success: true,
          configured: true,
          cached: false,
          cachedAt: new Date().toISOString(),
          newReviewsSynced,
          data: profileData,
        });
        return;
      }

      // If Google returned an error status but we have a cached copy
      if (cached && cached.place_id === placeId) {
        res.json({
          success: true,
          configured: true,
          cached: true,
          cachedAt: cached.cached_at,
          warning: `Google Places API returned ${gData.status}. Serving previously cached data.`,
          data: cached.data,
        });
        return;
      }

      res.status(400).json({
        success: false,
        configured: true,
        error: `Google Places API error (${gData.status}): ${gData.error_message || 'Please check Place ID and API key permissions'}`,
      });
    } catch (apiErr: any) {
      if (cached && cached.place_id === placeId) {
        res.json({
          success: true,
          configured: true,
          cached: true,
          cachedAt: cached.cached_at,
          warning: `Google Places API request timed out. Serving previously cached data.`,
          data: cached.data,
        });
        return;
      }
      res.status(502).json({
        success: false,
        configured: true,
        error: `Failed to reach Google Places API: ${apiErr?.message || 'Network timeout'}`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Force sync and refresh Google Profile + auto-ingest reviews into reviews table
app.post('/api/companies/:id/google-profile/sync', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const integration = await getCompanyIntegration(id, 'google_business');
    const placeId = (integration?.credentials?.placeId || '').trim();
    const apiKey = (integration?.credentials?.apiKey || '').trim();

    if (!placeId || !apiKey) {
      res.status(400).json({
        success: false,
        configured: false,
        status: 'PROVIDER_NOT_CONFIGURED',
        error: 'Google Places credentials not configured for this tenant. Please add Place ID and API Key in Integrations.',
      });
      return;
    }

    const gUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    gUrl.searchParams.set('place_id', placeId);
    gUrl.searchParams.set('key', apiKey);
    gUrl.searchParams.set(
      'fields',
      'name,rating,user_ratings_total,opening_hours,formatted_phone_number,international_phone_number,formatted_address,website,url,reviews,photos,business_status'
    );

    const gRes = await fetch(gUrl.toString(), { signal: AbortSignal.timeout(10000) });
    const gData = await gRes.json();

    if (gData.status !== 'OK' || !gData.result) {
      res.status(400).json({
        success: false,
        error: `Google Places API returned ${gData.status}: ${gData.error_message || 'Verification failed'}`,
      });
      return;
    }

    const result = gData.result;
    const profileData = {
      place_id: placeId,
      name: result.name,
      rating: typeof result.rating === 'number' ? result.rating : null,
      user_ratings_total: typeof result.user_ratings_total === 'number' ? result.user_ratings_total : 0,
      formatted_phone_number: result.formatted_phone_number || result.international_phone_number || null,
      formatted_address: result.formatted_address || null,
      website: result.website || null,
      url: result.url || null,
      opening_hours: result.opening_hours
        ? {
            open_now: result.opening_hours.open_now,
            weekday_text: result.opening_hours.weekday_text || [],
            periods: result.opening_hours.periods || [],
          }
        : null,
      business_status: result.business_status || 'OPERATIONAL',
      photos_count: Array.isArray(result.photos) ? result.photos.length : 0,
      photos: Array.isArray(result.photos)
        ? result.photos.slice(0, 10).map((p: any) => ({
            photo_reference: p.photo_reference,
            width: p.width,
            height: p.height,
          }))
        : [],
      reviews: Array.isArray(result.reviews)
        ? result.reviews.slice(0, 10).map((r: any) => ({
            author_name: r.author_name,
            author_url: r.author_url,
            profile_photo_url: r.profile_photo_url,
            rating: r.rating,
            text: r.text,
            relative_time_description: r.relative_time_description,
            time: r.time,
          }))
        : [],
    };

    await saveGoogleProfileCache(id, placeId, profileData);

    let syncedReviewsCount = 0;
    if (profileData.reviews && profileData.reviews.length > 0) {
      try {
        syncedReviewsCount = await syncGoogleReviewsToDatabase(id, profileData.reviews);
      } catch (err: any) {
        console.warn('[google-profile-sync] review sync notice:', err?.message);
      }
    }

    res.json({
      success: true,
      message: `Google Business Profile synced successfully! (${syncedReviewsCount} new reviews ingested)`,
      syncedReviewsCount,
      data: profileData,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Sync failed' });
  }
});

// ---------------- LOCAL SEO & GOOGLE MAPS RANK RADAR ENGINE ---------------- //

async function performRankScan(
  company: any,
  keyword: string,
  city?: string,
  rankCreds?: any
): Promise<{
  rank: number | null;
  previousRank: number | null;
  diff: number | null;
  searchVolume: string | null;
  dataClassification: 'LIVE' | 'VERIFIED' | 'UNAVAILABLE' | 'FAILED' | 'PARTIAL';
  provider: string;
  observations: RankObservation[];
  topCompetitors: Array<{ name: string; rating: number; reviewsCount: number; position: number }>;
  gridRankings: Record<string, number>;
  evidenceNotes: string;
  recommendation?: string;
}> {
  const targetCity = (city || company.city || '').trim();
  const centerCoords = resolveCenterCoordinates(targetCity, company.latitude, company.longitude);

  if (!centerCoords) {
    const locErr: any = new Error(`LOCATION_NOT_RESOLVED: Unable to resolve geographic coordinates for city "${targetCity || 'Unknown'}". Please specify a known metropolitan center or provide latitude/longitude.`);
    locErr.statusCode = 422;
    locErr.code = 'LOCATION_NOT_RESOLVED';
    throw locErr;
  }

  const coordinates = generate3x3GridCoordinates(centerCoords.lat, centerCoords.lng, 3.5);

  const provider = resolveRankProvider(rankCreds);

  const context: RankScanContext = {
    companyId: company.id,
    businessName: company.name,
    placeId: company.google_place_id || rankCreds?.placeId,
    keyword: keyword.trim(),
    city: targetCity,
    centerLat: centerCoords.lat,
    centerLng: centerCoords.lng,
    coordinates,
    radiusKm: 3.5,
  };

  const scanResult = await provider.scanRankGrid(context, rankCreds);

  // Persist all 9 real observations to relational table
  if (scanResult.observations && scanResult.observations.length > 0) {
    await saveRankObservations(company.id,keyword,scanResult.observations);
  }

  // Calculate historical trend strictly from stored DB observations
  const trend = await calculateHistoricalTrend(company.id, keyword, scanResult.overallRank);

  // Map 9 node observations to gridRankings dictionary for frontend visualizer
  const gridRankings: Record<string, number> = {};
  scanResult.observations.forEach((obs) => {
    gridRankings[`node_${obs.gridIndex}`] = obs.position || 0;
    // Backwards-compatible aliases for legacy 4 corners
    if (obs.gridIndex === 0) gridRankings.vashi = obs.position || 0;
    if (obs.gridIndex === 6) gridRankings.nerul = obs.position || 0;
    if (obs.gridIndex === 2) gridRankings.sanpada = obs.position || 0;
    if (obs.gridIndex === 8) gridRankings.belapur = obs.position || 0;
  });

  return {
    rank: scanResult.overallRank,
    previousRank: trend.previousRank,
    diff: trend.diff,
    searchVolume: scanResult.searchVolume,
    dataClassification: scanResult.status,
    provider: scanResult.provider,
    observations: scanResult.observations,
    topCompetitors: scanResult.topCompetitors,
    gridRankings,
    evidenceNotes: scanResult.evidenceNotes,
    recommendation:
      scanResult.status === 'UNAVAILABLE'
        ? 'No verified SERP ranking provider is configured. Connect DataForSEO or SerpAPI in Integrations to track live 3-Pack rank positions across real coordinates.'
        : scanResult.overallRank && scanResult.overallRank <= 3
        ? `Ranking in Google 3-Pack (#${scanResult.overallRank}). Maintain position with active photo uploads and review velocity.`
        : `Rank position #${scanResult.overallRank ?? 'unranked'}. Optimize business category signals and local review keywords.`,
  };
}

// Live Keyword Rank Scan endpoint
app.post('/api/companies/:id/rank-radar/scan', validateBody(rankScanSchema), async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { keyword, city } = req.body;

    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    // Check for configured local_seo_serp, dataforseo, or serpapi integration
    const serpIntegration =
      (await getCompanyIntegration(id, 'local_seo_serp')) ||
      (await getCompanyIntegration(id, 'dataforseo')) ||
      (await getCompanyIntegration(id, 'serpapi'));

    const scanResult = await performRankScan(company, keyword, city, serpIntegration?.credentials);

    // Persist into company profile payload
    const payload = (await getCompanyDataPayload(id)) || { keywords: [], competitors: [] };
    if (!Array.isArray(payload.keywords)) payload.keywords = [];
    if (!Array.isArray(payload.competitors)) payload.competitors = [];

    const existingIndex = payload.keywords.findIndex(
      (k: any) => (k.keyword || '').toLowerCase().trim() === keyword.toLowerCase().trim()
    );

    const newKeywordEntry = {
      id: existingIndex >= 0 ? payload.keywords[existingIndex].id : `kw_${crypto.randomUUID().slice(0, 8)}`,
      keyword: keyword.trim(),
      rank: scanResult.rank,
      previousRank: scanResult.previousRank,
      diff: scanResult.diff,
      searchVolume: scanResult.searchVolume,
      dataClassification: scanResult.dataClassification,
      provider: scanResult.provider,
      lastScannedAt: new Date().toISOString(),
      observations: scanResult.observations,
      topCompetitors: scanResult.topCompetitors,
      gridRankings: scanResult.gridRankings,
      evidenceNotes: scanResult.evidenceNotes,
    };

    if (existingIndex >= 0) {
      payload.keywords[existingIndex] = newKeywordEntry;
    } else {
      payload.keywords.unshift(newKeywordEntry);
    }

    // Discovered SERP names remain candidates on the keyword result. Tracking a
    // competitor is a separate explicit command with its own source classification.

    const previousVersion=companyDataVersion(payload);
    if(!await saveCompanyDataPayload(id,payload))throw new Error('Rank profile save unconfirmed');

    res.json({
      success: true,companyId:id,previousVersion,version:companyDataVersion(payload),
      keyword: newKeywordEntry,
      keywords: payload.keywords,
      observations: scanResult.observations,
      recommendation: scanResult.recommendation,
    });
  } catch (err: any) {
    const status=err instanceof WorkspaceConflict?409:err?.code==='LOCATION_NOT_RESOLVED'?422:503;
    res.status(status).json({success:false,error:status===409?'Workspace changed. Reload before another scan.':'Rank scan unavailable or save unconfirmed'});
  }
});

// Refresh all tracked keywords for a company
app.post('/api/companies/:id/rank-radar/refresh-all', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const company = await getCompanyById(id);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const payload = (await getCompanyDataPayload(id)) || { keywords: [], competitors: [] };
    if (!Array.isArray(payload.keywords) || payload.keywords.length === 0) {
      res.json({ success: true, message: 'No keywords currently tracked to refresh', keywords: [] });
      return;
    }

    const serpIntegration =
      (await getCompanyIntegration(id, 'local_seo_serp')) ||
      (await getCompanyIntegration(id, 'dataforseo')) ||
      (await getCompanyIntegration(id, 'serpapi'));

    if(payload.keywords.length>25||payload.keywords.some((item:any)=>typeof item.keyword!=='string'||!item.keyword.trim()||item.keyword.length>191)){res.status(400).json({success:false,error:'Refresh supports at most 25 valid keywords per request'});return;}
    const updatedKeywords: any[] = [];

    for (const kw of payload.keywords) {
      const scanResult = await performRankScan(company, kw.keyword, company.city, serpIntegration?.credentials);
      updatedKeywords.push({
        ...kw,
        previousRank: scanResult.previousRank,
        diff: scanResult.diff,
        rank: scanResult.rank,
        searchVolume: scanResult.searchVolume,
        dataClassification: scanResult.dataClassification,
        provider: scanResult.provider,
        lastScannedAt: new Date().toISOString(),
        observations: scanResult.observations,
        topCompetitors: scanResult.topCompetitors,
        gridRankings: scanResult.gridRankings,
        evidenceNotes: scanResult.evidenceNotes,
      });
    }

    payload.keywords = updatedKeywords;
    const previousVersion=companyDataVersion(payload);
    if(!await saveCompanyDataPayload(id,payload))throw new Error('Rank profile save unconfirmed');

    res.json({
      success: true,companyId:id,previousVersion,version:companyDataVersion(payload),
      message: `Refreshed rank radar for ${updatedKeywords.length} keywords.`,
      keywords: payload.keywords,
    });
  } catch (err: any) {
    res.status(err instanceof WorkspaceConflict?409:503).json({success:false,error:'Rank refresh unavailable or save unconfirmed'});
  }
});

registerObservationHistoryRoutes(app,{auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,ranks:getKeywordObservationHistory,competitors:getCompetitorObservationHistory});

registerCompetitorRoutes(app,{auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,
 read:async(company)=>{const payload=await getCompanyDataPayload(company);return payload?.competitors||[];},
 mutate:async(company,command)=>{const pool=await getDbPool();if(!pool)throw new Error('Durable competitor storage unavailable');return mutateCompetitorSql(pool,company,command);},
 fetch:async(companyId,competitor)=>{
  const company=await getCompanyById(companyId);if(!company)throw new Error('Workspace unavailable');
  const places=await getCompanyIntegration(companyId,'google_business');
  const serp=(await getCompanyIntegration(companyId,'serpapi'))||(await getCompanyIntegration(companyId,'local_seo_serp'));
  const provider=resolveCompetitorProvider(places?.credentials,serp?.credentials);
  return provider.fetchCompetitorObservation({companyId,competitorId:competitor.id,name:competitor.name,city:company.city,placeId:competitor.placeId||null},provider.providerName==='google_places'?places?.credentials:serp?.credentials);
 }
});

// ---------------- EVIDENCE-BASED AUDIT ENGINE & ACTION REMEDIATION ---------------- //

registerAuditRoutes(app,{auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,read:async(company)=>{
 const payload:any=await getCompanyDataPayload(company);
 const [reviews,posts,leads,domains,observations]=await Promise.all([getCompanyReviews(company),getCompanyPosts(company),getAllLeads(company),getCustomDomainsByCompany(company),getLatestKeywordObservations(company)]);
 return generateEvidenceBasedAudit({companyId:company,businessProfile:payload?.business,reviews,contentPosts:posts,leads,rankObservations:observations as any,campaigns:payload?.campaigns||[],customDomainVerified:domains.some((domain:any)=>domain.status==='verified')});
}});

// ---------------- INTEGRATIONS MANAGEMENT & LIVE CREDENTIAL VERIFICATION ---------------- //

function maskSecret(val: string): string {
  if (!val || typeof val !== 'string') return '';
  if (val.length <= 6) return '••••••';
  return val.slice(0, 4) + '••••' + val.slice(-4);
}

const maskCredentialsObj=maskIntegrationCredentials;

// Fetch configured integrations for a company
registerIntegrationMetadataRoutes(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,getCompanyIntegrations,isEmailServiceConfigured});

// Test integration credentials in real time against provider API
app.post('/api/integrations/test', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json(publicIntegrationCheck({ success: false, error: 'Authentication required to test integrations' }));
      return;
    }

    const {provider,credentials,companyId}=await resolveIntegrationInput(req.body,user,{access:verifyCompanyWorkspaceAccess,read:getCompanyIntegration});
    res.set('Cache-Control','no-store');

    if (provider === 'telegram_bot') {
      const botToken = credentials.botToken?.trim();
      if (!botToken) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Telegram Bot Token is required' }));
        return;
      }

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
          signal: AbortSignal.timeout(6000),
        });
        const tgData = await tgRes.json();
        if (tgRes.ok && tgData.ok) {
          res.json(publicIntegrationCheck({
            success: true,
            message: `Verified! Connected to Telegram Bot: @${tgData.result.username} (${tgData.result.first_name})`,
            details: { username: tgData.result.username, name: tgData.result.first_name, canJoinGroups: tgData.result.can_join_groups },
          }));
          return;
        } else {
          res.status(400).json(publicIntegrationCheck({
            success: false,
            error: tgData.description || 'Invalid Telegram Bot Token (HTTP 401)',
          }));
          return;
        }
      } catch (tgErr: any) {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: `Telegram connection error: ${tgErr?.message || 'Timeout connecting to Telegram API'}`,
        }));
        return;
      }
    }

    if (provider === 'whatsapp_cloud') {
      const phoneNumberId = credentials.phoneNumberId?.trim();
      const accessToken = credentials.accessToken?.trim();
      if (!phoneNumberId || !accessToken) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Phone Number ID and Meta Access Token are required' }));
        return;
      }

      try {
        const waRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(6000),
        });
        const waData = await waRes.json();
        if (waRes.ok && waData.id) {
          res.json(publicIntegrationCheck({
            success: true,
            message: `Verified! WhatsApp Phone Number: ${waData.display_phone_number || phoneNumberId} (${waData.verified_name || 'Verified Account'})`,
            details: waData,
          }));
          return;
        } else {
          res.status(400).json(publicIntegrationCheck({
            success: false,
            error: waData.error?.message || 'Meta Cloud API rejected credentials',
          }));
          return;
        }
      } catch (waErr: any) {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: `WhatsApp connection error: ${waErr?.message || 'Network timeout'}`,
        }));
        return;
      }
    }

    if (provider === 'google_business') {
      const placeId = credentials.placeId?.trim();
      const apiKey = credentials.apiKey?.trim();
      if (!placeId) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Google Place ID is required' }));
        return;
      }

      if (apiKey) {
        try {
          const gRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${encodeURIComponent(apiKey)}`, {
            signal: AbortSignal.timeout(6000),
          });
          const gData = await gRes.json();
          if (gData.status === 'OK') {
            res.json(publicIntegrationCheck({
              success: true,
              message: `Verified! Connected to Google Place: ${gData.result?.name} (${gData.result?.formatted_address})`,
              details: { name: gData.result?.name, address: gData.result?.formatted_address, rating: gData.result?.rating },
            }));
            return;
          } else {
            res.status(400).json(publicIntegrationCheck({
              success: false,
              error: `Google Places API Error: ${gData.status} - ${gData.error_message || 'Verify Place ID and API key'}`,
            }));
            return;
          }
        } catch (gErr: any) {
          res.status(400).json(publicIntegrationCheck({ success: false, error: `Google API timeout: ${gErr?.message}` }));
          return;
        }
      } else {
        // Syntax validation if API key not entered yet
        if (placeId.length >= 10) {
          res.json(publicIntegrationCheck({
            success: false,status:'NOT_VERIFIED',
            message: `Valid Place ID format (${placeId.slice(0, 8)}...). Saved for Google 3-Pack and Maps search indexing.`,
          }));
          return;
        } else {
          res.status(400).json(publicIntegrationCheck({ success: false, error: 'Invalid Google Place ID format. Should be standard Place ID string.' }));
          return;
        }
      }
    }

    if (provider === 'google_gmb_oauth') {
      const oauthToken = credentials.oauthToken?.trim();
      const accountId = credentials.accountId?.trim();
      if (!oauthToken || !accountId) {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: 'Google Business Profile OAuth requires both Account ID and an active OAuth2 Bearer Token.',
        }));
        return;
      }

      try {
        const gmbRes = await fetch(`https://mybusinessaccountmanagement.googleapis.com/v1/${encodeURIComponent(accountId)}`, {
          headers: { Authorization: `Bearer ${oauthToken}` },
          signal: AbortSignal.timeout(6000),
        });
        const gmbData = await gmbRes.json();
        if (gmbRes.ok) {
          res.json(publicIntegrationCheck({
            success: true,
            message: `Verified! Connected to Google Business Account: ${gmbData.accountName || accountId}`,
            details: gmbData,
          }));
          return;
        } else {
          res.status(400).json(publicIntegrationCheck({
            success: false,
            error: gmbData.error?.message || 'Google Business Profile OAuth token rejected or expired.',
          }));
          return;
        }
      } catch (gmbErr: any) {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: `Google Business Profile API connection error: ${gmbErr?.message}`,
        }));
        return;
      }
    }

    if (provider === 'google_search_console') {
      const siteUrl = credentials.siteUrl?.trim();
      const clientEmail = credentials.clientEmail?.trim();
      const privateKey = credentials.privateKey?.trim();

      if (!siteUrl) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Verified Property URL is required.' }));
        return;
      }

      if (!clientEmail || !privateKey) {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: 'Google Search Console integration requires Service Account Client Email and Private Key.',
        }));
        return;
      }

      res.json(publicIntegrationCheck({
        success: false,status:'NOT_VERIFIED',
        message: `Service Account credentials formatted for ${siteUrl}. Search Console property verification registered.`,
      }));
      return;
    }

    if (provider === 'local_seo_serp') {
      const pType = (credentials.provider || 'dataforseo').toLowerCase().trim();
      const login = credentials.login?.trim();
      const password = credentials.password?.trim();

      if (!login) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Login / API Key is required for Local SEO rank tracking' }));
        return;
      }

      if (pType.includes('serpapi')) {
        try {
          const sRes = await fetch(`https://serpapi.com/account?api_key=${encodeURIComponent(login)}`, {
            signal: AbortSignal.timeout(6000),
          });
          const sData = await sRes.json();
          if (sRes.ok && sData.account_id) {
            res.json(publicIntegrationCheck({
              success: true,
              message: `Verified! SerpAPI connected (${sData.total_searches_left ?? 'Active'} searches left).`,
              details: { searchesLeft: sData.total_searches_left, plan: sData.plan_name },
            }));
            return;
          } else {
            res.status(400).json(publicIntegrationCheck({
              success: false,
              error: sData.error || 'SerpAPI key was rejected.',
            }));
            return;
          }
        } catch (sErr: any) {
          res.status(400).json(publicIntegrationCheck({ success: false, error: `SerpAPI connection error: ${sErr?.message}` }));
          return;
        }
      } else {
        // DataForSEO test
        if (!password) {
          res.status(400).json(publicIntegrationCheck({ success: false, error: 'DataForSEO requires both API Login and API Password' }));
          return;
        }

        try {
          const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
          const dRes = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(6000),
          });
          const dData = await dRes.json();
          if (dRes.ok && dData?.status_code === 20000) {
            res.json(publicIntegrationCheck({
              success: true,
              message: `Verified! DataForSEO account connected (Balance: $${dData.tasks?.[0]?.result?.[0]?.money ?? 0}).`,
              details: dData.tasks?.[0]?.result?.[0],
            }));
            return;
          } else {
            res.status(400).json(publicIntegrationCheck({
              success: false,
              error: dData?.status_message || 'DataForSEO credentials rejected.',
            }));
            return;
          }
        } catch (dErr: any) {
          res.status(400).json(publicIntegrationCheck({ success: false, error: `DataForSEO connection error: ${dErr?.message}` }));
          return;
        }
      }
    }

    if (provider === 'meta_social') {
      const accessToken = credentials.accessToken?.trim();
      if (!accessToken) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Meta Access Token is required' }));
        return;
      }

      try {
        const metaRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}`, {
          signal: AbortSignal.timeout(6000),
        });
        const metaData = await metaRes.json();
        if (metaRes.ok && metaData.id) {
          res.json(publicIntegrationCheck({
            success: true,
            message: `Verified! Connected to Meta Account: ${metaData.name || 'Meta App'} (ID: ${metaData.id})`,
            details: metaData,
          }));
          return;
        } else {
          res.status(400).json(publicIntegrationCheck({
            success: false,
            error: metaData.error?.message || 'Meta Graph API token rejected',
          }));
          return;
        }
      } catch (metaErr: any) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: `Meta API error: ${metaErr?.message}` }));
        return;
      }
    }

    if (provider === 'razorpay_gateway') {
      const keyId = credentials.keyId?.trim();
      const keySecret = credentials.keySecret?.trim();
      if (!keyId) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Razorpay Key ID is required' }));
        return;
      }

      if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
        res.status(400).json(publicIntegrationCheck({ success: false, error: 'Key ID must start with rzp_test_ or rzp_live_' }));
        return;
      }

      if (keySecret) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const rzpRes = await fetch('https://api.razorpay.com/v1/customers?count=1', {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(6000),
          });
          if (rzpRes.ok) {
            res.json(publicIntegrationCheck({
              success: true,
              message: `Verified! Razorpay API Gateway active (${keyId.startsWith('rzp_live') ? 'LIVE Mode' : 'TEST Sandbox Mode'})`,
            }));
            return;
          } else {
            res.status(400).json(publicIntegrationCheck({ success: false, error: 'Razorpay authentication failed: Invalid Key ID or Key Secret' }));
            return;
          }
        } catch (rzpErr: any) {
          res.status(400).json(publicIntegrationCheck({ success: false, error: `Razorpay connection error: ${rzpErr?.message}` }));
          return;
        }
      } else {
        res.json(publicIntegrationCheck({ success: true, message: `Key ID format validated (${keyId}). Ready to receive orders.` }));
        return;
      }
    }

    if (provider === 'meta_ads') {
      const accessToken = credentials.accessToken?.trim() || credentials.access_token?.trim();
      const adAccountId = credentials.adAccountId?.trim() || credentials.ad_account_id?.trim();

      if (!accessToken || !adAccountId) {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: 'Meta Ads testing requires both Ad Account ID and Meta Access Token.',
        }));
        return;
      }

      const sanitizedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/${sanitizedAccountId}?fields=name,account_status,currency,amount_spent,timezone_name&access_token=${encodeURIComponent(accessToken)}`,
          { signal: AbortSignal.timeout(6000) }
        );
        const metaData = await metaRes.json();
        if (metaRes.ok && metaData.id) {
          const statusText = metaData.account_status === 1 ? 'ACTIVE (1)' : `Status Code: ${metaData.account_status}`;
          res.json(publicIntegrationCheck({
            success: true,
            message: `Verified! Connected to Meta Ad Account: ${metaData.name || sanitizedAccountId} (${metaData.currency || 'USD'}, ${statusText})`,
            details: metaData,
          }));
          return;
        } else {
          res.status(400).json(publicIntegrationCheck({
            success: false,
            error: metaData.error?.message || 'Meta Marketing API rejected Ad Account credentials',
          }));
          return;
        }
      } catch (metaErr: any) {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: `Meta Ads API connection error: ${metaErr?.message || 'Network timeout'}`,
        }));
        return;
      }
    }

    if (provider === 'transactional_email') {
      const emailTestResult = await testEmailConnection(credentials);
      if (emailTestResult.success) {
        res.json(publicIntegrationCheck({
          success: true,
          message: emailTestResult.message,
          details: emailTestResult.details,
        }));
      } else {
        res.status(400).json(publicIntegrationCheck({
          success: false,
          error: emailTestResult.message,
        }));
      }
      return;
    }

    if(provider==='website_cname'){res.json(publicIntegrationCheck(await inspectDomainIntegration(companyId,credentials.websiteUrl,{domains:getCustomDomainsByCompany,verify:verifyDomainDns})));return;}

    res.status(400).json(publicIntegrationCheck({ success: false, error: `Unknown provider: ${provider}` }));
  } catch (err: any) {
    res.status(err instanceof IntegrationAccessError?err.status:503).json(publicIntegrationCheck({success:false,error:err instanceof IntegrationAccessError?err.code:'Integration verification unavailable'}));
  }
});

// Live Test Email Dispatch Endpoint
app.post('/api/integrations/email/test-send', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { recipientEmail, companyId } = req.body;
    const targetEmail = (recipientEmail || user.email || '').trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid recipient email address is required.' });
      return;
    }

    if (!isEmailServiceConfigured()) {
      res.status(503).json({
        success: false,
        code: 'EMAIL_SERVICE_NOT_CONFIGURED',
        error: 'Transactional email transport is not configured. Please enter SMTP or API credentials in Integrations or server environment.',
      });
      return;
    }

    const brandName = 'Aaditech Business Growth Architecture';
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 24px; text-align: center;">
      <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">⚡ Live Email Dispatch Verified</h2>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-top: 0;">
        Hello <strong>${user.full_name || 'Administrator'}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
        This is a live transactional verification email sent from your <strong>${brandName}</strong> workspace on <strong>${timestamp} (IST)</strong>.
      </p>
      <div style="background: #0f172a; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px; margin: 20px 0;">
        <span style="color: #34d399; font-weight: bold; font-size: 13px;">Status: Verified & Operational</span>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">All password resets, verification codes, and client notifications will be delivered instantly.</p>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
        Tenant Workspace: <code>${companyId || 'Default'}</code> • User: <code>${user.email}</code>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const sendResult = await sendTransactionalEmail({
      to: targetEmail,
      subject: `✅ Live Verification Email - ${brandName}`,
      html,
      text: `Hello ${user.full_name || 'Administrator'},\n\nThis is a live transactional email test from Aaditech Business Growth Architecture at ${timestamp} (IST).\n\nStatus: Verified & Operational\nRecipient: ${targetEmail}`,
    });

    if (sendResult.success) {
      res.json({
        success: true,
        message: `Test email dispatched successfully to ${targetEmail}! (Provider: ${sendResult.provider})`,
        details: sendResult,
      });
    } else {
      res.status(502).json({
        success: false,
        error: `Failed to deliver test email: ${sendResult.error || 'Provider rejected request'}`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error dispatching test email' });
  }
});

// Save credentials and update integration state for a company
app.post('/api/integrations/save',async(req,res)=>{
 res.set('Cache-Control','no-store');try{
  const user=await getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
  const input=await resolveIntegrationInput(req.body,user,{access:verifyCompanyWorkspaceAccess,read:getCompanyIntegration});
  const saved=await saveCompanyIntegration(input.companyId,input.provider,{status:Object.values(input.credentials).some(Boolean)?'saved':'disconnected',credentials:input.credentials,config:input.config??input.existing?.config??{},last_tested_at:null,last_error:null});
  res.json({success:true,companyId:input.companyId,integration:{id:saved.id,company_id:saved.company_id,provider:saved.provider,status:saved.status,credentials:maskCredentialsObj(saved.credentials),last_tested_at:null,last_error:null}});
 }catch(error){res.status(error instanceof IntegrationAccessError?error.status:503).json({success:false,error:error instanceof IntegrationAccessError?error.code:'Integration save unavailable or unconfirmed'});}
});

// Disconnect / delete integration
app.delete('/api/integrations/:provider',async(req,res)=>{
 res.set('Cache-Control','no-store');try{
  const user=await getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
  const companyId=explicitIntegrationCompany(req.query),provider=req.params.provider;
  if(!/^[a-z][a-z0-9_]{0,63}$/.test(provider)){res.status(400).json({success:false,error:'Invalid provider'});return;}
  const access=await verifyCompanyWorkspaceAccess(user,companyId);if(!access.authorized){res.status(access.status).json({success:false,error:'Integration workspace access denied'});return;}
  const removed=await deleteCompanyIntegration(companyId,provider);res.status(removed?200:404).json({success:removed,companyId,provider,message:removed?'Saved integration removed':'Saved integration not found'});
 }catch(error){res.status(error instanceof IntegrationAccessError?error.status:503).json({success:false,error:error instanceof IntegrationAccessError?error.code:'Integration deletion unavailable or unconfirmed'});}
});

// ---------------- REVIEWS API ENDPOINTS (PER-TENANT MYSQL PERSISTENCE) ---------------- //

// List all reviews for a company
app.get('/api/reviews', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    const reviews = await getCompanyReviews(resolved.companyId);
    res.json({ success: true, companyId: resolved.companyId, reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Create new review (from webhook, sync, or manual client feedback)
app.post('/api/reviews', validateBody(createReviewSchema), async (req, res) => {
  try {
    const { author, rating, content, date, relative_time, sentiment, topic, is_operational_issue, source } = req.body;

    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = (req.body.companyId || req.body.company_id || req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    const ratingNum = rating !== undefined && rating !== null ? Number(rating) : null;
    const review = await createReview({
      company_id: resolved.companyId,
      author,
      rating: ratingNum !== null && !isNaN(ratingNum) ? Math.min(5, Math.max(1, ratingNum)) : (null as any),
      content,
      date: date || null,
      relative_time: relative_time || null,
      sentiment: sentiment || (ratingNum !== null ? (ratingNum >= 4 ? 'positive' : ratingNum === 3 ? 'neutral' : 'negative') : 'neutral'),
      topic: topic || 'Customer Service',
      is_operational_issue: Boolean(is_operational_issue),
      replied: false,
      source: source || 'manual',
    });

    if(!review?.id){res.status(503).json({success:false,error:'Review creation not confirmed'});return;}
    res.status(201).json({ success: true, review });
  } catch (err: any) {
    res.status(503).json({ success: false, error: 'Review creation unavailable' });
  }
});

// Publish / save reply to a review
registerReviewReplyRoutes(app,{validate:validateBody(replyReviewSchema),auth:getAuthUserFromRequest,companyForReview:getReviewCompanyId,access:verifyCompanyWorkspaceAccess,save:updateReviewReply,remove:deleteReview});

// ---------------- CONTENT POSTS API ENDPOINTS (PER-TENANT MYSQL PERSISTENCE) ---------------- //

// List all content posts for a company
app.get(['/api/content-posts', '/api/posts'], async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    const posts = await getCompanyPosts(resolved.companyId);
    res.json({ success: true, companyId: resolved.companyId, posts:posts.map(post=>({...post,sourceVersion:publishingSourceVersion(post)})) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Create new content post in MySQL
app.post(['/api/content-posts', '/api/posts'], validateBody(createPostSchema), async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required to schedule posts' });
      return;
    }

    const {
      title,
      type,
      platforms,
      channel,
      headline,
      caption,
      cta,
      imageUrl,
      image_url,
      videoUrl,
      video_url,
      status,
      scheduledDate,
      scheduled_date,
      scheduledTime,
      scheduled_time,
      timeSlot,
      time_slot,
      hashtags,
      reelScript,
      reel_script,
    } = req.body;

    const requestedCompanyId = (req.body.companyId || req.body.company_id || req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    const newPost = await createContentPost({
      company_id: resolved.companyId,
      campaign_id: req.body.campaign_id || req.body.campaignId || null,
      title: title || 'New Campaign Post',
      type: type || 'offer',
      platforms: Array.isArray(platforms) ? platforms : [channel || 'google'],
      channel: (Array.isArray(platforms) && platforms[0]) || channel || 'google',
      headline: headline || '',
      caption,
      cta: cta || '',
      image_url: image_url || imageUrl || undefined,
      video_url: video_url || videoUrl || undefined,
      status: status || 'scheduled',
      scheduled_date: scheduled_date || scheduledDate || undefined,
      scheduled_time: scheduled_time || scheduledTime || undefined,
      time_slot: time_slot || timeSlot || undefined,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      reel_script: reel_script || reelScript || undefined,
    });

    if(!newPost?.id){res.status(503).json({success:false,error:'Post creation not confirmed'});return;}
    res.status(201).json({ success: true, post: {...newPost,sourceVersion:publishingSourceVersion(newPost)} });
  } catch (err: any) {
    res.status(503).json({ success: false, error: 'Post creation unavailable' });
  }
});

registerContentMutationRoutes(app,{auth:getAuthUserFromRequest,company:getContentPostCompanyId,access:verifyCompanyWorkspaceAccess,remove:deleteContentPost});

// Get immutable publishing audit records and idempotency status for a post
app.get(['/api/content-posts/:id/publishing-history', '/api/posts/:id/publishing-history'], async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const realCompanyId = await getContentPostCompanyId(id);
    if (!realCompanyId) {
      res.status(404).json({ success: false, error: 'Content post not found' });
      return;
    }

    const company = await getCompanyById(realCompanyId);
    if (company && company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to view publishing history' });
      return;
    }

    const records = await getPublishingRecordsByPostId(id);
    res.json({ success: true, records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ==================== CAMPAIGN APIS (INTERNAL vs EXTERNAL AD SEPARATION) ==================== //

registerInternalCampaignRoutes(app,{auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,read:getInternalCampaigns,external:getExternalAdCampaigns,create:createInternalCampaign,update:updateInternalCampaign,remove:deleteInternalCampaign});

registerAdCampaignRoutes(app,{auth:getAuthUserFromRequest,resolve:resolveUserCompanyId,read:getCompanyExternalAdCampaigns,sync:syncExternalAdCampaigns});

// 8. Get content posts bound to an internal campaign
app.get(['/api/companies/:id/campaigns/:campaignId/posts', '/api/campaigns/internal/:campaignId/posts'], async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id, campaignId } = req.params;
    const targetCampaignId = campaignId || id;
    const requestedCompanyId = req.params.id && req.params.campaignId ? req.params.id : (req.query.companyId || req.query.company_id) as string;

    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    const posts = await getCompanyPostsByCampaignId(resolved.companyId, targetCampaignId);
    res.json({
      success: true,
      companyId: resolved.companyId,
      campaignId: targetCampaignId,
      count: posts.length,
      posts,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

app.post(['/api/ai/chat','/api/ai/reply-review','/api/ai/generate-content'],aiRateLimiter,requireAiWorkspace({auth:getAuthUserFromRequest,resolve:resolveUserCompanyId,company:getCompanyById,prepare:knowledgeDraftInput}));

// AI Chat / Telegram Natural Language endpoint (Protected with Auth + Rate Limiting)
app.post('/api/ai/chat', async (req, res) => {
  const user:DbUser = res.locals.aiUser;
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required to use AI marketing features. Please log in.' });
    return;
  }

  const { message, context, businessName, category, language, companyId } = req.body;
  const resolved = {companyId:res.locals.aiCompany.id as string};
  let targetBiz = businessName || 'our business';
  let targetCat = category || 'Business Services';

  const identity=res.locals.aiCompany;
  const savedIdentity=JSON.stringify({name:identity.name,category:identity.category,city:identity.city||'',website:identity.website||''});

  const prompt = `You are LocalPulse AI, an Autonomous AI Marketing & Growth Assistant for ${targetBiz}.
Business Name: ${targetBiz}
Category: ${targetCat}
Language Preference: ${language || 'English / Hinglish'}

[SAVED_WORKSPACE_IDENTITY] (Saved identity, not independent verification):
${savedIdentity}

[USER_PROVIDED_CONTEXT - UNVERIFIED] (Browser-Supplied Client State):
${JSON.stringify(context || {})}

User's Query / Command: "${message}"

CRITICAL TRUTH & INTEGRITY RULES:
1. Browser-supplied client context is UNVERIFIED. Never treat user-provided numbers or rankings as verified unless supplied as approved saved facts.
2. Do not fabricate unverified reviews, leads, revenue, or rankings.
3. Reply concisely, professionally, and action-oriented. If they speak in Hindi or Hinglish, respond in natural, friendly Hinglish.`;

  const draft=await generateWorkspaceDraft(req,res,'chat',prompt,typeof message==='string'?message:'');if(!draft)return;
  const aiText=draft.text;
  if (aiText) {
    res.json({ reply: aiText,knowledge:draft.knowledge });
    return;
  }

  res.status(503).json({success:false,error:'AI assistant unavailable'});
});

// AI Review Reply Generator (Protected with Auth + Rate Limiting)
app.post('/api/ai/reply-review', async (req, res) => {
  const user:DbUser = res.locals.aiUser;
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required to use AI review reply generator. Please log in.' });
    return;
  }

  const { reviewText, rating, reviewerName, tone, language, businessName } = req.body;
  const targetBiz = businessName || 'our business';
  const prompt = `You are drafting a public reply to a customer review for "${targetBiz}".
Reviewer: ${reviewerName || 'Customer'}
Rating: ${rating} / 5 stars
Review Content: "${reviewText}"
Desired Tone: ${tone || 'Professional & Friendly'} (e.g. Professional, Friendly, Short, Detailed, Hinglish)
Language: ${language || 'English'}

CRITICAL SAFETY GUARDRAILS:
- Do NOT argue or be defensive.
- Do NOT make false promises or admit legal liability.
- Do NOT share sensitive internal client data.
- Be warm and authentic. Mention warranties or guarantees only when explicitly present in approved facts.

Draft the exact reply text only.`;

  const draft=await generateWorkspaceDraft(req,res,'review',prompt,typeof reviewText==='string'?reviewText:'');if(!draft)return;
  const aiText=draft.text;
  if (aiText) {
    res.json({ replyText: aiText,knowledge:draft.knowledge });
    return;
  }

  res.status(503).json({success:false,error:'AI reply generation unavailable'});
});

registerKnowledgeRoutes(app,{registeredWebsite:async company=>(await getCompanyById(company))?.website||null,auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,pool:getDbPool,rateLimit:aiRateLimiter,profile:async(company)=>{const data=await getCompanyDataPayload(company);return {data,version:companyDataVersion(data)};}});

// AI Content Studio Generator (Protected with Auth + Rate Limiting + Zod Validation)
app.post('/api/ai/generate-content', validateBody(generateAiContentSchema), async (req, res) => {
  const user:DbUser = res.locals.aiUser;
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required to use AI content generator. Please log in.' });
    return;
  }

  const {
    businessName,
    category,
    contentType,
    platform,
    offer,
    language,
    website,
    city,
    targetAudience,
    brandTone,
    tagline,
    preferredLanguage,
  } = req.body;

  const chosenLang = language || preferredLanguage || 'English';
  const effectiveLocation = city && city.trim() ? `in ${city.trim()}` : 'in the local service area';
  const effectiveAudience = targetAudience && targetAudience.trim()
    ? targetAudience.trim()
    : `General local customers of a ${category || 'local'} business ${effectiveLocation}`;
  const effectiveWebsite = website && website.trim() ? website.trim() : 'Not provided — do not invent one';
  const effectiveTagline = tagline && tagline.trim() ? tagline.trim() : 'Not provided';
  const effectiveTone = brandTone && brandTone.trim() ? brandTone.trim() : 'Professional, Engaging & Trustworthy';
  const effectiveOffer = offer && offer.trim() ? offer.trim() : `General information about ${category}; no promotion terms have been approved`;
  const effectivePlatform = platform && platform.trim() ? platform.trim() : 'Google Business Profile, Instagram, WhatsApp';
  const effectiveType = contentType && contentType.trim() ? contentType.trim() : 'Offer / Promotional Post';

  const prompt = `Generate a high-converting, tailored marketing post for the specific business described below.

BUSINESS DETAILS:
- Business Name: ${businessName}
- Category: ${category}
- City / Service Area: ${city && city.trim() ? city.trim() : 'Not specified'}
- Website: ${effectiveWebsite}
- Brand Tagline: ${effectiveTagline}
- Brand Voice Tone: ${effectiveTone}
- Target Audience: ${effectiveAudience}
- Language: ${chosenLang}
- Content Type: ${effectiveType}
- Target Platform: ${effectivePlatform}
- Offer / Campaign Theme: ${effectiveOffer}

CRITICAL INSTRUCTIONS & GUARDRAILS:
- Use saved workspace identity for branding and APPROVED_FACT_DATA for business claims. Offer/style/audience fields are unverified themes, not factual authority. Do not reference any other company.
- Do NOT invent an external website URL. If website is "Not provided — do not invent one", do NOT insert any website link; direct users to visit the location, call, or message on WhatsApp.
- Maintain the specified brand tone (${effectiveTone}) and language (${chosenLang}).
- Ensure all hashtags, headlines, and call-to-actions specifically reflect ${businessName} and the ${category} category.

Provide a JSON-compatible structured response with:
- headline
- caption (with natural emojis, tailored strictly to ${businessName})
- callToAction
- hashtags (5-7 relevant industry and local discovery tags for ${category})
- googlePostSnippet (under 100 words, high direct-call/WhatsApp intent)
- reelScript (3 scene outline for a 15-second reel)`;

  const draft=await generateWorkspaceDraft(req,res,'marketing',prompt,[offer,contentType].filter(v=>typeof v==='string').join(' '),'application/json');if(!draft)return;
  const aiText=draft.text;

  if (!aiText) {res.status(503).json({success:false,error:'AI content generation unavailable'});return;}
  try{
    const parsed=contentSchema.safeParse(JSON.parse(aiText));
    if(!parsed.success){res.status(502).json({success:false,error:'AI content response invalid'});return;}
    res.json({...parsed.data,knowledge:draft.knowledge});
  }catch{res.status(502).json({success:false,error:'AI content response invalid'});}

});

// AI Template Definitions List
app.get('/api/ai/templates', async (_req, res) => {
  try {
    const templates = getAllTemplates();
    res.json({ success: true, templates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list templates' });
  }
});

// Color Palettes Library API
app.get('/api/templates/palettes', async (req, res) => {
  try {
    const brandPrimary = req.query.primaryColor ? String(req.query.primaryColor) : undefined;
    const palettes = getAllPalettes(brandPrimary);
    res.json({ success: true, palettes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list palettes' });
  }
});

registerSalesRoutes(app,{auth:getAuthUserFromRequest,pool:getDbPool});

registerRenderRoutes(app,{auth:getAuthUserFromRequest,resolve:resolveUserCompanyId,access:verifyCompanyWorkspaceAccess,limiter:aiRateLimiter,uploadsRoot:UPLOADS_BASE_DIR});

// Production Lead Capture API (bga.aaditechs.in) - Protected with Authentication & IDOR filtering
app.get('/api/leads', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = (req.query.companyId || req.query.company_id) as string | undefined;

    // If specific company requested, verify company ownership
    if (requestedCompanyId && typeof requestedCompanyId === 'string') {
      const company = await getCompanyById(requestedCompanyId);
      if (!company) {
        res.status(404).json({ success: false, error: 'Company not found' });
        return;
      }
      if (company.user_id !== user.id && !user.is_platform_admin) {
        res.status(403).json({ success: false, error: 'Access denied to this company leads' });
        return;
      }
      const leads = await getAllLeads(requestedCompanyId);
      res.json({ success: true, companyId:requestedCompanyId, leads });
      return;
    }

    // If no companyId specified:
    // Only platform_admin can access all leads across all tenants
    if (user.is_platform_admin) {
      const leads = await getAllLeads();
      res.json({ success: true, leads });
      return;
    }

    // Tenant owners / managers can only see leads belonging to their owned companies
    const userCompanies = await getUserCompanies(user.id);
    if (!userCompanies || userCompanies.length === 0) {
      res.json({ success: true, leads: [] });
      return;
    }

    const companyIds = new Set(userCompanies.map((c) => c.id));
    const allLeads = await getAllLeads();
    const filtered = allLeads.filter((l) => l.company_id && companyIds.has(l.company_id));
    res.json({ success: true, leads: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Public Lead Ingestion Endpoint (Strict Token Validation, Honeypot Anti-Spam & Rate Limiting)
registerPublicLeadRoutes(app,{rateLimit:leadsRateLimiter,pool:getDbPool,resolve:resolvePublicLeadCompany,save:savePublicLeadIntake,receipt:readPublicLeadReceipt,
 score:input=>calculateMessageIntent(input.notes||input.service||'',{service:input.service,budget:input.budget,phone:input.phone,email:input.email}).score??null,
 notify:(pool,company,id,input)=>notifyPublicLeadOnce(pool,company,id,()=>sendTenantTelegram(company,`New website inquiry\nName: ${input.name}\nPhone: ${input.phone}\nService: ${input.service||'Inquiry'}`,{getCompanyIntegration,fetch}))
});

// Authenticated Lead Ingestion & Internal CRM Lead Management
app.post('/api/leads', leadsRateLimiter, validateBody(createLeadSchema), async (req, res) => {
  try {
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. For public inquiries, submit to POST /api/public/leads with a valid publicFormToken.',
      });
      return;
    }

    const userCompanies = await getUserCompanies(authUser.id);
    if (!userCompanies || userCompanies.length === 0) {
      res.status(403).json({ success: false, error: 'User does not have an active business workspace' });
      return;
    }

    const { name, company, phone, email, service, budget, source, notes, stage } = req.body;
    let targetCompanyId = (req.body.company_id || req.body.companyId || req.query.company_id || req.query.companyId) as string | undefined;

    if (targetCompanyId) {
      const ownsCompany = userCompanies.some((c) => c.id === targetCompanyId) || authUser.is_platform_admin;
      if (!ownsCompany) {
        res.status(403).json({ success: false, error: 'Access denied to create leads for this business workspace' });
        return;
      }
    } else {
      targetCompanyId = userCompanies[0].id;
    }

    const targetComp = await getCompanyById(targetCompanyId);
    const compName = targetComp?.name || company || 'Our Team';

    const intentAnalysis = calculateMessageIntent(notes || service || '', {
      service,
      budget,
      phone,
      email,
    });

    const newLead = await createLead({
      company_id: targetCompanyId,
      name,
      company: company || 'Direct Client',
      phone,
      email: email || '',
      service: service || 'Digital Growth Inquiry',
      budget: budget || 'Custom Proposal',
      stage: stage || 'new',
      intent_score: intentAnalysis.score ?? null,
      source: source || `${compName} Lead Form`,
      notes: notes || '',
      ai_suggested_reply: `Namaste ${name}! Thank you for contacting ${compName}. We have received your inquiry for ${service || 'our services'}. Our team will connect with you shortly.`,
    });

    // Auto-dispatch Telegram alert
    const alertMsg = `🔥 *NEW HOT LEAD RECEIVED!* (${newLead.source})\n\n🏢 *Target Business:* ${compName}\n👤 *Client:* ${newLead.name}\n🏢 *Client Org:* ${newLead.company}\n📞 *Phone:* \`${newLead.phone}\`\n💼 *Service:* ${newLead.service}\n💰 *Budget:* ${newLead.budget}\n🎯 *Intent Score:* ${newLead.intent_score !== null ? `${newLead.intent_score}%` : 'UNAVAILABLE'}\n\n📱 *Source:* ${newLead.source}`;
    const telegramAccepted=await sendTenantTelegram(newLead.company_id!,alertMsg,{getCompanyIntegration,fetch});

    res.status(201).json({success:true,lead:newLead,notifications:{telegram:telegramAccepted?'ACCEPTED':'UNAVAILABLE'}});
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

registerLeadStageRoutes(app,{validate:validateBody(updateLeadStageSchema),auth:getAuthUserFromRequest,lead:getLeadById,access:verifyCompanyWorkspaceAccess,update:updateLeadStatus});

// ---------------- WHATSAPP CLOUD API & META SOCIAL DIRECT DISPATCH ---------------- //

// Helper to resolve Razorpay credentials per company or system env
async function resolveRazorpayCredentials(companyId?: string) {
  let keyId = process.env.RAZORPAY_KEY_ID || '';
  let keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  if (companyId) {
    try {
      const integration = await getCompanyIntegration(companyId, 'razorpay_gateway');
      if (integration && integration.credentials) {
        if (integration.credentials.keyId) keyId = integration.credentials.keyId;
        if (integration.credentials.keySecret) keySecret = integration.credentials.keySecret;
      }
    } catch {}
  }
  return {
    keyId: keyId.trim(),
    keySecret: keySecret.trim(),
    configured: Boolean(keyId.trim() && keySecret.trim()),
    isLive: keyId.trim().startsWith('rzp_live'),
  };
}

// WhatsApp Status Endpoint
app.get('/api/whatsapp/status', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyIdQuery = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, companyIdQuery);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    const creds = await resolveWhatsAppCredentials(resolved.companyId);
    res.json({
      success: true,
      companyId: resolved.companyId,
      configured: creds.configured,
      status: creds.configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      phoneNumberId: creds.phoneNumberId ? maskSecret(creds.phoneNumberId) : null,
      wabaId: creds.wabaId ? maskSecret(creds.wabaId) : null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Send WhatsApp Message via Meta Cloud API with fallback (Text, Template, Media)
app.post('/api/whatsapp/send', validateBody(whatsappSendSchema), async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { to, message, templateName, languageCode, components, templateParams, mediaType, mediaUrl, caption, companyId } = req.body;
    if (!to || (!message && !templateName && !mediaUrl)) {
      res.status(400).json({ success: false, error: 'Recipient phone number and message, templateName, or mediaUrl are required' });
      return;
    }

    const resolved = await resolveUserCompanyId(user, companyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const effectiveCompanyId = resolved.companyId;

    let cleanTo = String(to).replace(/[^0-9]/g, '');
    if (cleanTo.length === 10) cleanTo = '91' + cleanTo;
    if (cleanTo.startsWith('0') && cleanTo.length === 11) cleanTo = '91' + cleanTo.substring(1);

    const creds = await resolveWhatsAppCredentials(effectiveCompanyId);

    if (!creds.configured) {
      const fallbackLink = `https://wa.me/${cleanTo}?text=${encodeURIComponent(message || caption || '')}`;
      res.status(400).json({
        success: false,
        status: 'NOT_CONFIGURED',
        configured: false,
        method: 'not_configured',
        error: 'WhatsApp Cloud API credentials are not configured. Please configure Phone Number ID and Access Token in Integrations settings.',
        waLink: fallbackLink,
        fallbackNotice: 'Direct wa.me link generated for manual client-side redirection only; this is NOT Meta Cloud API delivery.',
      });
      return;
    }

    // Call official Meta Graph API v21.0
    const dispatchPool=await getDbPool();if(!dispatchPool)throw new Error('Durable dispatch store unavailable');
    const dispatchInput={sender:creds.phoneNumberId,to:cleanTo,message,templateName,languageCode,components,templateParams,mediaType,mediaUrl,caption};
    const waRes = await dispatchMessageIntent(dispatchPool,effectiveCompanyId,req.body.requestKey,dispatchInput,()=>sendWhatsAppCloudMessage(creds, {
      to: cleanTo,
      message,
      templateName,
      languageCode,
      components,
      templateParams,
      mediaType,
      mediaUrl,
      caption,
      companyId: effectiveCompanyId,
    }),user.id);

    if (waRes.success && waRes.messageId) {
      res.json({
        success: true,
        status: 'API_ACCEPTED',requestKey:req.body.requestKey,reused:waRes.reused,
        method: 'meta_cloud_api',
        messageId: waRes.messageId,
        recipient: cleanTo,
        message: `Message dispatched via official Meta WhatsApp Cloud API! (ID: ${waRes.messageId})`,
      });
      return;
    } else {
      const fallbackLink = `https://wa.me/${cleanTo}?text=${encodeURIComponent(message || caption || '')}`;
      res.status(waRes.status==='PAUSED'?423:waRes.status==='UNKNOWN'?502:400).json({
        success: false,
        status: waRes.status||'UNKNOWN',
        method: 'meta_cloud_api',
        error: waRes.error || 'Meta Cloud API error',
        fallbackNotice: 'Provider dispatch was not confirmed. Check provider history before another send.',
      });
      return;
    }
  } catch (err: any) {
    res.status(err instanceof DispatchIntentError?err.status:503).json({success:false,error:err instanceof DispatchIntentError?err.message:'Durable dispatch unavailable'});
  }
});

registerMessageDispatchStatus(app,{auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,read:async(company,key)=>{const pool=await getDbPool();if(!pool)throw new Error('Durable dispatch state unavailable');return readMessageDispatchStatus(pool,company,key);}});

// Broadcast WhatsApp Campaign Endpoint
app.post('/api/whatsapp/broadcast', validateBody(whatsappBroadcastSchema), async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { recipients, message, templateName, languageCode, templateParams, mediaType, mediaUrl, campaignName, companyId } = req.body;

    const resolved = await resolveUserCompanyId(user, companyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const effectiveCompanyId = resolved.companyId;

    const creds = await resolveWhatsAppCredentials(effectiveCompanyId);

    if (!creds.configured) {
      res.status(400).json({
        success: false,
        status: 'NOT_CONFIGURED',
        configured: false,
        error: 'WhatsApp Cloud API credentials not configured. Please configure Phone Number ID and Access Token in Integrations settings to perform broadcasts.',
        campaignName: campaignName || 'WhatsApp Blast Campaign',
        totalRecipients: recipients.length,
        successCount: 0,
        failCount: recipients.length,
      });
      return;
    }

    const dispatchPool=await getDbPool();if(!dispatchPool)throw new Error('Durable dispatch store unavailable');
    const outcome=await runWhatsAppBroadcast(recipients,(phone,recipientName)=>{
      const input={sender:creds.phoneNumberId,to:phone,message,templateName,languageCode,templateParams:templateParams||(recipientName?[recipientName]:undefined),mediaType,mediaUrl};
      const key=createHash('sha256').update(`wa-broadcast:${req.body.requestKey}:${phone}`).digest('hex');
      return dispatchMessageIntent(dispatchPool,effectiveCompanyId,key,input,()=>sendWhatsAppCloudMessage(creds,{...input,companyId:effectiveCompanyId}),user.id);
    });
    res.json({...outcome,requestKey:req.body.requestKey,campaignName:campaignName||'WhatsApp campaign',configured:true});

  } catch (err: any) {
    res.status(503).json({success:false,error:'Durable broadcast unavailable'});
  }
});

// Meta Webhook Verification Handshake (GET /api/whatsapp/webhook)
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const handshake = verifyMetaWebhookHandshake({ mode, token, challenge });
  if (handshake.verified && handshake.challenge) {
    console.log('[WhatsApp Webhook] Verification challenge accepted by Meta Graph API');
    res.status(200).send(handshake.challenge);
  } else {
    console.warn('[WhatsApp Webhook] Verification token mismatch.');
    res.status(403).send('Verification token mismatch');
  }
});

registerWhatsAppWebhook(app,{secret:()=>process.env.WHATSAPP_APP_SECRET||process.env.META_APP_SECRET,resolve:(phoneNumberId,wabaId)=>findCompanyByWhatsAppIdentifier({phoneNumberId,wabaId},true),receipt:async(company,input)=>{const pool=await getDbPool();if(!pool)throw new Error('Durable receipt storage unavailable');await recordMessageReceipt(pool,company,input);},inbound:async(matchedCompanyId,message,contact,source)=>{
 const inboundPool=await getDbPool();if(!inboundPool)throw new Error('Inbound storage unavailable');
      const {phone:fromPhone,name:contactName,body:textBody}=describeWhatsAppInbound(message,contact);

      const intentAnalysis = calculateMessageIntent(textBody, {
        service: 'WhatsApp Direct Inquiry',
        phone: fromPhone,
      });

      const matchedCompany = matchedCompanyId ? await getCompanyById(matchedCompanyId) : null;
      const compName = matchedCompany?.name || 'Our Team';

      // Auto-ingest lead into database for the matched company tenant
      const inserted=await recordWhatsAppInboundLead(inboundPool,matchedCompanyId,message.id,{
        name: contactName,
        company: 'WhatsApp Inbound Inquiry',
        phone: `+${fromPhone}`,
        service: 'WhatsApp Direct Inquiry',
        budget: 'Pending Discussion',
        stage: 'new',
        intent_score: intentAnalysis.score ?? null,
        source: 'WhatsApp Cloud Inbound',
        notes: `Inbound text: "${textBody}" [Provider Message ID: ${message.id}]${intentAnalysis.reasons.length > 0 ? ` [Intent Signals: ${intentAnalysis.reasons.join(', ')}]` : ''}`,
        ai_suggested_reply: `Namaste ${contactName}! ${compName} has received your message. A dedicated consultant will reply right here on WhatsApp shortly.`,
      },{body:textBody,kind:message.type,mediaId:typeof (message.image?.id||message.document?.id)==='string'?(message.image?.id||message.document?.id).slice(0,255):undefined},source);

      if(!inserted)return;
      await sendTenantTelegram(matchedCompanyId,`New WhatsApp inbound message recorded for this workspace.`,{getCompanyIntegration,fetch});
}});

// ---------------- META SOCIAL DIRECT DISPATCH (FACEBOOK & INSTAGRAM) ---------------- //

// Meta Social Status Endpoint
app.get('/api/meta/status', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyIdQuery = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, companyIdQuery);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    const creds = await resolveMetaSocialCredentials(resolved.companyId);
    res.json({
      success: true,
      companyId: resolved.companyId,
      configured: creds.configured,
      status: creds.configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      pageId: creds.pageId ? maskSecret(creds.pageId) : null,
      instagramId: creds.instagramId ? maskSecret(creds.instagramId) : null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Legacy URL delegates to the canonical stored-post publishing state machine.
registerPublicationControls(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,history:async(company,before)=>{const pool=await getDbPool();if(!pool)throw new Error('Durable history unavailable');return readPublicationControlHistory(pool,company,before);},read:async(company)=>{const pool=await getDbPool();if(!pool)throw new Error('Durable controls unavailable');return readScopedPublicationControls(pool,company);},update:async(company,actor,input)=>{const pool=await getDbPool();if(!pool)throw new Error('Durable controls unavailable');return updateScopedPublicationControls(pool,company,actor,input);}});
registerDailyWorkReport(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,read:async(company,date)=>{const pool=await getDbPool();if(!pool)throw new Error('Durable report storage unavailable');return readDailyWorkReport(pool,company,date);}});
registerPublicationWorkflow(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,getPostById,history:async(company,post,before)=>{const pool=await getDbPool();if(!pool)throw new PublishingReviewError(503,'Durable workflow history unavailable');return readPublicationWorkflowHistory(pool,company,post,before);},publish:executePublishingJob,transition:async(id,actor,input)=>{const pool=await getDbPool();if(!pool)throw new PublishingReviewError(503,'Durable workflow storage unavailable');return transitionPublication(pool,id,actor,input);}});
registerPublicationDrafts(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,prepare:async(company,actor,input)=>{const pool=await getDbPool();if(!pool)throw new PublishingReviewError(503,'Durable draft storage unavailable');return preparePublicationDraft(pool,company,actor,input);}});
registerMetaVerification(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,check:checkCompanyMetaPublication});

registerPublishingReview(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,read:getCompanyPublishingReview,append:recordCompanyPublishingReview});

registerMetaPublishing(app,{getAuthUserFromRequest,verifyCompanyWorkspaceAccess,getPostById,executePublishingJob});

// Razorpay Status Endpoint
app.get('/api/razorpay/status', async (req, res) => {
  try {
    const companyId = (req.query.companyId || req.query.company_id) as string | undefined;
    const creds = await resolveRazorpayCredentials(companyId);
    res.json({
      success: true,
      configured: creds.configured,
      isLive: creds.isLive,
      keyId: creds.keyId ? maskSecret(creds.keyId) : null,
      mode: creds.isLive ? 'LIVE' : creds.configured ? 'TEST / SANDBOX' : 'UNCONFIGURED',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Create Razorpay Order
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt, notes, companyId } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Valid amount greater than 0 is required' });
      return;
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const orderReceipt = receipt || `rcpt_${Date.now()}`;
    const creds = await resolveRazorpayCredentials(companyId);

    if (creds.configured) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: currency || 'INR',
            receipt: orderReceipt,
            notes: notes || {},
          }),
          signal: AbortSignal.timeout(8000),
        });

        const rzpData = await rzpRes.json();
        if (rzpRes.ok && rzpData.id) {
          res.json({
            success: true,
            order: rzpData,
            keyId: creds.keyId,
            mode: creds.isLive ? 'live' : 'test',
          });
          return;
        } else {
          res.status(400).json({
            success: false,
            error: rzpData.error?.description || 'Failed to create Razorpay order',
          });
          return;
        }
      } catch (rzpErr: any) {
        res.status(500).json({
          success: false,
          error: `Razorpay connection error: ${rzpErr?.message}`,
        });
        return;
      }
    }

    // In production mode, simulated orders are forbidden
    if (isProductionEnvironment()) {
      res.status(400).json({
        success: false,
        error: 'Razorpay API credentials are not configured in production mode. Please configure live Razorpay keys in the Integrations settings.',
      });
      return;
    }

    // Fallback test order for sandbox exploration (non-production only)
    const mockOrderId = `order_test_${Date.now()}`;
    res.json({
      success: true,
      order: {
        id: mockOrderId,
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: currency || 'INR',
        receipt: orderReceipt,
        status: 'created',
        notes: notes || {},
      },
      keyId: 'rzp_test_demo12345678',
      mode: 'sandbox_preview',
      notice: 'Razorpay API keys not yet stored in Integrations tab. Simulated order created for testing.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Verify Razorpay Payment Signature
app.post('/api/razorpay/verify-payment', validateBody(verifyRazorpayPaymentSchema), async (req, res) => {
  try {
    // 1. Authentication check: Must have valid authenticated user session
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required to verify payments' });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, companyId, leadId, planName, amount } = req.body;

    // Verify company ownership or platform_admin authorization
    let targetCompanyId = companyId;
    let targetLead = null;

    if (leadId) {
      targetLead = await getLeadById(leadId);
      if (!targetLead) {
        res.status(404).json({ success: false, error: 'Lead not found' });
        return;
      }
      if (targetLead.company_id) {
        if (targetCompanyId && targetCompanyId !== targetLead.company_id) {
          res.status(403).json({ success: false, error: 'Lead does not belong to specified company workspace' });
          return;
        }
        targetCompanyId = targetLead.company_id;
      }
    }

    if (targetCompanyId) {
      const company = await getCompanyById(targetCompanyId);
      if (company && company.user_id !== user.id && !user.is_platform_admin) {
        res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
        return;
      }
    } else if (!user.is_platform_admin) {
      // If non-admin user didn't specify company or lead, check if they own any company
      const userCompanies = await getUserCompanies(user.id);
      if (userCompanies.length > 0) {
        targetCompanyId = userCompanies[0].id;
      }
    }

    const effectiveCompanyId = targetCompanyId || 'comp_aaditech_main';
    const creds = await resolveRazorpayCredentials(effectiveCompanyId);

    // 2. Separate test/simulation mode from production; never return success=true for simulated payment in production
    const isSimulated =
      razorpay_payment_id.startsWith('sim_') ||
      razorpay_payment_id.startsWith('mock_') ||
      razorpay_payment_id.startsWith('test_unverified_');

    if (isProductionEnvironment() && isSimulated) {
      res.status(400).json({
        success: false,
        verified: false,
        error: 'Simulated and mock payments are strictly forbidden in production mode.',
      });
      return;
    }

    // 3. Fallback when credentials are not configured
    if (!creds.configured || !creds.keySecret) {
      if (isProductionEnvironment()) {
        res.status(400).json({
          success: false,
          verified: false,
          error: 'Razorpay Key Secret is not configured. Cannot verify payment in production.',
        });
        return;
      }

      res.json({
        success: false,
        verified: false,
        mode: 'sandbox_no_credentials',
        message: 'No live Razorpay credentials configured for this company — payment was NOT verified.',
      });
      return;
    }

    // 4. Verify payment through trusted cryptographic mechanism
    const verification = verifyRazorpayPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      keySecret: creds.keySecret,
      isProduction: isProductionEnvironment(),
    });

    if (!verification.verified) {
      res.status(400).json({
        success: false,
        verified: false,
        error: verification.error || 'Payment signature verification failed. Invalid cryptographic HMAC-SHA256 signature.',
      });
      return;
    }

    // 5. Genuine match: Update lead status to 'won' if leadId attached
    if (leadId) {
      await updateLeadStatus(leadId, 'won');
    }

    // 6. Automatic Invoice Ledger Creation with GST (18%) and duplicate prevention
    const numAmount = Number(amount) || 799;
    const gstAmount = +(numAmount * 0.18).toFixed(2);
    const totalAmount = +(numAmount + gstAmount).toFixed(2);
    const resolvedPlan = planName || 'Growth Tier (Monthly)';

    const newInvoice = await createInvoice({
      company_id: effectiveCompanyId,
      plan: resolvedPlan,
      amount: numAmount,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      payment_method: 'UPI / Razorpay Verified',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      customer_name: user.full_name || 'Aaditech Solution Client',
      customer_email: user.email || 'billing@aaditechs.in',
      status: 'Paid',
      hsn_code: '998314',
    });

    // 7. Update subscription idempotently if it's a plan payment
    let planKey = 'growth';
    const lowerPlan = resolvedPlan.toLowerCase();
    if (lowerPlan.includes('starter')) planKey = 'starter';
    else if (lowerPlan.includes('pro')) planKey = 'pro';
    else if (lowerPlan.includes('agency')) planKey = 'agency';

    await activateSubscriptionIdempotent({
      companyId: effectiveCompanyId,
      planId: planKey,
      planName: resolvedPlan,
      status: 'active',
      amount: numAmount,
      billingCycle: 'monthly',
    });

    // Dispatch verified payment alert to Telegram
    const paymentMsg = `💰 *REAL PAYMENT CONFIRMED VIA RAZORPAY!*\n\n💳 *Payment ID:* \`${razorpay_payment_id}\`\n📦 *Order ID:* \`${razorpay_order_id}\`\n💵 *Amount:* ₹${numAmount} + ₹${gstAmount} GST = ₹${totalAmount}\n📌 *Plan/Service:* ${resolvedPlan}\n🧾 *Tax Invoice:* \`${newInvoice.id}\` (HSN: 998314)\n\n✅ Cryptographic HMAC-SHA256 signature verified against Razorpay Key Secret.`;
    sendTelegramPushAlert(paymentMsg).catch(() => {});

    res.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      invoiceId: newInvoice.id,
      totalAmount,
      message: 'Payment signature verified successfully against Razorpay secret!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Create Instant Payment Link (for Leads, WhatsApp, Invoices)
app.post('/api/razorpay/create-payment-link', async (req, res) => {
  try {
    const { amount, description, customerName, customerPhone, customerEmail, companyId, leadId } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Valid amount is required' });
      return;
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const creds = await resolveRazorpayCredentials(companyId);

    let cleanPhone = String(customerPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    if (creds.configured) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
        const linkPayload = {
          amount: amountInPaise,
          currency: 'INR',
          accept_partial: false,
          description: description || 'Digital Growth Services & Retainer',
          customer: {
            name: customerName || 'Valued Client',
            contact: cleanPhone ? `+${cleanPhone}` : undefined,
            email: customerEmail || undefined,
          },
          notify: { sms: Boolean(cleanPhone), email: Boolean(customerEmail) },
          reminder_enable: true,
          notes: {
            leadId: leadId || '',
            companyId: companyId || '',
          },
        };

        const linkRes = await fetch('https://api.razorpay.com/v1/payment_links', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(linkPayload),
          signal: AbortSignal.timeout(8000),
        });

        const linkData = await linkRes.json();
        if (linkRes.ok && linkData.short_url) {
          res.json({
            success: true,
            method: 'razorpay_live',
            paymentLinkId: linkData.id,
            shortUrl: linkData.short_url,
            amount: Number(amount),
            currency: 'INR',
          });
          return;
        } else {
          console.warn('Razorpay payment link error:', linkData.error);
        }
      } catch (linkErr: any) {
        console.warn('Razorpay payment link fetch failed:', linkErr?.message);
      }
    }

    if (isProductionEnvironment()) {
      res.status(400).json({
        success: false,
        error: 'Razorpay API credentials are not configured in production mode. Please configure live Razorpay keys in the Integrations settings.',
      });
      return;
    }

    // Direct UPI payment link fallback (Standard NPCI UPI Intent URL for phone apps)
    const upiUri = `upi://pay?pa=r8898278453@okaxis&pn=Aaditech%20Solution&am=${amount}&cu=INR&tn=${encodeURIComponent(description || 'Services Payment')}`;
    const simulatedLink = `https://rzp.io/i/test_${Date.now().toString(36)}`;

    res.json({
      success: true,
      method: 'upi_fallback',
      shortUrl: simulatedLink,
      upiUri,
      amount: Number(amount),
      currency: 'INR',
      notice: 'Direct UPI link and simulated Razorpay URL generated.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Razorpay Webhook Inbound Handler (Real HMAC-SHA256 Signature Verification, Idempotency & Ledger Ingestion)
app.post('/api/razorpay/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Use raw body for strict cryptographic HMAC validation
    const rawPayload = (req as any).rawBody
      ? (req as any).rawBody
      : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

    // 1. Mandatory webhook signature verification & missing secret rejection in production
    const sigCheck = verifyRazorpayWebhookSignature({
      rawBody: rawPayload,
      signature,
      secret: webhookSecret,
      isProduction: isProductionEnvironment(),
    });

    if (!sigCheck.isValid) {
      console.warn(`[Razorpay Webhook] Rejected webhook: ${sigCheck.error}`);
      res.status(400).json({ error: sigCheck.error, code: sigCheck.code });
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    // 2. Webhook Event Idempotency (Requirement 3)
    const eventId =
      (req.headers['x-razorpay-event-id'] as string) ||
      req.body?.event_id ||
      (payload?.payment?.entity?.id ? `${payload.payment.entity.id}_${event}` : undefined) ||
      (payload?.subscription?.entity?.id ? `${payload.subscription.entity.id}_${event}` : undefined) ||
      (payload?.order?.entity?.id ? `${payload.order.entity.id}_${event}` : undefined);

    if (eventId && (await isWebhookEventProcessed(eventId))) {
      console.log(`[Razorpay Webhook] Idempotent duplicate event ignored: ${eventId}`);
      res.status(200).json({ status: 'ok', duplicate: true, eventId, eventHandled: event });
      return;
    }

    console.log(`[Razorpay Webhook] Ingested webhook event: ${event}`);

    // Ingest and reconcile payments, payment links, orders, and subscriptions
    if (
      event === 'payment.captured' ||
      event === 'order.paid' ||
      event === 'payment_link.paid' ||
      event === 'subscription.charged'
    ) {
      const payment = payload?.payment?.entity || payload?.order?.entity || {};
      const amountPaise = Number(payment.amount || 0);
      const amountRupees = amountPaise > 0 ? +(amountPaise / 100).toFixed(2) : 799.0;
      const gstAmount = +(amountRupees * 0.18).toFixed(2);
      const totalAmount = +(amountRupees + gstAmount).toFixed(2);

      const notes = payment.notes || {};
      const companyId = notes.companyId || notes.company_id || 'comp_aaditech_main';
      const leadId = notes.leadId || notes.lead_id;
      const planName = notes.planName || notes.plan_name || 'Growth Tier (Monthly)';
      const payerName = payment.contact_name || payment.name || notes.customerName || 'Aaditech Client';
      const payerPhone = payment.contact || notes.customerPhone || '';
      const payerEmail = payment.email || notes.customerEmail || '';

      // 1. Sync Invoice to Ledger (with duplicate prevention built-in)
      const invoice = await createInvoice({
        company_id: companyId,
        plan: planName,
        amount: amountRupees,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        payment_method: payment.method ? `Razorpay (${payment.method.toUpperCase()})` : 'UPI / Razorpay',
        payment_id: payment.id || `pay_${Date.now().toString(36)}`,
        order_id: payment.order_id || payload?.order?.entity?.id,
        payment_link_id: payment.payment_link_id || payload?.payment_link?.entity?.id,
        customer_name: payerName,
        customer_email: payerEmail,
        customer_phone: payerPhone,
        status: 'Paid',
        hsn_code: '998314',
      });

      // 2. Update Lead to Won if leadId present
      if (leadId) {
        await updateLeadStatus(leadId, 'won').catch(() => {});
      }

      // 3. Update subscription status idempotently (Requirement 5 & 11)
      let planKey = 'growth';
      const lowerPlan = planName.toLowerCase();
      if (lowerPlan.includes('starter')) planKey = 'starter';
      else if (lowerPlan.includes('pro')) planKey = 'pro';
      else if (lowerPlan.includes('agency')) planKey = 'agency';

      const targetStatus = mapRazorpayEventToSubscriptionState(event, payment.status) || 'active';

      await activateSubscriptionIdempotent({
        companyId,
        planId: planKey,
        planName,
        status: targetStatus,
        amount: amountRupees,
        billingCycle: 'monthly',
      }).catch(() => {});

      // 4. Record event as processed for idempotency
      if (eventId) {
        await markWebhookEventProcessed(eventId, event, companyId);
      }

      // 5. Dispatch Telegram Notification
      sendTelegramPushAlert(
        `🎉 *WEBHOOK: RAZORPAY PAYMENT CAPTURED!*\n\n💰 *Amount:* ₹${amountRupees} + ₹${gstAmount} GST (Total: ₹${totalAmount})\n💳 *Payment ID:* \`${payment?.id || 'N/A'}\`\n📞 *Contact:* ${payerPhone || 'N/A'} / ${payerEmail || 'N/A'}\n📌 *Plan:* ${planName}\n🧾 *Invoice:* \`${invoice.id}\`\n⚡ *Event:* \`${event}\``
      ).catch(() => {});
    } else {
      // Map lifecycle states: trial, active, past_due, payment_failed, cancelled, expired (Requirement 11)
      const subEntity = payload?.subscription?.entity || payload?.payment?.entity || {};
      const notes = subEntity.notes || {};
      const companyId = notes.companyId || notes.company_id || 'comp_aaditech_main';
      const mappedState = mapRazorpayEventToSubscriptionState(event, subEntity.status);

      if (mappedState) {
        await activateSubscriptionIdempotent({
          companyId,
          planId: 'growth',
          planName: 'Growth Tier',
          status: mappedState,
          amount: 799.0,
          razorpaySubscriptionId: subEntity.id,
        }).catch(() => {});
      }

      if (eventId) {
        await markWebhookEventProcessed(eventId, event, companyId);
      }
    }

    res.status(200).json({ status: 'ok', eventHandled: event });
  } catch (err: any) {
    console.warn('[Razorpay Webhook] Error:', err?.message);
    res.status(200).json({ status: 'handled', error: err?.message });
  }
});

// ---------------- BILLING, INVOICE LEDGER & SUBSCRIPTIONS APIS ---------------- //

// GET /api/companies/:id/invoices - Retrieve verified GST invoice ledger
app.get('/api/companies/:id/invoices', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyId = req.params.id;
    const company = await getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company workspace not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const invoices = await getInvoicesByCompany(companyId);
    res.json({
      success: true,
      companyId,
      count: invoices.length,
      invoices,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/companies/:id/invoices - Create new invoice record
app.post('/api/companies/:id/invoices', validateBody(createInvoiceSchema), async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyId = req.params.id;
    const company = await getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company workspace not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const invoice = await createInvoice({
      ...req.body,
      company_id: companyId,
    });

    res.status(201).json({
      success: true,
      invoice,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/companies/:id/subscription - Retrieve active subscription plan
app.get('/api/companies/:id/subscription', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyId = req.params.id;
    const company = await getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company workspace not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    let subscription = await getSubscriptionByCompany(companyId);
    if (!subscription) {
      // Default to Growth tier
      subscription = await upsertSubscription({
        company_id: companyId,
        plan_id: 'growth',
        plan_name: 'Growth Tier',
        status: 'active',
        amount: 799.0,
      });
    }

    res.json({
      success: true,
      subscription,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/companies/:id/subscription/upgrade - Upgrade or modify subscription plan
app.post('/api/companies/:id/subscription/upgrade', validateBody(upgradeSubscriptionSchema), async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyId = req.params.id;
    const company = await getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company workspace not found' });
      return;
    }

    if (company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this company workspace' });
      return;
    }

    const { planId, billingCycle, paymentId, orderId } = req.body;
    const planNames: Record<string, string> = {
      starter: 'Starter Tier',
      growth: 'Growth Tier',
      pro: 'Pro Automation Tier',
      agency: 'Agency Multi-Client',
    };
    const planPrices: Record<string, number> = {
      starter: 499,
      growth: 799,
      pro: 1499,
      agency: 4999,
    };

    const price = planPrices[planId] || 799;
    const planName = planNames[planId] || 'Growth Tier';

    const updatedSub = await upsertSubscription({
      company_id: companyId,
      plan_id: planId,
      plan_name: planName,
      status: 'active',
      amount: price,
      billing_cycle: billingCycle || 'monthly',
    });

    // If payment ID is provided, record invoice immediately
    let invoice = null;
    if (paymentId) {
      const gstAmount = +(price * 0.18).toFixed(2);
      const totalAmount = +(price + gstAmount).toFixed(2);
      invoice = await createInvoice({
        company_id: companyId,
        plan: `${planName} (${billingCycle || 'Monthly'})`,
        amount: price,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        payment_method: 'Razorpay / UPI Verified',
        payment_id: paymentId,
        order_id: orderId,
        customer_name: user.full_name || company.name,
        customer_email: user.email,
        status: 'Paid',
      });
    }

    res.json({
      success: true,
      subscription: updatedSub,
      invoice,
      message: `Successfully upgraded to ${planName}!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/invoices/:id/download - Detailed printable GST tax invoice
app.get('/api/invoices/:id/download', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const invoiceId = req.params.id;
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    const company = await getCompanyById(invoice.company_id);
    if (company && company.user_id !== user.id && !user.is_platform_admin) {
      res.status(403).json({ success: false, error: 'Access denied to this invoice' });
      return;
    }

    // Structured GST tax invoice model
    const baseAmount = Number(invoice.amount);
    const gstAmount = Number(invoice.gst_amount);
    const totalAmount = Number(invoice.total_amount);
    const cgstAmount = +(gstAmount / 2).toFixed(2);
    const sgstAmount = +(gstAmount / 2).toFixed(2);

    const taxInvoiceData = {
      invoiceNumber: invoice.id,
      invoiceDate: invoice.date,
      status: invoice.status,
      paymentMethod: invoice.payment_method,
      paymentId: invoice.payment_id || 'N/A',
      orderId: invoice.order_id || 'N/A',
      hsnSacCode: invoice.hsn_code || '998314',
      serviceDescription: invoice.plan,
      seller: {
        legalName: 'Aaditech Solution Private Limited',
        brandName: 'Aaditech BGA Growth Suite',
        gstin: '27AAGCA0000A1Z5',
        pan: 'AAGCA0000A',
        address: '210, Anant Laxmi Chambers, B-Cabin, Dada Patil Marg, Thane (W), Maharashtra 400602',
        state: 'Maharashtra (27)',
        email: 'billing@aaditechs.in',
        phone: '+91 22 4963 8603',
        website: 'https://bga.aaditechs.in',
      },
      buyer: {
        companyName: company?.legal_name || company?.name || invoice.customer_name || 'Client Business',
        customerName: invoice.customer_name || user.full_name || 'Business Owner',
        email: invoice.customer_email || user.email || 'N/A',
        phone: invoice.customer_phone || company?.phone || 'N/A',
        city: company?.city || 'Thane - Mumbai MMR',
        state: 'Maharashtra (27)',
      },
      lineItems: [
        {
          itemNo: 1,
          description: `${invoice.plan} - AI Autonomous Marketing & SEO Growth Engine`,
          sacCode: invoice.hsn_code || '998314',
          taxableValue: baseAmount,
          cgstRate: '9%',
          cgstAmount,
          sgstRate: '9%',
          sgstAmount,
          total: totalAmount,
        },
      ],
      summary: {
        taxableAmount: baseAmount,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: 0.0,
        totalTax: gstAmount,
        grandTotal: totalAmount,
        amountInWords: `INR ${totalAmount.toFixed(2)} Only`,
      },
    };

    res.json({
      success: true,
      invoice: taxInvoiceData,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Direct Telegram alert dispatch endpoint - Protected with Authentication & Rate Limiting
registerTenantNotificationRoutes(app, {
  limiter: telegramAlertLimiter,
  getAuthUserFromRequest,
  verifyCompanyWorkspaceAccess,
  send: (companyId, message) => sendTenantTelegram(companyId, message, { getCompanyIntegration, fetch }),
});

// ---------------- AUTONOMOUS GOVERNANCE & EXECUTION ENGINE ---------------- //

// GET /api/autonomous/status - Check autopilot engine health & kill-switch status
app.get('/api/autonomous/status', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyIdQuery = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, companyIdQuery);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const companyId = resolved.companyId;
    const company = await getCompanyById(companyId);

    if(!company){res.status(404).json({success:false,error:'Workspace not found'});return;}
    const rawAutopilot:unknown=company.autopilot_enabled;if(![true,false,0,1].some(value=>value===rawAutopilot)){res.status(503).json({success:false,error:'Autopilot state unavailable'});return;}
    const actions = await getAutonomousActionsByCompany(companyId);
    const recommendations = await getAutonomousRecommendationsByCompany(companyId);
    const pendingApprovals = actions.filter((a) => a.approval_status === 'pending_approval').length;

    res.json({
      success: true,
      companyId,
      autopilotEnabled: Boolean(company!.autopilot_enabled),
      globalEmergencyStop: isGlobalEmergencyStopActive(),
      activeKillSwitch: isGlobalEmergencyStopActive() || (company ? !company.autopilot_enabled : false),
      totalRecommendations: recommendations.length,
      totalActions: actions.length,
      pendingApprovals,
      lifecycleStage: 'OBSERVE_DETECT_ANALYZE_RECOMMEND_APPROVE_EXECUTE_VERIFY_MEASURE',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

registerAutonomousControlRoutes(app,{auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,stop:setGlobalEmergencyStop,isStopped:isGlobalEmergencyStopActive,autopilot:async(company,enabled)=>{
 const pool=await getDbPool();if(!pool)throw new Error('Durable control store unavailable');
 const [result]:any=await pool.query('UPDATE companies SET autopilot_enabled = ? WHERE id = ?',[enabled?1:0,company]);return result.affectedRows>0;
}});

// POST /api/autonomous/run-cycle - Trigger grounded observation & recommendation cycle
app.post('/api/autonomous/run-cycle', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = req.body.companyId || req.body.company_id;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const companyId = resolved.companyId;

    const approvalPolicy = req.body.approvalPolicy || {};
    const result = await runAutonomousCycle(companyId, approvalPolicy);

    res.json({
      success: true,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/autonomous/recommendations - List grounded recommendations
app.get('/api/autonomous/recommendations', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const companyId = resolved.companyId;

    const recommendations = await getAutonomousRecommendationsByCompany(companyId);
    res.json({
      success: true,companyId,
      count: recommendations.length,
      recommendations,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/autonomous/actions - List actions and execution state
app.get('/api/autonomous/actions', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const companyId = resolved.companyId;

    const actions = await getAutonomousActionsByCompany(companyId);
    res.json({
      success: true,companyId,
      count: actions.length,
      actions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/autonomous/actions/:id/approve - Approve an action
app.post('/api/autonomous/actions/:id/approve', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const actionId = req.params.id;
    const action = await getAutonomousActionById(actionId);
    if (!action) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    if(req.body?.companyId!==undefined&&req.body.companyId!==action.company_id){res.status(403).json({success:false,error:'Action workspace mismatch'});return;}
    const authCheck = await verifyCompanyWorkspaceAccess(user, action.company_id);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const updated = await updateAutonomousAction(actionId, {
      approval_status: 'approved',
    });

    if (action.recommendation_id) {
      await updateAutonomousRecommendationStatus(action.recommendation_id, 'approved');
    }

    await recordAutonomousAuditLog({
      company_id: action.company_id,
      action_id: actionId,
      actor: user.email || user.id,
      event_type: 'ACTION_APPROVED_BY_USER',
      details: { actionType: action.action_type },
    });

    res.json({
      success: true,
      action: updated,
      message: 'Action approved successfully. Ready for verified execution.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/autonomous/actions/:id/reject - Reject an action
app.post('/api/autonomous/actions/:id/reject', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const actionId = req.params.id;
    const action = await getAutonomousActionById(actionId);
    if (!action) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    if(req.body?.companyId!==undefined&&req.body.companyId!==action.company_id){res.status(403).json({success:false,error:'Action workspace mismatch'});return;}
    const authCheck = await verifyCompanyWorkspaceAccess(user, action.company_id);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const updated = await updateAutonomousAction(actionId, {
      approval_status: 'rejected',
      execution_state: 'blocked',
      error: 'Rejected by user',
    });

    if (action.recommendation_id) {
      await updateAutonomousRecommendationStatus(action.recommendation_id, 'rejected');
    }

    await recordAutonomousAuditLog({
      company_id: action.company_id,
      action_id: actionId,
      actor: user.email || user.id,
      event_type: 'ACTION_REJECTED_BY_USER',
      details: { actionType: action.action_type },
    });

    res.json({
      success: true,
      action: updated,
      message: 'Action rejected by user.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/autonomous/actions/:id/execute - Execute action through 8-Stage Gate
app.post('/api/autonomous/actions/:id/execute', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const actionId = req.params.id;
    const action = await getAutonomousActionById(actionId);
    if (!action) {
      res.status(404).json({ success: false, error: 'Action not found' });
      return;
    }

    if(req.body?.companyId!==undefined&&req.body.companyId!==action.company_id){res.status(403).json({success:false,error:'Action workspace mismatch'});return;}
    const authCheck = await verifyCompanyWorkspaceAccess(user, action.company_id);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const executionResult = await executeAutonomousAction(actionId, {
      userId: user.id,
      companyId: action.company_id,
      isPlatformAdmin: user.is_platform_admin,
      actor: user.email || user.full_name || user.id,
    });

    const httpStatus = executionResult.status === 'EXECUTED' ? 200 : 400;
    res.status(httpStatus).json({
      success: executionResult.status === 'EXECUTED',
      result: executionResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/autonomous/audit-logs - Retrieve immutable audit logs
app.get('/api/autonomous/audit-logs', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const requestedCompanyId = (req.query.companyId || req.query.company_id) as string | undefined;
    const resolved = await resolveUserCompanyId(user, requestedCompanyId);
    if (!resolved.companyId) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const companyId = resolved.companyId;

    const logs = await getAutonomousAuditLogsByCompany(companyId);
    res.json({
      success: true,companyId,
      count: logs.length,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ---------------- CUSTOM DOMAINS, DNS VERIFICATION & STATIC WEBSITE BUILDER ---------------- //

registerWebsiteRoutes(app,{auth:getAuthUserFromRequest,access:verifyCompanyWorkspaceAccess,domains:getCustomDomainsByCompany,domain:getCustomDomainById,create:createCustomDomain,verify:verifyDomainDns,saveDns:updateCustomDomainStatus,remove:deleteCustomDomain,config:getWebsiteConfigByCompany,save:upsertWebsiteConfig,zip:generateStaticExportZip});

// Preview standalone HTML
app.get('/api/companies/:id/website/preview-html', async (req, res) => {
  try {
    const companyId = req.params.id;
    const pageId = (req.query.page as string) || 'main';
    const company = await getCompanyById(companyId);
    if (!company) {
      res.status(404).send('<h1>Business Not Found</h1><p>The requested business workspace does not exist.</p>');
      return;
    }
    const config = await getWebsiteConfigByCompany(companyId);
    const html = generateStorefrontHtml(company as any, config, pageId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(503).send('<h1>Preview unavailable</h1>');
  }
});

// Public Live Storefront Route (Accessible directly by visitors & search engines)
app.get('/storefront/:companyId', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const pageId = (req.query.page as string) || 'main';
    const company = await getCompanyById(companyId);
    if (!company) {
      res.status(404).send('<h1>Storefront Not Found</h1><p>The requested business storefront is unavailable or does not exist.</p>');
      return;
    }
    const config = await getWebsiteConfigByCompany(companyId);
    const html = generateStorefrontHtml(company as any, config, pageId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(503).send('<h1>Storefront unavailable</h1>');
  }
});

// System Deployment & Environment Health Check
app.get('/api/system/status', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({
    app: 'Aaditech BGA',
    subdomain: 'bga.aaditechs.in',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    mysqlConfigured: dbStatus.configured,
    mysqlConnected: dbStatus.connected,
    telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ---------------- HOSTINGER SHARED-SAFE UNIVERSAL SCHEDULER & DURABLE JOB QUEUE ---------------- //

// Universal Scheduler & Durable Queue Tick (External Webhook Ping / Hostinger hPanel Cron)
registerSchedulerRoutes(app, {
  getCronSecret: () => process.env.CRON_SECRET,
  readHistory:async(before,limit)=>{const pool=await getDbPool();if(!pool)throw new Error('Dispatcher storage unavailable');return readDispatcherHistory(pool,before,limit);},
  getAuthUserFromRequest,
  runSchedulerTick,
});

// GET /api/companies/:id/jobs - Durable Job Queue Status & History
app.get('/api/companies/:id/jobs', async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const companyId = req.params.id;
    const authCheck = await verifyCompanyWorkspaceAccess(user, companyId);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 50;
    const [jobs, pendingCounts] = await Promise.all([
      getJobsByCompany(companyId, limit),
      getPendingJobsCount(companyId),
    ]);

    res.json({
      success: true,
      companyId,
      pendingCounts,
      count: jobs.length,
      jobs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

registerNotificationStatus(app, { getAuthUserFromRequest, verifyCompanyWorkspaceAccess, read: getCompanyNotificationStatus });

registerActionFeed(app, { getAuthUserFromRequest, verifyCompanyWorkspaceAccess, getCompanyActionFeed });

registerQueueAdmission(app, {
  getAuthUserFromRequest,
  verifyCompanyWorkspaceAccess,
  getPostById,
  getAllLeads,
  enqueueJob,
});

// Global process exception handlers to prevent unexpected process exit
process.on('unhandledRejection', (reason) => {
  console.warn('[Server] Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
});

async function startServer() {
  try {
    const isProductionDeployment = process.env.NODE_ENV === 'production' || process.env.IS_PRODUCTION === 'true';

    // Never migrate, seed, or grant administrator privileges on application startup.
    try {
      const report=await inspectDatabaseStartup({production:isProductionDeployment,getDbPool,verifySchema});
      console.log(`[Database] Startup status: ${report.status}; schema version: ${report.schemaVersion}.`);
    } catch {
      if(isProductionDeployment){
        console.error('FATAL: Database unavailable or schema not ready. Run approved database setup/migrations before starting this build.');
        process.exit(1);
      }
      console.warn('[Database] Non-production startup check unavailable; no schema or administrator changes attempted.');
    }

    let viteInstance: any = null;

    if (process.env.NODE_ENV !== 'production') {
      viteInstance = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(viteInstance.middlewares);
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api') || url.startsWith('/uploads')) {
          return next();
        }
        try {
          const indexPath = path.resolve(process.cwd(), 'index.html');
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await viteInstance.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          if (viteInstance) viteInstance.ssrFixStacktrace(e);
          next(e);
        }
      });
      console.log('[Server] Vite middleware mounted and ready.');
    } else {
      const distPath = path.join(process.cwd(), 'dist', 'client');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      // Start background automation scheduler (auto-publish, daily digest, review reminders)
      try {
        startScheduler();
      } catch (schedErr) {
        console.warn('[Server] Scheduler background initialization warning:', schedErr);
      }
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Server] Port ${PORT} currently in use. Retrying in 1s...`);
        setTimeout(() => {
          try {
            server.close();
          } catch {}
          server.listen(PORT, '0.0.0.0');
        }, 1000);
      } else {
        console.error('[Server] Fatal server error:', err);
      }
    });

    const cleanup = async () => {
      console.log('[Server] Shutting down gracefully...');
      try {
        stopScheduler();
      } catch {}
      if (viteInstance) {
        try {
          await viteInstance.close();
        } catch {}
      }
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();


