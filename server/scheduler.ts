/**
 * ============================================================================
 * ARCHITECTURAL NOTICE: IN-PROCESS BACKGROUND AUTOMATION SCHEDULER
 * ============================================================================
 * IMPORTANT: This scheduler runs as an in-process cron daemon within the single
 * Node.js Express server process. It functions reliably as long as this single
 * Node.js instance stays active and running.
 *
 * HORIZONTAL SCALING & MULTI-REPLICA DEPLOYMENT WARNING:
 * If this application is ever deployed across multiple server instances,
 * load-balanced containers, or auto-scaled Cloud Run / Kubernetes replicas,
 * this in-process scheduler will cause duplicate task execution across nodes.
 *
 * In such multi-instance environments, these scheduled cron jobs MUST be moved
 * to a dedicated distributed task queue architecture (such as BullMQ + Redis,
 * Temporal, or GCP Cloud Tasks / Cloud Scheduler) using a distributed-locking
 * or leader-election mechanism (such as Redlock or database lock tables)
 * to guarantee strict at-most-once execution across instances.
 * ============================================================================
 */

import cron, { ScheduledTask } from 'node-cron';
import {
  getAllScheduledPosts,
  updateContentPostStatus,
  getAllCompanies,
  getAllLeads,
  getCompanyReviews,
  sendTelegramPushAlert,
  getCompanyById,
  getCompanyIntegration,
  DbContentPost,
  DbCompany,
} from './db';
import { executePublishingJob } from './publishingEngine';

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
export function isScheduledTimePassed(
  scheduledDate?: string | null,
  scheduledTime?: string | null,
  timeSlot?: string | null
): boolean {
  if (!scheduledDate || typeof scheduledDate !== 'string') return false;

  const now = Date.now();
  const trimmedDate = scheduledDate.trim();

  // 1. Direct ISO / Datetime strings with time components (e.g. 2026-09-13T10:00:00.000Z or 2026-09-13 14:00:00)
  if (trimmedDate.includes('T') || (trimmedDate.includes(':') && trimmedDate.includes(' '))) {
    const parsedIso = Date.parse(trimmedDate);
    if (!isNaN(parsedIso)) {
      return parsedIso <= now;
    }
  }

  // 2. Date in YYYY-MM-DD format
  const dateMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const day = parseInt(dateMatch[3], 10);

    const rawTime = (scheduledTime || timeSlot || '').trim();
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let hasTimeComponent = false;

    if (rawTime.includes(':')) {
      const ampmMatch = rawTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (ampmMatch) {
        hasTimeComponent = true;
        let h = parseInt(ampmMatch[1], 10);
        minutes = parseInt(ampmMatch[2], 10);
        seconds = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
        const ampm = ampmMatch[4]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        hours = h;
      }
    }

    if (hasTimeComponent) {
      const targetTime = new Date(year, month, day, hours, minutes, seconds).getTime();
      return targetTime <= now;
    } else {
      // If only date is specified with no time:
      // If the scheduled day is before today's calendar day, it has definitely passed.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const scheduledDay = new Date(year, month, day, 0, 0, 0);
      return scheduledDay.getTime() < today.getTime();
    }
  }

  // 3. Fallback generic date parser
  const genericParsed = Date.parse(trimmedDate);
  if (!isNaN(genericParsed)) {
    return genericParsed <= now;
  }

  return false;
}

/**
 * JOB A: Auto-publish scheduled content posts.
 * Runs every 5 minutes. Finds content_posts with status='scheduled' whose
 * scheduled_date has passed, flips them to status='published', and sends a
 * Telegram notification confirming auto-publish.
 */
export async function runAutoPublishJob(): Promise<{
  processed: number;
  publishedCount: number;
  publishedPosts: Array<{ id: string; title: string; companyId: string }>;
}> {
  const timestamp = new Date().toISOString();
  schedulerStatus.lastPublishRun = timestamp;
  console.log(`[Scheduler:AutoPublish] [${timestamp}] Checking scheduled content posts...`);

  const scheduledPosts = await getAllScheduledPosts();
  const publishedPosts: Array<{ id: string; title: string; companyId: string }> = [];

  for (const post of scheduledPosts) {
    if (isScheduledTimePassed(post.scheduled_date, post.scheduled_time, post.time_slot)) {
      try {
        // Execute strict publishing state machine: Content -> Job -> Provider API -> Provider Success -> Record -> PUBLISHED
        const jobResult = await executePublishingJob(post);

        if (jobResult.overallStatus === 'PUBLISHED') {
          publishedPosts.push({
            id: post.id,
            title: post.title || post.caption.slice(0, 40),
            companyId: post.company_id,
          });

          schedulerStatus.stats.totalPostsPublished += 1;
          console.log(
            `[Scheduler:AutoPublish] Successfully published post "${post.id}" ("${post.title || post.caption.slice(0, 30)}") for company "${post.company_id}". Providers: ${jobResult.message}`
          );

          // Fetch company details for rich Telegram alert
          let compName = post.company_id;
          try {
            const comp = await getCompanyById(post.company_id);
            if (comp?.name) compName = comp.name;
          } catch {}

          const mediaBadge = post.video_url ? '\n🎬 *Format:* 15-Second Remotion MP4 Reel Video' : '';
          const platforms = Array.isArray(post.platforms) && post.platforms.length > 0
            ? post.platforms
            : [post.channel || 'google'];

          const alertMsg = `🚀 *AUTONOMOUS ENGINE: POST PUBLISHED!*

🏢 *Business:* ${compName}
📝 *Title:* ${post.title || 'Campaign Update'}
🏷️ *Platforms:* ${platforms.join(', ')}${mediaBadge}
⏰ *Scheduled For:* ${post.scheduled_date} ${post.scheduled_time || post.time_slot || ''}
💬 *Caption Preview:* "${post.caption.slice(0, 140)}${post.caption.length > 140 ? '...' : ''}"

⚡ Published autonomously by ABGA Autopilot Engine. Status: ${jobResult.overallStatus}`;

          // Send Telegram alert confirming verified auto-publish
          sendTelegramPushAlert(alertMsg).catch((err) => {
            console.warn('[Scheduler:AutoPublish] Telegram alert dispatch notice:', err?.message);
          });
        } else if (jobResult.overallStatus === 'SKIPPED_ALREADY_PUBLISHED') {
          console.log(`[Scheduler:AutoPublish] Post "${post.id}" was already published. Skipped duplicate dispatch.`);
        } else if (jobResult.overallStatus === 'UNKNOWN') {
          console.warn(
            `[Scheduler:AutoPublish] Post "${post.id}" provider status is UNKNOWN (timeout/unconfirmed): ${jobResult.message}. Post marked as UNKNOWN.`
          );
        } else {
          console.warn(
            `[Scheduler:AutoPublish] Post "${post.id}" failed auto-publish requirements: ${jobResult.message}. Post marked as FAILED.`
          );
        }
      } catch (err: any) {
        console.error(`[Scheduler:AutoPublish] Failed to execute publishing job for post ${post.id}:`, err?.message);
      }
    }
  }

  console.log(
    `[Scheduler:AutoPublish] Finished. Examined ${scheduledPosts.length} posts, verified published ${publishedPosts.length}.`
  );

  return {
    processed: scheduledPosts.length,
    publishedCount: publishedPosts.length,
    publishedPosts,
  };
}

/**
 * JOB B: Compile and send Daily Morning Digest.
 * Runs once daily (e.g. 8:00 AM IST).
 * For each company: compiles new leads count (last 24h), new reviews count (last 24h),
 * and average rating change, and dispatches via sendTelegramPushAlert.
 */
export async function runDailyDigestJob(): Promise<{
  companiesProcessed: number;
  digestsSent: number;
}> {
  const timestamp = new Date().toISOString();
  schedulerStatus.lastDailyDigestRun = timestamp;
  console.log(`[Scheduler:DailyDigest] [${timestamp}] Generating morning business digests...`);

  const companies = await getAllCompanies();
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  let digestsSent = 0;

  for (const comp of companies) {
    try {
      // 1. Inbound Leads in last 24h
      const allLeads = await getAllLeads(comp.id);
      const recentLeads = allLeads.filter((l) => {
        if (!l.created_at) return false;
        const leadTime = new Date(l.created_at).getTime();
        return !isNaN(leadTime) && (now - leadTime) <= twentyFourHoursMs;
      });

      // 2. Reviews in last 24h and rating statistics
      const allReviews = await getCompanyReviews(comp.id);
      const recentReviews = allReviews.filter((r) => {
        let revTime = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (!revTime || isNaN(revTime)) {
          revTime = Date.parse(r.date);
        }
        return !isNaN(revTime) && revTime > 0 && (now - revTime) <= twentyFourHoursMs;
      });

      // Overall average rating
      const totalReviewsCount = allReviews.length;
      const overallAvgRating = totalReviewsCount > 0
        ? allReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviewsCount
        : 0;

      // Reviews prior to the last 24 hours
      const olderReviews = allReviews.filter((r) => {
        let revTime = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (!revTime || isNaN(revTime)) {
          revTime = Date.parse(r.date);
        }
        return !isNaN(revTime) && revTime > 0 && (now - revTime) > twentyFourHoursMs;
      });

      const olderAvgRating = olderReviews.length > 0
        ? olderReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / olderReviews.length
        : overallAvgRating;

      // Calculate rating delta
      const ratingDiff = (recentReviews.length > 0 && olderReviews.length > 0)
        ? (overallAvgRating - olderAvgRating)
        : 0;

      let deltaSummary = 'Stable';
      if (ratingDiff > 0.05) {
        deltaSummary = `+${ratingDiff.toFixed(2)} ★ (Improved)`;
      } else if (ratingDiff < -0.05) {
        deltaSummary = `${ratingDiff.toFixed(2)} ★ (Decreased)`;
      } else if (recentReviews.length > 0) {
        deltaSummary = 'Unchanged';
      }

      const dateHeader = new Date().toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const digestMessage = `🌅 *DAILY MORNING DIGEST — ${comp.name}*
📍 *City:* ${comp.city || 'National'}
📅 *Date:* ${dateHeader}

📊 *24-Hour Operations Summary:*
🔥 *New Inbound Leads:* ${recentLeads.length}
⭐ *New Customer Reviews:* ${recentReviews.length}
📈 *Average Rating:* ${overallAvgRating > 0 ? `${overallAvgRating.toFixed(1)} ★` : 'No ratings yet'} (${deltaSummary})
🎯 *Local Growth Score:* ${comp.score || 82} / 100

${recentLeads.length > 0 ? `💼 *Recent Inquiry:* ${recentLeads[0].name} (${recentLeads[0].service || 'Consultation'})` : 'ℹ️ No new leads in last 24h. Autonomous SEO autopilot is active.'}
${recentReviews.length > 0 ? `💬 *Latest Review:* ${recentReviews[0].author} gave ${recentReviews[0].rating}★` : ''}

📱 *Live Dashboard:* https://bga.aaditechs.in`;

      const sent = await sendTelegramPushAlert(digestMessage);
      if (sent) {
        digestsSent += 1;
        schedulerStatus.stats.totalDailyDigestsSent += 1;
      }
      console.log(`[Scheduler:DailyDigest] Processed digest for "${comp.name}" (sent: ${sent}).`);
    } catch (err: any) {
      console.error(`[Scheduler:DailyDigest] Error generating digest for company "${comp.id}":`, err?.message);
    }
  }

  console.log(`[Scheduler:DailyDigest] Completed. Sent ${digestsSent} digests across ${companies.length} companies.`);
  return {
    companiesProcessed: companies.length,
    digestsSent,
  };
}

/**
 * JOB C: Hourly Review Reply Reminder.
 * Runs every hour (e.g. 0 * * * *).
 * Finds reviews where reply_text is empty/null and created_at is older than 24 hours,
 * and sends a single batched Telegram reminder per company listing how many reviews
 * still need a reply.
 */
export async function runHourlyReviewReminderJob(): Promise<{
  companiesChecked: number;
  remindersSent: number;
  totalPendingReviews: number;
}> {
  const timestamp = new Date().toISOString();
  schedulerStatus.lastHourlyReminderRun = timestamp;
  console.log(`[Scheduler:HourlyReviewReminder] [${timestamp}] Checking unanswered reviews older than 24h...`);

  const companies = await getAllCompanies();
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  let remindersSent = 0;
  let totalPendingReviews = 0;

  for (const comp of companies) {
    try {
      const reviews = await getCompanyReviews(comp.id);

      const unrepliedOlderThan24h = reviews.filter((r) => {
        const hasReply = Boolean(r.replied) || Boolean(r.reply_text && r.reply_text.trim().length > 0);
        if (hasReply) return false;

        let revTime = 0;
        if (r.created_at) {
          revTime = new Date(r.created_at).getTime();
        }
        if (!revTime || isNaN(revTime)) {
          revTime = Date.parse(r.date);
        }

        if (isNaN(revTime) || revTime === 0) {
          // Check relative time strings like "2 days ago", "1 week ago", "3 weeks ago"
          const dateStr = (r.relative_time || r.date || '').toLowerCase();
          if (
            dateStr.includes('day') ||
            dateStr.includes('week') ||
            dateStr.includes('month') ||
            dateStr.includes('year')
          ) {
            return true;
          }
          return false;
        }

        return (now - revTime) > twentyFourHoursMs;
      });

      if (unrepliedOlderThan24h.length > 0) {
        totalPendingReviews += unrepliedOlderThan24h.length;
        const lowestRating = Math.min(...unrepliedOlderThan24h.map((r) => Number(r.rating) || 5));
        const sampleReview = unrepliedOlderThan24h[0];
        const count = unrepliedOlderThan24h.length;

        const reminderMsg = `⚠️ *ACTION REQUIRED: UNREPLIED REVIEWS (>24H) — ${comp.name}*

🔔 *${count}* customer review${count > 1 ? 's' : ''} older than 24 hours ${count > 1 ? 'are' : 'is'} awaiting your reply!
⭐ *Lowest Pending Rating:* ${lowestRating} ★
👤 *Sample Reviewer:* ${sampleReview.author} (${sampleReview.rating} ★)
💬 *Excerpt:* "${sampleReview.content ? sampleReview.content.slice(0, 110) + (sampleReview.content.length > 110 ? '...' : '') : 'No review text provided'}"

⚡ Prompt owner replies protect your Google Local 3-Pack rank and conversion rates.
👉 Open https://bga.aaditechs.in/ to generate 1-click AI replies.`;

        const sent = await sendTelegramPushAlert(reminderMsg);
        if (sent) {
          remindersSent += 1;
          schedulerStatus.stats.totalHourlyRemindersSent += 1;
        }
        console.log(
          `[Scheduler:HourlyReviewReminder] Alerted ${comp.name} for ${count} pending review(s) (sent: ${sent}).`
        );
      }
    } catch (err: any) {
      console.error(`[Scheduler:HourlyReviewReminder] Error for company "${comp.id}":`, err?.message);
    }
  }

  console.log(
    `[Scheduler:HourlyReviewReminder] Completed. Sent ${remindersSent} reminders for ${totalPendingReviews} total pending reviews.`
  );

  return {
    companiesChecked: companies.length,
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
      await runAutoPublishJob();
    } catch (err: any) {
      console.error('[Scheduler:Cron:AutoPublish] Unhandled execution error:', err?.message);
    }
  });
  tasks.push(autoPublishTask);

  // JOB 2: Daily morning digest at 8:00 AM IST (Asia/Kolkata)
  // Cron: 0 8 * * *
  const dailyDigestTask = cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        await runDailyDigestJob();
      } catch (err: any) {
        console.error('[Scheduler:Cron:DailyDigest] Unhandled execution error:', err?.message);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );
  tasks.push(dailyDigestTask);

  // JOB 3: Hourly review reply reminder
  // Cron: 0 * * * *
  const hourlyReminderTask = cron.schedule('0 * * * *', async () => {
    try {
      await runHourlyReviewReminderJob();
    } catch (err: any) {
      console.error('[Scheduler:Cron:HourlyReminder] Unhandled execution error:', err?.message);
    }
  });
  tasks.push(hourlyReminderTask);

  // Mark as started in memory and global scope
  global.__abga_scheduler_started = true;
  global.__abga_cron_tasks = tasks;
  schedulerStatus.running = true;
  schedulerStatus.tasksCount = tasks.length;

  console.log(
    `[Scheduler] ABGA Background Engine initialized successfully with ${tasks.length} active cron jobs:
   • Auto-Publish: Every 5 minutes (*/5 * * * *)
   • Daily Digest: Daily at 8:00 AM IST (0 8 * * * [Asia/Kolkata])
   • Review Alerts: Hourly at :00 (0 * * * *)`
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

/**
 * Returns current health and diagnostic statistics for the scheduler.
 */
export function getSchedulerStatus(): SchedulerStatus {
  return { ...schedulerStatus };
}
