import crypto from 'crypto';

export interface NormalizedCompetitorObservation {
  id: string;
  companyId: string;
  competitorId: string;
  name: string;
  placeId: string | null;
  address: string | null;
  rating: number | null;
  reviewsCount: number | null;
  photosCount: number | null;
  postsPerWeek: number | null;
  rankPosition: number | null;
  provider: string;
  timestamp: string;
  dataClassification: 'LIVE' | 'VERIFIED' | 'USER_ENTERED' | 'UNAVAILABLE';
  rawPayload?: any;
}

export interface CompetitorFetchContext {
  companyId: string;
  competitorId: string;
  name: string;
  city?: string;
  placeId?: string | null;
  keyword?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ICompetitorProvider {
  readonly providerName: string;
  fetchCompetitorObservation(
    context: CompetitorFetchContext,
    credentials?: any
  ): Promise<NormalizedCompetitorObservation>;
}

export class GooglePlacesCompetitorProvider implements ICompetitorProvider {
  readonly providerName = 'google_places';

  constructor(private apiKey: string) {}

  async fetchCompetitorObservation(
    context: CompetitorFetchContext,
    credentials?: any
  ): Promise<NormalizedCompetitorObservation> {
    const key = (this.apiKey || credentials?.apiKey || '').trim();
    if (!key) {
      return new UnconfiguredCompetitorProvider().fetchCompetitorObservation(context);
    }

    const timestamp = new Date().toISOString();
    const obsId = `cobs_${crypto.randomUUID().replace(/-/g, '')}`;

    try {
      let resolvedPlaceId = context.placeId;

      // If placeId not provided, search for competitor place by name & city
      if (!resolvedPlaceId) {
        const query = `${context.name} ${context.city || ''}`.trim();
        const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
        searchUrl.searchParams.set('input', query);
        searchUrl.searchParams.set('inputtype', 'textquery');
        searchUrl.searchParams.set('fields', 'place_id,name,formatted_address');
        searchUrl.searchParams.set('key', key);

        const searchRes = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(8000) });
        const searchData = await searchRes.json();
        if (searchData.status === 'OK' && searchData.candidates && searchData.candidates.length > 0) {
          resolvedPlaceId = searchData.candidates[0].place_id;
        }
      }

      if (!resolvedPlaceId) {
        return {
          id: obsId,
          companyId: context.companyId,
          competitorId: context.competitorId,
          name: context.name,
          placeId: null,
          address: null,
          rating: null,
          reviewsCount: null,
          photosCount: null,
          postsPerWeek: null,
          rankPosition: null,
          provider: this.providerName,
          timestamp,
          dataClassification: 'UNAVAILABLE',
        };
      }

      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.set('place_id', resolvedPlaceId);
      detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,photos,formatted_address');
      detailsUrl.searchParams.set('key', key);

      const detailsRes = await fetch(detailsUrl.toString(), { signal: AbortSignal.timeout(8000) });
      const detailsData = await detailsRes.json();

      if (detailsData.status === 'OK' && detailsData.result) {
        const res = detailsData.result;
        return {
          id: obsId,
          companyId: context.companyId,
          competitorId: context.competitorId,
          name: res.name || context.name,
          placeId: resolvedPlaceId,
          address: res.formatted_address || null,
          rating: typeof res.rating === 'number' ? Number(res.rating.toFixed(1)) : null,
          reviewsCount: typeof res.user_ratings_total === 'number' ? res.user_ratings_total : null,
          photosCount: Array.isArray(res.photos) ? res.photos.length : null,
          postsPerWeek: null, // Google Places API does not provide post frequency, strictly null
          rankPosition: null, // SERP position is separate from Places API, strictly null
          provider: this.providerName,
          timestamp,
          dataClassification: 'LIVE',
          rawPayload: res,
        };
      }
    } catch (err: any) {
      console.warn('[GooglePlacesCompetitorProvider] Error:', err?.message);
    }

    return {
      id: obsId,
      companyId: context.companyId,
      competitorId: context.competitorId,
      name: context.name,
      placeId: context.placeId || null,
      address: null,
      rating: null,
      reviewsCount: null,
      photosCount: null,
      postsPerWeek: null,
      rankPosition: null,
      provider: this.providerName,
      timestamp,
      dataClassification: 'UNAVAILABLE',
    };
  }
}

export class SerpApiCompetitorProvider implements ICompetitorProvider {
  readonly providerName = 'serpapi';

  constructor(private apiKey: string) {}

  async fetchCompetitorObservation(
    context: CompetitorFetchContext,
    credentials?: any
  ): Promise<NormalizedCompetitorObservation> {
    const key = (this.apiKey || credentials?.apiKey || '').trim();
    const timestamp = new Date().toISOString();
    const obsId = `cobs_${crypto.randomUUID().replace(/-/g, '')}`;

    if (!key) {
      return new UnconfiguredCompetitorProvider().fetchCompetitorObservation(context);
    }

    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_maps');
      url.searchParams.set('api_key', key);

      // Strict Rule: If tracked keyword is specified, measure competitor rank on that keyword at specific coordinates.
      // If keyword is NOT specified, query place directly and rankPosition is strictly NULL.
      if (context.keyword) {
        url.searchParams.set('q', context.keyword);
        if (typeof context.latitude === 'number' && typeof context.longitude === 'number') {
          url.searchParams.set('ll', `@${context.latitude},${context.longitude},14z`);
        }
      } else {
        url.searchParams.set('q', `${context.name} ${context.city || ''}`.trim());
      }

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      const data = await res.json();

      if (data.local_results && data.local_results.length > 0) {
        const cleanCompName = context.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let targetItem = data.local_results[0];
        let observedRank: number | null = null;

        if (context.keyword) {
          // Find competitor in the keyword search results
          data.local_results.forEach((item: any, idx: number) => {
            const itemClean = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const isMatch =
              (context.placeId && item.place_id === context.placeId) ||
              (cleanCompName.length > 3 && itemClean.includes(cleanCompName)) ||
              (itemClean.length > 3 && cleanCompName.includes(itemClean));

            if (isMatch && observedRank === null) {
              observedRank = idx + 1;
              targetItem = item;
            }
          });
        }

        return {
          id: obsId,
          companyId: context.companyId,
          competitorId: context.competitorId,
          name: targetItem.title || context.name,
          placeId: targetItem.place_id || null,
          address: targetItem.address || null,
          rating: typeof targetItem.rating === 'number' ? Number(targetItem.rating.toFixed(1)) : null,
          reviewsCount: typeof targetItem.reviews === 'number' ? targetItem.reviews : null,
          photosCount: typeof targetItem.photos_count === 'number' ? targetItem.photos_count : null,
          postsPerWeek: null, // Never fabricate
          rankPosition: observedRank, // Only set if verified in keyword SERP, else null
          provider: this.providerName,
          timestamp,
          dataClassification: 'LIVE',
          rawPayload: targetItem,
        };
      }
    } catch (err: any) {
      console.warn('[SerpApiCompetitorProvider] Error:', err?.message);
    }

    return {
      id: obsId,
      companyId: context.companyId,
      competitorId: context.competitorId,
      name: context.name,
      placeId: context.placeId || null,
      address: null,
      rating: null,
      reviewsCount: null,
      photosCount: null,
      postsPerWeek: null,
      rankPosition: null,
      provider: this.providerName,
      timestamp,
      dataClassification: 'UNAVAILABLE',
    };
  }
}

export class UnconfiguredCompetitorProvider implements ICompetitorProvider {
  readonly providerName = 'unconfigured';

  async fetchCompetitorObservation(context: CompetitorFetchContext): Promise<NormalizedCompetitorObservation> {
    return {
      id: `cobs_${crypto.randomUUID().replace(/-/g, '')}`,
      companyId: context.companyId,
      competitorId: context.competitorId,
      name: context.name,
      placeId: context.placeId || null,
      address: null,
      rating: null,
      reviewsCount: null,
      photosCount: null,
      postsPerWeek: null,
      rankPosition: null,
      provider: 'none',
      timestamp: new Date().toISOString(),
      dataClassification: 'UNAVAILABLE',
    };
  }
}

export function resolveCompetitorProvider(
  placesCreds?: any,
  serpCreds?: any
): ICompetitorProvider {
  const placesApiKey = (
    placesCreds?.apiKey ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  if (placesApiKey) {
    return new GooglePlacesCompetitorProvider(placesApiKey);
  }

  const serpApiKey = (serpCreds?.apiKey || process.env.SERPAPI_API_KEY || '').trim();
  if (serpApiKey) {
    return new SerpApiCompetitorProvider(serpApiKey);
  }

  return new UnconfiguredCompetitorProvider();
}

/**
 * Calculates genuine historical changes between observations.
 * Strict Constraint: Only calculates change when historical baseline observations exist.
 */
export function calculateCompetitorChanges(
  currentObs: { rating: number | null; reviewsCount: number | null; rankPosition: number | null },
  previousObs: { rating: number | null; reviewsCount: number | null; rankPosition: number | null } | null
): {
  reviewGrowthThisMonth: number | null;
  ratingDiff: number | null;
  rankDiff: number | null;
  hasHistoricalBaseline: boolean;
} {
  if (!previousObs) {
    return {
      reviewGrowthThisMonth: null,
      ratingDiff: null,
      rankDiff: null,
      hasHistoricalBaseline: false,
    };
  }

  const reviewGrowth =
    typeof currentObs.reviewsCount === 'number' && typeof previousObs.reviewsCount === 'number'
      ? currentObs.reviewsCount - previousObs.reviewsCount
      : null;

  const ratingDiff =
    typeof currentObs.rating === 'number' && typeof previousObs.rating === 'number'
      ? Number((currentObs.rating - previousObs.rating).toFixed(2))
      : null;

  const rankDiff =
    typeof currentObs.rankPosition === 'number' && typeof previousObs.rankPosition === 'number'
      ? previousObs.rankPosition - currentObs.rankPosition
      : null;

  return {
    reviewGrowthThisMonth: reviewGrowth,
    ratingDiff,
    rankDiff,
    hasHistoricalBaseline: true,
  };
}
