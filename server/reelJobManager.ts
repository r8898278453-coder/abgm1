/**
 * In-Memory Reel Render Job Manager
 *
 * ARCHITECTURAL NOTE FOR PRODUCTION SCALE:
 * This in-memory job store is designed for single-node execution.
 * If this application is horizontally scaled to multiple Node.js instances or container replicas,
 * this state MUST be backed by a distributed queue/store (such as Redis, BullMQ, or Google Cloud Tasks)
 * so that polling requests from any load-balanced worker can retrieve job status.
 */

export interface ReelRenderJob {
  id: string;
  companyId: string;
  userId: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number; // 0 to 100
  createdAt: number;
  updatedAt: number;
  videoUrl?: string;
  filename?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  error?: string;
  scenesCount?: number;
}

const jobs = new Map<string, ReelRenderJob>();

// Auto-cleanup jobs older than 2 hours to avoid unbounded memory retention
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) {
      jobs.delete(id);
    }
  }
}, 15 * 60 * 1000);

export function createReelJob(companyId: string, userId: string, scenesCount: number = 3): ReelRenderJob {
  const id = `job_reel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const job: ReelRenderJob = {
    id,
    companyId,
    userId,
    status: 'pending',
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    scenesCount,
  };
  jobs.set(id, job);
  return job;
}

export function getReelJob(id: string): ReelRenderJob | undefined {
  return jobs.get(id);
}

export function updateReelJob(id: string, patch: Partial<ReelRenderJob>): ReelRenderJob | undefined {
  const existing = jobs.get(id);
  if (!existing) return undefined;

  const updated: ReelRenderJob = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  jobs.set(id, updated);
  return updated;
}
