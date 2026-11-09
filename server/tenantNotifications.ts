import {isGlobalEmergencyStopActive} from './executionStop';
/** Tenant notifications never inherit a platform-global bot or recipient. */
export async function sendTenantTelegram(companyId: string, message: string, deps: {
  getCompanyIntegration: (companyId: string, provider: string) => Promise<{ company_id: string; provider: string; status: string; credentials?: Record<string, any> } | null>;
  fetch: typeof fetch;
}): Promise<boolean> {
  if(isGlobalEmergencyStopActive())return false;
  if (!companyId || typeof message !== 'string' || !message.trim() || message.length > 4096) return false;
  try {
    const integration = await deps.getCompanyIntegration(companyId, 'telegram_bot');
    if (!integration || integration.company_id !== companyId || integration.provider !== 'telegram_bot' || integration.status !== 'connected') return false;
    const token = integration.credentials?.botToken;
    const chatId = integration.credentials?.chatId;
    if (typeof token !== 'string' || !/^\d+:[A-Za-z0-9_-]+$/.test(token) || typeof chatId !== 'string' || !/^-?\d+$/.test(chatId)) return false;
    if(isGlobalEmergencyStopActive())return false;
    const response = await deps.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      // Plain text: client names/review excerpts cannot inject Markdown formatting.
      body: JSON.stringify({ chat_id: chatId, text: message }), signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => null);
    return response.ok && data?.ok === true && Number.isInteger(data.result?.message_id) &&
      String(data.result?.chat?.id) === chatId;
  } catch {
    // A provider URL can contain the bot token: never log raw network errors.
    return false;
  }
}
