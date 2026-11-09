import type { Express, Request } from 'express';
import type { DbUser } from './db';
import type { getCompanyActionFeed } from './actionFeedService';
import { validateActionFeedQuery } from './actionOutbox';

export function registerActionFeed(app: Express, deps: {
  getAuthUserFromRequest: (req: Request) => Promise<DbUser | null>;
  verifyCompanyWorkspaceAccess: (user: DbUser, companyId: string) => Promise<{ authorized: boolean; status: number; error?: string }>;
  getCompanyActionFeed: typeof getCompanyActionFeed;
}): void {
  app.get('/api/companies/:id/job-actions', async (req, res) => {
    try {
      const user = await deps.getAuthUserFromRequest(req);
      if (!user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
      const access = await deps.verifyCompanyWorkspaceAccess(user, req.params.id);
      if (!access.authorized) { res.status(access.status).json({ success: false, error: access.error }); return; }
      const after = req.query.after ?? '0';
      const rawLimit = req.query.limit ?? '50';
      try {
        if (typeof after !== 'string' || typeof rawLimit !== 'string' || !/^\d{1,3}$/.test(rawLimit)) throw new Error();
        validateActionFeedQuery(after, Number(rawLimit));
      } catch { res.status(400).json({ success: false, error: 'Invalid feed cursor or limit' }); return; }
      const feed = await deps.getCompanyActionFeed(req.params.id, after as string, Number(rawLimit));
      res.status(feed.available ? 200 : 503).json({ success: feed.available, ...feed });
    } catch { res.status(500).json({ success: false, error: 'Unable to load action feed' }); }
  });
}
