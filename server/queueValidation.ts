import { z } from 'zod';

const id = z.string().trim().min(1).max(128);
const requestSchema = z.discriminatedUnion('job_type', [
  z.object({ job_type: z.literal('publishing'), payload: z.object({ postId: id }).strict() }),
  z.object({ job_type: z.literal('seo_scan'), payload: z.object({
    keyword: z.string().trim().min(1).max(256), city: z.string().trim().min(1).max(128).optional(),
    centerLat: z.number().finite().min(-90).max(90).optional(),
    centerLng: z.number().finite().min(-180).max(180).optional(),
  }).strict().refine(p => (p.centerLat !== undefined && p.centerLng !== undefined) ||
    (p.centerLat === undefined && p.centerLng === undefined && !!p.city), 'Provide both coordinates or a city') }),
  z.object({ job_type: z.literal('competitor_scan'), payload: z.object({
    competitorId: id, competitorName: z.string().trim().min(1).max(191), placeId: id.optional(),
  }).strict() }),
  z.object({ job_type: z.literal('ai_summary'), payload: z.object({}).strict() }),
  z.object({ job_type: z.literal('lead_nurture'), payload: z.object({ leadId: id }).strict() }),
]);
const envelopeSchema = z.object({
  job_type: z.string(), payload: z.unknown(),
  idempotency_key: z.string().trim().min(1).max(128).optional(),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
}).strict();

export function parseQueueRequest(input: unknown) {
  const raw = z.record(z.string(), z.unknown()).parse(input);
  const canonical = { ...raw };
  for (const [name, alias] of [['job_type', 'jobType'], ['idempotency_key', 'idempotencyKey'], ['scheduled_for', 'scheduledFor']]) {
    if (raw[name] !== undefined && raw[alias] !== undefined && raw[name] !== raw[alias]) {
      throw new z.ZodError([{ code: 'custom', path: [name], message: 'Conflicting aliases' }]);
    }
    if (raw[name] !== undefined || raw[alias] !== undefined) canonical[name] = raw[name] ?? raw[alias];
    delete canonical[alias];
  }
  const envelope = envelopeSchema.parse({ ...canonical, payload: canonical.payload ?? {} });
  return { ...envelope, ...requestSchema.parse(envelope) };
}

export async function queueResourceBelongsToCompany(
  request: ReturnType<typeof parseQueueRequest>, companyId: string,
  repository: {
    getPostById: (id: string) => Promise<{ company_id: string } | null>;
    getAllLeads: (companyId: string) => Promise<Array<{ id: string }>>;
  }
): Promise<boolean> {
  if (request.job_type === 'publishing') return (await repository.getPostById(request.payload.postId))?.company_id === companyId;
  if (request.job_type === 'lead_nurture') return (await repository.getAllLeads(companyId)).some(l => l.id === request.payload.leadId);
  return true;
}
