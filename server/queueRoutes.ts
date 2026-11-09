import type { Express, Request } from 'express';
import type { DbUser, enqueueJob } from './db';
import { parseQueueRequest, queueResourceBelongsToCompany } from './queueValidation';

type ResourceRepository = Parameters<typeof queueResourceBelongsToCompany>[2];
interface Dependencies extends ResourceRepository {
  getAuthUserFromRequest: (req: Request) => Promise<DbUser | null>;
  verifyCompanyWorkspaceAccess: (user: DbUser, companyId: string) => Promise<{ authorized: boolean; status: number; error?: string }>;
  enqueueJob: typeof enqueueJob;
}

/** One admission path; injected dependencies allow HTTP tests without DB initialization. */
export function registerQueueAdmission(app: Express, deps: Dependencies): void {
  app.post('/api/companies/:id/jobs', async (req, res) => {
    try {
      const user = await deps.getAuthUserFromRequest(req);
      if (!user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      const companyId = req.params.id;
      const access = await deps.verifyCompanyWorkspaceAccess(user, companyId);
      if (!access.authorized) {
        res.status(access.status).json({ success: false, error: access.error });
        return;
      }
      let request;
      try {
        request = parseQueueRequest(req.body);
      } catch {
        res.status(400).json({ success: false, error: 'Invalid job type, payload, aliases or schedule' });
        return;
      }
      if (!await queueResourceBelongsToCompany(request, companyId, deps)) {
        res.status(404).json({ success: false, error: 'Job resource not found in this workspace' });
        return;
      }
      const job = await deps.enqueueJob({ company_id: companyId, ...request, requested_by: user.id });
      res.status(201).json({ success: true, job });
    } catch {
      res.status(500).json({ success: false, error: 'Unable to enqueue job' });
    }
  });
}
