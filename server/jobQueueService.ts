import {clientArchived} from './agencyPolicy';
import {executeWebsiteImportJob} from './websiteImportJobs';
import {executeKnowledgeExtractionJob,recoverKnowledgeIngestion} from './knowledgeIngestion';
import {publishingExecutionBlock} from './publishingExecutionControls';
import type {PauseReason} from './queueSql';
import { scheduledPostKey } from './scheduledPublishing';
import { isScheduledTimePassed } from './scheduleTime';
import {
  getDbPool,
  claimNextJob,
  renewJobLease,
  completeJob,
  failJob,
  deferJob,
  getCompanyById,
  getPostById,
  getCompanyReviews,
  getAllLeads,
  getCompanyIntegrations,
  saveRankObservations,
  saveCompetitorObservation,
  DbJobQueue,
} from './db';
import { executePublishingJob } from './publishingEngine';
import { isGlobalEmergencyStopActive } from './autonomousEngine';
import { generate3x3GridCoordinates, resolveRankProvider, resolveCenterCoordinates } from './localSeoProvider';
import { resolveCompetitorProvider } from './competitorProvider';
import { buildStructuredEvidence, generateDeterministicSummary } from './aiExecutiveSummary';

export interface JobExecutionResult {
  jobId: string;
  jobType: string;
  status: 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  result?: any;
  error?: string;
}

export interface QueueTickSummary {
  workerId: string;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  jobs: JobExecutionResult[];
  timestamp: string;
}

/**
 * Executes a single claimed job according to its registered job_type.
 * Guarantees zero false completion: never marks a job succeeded if provider or operation failed.
 */
// Persistence seam permits deterministic failure/recovery contract tests without a live DB.
export async function executeJob(
  job: DbJobQueue,
  persistence: {
    saveRankObservations: typeof saveRankObservations;
    saveCompetitorObservation: typeof saveCompetitorObservation;
  } = { saveRankObservations, saveCompetitorObservation }
): Promise<JobExecutionResult> {
  const { id: jobId, job_type: jobType, company_id: companyId, payload } = job;

  const lease = job.status === 'RUNNING' && job.locked_by ? { workerId: job.locked_by, attempt: job.attempts } : undefined;
  let leaseLost = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const complete = async (id: string, result?: Record<string, any>) => {
    if (leaseLost) throw new Error('JOB_LEASE_LOST');
    const updated = await completeJob(id, result, lease);
    if (!updated) throw new Error('JOB_LEASE_LOST');
    return updated;
  };
  const fail = async (id: string, error: string, retryable = true) => {
    if (leaseLost) throw new Error('JOB_LEASE_LOST');
    const updated = await failJob(id, error, retryable, lease);
    if (!updated) throw new Error('JOB_LEASE_LOST');
    return updated;
  };

  try {
    if (lease) {
      if (!await renewJobLease(jobId, lease)) throw new Error('JOB_LEASE_LOST');
      let renewing = false;
      heartbeat = setInterval(async () => {
        if (renewing || leaseLost) return;
        renewing = true;
        try { leaseLost = !await renewJobLease(jobId, lease); }
        catch { leaseLost = true; }
        finally { renewing = false; }
      }, 60_000);
      heartbeat.unref();
    }
    const defer=async(reason:PauseReason)=>{
      if(leaseLost || !await deferJob(jobId,reason,lease))throw new Error('JOB_LEASE_LOST');
      return {jobId,jobType,status:'SKIPPED' as const,error:reason};
    };
    if(isGlobalEmergencyStopActive())return await defer('GLOBAL_EMERGENCY_STOP');
    const operationsPool=await getDbPool();if(operationsPool&&await clientArchived(operationsPool,companyId))return await defer('CLIENT_ARCHIVED');
    switch (jobType) {
      case 'website_import': {const pool=await getDbPool();if(!pool)throw new Error('KNOWLEDGE_STORAGE_UNAVAILABLE');return await executeWebsiteImportJob(pool,job);}
      case 'knowledge_extract': {const pool=await getDbPool();if(!pool)throw new Error('KNOWLEDGE_STORAGE_UNAVAILABLE');return await executeKnowledgeExtractionJob(pool,job);}
      case 'publishing': {
        const postId = payload?.postId;
        if (!postId) {
          await fail(jobId, 'INVALID_PAYLOAD: Missing postId for publishing job', false);
          return { jobId, jobType, status: 'FAILED', error: 'Missing postId' };
        }
        const post = await getPostById(postId);
        if (!post) {
          await fail(jobId, `POST_NOT_FOUND: Post ${postId} does not exist`, false);
          return { jobId, jobType, status: 'FAILED', error: 'Post not found' };
        }

        if (post.company_id !== companyId) {
          await fail(jobId, 'TENANT_MISMATCH: Post does not belong to job company', false);
          return { jobId, jobType, status: 'FAILED', error: 'Post does not belong to job company' };
        }

        if (payload.scheduleOccurrence) {
          const guardError = payload.scheduleOccurrence !== scheduledPostKey(post) ? 'SCHEDULE_CHANGED'
            : post.status !== 'scheduled' && post.status !== 'published' ? 'POST_NOT_SCHEDULED'
            : !isScheduledTimePassed(post.scheduled_date, post.scheduled_time, post.time_slot) ? 'SCHEDULE_NOT_DUE' : null;
          if (guardError) {
            await fail(jobId, guardError, false);
            return { jobId, jobType, status: 'FAILED', error: guardError };
          }
        }

        const pause=await publishingExecutionBlock(companyId,'automatic',post.platforms?.length?post.platforms:[post.channel || 'google']);if(pause)return await defer(pause);
        const publishResult = await executePublishingJob(post,{executionMode:'automatic'});
        if(publishResult.deferredReason)return await defer(publishResult.deferredReason);
        if (publishResult.overallStatus === 'PUBLISHED' || publishResult.overallStatus === 'SKIPPED_ALREADY_PUBLISHED') {
          await complete(jobId, publishResult);
          return { jobId, jobType, status: 'SUCCEEDED', result: publishResult };
        } else {
          const isRetryable = !publishResult.platformResults.some(r => r.status === 'UNKNOWN') && publishResult.platformResults.some(r => r.errorType === 'RETRYABLE');
          await fail(jobId, publishResult.message || 'Publishing failed', isRetryable);
          return { jobId, jobType, status: 'FAILED', error: publishResult.message };
        }
      }

      case 'seo_scan': {
        const keyword = payload?.keyword;
        const city = payload?.city;
        const hasCoordinates = payload?.centerLat != null || payload?.centerLng != null;
        const coordinates = hasCoordinates
          ? (typeof payload.centerLat === 'number' && typeof payload.centerLng === 'number'
              && Number.isFinite(payload.centerLat) && Number.isFinite(payload.centerLng)
              && Math.abs(payload.centerLat) <= 90 && Math.abs(payload.centerLng) <= 180
            ? { lat: payload.centerLat, lng: payload.centerLng } : null)
          : resolveCenterCoordinates(city);
        if (!coordinates) {
          await fail(jobId, 'LOCATION_NOT_RESOLVED: Valid coordinates or a supported city are required', false);
          return { jobId, jobType, status: 'FAILED', error: 'LOCATION_NOT_RESOLVED' };
        }
        const { lat: centerLat, lng: centerLng } = coordinates;

        if (!keyword) {
          await fail(jobId, 'INVALID_PAYLOAD: Missing keyword for SEO scan', false);
          return { jobId, jobType, status: 'FAILED', error: 'Missing keyword' };
        }

        const company = await getCompanyById(companyId);
        const integrations = await getCompanyIntegrations(companyId);
        const creds = integrations.find((i) => i.provider === 'dataforseo' || i.provider === 'serpapi')?.credentials || {};
        const provider = resolveRankProvider(creds);
        const gridCoords = generate3x3GridCoordinates(centerLat, centerLng);

        const scanResult = await provider.scanRankGrid(
          {
            companyId,
            businessName: company?.name || 'Local Business',
            keyword,
            city,
            centerLat,
            centerLng,
            coordinates: gridCoords,
          },
          creds
        );

        if (!['LIVE', 'VERIFIED'].includes(scanResult.status) || !scanResult.observations?.length) {
          const error = `SCAN_NOT_COMPLETE: ${scanResult.status}`;
          await fail(jobId, error, scanResult.status !== 'UNAVAILABLE');
          return { jobId, jobType, status: 'FAILED', error, result: scanResult };
        }
        await persistence.saveRankObservations(companyId, keyword, scanResult.observations);

        await complete(jobId, scanResult);
        return { jobId, jobType, status: 'SUCCEEDED', result: scanResult };
      }

      case 'competitor_scan': {
        const competitorId = payload?.competitorId;
        const competitorName = payload?.competitorName;
        const placeId = payload?.placeId;

        if (!competitorId || !competitorName) {
          await fail(jobId, 'INVALID_PAYLOAD: Missing competitor details', false);
          return { jobId, jobType, status: 'FAILED', error: 'Missing competitor details' };
        }

        const integrations = await getCompanyIntegrations(companyId);
        const googleCreds = integrations.find((i) => i.provider === 'google')?.credentials;
        const serpCreds = integrations.find((i) => i.provider === 'serpapi')?.credentials;
        const provider = resolveCompetitorProvider(googleCreds, serpCreds);

        const obsResult = await provider.fetchCompetitorObservation(
          {
            companyId,
            competitorId,
            name: competitorName,
            placeId,
          },
          googleCreds || serpCreds
        );

        if (!obsResult || !['LIVE', 'VERIFIED'].includes(obsResult.dataClassification)) {
          const error = `OBSERVATION_UNAVAILABLE: ${obsResult?.dataClassification || 'EMPTY'}`;
          await fail(jobId, error, false);
          return { jobId, jobType, status: 'FAILED', error, result: obsResult };
        }
        await persistence.saveCompetitorObservation({
              id: obsResult.id || `cobs_${crypto.randomUUID().replace(/-/g, '')}`,
              company_id: companyId,
              competitor_id: competitorId,
              name: competitorName,
              place_id: obsResult.placeId || placeId || null,
              address: obsResult.address || null,
              rating: obsResult.rating ?? null,
              reviews_count: obsResult.reviewsCount ?? null,
              photos_count: obsResult.photosCount ?? null,
              posts_per_week: obsResult.postsPerWeek ?? null,
              rank_position: obsResult.rankPosition ?? null,
              provider: obsResult.provider,
              timestamp: obsResult.timestamp || new Date().toISOString(),
              status: (obsResult.dataClassification as any) || 'UNAVAILABLE',
              raw_payload: obsResult.rawPayload ? JSON.stringify(obsResult.rawPayload) : null,
        });

        await complete(jobId, obsResult);
        return { jobId, jobType, status: 'SUCCEEDED', result: obsResult };
      }

      case 'ai_summary': {
        const company = await getCompanyById(companyId);
        const reviews = await getCompanyReviews(companyId);
        const leads = await getAllLeads(companyId);
        const evidence = buildStructuredEvidence({
          businessProfile: company as any,
          reviews,
          leads,
        });
        const summary = generateDeterministicSummary(
          company?.name || 'Local Business',
          company?.city || 'Local Area',
          evidence
        );
        await complete(jobId, {
          summary,
          evidenceCounts: { reviews: reviews.length, leads: leads.length },
        });
        return { jobId, jobType, status: 'SUCCEEDED', result: summary };
      }

      case 'lead_nurture': {
        const leadId = payload?.leadId;
        const leads = await getAllLeads(companyId);
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) {
          await fail(jobId, `LEAD_NOT_FOUND: Lead ${leadId} not found`, false);
          return { jobId, jobType, status: 'FAILED', error: 'Lead not found' };
        }
        const outcome = {
          leadId,
          stage: lead.stage,
          intentScore: lead.intent_score,
          nurtureAction: lead.stage === 'new' ? 'SEND_WELCOME_WHATSAPP' : 'FOLLOW_UP_REMINDER',
          evaluatedAt: new Date().toISOString(),
        };
        await complete(jobId, outcome);
        return { jobId, jobType, status: 'SUCCEEDED', result: outcome };
      }

      default: {
        console.warn(`[JobQueue] Unknown job type encountered: ${jobType}`);
        await fail(jobId, `UNSUPPORTED_JOB_TYPE: ${jobType}`, false);
        return { jobId, jobType, status: 'FAILED', error: `Unsupported job type: ${jobType}` };
      }
    }
  } catch (err: any) {
    console.error(`[JobQueue] Error executing job ${jobId}:`, err?.message);
    if (err?.message !== 'JOB_LEASE_LOST') {
      await failJob(jobId, err?.message || 'Unexpected job execution error', true, lease);
    }
    return { jobId, jobType, status: 'FAILED', error: err?.message };
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
}

/**
 * Ticks the job queue by claiming up to `batchSize` eligible jobs and executing them sequentially.
 * Safe for single-node Hostinger shared hosting and multi-worker invocation.
 */
export async function tickJobQueue(
  workerId = `worker_${process.pid}_${Math.random().toString(36).substring(2, 7)}`,
  batchSize = 5,
  canStart: () => boolean = () => true
): Promise<QueueTickSummary> {
  const summary: QueueTickSummary = {
    workerId,
    processedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    jobs: [],
    timestamp: new Date().toISOString(),
  };

  if(!(batchSize>0))return summary;
  if(canStart()&&!isGlobalEmergencyStopActive())try{const pool=await getDbPool();if(pool)await recoverKnowledgeIngestion(pool,canStart);}catch{console.warn('[JobQueue] Knowledge admission/reconciliation unavailable');}
  for (let i = 0; i < batchSize; i++) {
    if (!canStart()) break;
    const job = await claimNextJob(workerId);
    if (!job) break; // No more due jobs in queue

    summary.processedCount++;
    const res = await executeJob(job);
    summary.jobs.push(res);
    if (res.status === 'SUCCEEDED') summary.succeededCount++;
    if (res.status === 'FAILED') summary.failedCount++;
  }

  return summary;
}
