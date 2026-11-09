import type { Express, Request, RequestHandler } from 'express';
import type { DbUser } from './db';

export function registerTenantNotificationRoutes(app: Express, deps: {
  limiter: RequestHandler;
  getAuthUserFromRequest: (req: Request) => Promise<DbUser | null>;
  verifyCompanyWorkspaceAccess: (user: DbUser, companyId: string) => Promise<{ authorized: boolean; status: number; error?: string }>;
  send: (companyId: string, message: string) => Promise<boolean>;
}) {
  app.post('/api/telegram/notify', deps.limiter, async (req, res) => {
    try {
      const user = await deps.getAuthUserFromRequest(req);
      if (!user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
      const { companyId, message } = req.body || {};
      if (typeof companyId !== 'string' || !companyId.trim() || companyId.length > 128 || typeof message !== 'string' || !message.trim() || message.length > 4096 || Object.keys(req.body).some(key => !['companyId', 'message'].includes(key))) {
        res.status(400).json({ success: false, error: 'Valid companyId and message are required' }); return;
      }
      const access = await deps.verifyCompanyWorkspaceAccess(user, companyId);
      if (!access.authorized) { res.status(access.status).json({ success: false, error: access.error }); return; }
      const sent = await deps.send(companyId, message.trim());
      res.status(sent ? 200 : 502).json(sent ? { success: true } : { success: false, error: 'Delivery not confirmed. Check this workspace’s Telegram integration before retrying.' });
    } catch { res.status(500).json({ success: false, error: 'Unable to dispatch workspace notification' }); }
  });
}
