import {claimDispatcherTick,checkpointDispatcherStage,settleDispatcherTick} from './dispatcherStore';
import {runDispatcherCycle,dispatcherSummary} from './dispatcherCycle';
import { createWorkBudget, type WorkGate } from './workBudget';
import { getDigestSummary, getReviewReminderSummary, getDailyWorkDigest } from './notificationSummaryService';
import { getScheduledPostBatch } from './scheduledPostBatchService';
import { getNotificationCompanyBatch } from './notificationBatchService';
import { PLATFORM_TIME_ZONE } from '../shared/platformTime';
import { sendScheduledNotification } from './scheduledNotifications';
import { latestNotificationDue } from './notificationOccurrences';
import { admitScheduledPosts } from './scheduledPublishing';
import { processInternalActionFeed } from './actionFeedService';
/**
 * Internal and external ticks share durable queue admission/execution for posts.
 * Digests/reminders use persisted latest-due occurrences with conservative UNKNOWN
 * outcomes after uncertain dispatch. Provider reconciliation and report UI remain pending.
 */

import cron, { ScheduledTask } from 'node-cron';
import {
  getDbPool,
  enqueueJob,
  getCompanyById,
} from './db';
import { isGlobalEmergencyStopActive } from './autonomousEngine';

// Global registration guard for development hot-reloads and container lifecycles
declare global {
  // eslint-disable-next-line no-var
  var __abga_scheduler_started: boolean | undefined;
  // eslint-disable-next-line no-var
  var __abga_cron_tasks: ScheduledTask[] | undefined;
}

interface SchedulerStatus {
  running: boolean;
  tasksCount: number;
  lastPublishRun?: string;
  lastDailyDigestRun?: string;
  lastHourlyReminderRun?: string;
  stats: {
    totalPostsPublished: number;
    totalDailyDigestsSent: number;
    totalHourlyRemindersSent: number;
  };
}

const schedulerStatus: SchedulerStatus = {
  running: false,
  tasksCount: 0,
  stats: {
    totalPostsPublished: 0,
    totalDailyDigestsSent: 0,
    totalHourlyRemindersSent: 0,
  },
};

/**
 * Evaluates whether a post's scheduled date and time has passed.
 * Supports ISO strings, YYYY-MM-DD dates, and standard 12/24-hour time strings.
 */
export { isScheduledTimePassed } from './scheduleTime';

/** Admit overdue scheduled posts to the durable queue; never call providers here. */
export async function runAutoPublishJob(canStart: WorkGate = () => true) {
  schedulerStatus.lastPublishRun = new Date().toISOString();
  const admission = await admitScheduledPosts({ getScheduledPosts: getScheduledPostBatch, getCompanyById, enqueueJob, isStopped: isGlobalEmergencyStopActive, canStart });
  return admission;
}

/**
 * JOB B: Compile and send Daily Morning Digest.
 * Runs once daily (e.g. 8:00 AM IST).
 * For each company: compiles new leads count (last 24h), new reviews count (last 24h),
 * and average rating change, and dispatches to its own configured Telegram recipient.
 */
export async function runDailyDigestJob(tickTime = Date.now(), canStart: WorkGate = () => true): Promise<{
  companiesProcessed: number;
  digestsSent: number;
  companiesSelected: number;
  companiesDeferred: number;
  failedCompanies: number;
  readTimeouts: number;
  workReportsUnavailable:number;
}> {
  const timestamp = new Date().toISOString();
  schedulerStatus.lastDailyDigestRun = timestamp;
  console.log(`[Scheduler:DailyDigest] [${timestamp}] Generating morning business digests...`);

  const companies = canStart() ? await getNotificationCompanyBatch('daily_digest') : [];
  const now = latestNotificationDue('daily_digest', tickTime);
  let workReportsUnavailable=0;
  let digestsSent = 0;
  let companiesProcessed = 0, failedCompanies = 0, readTimeouts = 0;

  for (const comp of companies) {
    if (!canStart()) break;
    companiesProcessed++;
    try {
      const summary = await getDigestSummary(comp.id, now);
      const workReport=await getDailyWorkDigest(comp.id,now,canStart);
      if(!workReport.available && !workReport.deferred)workReportsUnavailable++;
      if(workReport.readTimedOut)readTimeouts++;
      const overallAvgRating = summary.averageRating;
      const ratingDiff = summary.averageRating !== null && summary.olderAverageRating !== null
        ? summary.averageRating - summary.olderAverageRating : null;
      const deltaSummary = ratingDiff === null ? 'Comparison unavailable'
        : ratingDiff > 0.05 ? `+${ratingDiff.toFixed(2)} ★ (Improved)`
        : ratingDiff < -0.05 ? `${ratingDiff.toFixed(2)} ★ (Decreased)` : 'Stable';

      const dateHeader = new Date(now).toLocaleDateString('en-IN', {
        timeZone: PLATFORM_TIME_ZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const digestMessage = `🌅 *DAILY MORNING DIGEST — ${comp.name}*
📍 *City:* ${comp.city || 'National'}
📅 *Date:* ${dateHeader}

📊 *24-Hour Operations Summary:*
🔥 *New Inbound Leads:* ${summary.recentLeads}
⭐ *Newly Recorded Reviews:* ${summary.recentReviews}
📈 *Recorded Average Rating:* ${overallAvgRating !== null ? `${overallAvgRating.toFixed(1)} ★` : 'No ratings yet'} (${deltaSummary})
🎯 *Local Growth Score:* ${comp.score !== null && comp.score !== undefined ? `${comp.score} / 100` : 'N/A (Pending initial data)'}

${summary.leadSample ? `💼 *Recent Inquiry:* ${summary.leadSample.name} (${summary.leadSample.service || 'Consultation'})` : 'ℹ️ No recorded new leads in this reporting window.'}
${summary.reviewSample ? `💬 *Latest Recorded Review:* ${summary.reviewSample.author} (${summary.reviewSample.rating === null ? 'Unrated' : `${summary.reviewSample.rating}★`})` : ''}
${summary.missingLeadTime || summary.missingReviewTime ? `⚠️ Excluded from timed counts: ${summary.missingLeadTime} lead(s), ${summary.missingReviewTime} review(s) without a canonical recorded timestamp.` : ''}

${workReport.text}

📱 *Live Dashboard:* https://bga.aaditechs.in`;

      const sent = await sendScheduledNotification(comp.id, 'daily_digest', now, digestMessage, canStart);
      if (sent) {
        digestsSent += 1;
        schedulerStatus.stats.totalDailyDigestsSent += 1;
      }
      console.log(`[Scheduler:DailyDigest] Processed digest for "${comp.name}" (sent: ${sent}).`);
    } catch (err: any) {
      failedCompanies++;
      if (err?.code === 'READ_ONLY_SQL_TIMEOUT') readTimeouts++;
      console.error(`[Scheduler:DailyDigest] Error generating digest for company "${comp.id}":`, err?.message);
    }
  }

  console.log(`[Scheduler:DailyDigest] Completed. Sent ${digestsSent} digests across ${companies.length} companies.`);
  return {
    companiesProcessed, companiesSelected: companies.length, companiesDeferred: companies.length - companiesProcessed, failedCompanies, readTimeouts,
    digestsSent,workReportsUnavailable,
  };
}

/**
 * JOB C: Hourly Review Reply Reminder.
 * Runs every hour (e.g. 0 * * * *).
 * Finds reviews where reply_text is empty/null and created_at is older than 24 hours,
 * and sends a single batched Telegram reminder per company listing how many reviews
 * still need a reply.
 */
export async function runHourlyReviewReminderJob(tickTime = Date.now(), canStart: WorkGate = () => true): Promise<{
  companiesChecked: number;
  remindersSent: number;
  totalPendingReviews: number;
  companiesSelected: number;
  companiesDeferred: number;
  failedCompanies: number;
  readTimeouts: number;
}> {
  const timestamp = new Date().toISOString();
  schedulerStatus.lastHourlyReminderRun = timestamp;
  console.log(`[Scheduler:HourlyReviewReminder] [${timestamp}] Checking unanswered reviews older than 24h...`);

  const companies = canStart() ? await getNotificationCompanyBatch('review_reminder') : [];
  const now = latestNotificationDue('review_reminder', tickTime);
  let remindersSent = 0;
  let companiesChecked = 0, failedCompanies = 0, readTimeouts = 0;
  let totalPendingReviews = 0;

  for (const comp of companies) {
    if (!canStart()) break;
    companiesChecked++;
    try {
      const summary = await getReviewReminderSummary(comp.id, now);
      if (summary.pendingReviews > 0 && summary.sample) {
        totalPendingReviews += summary.pendingReviews;
        const lowestRating = summary.lowestRating;
        const sampleReview = summary.sample;
        const count = summary.pendingReviews;

        const reminderMsg = `⚠️ *ACTION REQUIRED: UNREPLIED REVIEWS (>24H) — ${comp.name}*

🔔 *${count}* customer review${count > 1 ? 's' : ''} older than 24 hours ${count > 1 ? 'are' : 'is'} awaiting your reply!
⭐ *Lowest Pending Rating:* ${lowestRating === null ? 'Unrated' : `${lowestRating} ★`}
👤 *Sample Reviewer:* ${sampleReview.author} (${sampleReview.rating === null ? 'Unrated' : `${sampleReview.rating} ★`})
💬 *Excerpt:* "${sampleReview.excerpt ? sampleReview.excerpt + (sampleReview.truncated ? '…' : '') : 'No review text provided'}"

${summary.missingReviewTime ? `⚠️ ${summary.missingReviewTime} additional unanswered review(s) have no canonical timestamp; age is unknown.` : ''}
⚡ Review and respond to recorded customer feedback.
👉 Open https://bga.aaditechs.in/ to generate 1-click AI replies.`;

        const sent = await sendScheduledNotification(comp.id, 'review_reminder', now, reminderMsg, canStart);
        if (sent) {
          remindersSent += 1;
          schedulerStatus.stats.totalHourlyRemindersSent += 1;
        }
        console.log(
          `[Scheduler:HourlyReviewReminder] Alerted ${comp.name} for ${count} pending review(s) (sent: ${sent}).`
        );
      }
    } catch (err: any) {
      failedCompanies++;
      if (err?.code === 'READ_ONLY_SQL_TIMEOUT') readTimeouts++;
      console.error(`[Scheduler:HourlyReviewReminder] Error for company "${comp.id}":`, err?.message);
    }
  }

  console.log(
    `[Scheduler:HourlyReviewReminder] Completed. Sent ${remindersSent} reminders for ${totalPendingReviews} total pending reviews.`
  );

  return {
    companiesChecked, companiesSelected: companies.length, companiesDeferred: companies.length - companiesChecked, failedCompanies, readTimeouts,
    remindersSent,
    totalPendingReviews,
  };
}

/**
 * Starts the in-process background automation scheduler.
 * Guards against duplicate registrations caused by development hot-reloads.
 */
export function startScheduler(): void {
  if (global.__abga_scheduler_started) {
    console.log('[Scheduler] Background automation scheduler is already running. Skipping duplicate initialization.');
    return;
  }

  console.log('[Scheduler] Initializing ABGA Autonomous Background Engine...');

  const tasks: ScheduledTask[] = [];

  // JOB 1: Every 5 minutes (Auto-publish scheduled content posts)
  // Cron: */5 * * * *
  const autoPublishTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await runSchedulerTick();
    } catch (err: any) {
      console.error('[Scheduler:Cron:AutoPublish] Unhandled execution error:', err?.message);
    }
  });
  tasks.push(autoPublishTask);

  // Mark as started in memory and global scope
  global.__abga_scheduler_started = true;
  global.__abga_cron_tasks = tasks;
  schedulerStatus.running = true;
  schedulerStatus.tasksCount = tasks.length;

  console.log(
    `[Scheduler] ABGA Background Engine initialized successfully with ${tasks.length} active cron jobs:
   • Auto-Publish: Every 5 minutes (*/5 * * * *)
   • Daily Digest: Latest due 8:00 AM IST occurrence through shared tick
   • Review Alerts: Latest due IST hour through shared tick`
  );
}

/**
 * Stops all registered background cron tasks.
 */
export function stopScheduler(): void {
  if (global.__abga_cron_tasks && Array.isArray(global.__abga_cron_tasks)) {
    for (const task of global.__abga_cron_tasks) {
      try {
        task.stop();
      } catch {}
    }
    global.__abga_cron_tasks = [];
  }
  global.__abga_scheduler_started = false;
  schedulerStatus.running = false;
  schedulerStatus.tasksCount = 0;
  console.log('[Scheduler] Background automation engine stopped.');
}

import { tickJobQueue } from './jobQueueService';

/**
 * Universal Scheduler & Queue Tick.
 * Can be executed by:
 * 1. Internal in-process timer
 * 2. External HTTP webhook ping (Hostinger hPanel cron: POST /api/scheduler/tick)
 */
export async function runSchedulerTick() {
  const timestamp=new Date().toISOString(),budget=createWorkBudget();
  const deferred={deferred:true,reason:'DISPATCHER_STORAGE_UNAVAILABLE'};
  let admittedSlot:string|undefined;
  const unavailable=()=>({timestamp,available:false,status:'UNAVAILABLE',autoPublish:deferred,queue:deferred,outbox:deferred,notifications:{digest:deferred,reminders:deferred},budget:{...budget.report(),deferredStages:['autoPublish','queue','outbox','digest','reminders']}});
  try{
    const pool=await getDbPool();if(!pool)return unavailable();
    const claim=await claimDispatcherTick(pool);
    if(!claim)return {timestamp,available:true,status:'EXISTING',budget:{...budget.report(),deferredStages:[]}};
    admittedSlot=claim.slot;const tickTime=Number(BigInt(claim.slot)*60000n);
    const stages={autoPublish:(gate:WorkGate)=>runAutoPublishJob(gate),queue:(gate:WorkGate)=>tickJobQueue(`scheduler_${process.pid}`,5,gate),outbox:(gate:WorkGate)=>processInternalActionFeed(gate),digest:(gate:WorkGate)=>runDailyDigestJob(tickTime,gate),reminders:(gate:WorkGate)=>runHourlyReviewReminderJob(tickTime,gate)};
    const cycle=await runDispatcherCycle(claim.firstGroup,stages,(stage,state)=>checkpointDispatcherStage(pool,claim,stage,state),budget);
    await settleDispatcherTick(pool,claim,cycle.partial);
    return {timestamp,available:true,status:cycle.partial?'PARTIAL':'COMPLETED',slot:claim.slot,firstGroup:claim.firstGroup,stageStates:cycle.states,autoPublish:dispatcherSummary(cycle.results.autoPublish),queue:dispatcherSummary(cycle.results.queue),outbox:dispatcherSummary(cycle.results.outbox),notifications:{digest:dispatcherSummary(cycle.results.digest),reminders:dispatcherSummary(cycle.results.reminders)},budget:cycle.budget};
  }catch{if(!admittedSlot)return unavailable();const unknown={unconfirmed:true,reason:'DISPATCHER_JOURNAL_UNCONFIRMED'};return {timestamp,available:false,status:'UNCONFIRMED',slot:admittedSlot,autoPublish:unknown,queue:unknown,outbox:unknown,notifications:{digest:unknown,reminders:unknown},budget:{...budget.report(),deferredStages:[]}};}
}

/**
 * Returns current health and diagnostic statistics for the scheduler.
 */
export function getSchedulerStatus(): SchedulerStatus {
  return { ...schedulerStatus };
}
