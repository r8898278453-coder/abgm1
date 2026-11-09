import { isGlobalEmergencyStopActive } from './autonomousEngine';
import { getDbPool, getCompanyIntegration } from './db';
import { runNotificationOccurrence, type NotificationKind } from './notificationOccurrences';
import { sendTenantTelegram } from './tenantNotifications';

/** Missing configuration leaves the occurrence unclaimed for a later configured tick. */
export async function sendScheduledNotification(companyId: string, kind: NotificationKind, dueAt: number, message: string, canStart: () => boolean = () => true): Promise<boolean> {
  if (!canStart() || isGlobalEmergencyStopActive()) return false;
  const integration = await getCompanyIntegration(companyId, 'telegram_bot');
  if (!integration || integration.company_id !== companyId || integration.status !== 'connected' ||
      typeof integration.credentials?.botToken !== 'string' || !/^\d+:[A-Za-z0-9_-]+$/.test(integration.credentials.botToken) ||
      typeof integration.credentials?.chatId !== 'string' || !/^-?\d+$/.test(integration.credentials.chatId) || message.length > 4096) return false;
  const pool = await getDbPool();
  if (!pool || !canStart()) return false; // No volatile fallback for scheduled external delivery.
  return await runNotificationOccurrence(pool, companyId, kind, dueAt,
    () => !canStart() || isGlobalEmergencyStopActive() ? Promise.resolve(false) : sendTenantTelegram(companyId, message, { getCompanyIntegration: async () => integration, fetch })) === 'SENT';
}
