import {syncMetaAdCampaigns} from './metaAdsSync';
import {
  getCompanyIntegration,
  getExternalAdCampaigns,
  upsertExternalAdCampaign,
  DbExternalAdCampaign,
} from './db.js';

export interface AdProviderSyncResult {
  provider: string;
  status: 'SUCCESS' | 'PARTIAL' | 'NOT_CONFIGURED' | 'PROVIDER_ERROR';
  companyId?: string;
  campaignsCount: number;
  message: string;
  fetchedAt: string;
  campaigns: DbExternalAdCampaign[];
}

export interface AdProviderAdapter {
  providerId: string;
  providerName: string;
  syncCampaigns(companyId: string): Promise<AdProviderSyncResult>;
}

/**
 * Meta (Facebook/Instagram) Ads Adapter
 * Interacts with the Meta Marketing API (/v21.0/act_{ad_account_id}/campaigns and /insights)
 * ONLY stores metrics explicitly returned by the Meta Graph API.
 * Never fabricates reach, clicks, conversions, revenue, ROI, or ROAS.
 */
export class MetaAdsAdapter implements AdProviderAdapter {
  providerId = 'meta_ads';
  providerName = 'Meta Ads (Facebook & Instagram)';

  async syncCampaigns(companyId: string): Promise<AdProviderSyncResult> {
    return syncMetaAdCampaigns(companyId,{integration:(company)=>getCompanyIntegration(company,'meta_ads'),save:upsertExternalAdCampaign,fetch});
  }
}

// Registry of supported ad provider adapters
const providerAdapters: Record<string, AdProviderAdapter> = {
  meta_ads: new MetaAdsAdapter(),
};

/**
 * Synchronize external ad campaigns from a specific ad provider
 */
export async function syncExternalAdCampaigns(
  companyId: string,
  provider: string
): Promise<AdProviderSyncResult> {
  const adapter = providerAdapters[provider];
  if (!adapter) {
    return {
      provider,
      status: 'PROVIDER_ERROR',
      campaignsCount: 0,
      message: `Unsupported ad provider: '${provider}'. Currently verified provider is 'meta_ads'.`,
      fetchedAt: new Date().toISOString(),
      campaigns: [],
    };
  }

  return await adapter.syncCampaigns(companyId);
}

/**
 * Fetch all verified external ad campaigns for a company
 */
export async function getCompanyExternalAdCampaigns(
  companyId: string
): Promise<DbExternalAdCampaign[]> {
  return await getExternalAdCampaigns(companyId);
}
