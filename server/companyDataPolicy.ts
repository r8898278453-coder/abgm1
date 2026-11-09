import crypto from 'node:crypto';
export function sanitizeCompanyData(clientData:any,existingPayload:any,company:any){
    // Strict Data Authority Boundary:
    // Only accept user-configurable settings and metadata.
    // Client CANNOT overwrite authoritative calculated scores, verified ranks, verified reviews, or provider observations.
    const sanitizedPayload: any = {
      ...existingPayload,
      business: clientData.business
        ? {
            ...(existingPayload.business || {}),
            ...clientData.business,
            id: company.id,
            name: company.name,
            category: clientData.business.category || company.category,
            city: clientData.business.city || company.city,
          }
        : existingPayload.business,
      knowledge_base: clientData.knowledge_base !== undefined ? clientData.knowledge_base : existingPayload.knowledge_base,
      engine_settings: clientData.engine_settings !== undefined ? {...(existingPayload.engine_settings||{}),...clientData.engine_settings} : existingPayload.engine_settings,
      customization: clientData.customization !== undefined ? clientData.customization : existingPayload.customization,
      isDemoMode: clientData.isDemoMode===undefined?Boolean(existingPayload.isDemoMode):Boolean(clientData.isDemoMode),
    };

    // User-managed keywords: user can add/remove keywords to monitor, but cannot forge provider observations/ranks
    if (Array.isArray(clientData.keywords)) {
      const existingKwMap = new Map(
        (existingPayload.keywords || []).map((k: any) => [(k.keyword || '').toLowerCase().trim(), k])
      );
      sanitizedPayload.keywords = clientData.keywords.map((kw: any) => {
        const cleanKw = (kw.keyword || kw.name || '').trim();
        const existing: any = existingKwMap.get(cleanKw.toLowerCase());
        if (existing) {
          return {
            ...existing,
            id: existing.id || kw.id,
            keyword: cleanKw,
          };
        }
        return {
          id: kw.id || `kw_${crypto.randomUUID().slice(0, 8)}`,
          keyword: cleanKw,
          rank: null,
          previousRank: null,
          diff: null,
          searchVolume: null,
          dataClassification: 'UNAVAILABLE',
          provider: 'UNCONFIGURED',
          lastScannedAt: null,
          observations: [],
          topCompetitors: [],
          gridRankings: [],
        };
      });
    }

    // User-managed competitors: user can add/remove competitors to monitor, but cannot forge provider ratings/reviews
    if (Array.isArray(clientData.competitors)) {
      const existingCompMap = new Map(
        (existingPayload.competitors || []).map((c: any) => [(c.name || '').toLowerCase().trim(), c])
      );
      sanitizedPayload.competitors = clientData.competitors.map((comp: any) => {
        const cleanName = (comp.name || '').trim();
        const existing: any = existingCompMap.get(cleanName.toLowerCase());
        if (existing) {
          return {
            ...existing,
            id: existing.id || comp.id,
            name: cleanName,
            placeId: existing.placeId || comp.placeId,
            address: existing.address || comp.address,
          };
        }
        return {
          id: comp.id || `comp_${crypto.randomUUID().slice(0, 8)}`,
          name: cleanName,
          placeId: comp.placeId || null,
          address: comp.address || null,
          rating: null,
          reviewsCount: null,
          reviewGrowthThisMonth: null,
          photosCount: null,
          postsPerWeek: null,
          localVisibilityRank: null,
          provider: 'UNCONFIGURED',
          lastObservedAt: null,
          dataClassification: 'UNAVAILABLE',
        };
      });
    }

    // User-managed campaigns: user can manage strategic campaign plans, but actual_spend / impressions / provider IDs are strictly server/provider-verified
    if (Array.isArray(clientData.campaigns)) {
      const existingCampMap = new Map((existingPayload.campaigns || []).map((c: any) => [c.id, c]));
      sanitizedPayload.campaigns = clientData.campaigns.map((camp: any) => {
        const existing: any = existingCampMap.get(camp.id);
        return {
          id: camp.id || `camp_${crypto.randomUUID().slice(0, 8)}`,
          name: (camp.name || 'Campaign').trim(),
          type: camp.type || 'offer',
          status: camp.status || 'draft',
          channels: Array.isArray(camp.channels) ? camp.channels : ['google'],
          target_audience: camp.target_audience || '',
          start_date: camp.start_date || null,
          end_date: camp.end_date || null,
          budget: typeof camp.budget === 'number' ? camp.budget : null,
          actual_spend: existing?.actual_spend ?? null,
          verified_spend: existing?.verified_spend ?? null,
          provider_campaign_id: existing?.provider_campaign_id ?? null,
          impressions: existing?.impressions ?? null,
          clicks: existing?.clicks ?? null,
          leads_generated: existing?.leads_generated ?? null,
        };
      });
    }

    // Audit findings/resolution are server observations, never profile-save commands.
    sanitizedPayload.audit_items=existingPayload.audit_items||[];

    // Autonomous actions: client must NOT inject autonomous action history; strictly server-authoritative
    sanitizedPayload.autonomous_actions = existingPayload.autonomous_actions || [];

    // Growth Score remains strictly derived by canonical engine only
    sanitizedPayload.growth_score = existingPayload.growth_score || null;

    return sanitizedPayload;
}
