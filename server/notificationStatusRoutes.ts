import type { Express, Request } from 'express';
import type { DbUser } from './db';
import { parseNotificationCursor, type NotificationCursor } from './notificationStatus';
export function registerNotificationStatus(app: Express, deps: {
  getAuthUserFromRequest: (req: Request) => Promise<DbUser | null>;
  verifyCompanyWorkspaceAccess: (user: DbUser, company: string) => Promise<{ authorized: boolean; status: number; error?: string }>;
  read: (company: string, before: NotificationCursor | null, limit: number) => Promise<unknown>;
}) {
  app.get('/api/companies/:id/notification-status', async (req, res) => {
    try {
      const user = await deps.getAuthUserFromRequest(req);
      if (!user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
      const access = await deps.verifyCompanyWorkspaceAccess(user, req.params.id);
      if (!access.authorized) { res.status(access.status).json({ success: false, error: access.error }); return; }
      let before: NotificationCursor | null, limit: number;
      try {
        before = parseNotificationCursor(req.query.before);
        const raw = req.query.limit ?? '25';
        if (typeof raw !== 'string' || !/^\d{1,3}$/.test(raw)) throw new Error();
        limit = Number(raw); if (limit < 1 || limit > 100) throw new Error();
      } catch { res.status(400).json({ success: false, error: 'Invalid notification cursor or limit' }); return; }
      const result: any = await deps.read(req.params.id, before, limit);
      res.status(result.available ? 200 : 503).json({ success: result.available, ...result });
    } catch { res.status(500).json({ success: false, error: 'Unable to load notification status' }); }
  });
}
