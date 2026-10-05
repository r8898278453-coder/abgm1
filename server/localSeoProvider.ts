import crypto from 'crypto';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  label: string;
  gridIndex: number; // 0 to 8 for 3x3
}

export interface RankObservation {
  id: string;
  companyId: string;
  keyword: string;
  latitude: number;
  longitude: number;
  gridIndex: number;
  gridLabel: string;
  timestamp: string;
  provider: string;
  position: number | null; // 1-20 or null if unranked / unavailable
  status: 'LIVE' | 'VERIFIED' | 'UNAVAILABLE' | 'FAILED';
  sourceEvidence?: string;
  topCompetitors?: Array<{
    name: string;
    rating: number;
    reviewsCount: number;
    position: number;
    placeId?: string;
  }>;
}

export interface RankScanContext {
  companyId: string;
  businessName: string;
  placeId?: string;
  keyword: string;
  city: string;
  centerLat: number;
  centerLng: number;
  coordinates: GeoCoordinate[];
  radiusKm?: number;
}

export interface RankScanResult {
  provider: string;
  observations: RankObservation[];
  overallRank: number | null;
  searchVolume: string | null;
  status: 'LIVE' | 'PARTIAL' | 'FAILED' | 'VERIFIED' | 'UNAVAILABLE';
  topCompetitors: Array<{ name: string; rating: number; reviewsCount: number; position: number }>;
  evidenceNotes: string;
}

export interface ILocalSeoRankProvider {
  readonly providerId: string;
  readonly providerName: string;
  isConfigured(credentials?: Record<string, any>): boolean;
  scanRankGrid(context: RankScanContext, credentials?: Record<string, any>): Promise<RankScanResult>;
}

/**
 * Standard known city center lat/lng dictionary for Indian & Global metros
 */
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  thane: { lat: 19.2183, lng: 72.9781 },
  mumbai: { lat: 18.922, lng: 72.8347 },
  'navi mumbai': { lat: 19.033, lng: 73.0297 },
  pune: { lat: 18.5204, lng: 73.8567 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  delhi: { lat: 28.6139, lng: 77.209 },
  noida: { lat: 28.5355, lng: 77.391 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
};

/**
 * Resolves center coordinates for a business from its explicit location or city name
 */
export function resolveCenterCoordinates(city?: string, customLat?: number, customLng?: number): { lat: number; lng: number } | null {
  if (typeof customLat === 'number' && typeof customLng === 'number' && !isNaN(customLat) && !isNaN(customLng)) {
    return { lat: customLat, lng: customLng };
  }
  const cleanCity = (city || '').toLowerCase().trim();
  if (!cleanCity) return null;
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (cleanCity.includes(key)) {
      return coords;
    }
  }
  return null;
}

/**
 * Generates 9 real geographic coordinates for a 3x3 geographical grid around center
 */
export function generate3x3GridCoordinates(centerLat: number, centerLng: number, radiusKm = 3.5): GeoCoordinate[] {
  // ~111.32 km per degree latitude
  const dLat = radiusKm / 111.32;
  // Longitude distance depends on latitude
  const dLng = radiusKm / (111.32 * Math.cos(centerLat * (Math.PI / 180)));

  const labels = [
    'Node 1 (NW): North-West Corridor',
    'Node 2 (N): North Commercial Hub',
    'Node 3 (NE): North-East Industrial',
    'Node 4 (W): West Transit Belt',
    'Node 5 (Center): Business Headquarters',
    'Node 6 (E): East Market District',
    'Node 7 (SW): South-West Suburbs',
    'Node 8 (S): South Metro Corridor',
    'Node 9 (SE): South-East Tech Corridor',
  ];

  // Grid offsets: [row, col] where row: 1 is North, -1 is South, col: -1 is West, 1 is East
  const offsets = [
    { r: 1, c: -1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 0, c: -1 },
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: -1, c: -1 },
    { r: -1, c: 0 },
    { r: -1, c: 1 },
  ];

  return offsets.map((off, idx) => ({
    gridIndex: idx,
    label: labels[idx],
    lat: Number((centerLat + off.r * dLat).toFixed(6)),
    lng: Number((centerLng + off.c * dLng).toFixed(6)),
  }));
}

/**
 * Provider 1: DataForSEO Google Maps SERP API Adapter
 */
export class DataForSeoLocalProvider implements ILocalSeoRankProvider {
  readonly providerId = 'dataforseo';
  readonly providerName = 'DataForSEO Local SERP API';

  isConfigured(credentials?: Record<string, any>): boolean {
    const login = credentials?.login;
    const password = credentials?.password;
    return Boolean(login && password && String(login).trim().length > 0 && String(password).trim().length > 0);
  }

  async scanRankGrid(context: RankScanContext, credentials?: Record<string, any>): Promise<RankScanResult> {
    const login = credentials?.login;
    const password = credentials?.password;

    if (!login || !password) {
      throw new Error('DataForSEO API login and password not configured for tenant');
    }

    const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
    const nowIso = new Date().toISOString();
    const observations: RankObservation[] = [];
    const allCompetitors: Map<string, { name: string; rating: number; reviewsCount: number; position: number }> = new Map();

    // Query DataForSEO for center node or sample nodes
    for (const coord of context.coordinates) {
      try {
        const postData = [
          {
            keyword: context.keyword,
            location_coordinate: `${coord.lat},${coord.lng}`,
            language_code: 'en',
            depth: 20,
          },
        ];

        const response = await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const resJson: any = await response.json();
          const items = resJson?.tasks?.[0]?.result?.[0]?.items || [];
          let nodeRank: number | null = null;
          let matchedEvidence = '';

          if (items.length === 0) {
            observations.push({
              id: `obs_${crypto.randomUUID().slice(0, 10)}`,
              companyId: context.companyId,
              keyword: context.keyword,
              latitude: coord.lat,
              longitude: coord.lng,
              gridIndex: coord.gridIndex,
              gridLabel: coord.label,
              timestamp: nowIso,
              provider: this.providerId,
              position: null,
              status: 'FAILED',
              sourceEvidence: `DataForSEO returned 0 local results at @${coord.lat},${coord.lng}`,
            });
            continue;
          }

          const cleanBizName = context.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');

          items.forEach((item: any, idx: number) => {
            const itemClean = (item.title || item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const isMatch =
              (context.placeId && item.place_id === context.placeId) ||
              (cleanBizName.length > 3 && itemClean.includes(cleanBizName)) ||
              (itemClean.length > 3 && cleanBizName.includes(itemClean));

            if (isMatch && nodeRank === null) {
              nodeRank = idx + 1;
              matchedEvidence = `DataForSEO SERP matched position #${idx + 1} (${item.title || item.name})`;
            } else if (!isMatch && allCompetitors.size < 6) {
              const compName = item.title || item.name || 'Local Competitor';
              if (!allCompetitors.has(compName)) {
                allCompetitors.set(compName, {
                  name: compName,
                  rating: typeof item.rating?.value === 'number' ? item.rating.value : (typeof item.rating === 'number' ? item.rating : (null as any)),
                  reviewsCount: typeof (item.rating?.votes_count ?? item.reviews_count) === 'number' ? (item.rating?.votes_count ?? item.reviews_count) : (null as any),
                  position: idx + 1,
                });
              }
            }
          });

          observations.push({
            id: `obs_${crypto.randomUUID().slice(0, 10)}`,
            companyId: context.companyId,
            keyword: context.keyword,
            latitude: coord.lat,
            longitude: coord.lng,
            gridIndex: coord.gridIndex,
            gridLabel: coord.label,
            timestamp: nowIso,
            provider: this.providerId,
            position: nodeRank,
            status: 'LIVE',
            sourceEvidence: matchedEvidence || `DataForSEO observed 20 SERP listings; business not ranked in top 20 at @${coord.lat},${coord.lng}`,
          });
        } else {
          observations.push({
            id: `obs_${crypto.randomUUID().slice(0, 10)}`,
            companyId: context.companyId,
            keyword: context.keyword,
            latitude: coord.lat,
            longitude: coord.lng,
            gridIndex: coord.gridIndex,
            gridLabel: coord.label,
            timestamp: nowIso,
            provider: this.providerId,
            position: null,
            status: 'FAILED',
            sourceEvidence: `DataForSEO HTTP ${response.status}`,
          });
        }
      } catch (err: any) {
        observations.push({
          id: `obs_${crypto.randomUUID().slice(0, 10)}`,
          companyId: context.companyId,
          keyword: context.keyword,
          latitude: coord.lat,
          longitude: coord.lng,
          gridIndex: coord.gridIndex,
          gridLabel: coord.label,
          timestamp: nowIso,
          provider: this.providerId,
          position: null,
          status: 'FAILED',
          sourceEvidence: `Network error: ${err?.message}`,
        });
      }
    }

    const centerObs = observations.find((o) => o.gridIndex === 4) || observations[0];
    const validPositions = observations.map((o) => o.position).filter((p): p is number => typeof p === 'number');
    const successCount = observations.filter((o) => o.status === 'LIVE' || o.status === 'VERIFIED').length;

    let overallStatus: 'LIVE' | 'PARTIAL' | 'FAILED' = 'FAILED';
    if (successCount === observations.length && successCount > 0) {
      overallStatus = 'LIVE';
    } else if (successCount > 0) {
      overallStatus = 'PARTIAL';
    } else {
      overallStatus = 'FAILED';
    }

    const overallRank = overallStatus === 'FAILED'
      ? null
      : (centerObs?.position ?? (validPositions.length > 0 ? Math.round(validPositions.reduce((a, b) => a + b, 0) / validPositions.length) : null));

    return {
      provider: this.providerId,
      observations,
      overallRank,
      searchVolume: null, // DataForSEO search volume requires keyword_data API
      status: overallStatus,
      topCompetitors: Array.from(allCompetitors.values()),
      evidenceNotes: overallStatus === 'LIVE'
        ? `Live 9-node geolocated DataForSEO scan completed at ${nowIso}.`
        : overallStatus === 'PARTIAL'
        ? `Partial DataForSEO scan (${successCount}/${observations.length} nodes succeeded).`
        : `DataForSEO scan failed for all 9 coordinates.`,
    };
  }
}

/**
 * Provider 2: SerpApi Google Maps Engine Adapter
 */
export class SerpApiLocalProvider implements ILocalSeoRankProvider {
  readonly providerId = 'serpapi';
  readonly providerName = 'SerpApi Google Maps SERP';

  isConfigured(credentials?: Record<string, any>): boolean {
    const apiKey = credentials?.apiKey || credentials?.api_key;
    return Boolean(apiKey && String(apiKey).trim().length > 5);
  }

  async scanRankGrid(context: RankScanContext, credentials?: Record<string, any>): Promise<RankScanResult> {
    const apiKey = credentials?.apiKey || credentials?.api_key;
    if (!apiKey) {
      throw new Error('SerpApi API Key not configured for tenant');
    }

    const nowIso = new Date().toISOString();
    const observations: RankObservation[] = [];
    const allCompetitors: Map<string, { name: string; rating: number; reviewsCount: number; position: number }> = new Map();

    for (const coord of context.coordinates) {
      try {
        const serpUrl = new URL('https://serpapi.com/search.json');
        serpUrl.searchParams.set('engine', 'google_maps');
        serpUrl.searchParams.set('q', context.keyword);
        serpUrl.searchParams.set('ll', `@${coord.lat},${coord.lng},14z`);
        serpUrl.searchParams.set('api_key', String(apiKey).trim());

        const res = await fetch(serpUrl.toString(), { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          const data: any = await res.json();
          const localResults = data.local_results || [];
          let nodeRank: number | null = null;
          let matchedEvidence = '';

          if (localResults.length === 0) {
            observations.push({
              id: `obs_${crypto.randomUUID().slice(0, 10)}`,
              companyId: context.companyId,
              keyword: context.keyword,
              latitude: coord.lat,
              longitude: coord.lng,
              gridIndex: coord.gridIndex,
              gridLabel: coord.label,
              timestamp: nowIso,
              provider: this.providerId,
              position: null,
              status: 'FAILED',
              sourceEvidence: `SerpApi returned 0 local results at @${coord.lat},${coord.lng}`,
            });
            continue;
          }

          const cleanBizName = context.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');

          localResults.forEach((item: any, idx: number) => {
            const itemClean = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const isMatch =
              (context.placeId && item.place_id === context.placeId) ||
              (cleanBizName.length > 3 && itemClean.includes(cleanBizName)) ||
              (itemClean.length > 3 && cleanBizName.includes(itemClean));

            if (isMatch && nodeRank === null) {
              nodeRank = idx + 1;
              matchedEvidence = `SerpApi verified listing at position #${idx + 1} (${item.title})`;
            } else if (!isMatch && allCompetitors.size < 6) {
              const compName = item.title || 'Local Competitor';
              if (!allCompetitors.has(compName)) {
                allCompetitors.set(compName, {
                  name: compName,
                  rating: typeof item.rating === 'number' ? item.rating : (null as any),
                  reviewsCount: typeof item.reviews === 'number' ? item.reviews : (null as any),
                  position: idx + 1,
                });
              }
            }
          });

          observations.push({
            id: `obs_${crypto.randomUUID().slice(0, 10)}`,
            companyId: context.companyId,
            keyword: context.keyword,
            latitude: coord.lat,
            longitude: coord.lng,
            gridIndex: coord.gridIndex,
            gridLabel: coord.label,
            timestamp: nowIso,
            provider: this.providerId,
            position: nodeRank,
            status: 'LIVE',
            sourceEvidence: matchedEvidence || `SerpApi scan at @${coord.lat},${coord.lng}`,
          });
        } else {
          observations.push({
            id: `obs_${crypto.randomUUID().slice(0, 10)}`,
            companyId: context.companyId,
            keyword: context.keyword,
            latitude: coord.lat,
            longitude: coord.lng,
            gridIndex: coord.gridIndex,
            gridLabel: coord.label,
            timestamp: nowIso,
            provider: this.providerId,
            position: null,
            status: 'FAILED',
            sourceEvidence: `SerpApi HTTP ${res.status}`,
          });
        }
      } catch (err: any) {
        observations.push({
          id: `obs_${crypto.randomUUID().slice(0, 10)}`,
          companyId: context.companyId,
          keyword: context.keyword,
          latitude: coord.lat,
          longitude: coord.lng,
          gridIndex: coord.gridIndex,
          gridLabel: coord.label,
          timestamp: nowIso,
          provider: this.providerId,
          position: null,
          status: 'FAILED',
          sourceEvidence: `Network error: ${err?.message}`,
        });
      }
    }

    const centerObs = observations.find((o) => o.gridIndex === 4) || observations[0];
    const validPositions = observations.map((o) => o.position).filter((p): p is number => typeof p === 'number');
    const successCount = observations.filter((o) => o.status === 'LIVE' || o.status === 'VERIFIED').length;

    let overallStatus: 'LIVE' | 'PARTIAL' | 'FAILED' = 'FAILED';
    if (successCount === observations.length && successCount > 0) {
      overallStatus = 'LIVE';
    } else if (successCount > 0) {
      overallStatus = 'PARTIAL';
    } else {
      overallStatus = 'FAILED';
    }

    const overallRank = overallStatus === 'FAILED'
      ? null
      : (centerObs?.position ?? (validPositions.length > 0 ? Math.round(validPositions.reduce((a, b) => a + b, 0) / validPositions.length) : null));

    return {
      provider: this.providerId,
      observations,
      overallRank,
      searchVolume: null,
      status: overallStatus,
      topCompetitors: Array.from(allCompetitors.values()),
      evidenceNotes: overallStatus === 'LIVE'
        ? `Live SerpApi geolocated scan completed at ${nowIso}.`
        : overallStatus === 'PARTIAL'
        ? `Partial SerpApi scan (${successCount}/${observations.length} nodes succeeded).`
        : `SerpApi scan failed for all 9 coordinates.`,
    };
  }
}

/**
 * Provider 3: Unconfigured Provider (Returns honest UNAVAILABLE when no verified SERP scraper is active)
 */
export class UnconfiguredRankProvider implements ILocalSeoRankProvider {
  readonly providerId = 'unconfigured';
  readonly providerName = 'Unconfigured SERP Provider';

  isConfigured(_credentials?: Record<string, any>): boolean {
    return false;
  }

  async scanRankGrid(context: RankScanContext, _credentials?: Record<string, any>): Promise<RankScanResult> {
    const nowIso = new Date().toISOString();
    // Return 9 explicit geographic coordinates with position: null and status: UNAVAILABLE
    const observations: RankObservation[] = context.coordinates.map((coord) => ({
      id: `obs_${crypto.randomUUID().slice(0, 10)}`,
      companyId: context.companyId,
      keyword: context.keyword,
      latitude: coord.lat,
      longitude: coord.lng,
      gridIndex: coord.gridIndex,
      gridLabel: coord.label,
      timestamp: nowIso,
      provider: this.providerId,
      position: null,
      status: 'UNAVAILABLE',
      sourceEvidence: `No verified ranking provider configured for ${coord.lat}, ${coord.lng}`,
    }));

    return {
      provider: this.providerId,
      observations,
      overallRank: null,
      searchVolume: null,
      status: 'UNAVAILABLE',
      topCompetitors: [],
      evidenceNotes:
        'No verified local SERP rank provider is configured (e.g. DataForSEO or SerpAPI). Connect API credentials in Integrations to track live 3-Pack rank positions.',
    };
  }
}

/**
 * Provider 4: Mock Test Provider (ONLY active in test suites or explicit unit tests)
 */
export class MockTestRankProvider implements ILocalSeoRankProvider {
  readonly providerId = 'mock_test_provider';
  readonly providerName = 'Mock Test Local SEO Provider (Test Suite Only)';

  isConfigured(_credentials?: Record<string, any>): boolean {
    return true;
  }

  async scanRankGrid(context: RankScanContext, _credentials?: Record<string, any>): Promise<RankScanResult> {
    const nowIso = new Date().toISOString();
    const mockPositions = [2, 1, 3, 2, 1, 2, 4, 3, 4];

    const observations: RankObservation[] = context.coordinates.map((coord, idx) => ({
      id: `obs_mock_${idx}_${Date.now()}`,
      companyId: context.companyId,
      keyword: context.keyword,
      latitude: coord.lat,
      longitude: coord.lng,
      gridIndex: coord.gridIndex,
      gridLabel: coord.label,
      timestamp: nowIso,
      provider: this.providerId,
      position: mockPositions[idx] || 2,
      status: 'VERIFIED',
      sourceEvidence: `Mock test observation verified at coordinates ${coord.lat}, ${coord.lng}`,
    }));

    return {
      provider: this.providerId,
      observations,
      overallRank: 1,
      searchVolume: '450/mo',
      status: 'VERIFIED',
      topCompetitors: [
        { name: 'Apex Competitor Test A', rating: 4.8, reviewsCount: 95, position: 2 },
        { name: 'Digitron Test Competitor', rating: 4.6, reviewsCount: 42, position: 3 },
      ],
      evidenceNotes: 'Automated test suite mock verification observation.',
    };
  }
}

// Global Provider Instances
export const dataForSeoProvider = new DataForSeoLocalProvider();
export const serpApiProvider = new SerpApiLocalProvider();
export const unconfiguredProvider = new UnconfiguredRankProvider();
export const mockTestProvider = new MockTestRankProvider();

/**
 * Resolves the appropriate rank tracking provider for a company based on credentials
 */
export function resolveRankProvider(credentials?: Record<string, any>): ILocalSeoRankProvider {
  if (dataForSeoProvider.isConfigured(credentials)) {
    return dataForSeoProvider;
  }
  if (serpApiProvider.isConfigured(credentials)) {
    return serpApiProvider;
  }
  return unconfiguredProvider;
}
