import {
  claimNextJob,
  completeJob,
  failJob,
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
import { generate3x3GridCoordinates, resolveRankProvider } from './localSeoProvider';
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
export async function executeJob(job: DbJobQueue): Promise<JobExecutionResult> {
  const { id: jobId, job_type: jobType, company_id: companyId, payload } = job;

  // Emergency kill switch safety gate
  if (isGlobalEmergencyStopActive()) {
    console.warn(`[JobQueue] Job ${jobId} execution BLOCKED: Global Emergency Kill Switch is ACTIVE.`);
    await failJob(jobId, 'BLOCKED_BY_GLOBAL_EMERGENCY_STOP', true);
    return {
      jobId,
      jobType,
      status: 'SKIPPED',
      error: 'Global emergency stop active',
    };
  }

  try {
    switch (jobType) {
      case 'publishing': {
        const postId = payload?.postId;
        if (!postId) {
          await failJob(jobId, 'INVALID_PAYLOAD: Missing postId for publishing job', false);
          return { jobId, jobType, status: 'FAILED', error: 'Missing postId' };
        }
        const post = await getPostById(postId);
        if (!post) {
          await failJob(jobId, `POST_NOT_FOUND: Post ${postId} does not exist`, false);
          return { jobId, jobType, status: 'FAILED', error: 'Post not found' };
        }

        const publishResult = await executePublishingJob(post);
        if (publishResult.overallStatus === 'PUBLISHED' || publishResult.overallStatus === 'SKIPPED_ALREADY_PUBLISHED') {
          await completeJob(jobId, publishResult);
          return { jobId, jobType, status: 'SUCCEEDED', result: publishResult };
        } else {
          const isRetryable = publishResult.platformResults.some((r) => r.errorType === 'RETRYABLE');
          await failJob(jobId, publishResult.message || 'Publishing failed', isRetryable);
          return { jobId, jobType, status: 'FAILED', error: publishResult.message };
        }
      }

      case 'seo_scan': {
        const keyword = payload?.keyword;
        const centerLat = Number(payload?.centerLat) || 19.033;
        const centerLng = Number(payload?.centerLng) || 73.0297;
        const city = payload?.city || 'Navi Mumbai';

        if (!keyword) {
          await failJob(jobId, 'INVALID_PAYLOAD: Missing keyword for SEO scan', false);
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

        if (scanResult.observations && scanResult.observations.length > 0) {
          try {
            await saveRankObservations(companyId, keyword, scanResult.observations);
          } catch (dbSaveErr) {
            console.warn('[JobQueue] Non-fatal saveRankObservations warning:', dbSaveErr);
          }
        }

        await completeJob(jobId, scanResult);
        return { jobId, jobType, status: 'SUCCEEDED', result: scanResult };
      }

      case 'competitor_scan': {
        const competitorId = payload?.competitorId;
        const competitorName = payload?.competitorName;
        const placeId = payload?.placeId;

        if (!competitorId || !competitorName) {
          await failJob(jobId, 'INVALID_PAYLOAD: Missing competitor details', false);
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

        if (obsResult) {
          try {
            await saveCompetitorObservation({
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
          } catch (dbSaveErr) {
            console.warn('[JobQueue] Non-fatal saveCompetitorObservation warning:', dbSaveErr);
          }
        }

        await completeJob(jobId, obsResult);
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
        await completeJob(jobId, {
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
          await failJob(jobId, `LEAD_NOT_FOUND: Lead ${leadId} not found`, false);
          return { jobId, jobType, status: 'FAILED', error: 'Lead not found' };
        }
        const outcome = {
          leadId,
          stage: lead.stage,
          intentScore: lead.intent_score,
          nurtureAction: lead.stage === 'new' ? 'SEND_WELCOME_WHATSAPP' : 'FOLLOW_UP_REMINDER',
          evaluatedAt: new Date().toISOString(),
        };
        await completeJob(jobId, outcome);
        return { jobId, jobType, status: 'SUCCEEDED', result: outcome };
      }

      default: {
        console.warn(`[JobQueue] Unknown job type encountered: ${jobType}`);
        await failJob(jobId, `UNSUPPORTED_JOB_TYPE: ${jobType}`, false);
        return { jobId, jobType, status: 'FAILED', error: `Unsupported job type: ${jobType}` };
      }
    }
  } catch (err: any) {
    console.error(`[JobQueue] Error executing job ${jobId}:`, err?.message);
    await failJob(jobId, err?.message || 'Unexpected job execution error', true);
    return { jobId, jobType, status: 'FAILED', error: err?.message };
  }
}

/**
 * Ticks the job queue by claiming up to `batchSize` eligible jobs and executing them sequentially.
 * Safe for single-node Hostinger shared hosting and multi-worker invocation.
 */
export async function tickJobQueue(
  workerId = `worker_${process.pid}_${Math.random().toString(36).substring(2, 7)}`,
  batchSize = 5
): Promise<QueueTickSummary> {
  const summary: QueueTickSummary = {
    workerId,
    processedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    jobs: [],
    timestamp: new Date().toISOString(),
  };

  for (let i = 0; i < batchSize; i++) {
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
