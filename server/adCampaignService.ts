import {
  getCompanyIntegration,
  getExternalAdCampaigns,
  upsertExternalAdCampaign,
  DbExternalAdCampaign,
} from './db.js';

export interface AdProviderSyncResult {
  provider: string;
  status: 'SUCCESS' | 'NOT_CONFIGURED' | 'PROVIDER_ERROR';
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
 * Interacts with the Meta Marketing API (/v19.0/act_{ad_account_id}/campaigns and /insights)
 * ONLY stores metrics explicitly returned by the Meta Graph API.
 * Never fabricates reach, clicks, conversions, revenue, ROI, or ROAS.
 */
export class MetaAdsAdapter implements AdProviderAdapter {
  providerId = 'meta_ads';
  providerName = 'Meta Ads (Facebook & Instagram)';

  async syncCampaigns(companyId: string): Promise<AdProviderSyncResult> {
    const fetchedAt = new Date().toISOString();

    // 1. Retrieve stored credentials from company_integrations
    const integration = await getCompanyIntegration(companyId, 'meta_ads');
    const creds = integration?.credentials || {};
    const config = integration?.config || {};

    const accessToken = creds.access_token || creds.accessToken || process.env.META_ADS_ACCESS_TOKEN;
    const adAccountId = creds.ad_account_id || creds.adAccountId || config.ad_account_id || config.adAccountId || process.env.META_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
      // Integration not configured or active
      return {
        provider: this.providerId,
        status: 'NOT_CONFIGURED',
        campaignsCount: 0,
        message: 'Meta Ads integration is not configured with valid Access Token and Ad Account ID.',
        fetchedAt,
        campaigns: [],
      };
    }

    const sanitizedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    try {
      // 2. Fetch active/paused campaigns from Meta Marketing API
      const campaignsUrl = `https://graph.facebook.com/v19.0/${sanitizedAccountId}/campaigns?fields=id,name,status,objective,start_time,stop_time&access_token=${encodeURIComponent(accessToken)}`;
      
      const campResponse = await fetch(campaignsUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!campResponse.ok) {
        const errJson: any = await campResponse.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `Meta API HTTP ${campResponse.status}`;
        return {
          provider: this.providerId,
          status: 'PROVIDER_ERROR',
          campaignsCount: 0,
          message: `Meta Ads API error: ${errMsg}`,
          fetchedAt,
          campaigns: [],
        };
      }

      const campData: any = await campResponse.json();
      const metaCampaignList = Array.isArray(campData.data) ? campData.data : [];

      const syncedCampaigns: DbExternalAdCampaign[] = [];

      // 3. For each campaign, fetch insights strictly from the API
      for (const mCamp of metaCampaignList) {
        const insightsUrl = `https://graph.facebook.com/v19.0/${mCamp.id}/insights?fields=spend,impressions,clicks,actions,action_values&date_preset=maximum&access_token=${encodeURIComponent(accessToken)}`;
        
        let spend: number | null = null;
        let impressions: number | null = null;
        let clicks: number | null = null;
        let conversions: number | null = null;
        let conversionTrackingStatus: 'ACTIVE' | 'UNAVAILABLE' = 'UNAVAILABLE';
        let revenue: number | null = null;
        let revenueAttributionStatus: 'VERIFIED' | 'UNAVAILABLE' = 'UNAVAILABLE';
        let roas: number | null = null;
        let rawJsonPayload: string | null = null;

        try {
          const insResponse = await fetch(insightsUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });

          if (insResponse.ok) {
            const insData: any = await insResponse.json();
            rawJsonPayload = JSON.stringify(insData);
            const insights = Array.isArray(insData.data) && insData.data.length > 0 ? insData.data[0] : null;

            if (insights) {
              if (insights.spend !== undefined && insights.spend !== null) {
                spend = parseFloat(insights.spend);
              }
              if (insights.impressions !== undefined && insights.impressions !== null) {
                impressions = parseInt(insights.impressions, 10);
              }
              if (insights.clicks !== undefined && insights.clicks !== null) {
                clicks = parseInt(insights.clicks, 10);
              }

              // Conversions check: actions list from Meta pixel / CAPI
              if (Array.isArray(insights.actions)) {
                const purchaseAction = insights.actions.find((a: any) => 
                  a.action_type === 'purchase' || a.action_type === 'omni_purchase' || a.action_type === 'lead'
                );
                if (purchaseAction && purchaseAction.value !== undefined) {
                  conversions = parseInt(purchaseAction.value, 10);
                  conversionTrackingStatus = 'ACTIVE';
                }
              }

              // Revenue check: action_values from Meta
              if (Array.isArray(insights.action_values)) {
                const purchaseValue = insights.action_values.find((a: any) =>
                  a.action_type === 'purchase' || a.action_type === 'omni_purchase'
                );
                if (purchaseValue && purchaseValue.value !== undefined) {
                  revenue = parseFloat(purchaseValue.value);
                  revenueAttributionStatus = 'VERIFIED';
                }
              }

              // Calculate ROAS strictly if both revenue and spend are non-null and spend > 0
              if (revenue !== null && spend !== null && spend > 0) {
                roas = parseFloat((revenue / spend).toFixed(2));
              }
            }
          }
        } catch (insErr: any) {
          console.warn(`[MetaAdsAdapter] Insights fetch error for ${mCamp.id}:`, insErr?.message);
        }

        const externalRecord = await upsertExternalAdCampaign({
          company_id: companyId,
          provider: 'meta_ads',
          external_campaign_id: String(mCamp.id),
          name: mCamp.name || `Meta Campaign #${mCamp.id}`,
          status: mCamp.status === 'ACTIVE' ? 'ACTIVE' : mCamp.status === 'PAUSED' ? 'PAUSED' : 'ARCHIVED',
          fetched_at: fetchedAt,
          spend,
          impressions,
          clicks,
          conversions,
          conversion_tracking_status: conversionTrackingStatus,
          revenue,
          revenue_attribution_status: revenueAttributionStatus,
          roas,
          raw_metrics_json: rawJsonPayload,
        });

        syncedCampaigns.push(externalRecord);
      }

      return {
        provider: this.providerId,
        status: 'SUCCESS',
        campaignsCount: syncedCampaigns.length,
        message: `Successfully synchronized ${syncedCampaigns.length} campaigns from Meta Ads API.`,
        fetchedAt,
        campaigns: syncedCampaigns,
      };
    } catch (err: any) {
      console.error('[MetaAdsAdapter] Sync error:', err?.message);
      return {
        provider: this.providerId,
        status: 'PROVIDER_ERROR',
        campaignsCount: 0,
        message: `Network or runtime error contacting Meta Marketing API: ${err?.message}`,
        fetchedAt,
        campaigns: [],
      };
    }
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
