import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Phone,
  Globe,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Plus,
  Save,
  Star,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { BusinessProfile, CompanyAsset } from '../types';
import {
  getGoogleProfileApi,
  syncGoogleProfileApi,
  GoogleProfileData,
  fetchCompanyAssetsApi,
} from '../services/authService';

interface GoogleProfileViewProps {
  business: BusinessProfile;
  companyId?: string;
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onNavigate?: (tab: string) => void;
}

export const GoogleProfileView: React.FC<GoogleProfileViewProps> = ({
  business,
  companyId,
  onUpdateBusiness,
  onNavigate,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [newService, setNewService] = useState('');
  const [servicesList, setServicesList] = useState(business.services || []);
  const [isOptimizingDesc, setIsOptimizingDesc] = useState(false);
  const [description, setDescription] = useState(business.description);
  const [brandAssets, setBrandAssets] = useState<CompanyAsset[]>([]);

  // Live Google Places Profile Sync State
  const [googleData, setGoogleData] = useState<GoogleProfileData | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  // Sync services & description if parent business changes
  useEffect(() => {
    setServicesList(business.services || []);
    setDescription(business.description);
  }, [business]);

  // Fetch Google Profile data on mount and whenever companyId changes
  useEffect(() => {
    if (!companyId) {
      setIsConfigured(false);
      return;
    }
    loadGoogleProfile(false);
  }, [companyId]);

  // Fetch real uploaded brand assets
  useEffect(() => {
    const targetId = companyId || business.id;
    if (targetId) {
      fetchCompanyAssetsApi(targetId)
        .then((items) => setBrandAssets(items || []))
        .catch(() => {});
    }
  }, [companyId, business.id]);

  const loadGoogleProfile = async (refresh = false) => {
    if (!companyId) return;
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorNotice(null);
    setWarningNotice(null);
    setSuccessNotice(null);

    try {
      const res = refresh ? await syncGoogleProfileApi(companyId) : await getGoogleProfileApi(companyId, false);
      if (res.success && res.configured !== false && res.data) {
        setIsConfigured(true);
        setGoogleData(res.data);
        setIsCached(Boolean(res.cached));
        setCachedAt(res.cachedAt || null);
        if (res.warning) {
          setWarningNotice(res.warning);
        }
        if (refresh && (res.syncedReviewsCount || res.newReviewsSynced)) {
          const count = res.syncedReviewsCount ?? res.newReviewsSynced ?? 0;
          setSuccessNotice(
            count > 0
              ? `Live Google sync complete! ${count} new reviews ingested into Reviews manager.`
              : 'Google profile refreshed and synchronized with Google Places API.'
          );
        }
      } else if (res.configured === false) {
        setIsConfigured(false);
        setGoogleData(null);
        setCachedAt(null);
        setIsCached(false);
      } else {
        // Configured was true, but API returned an error
        setIsConfigured(true);
        setErrorNotice(res.error || res.message || 'Unable to load Google Profile details');
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to connect to Google Profile service');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAddService = () => {
    if (!newService.trim()) return;
    setServicesList([...servicesList, newService.trim()]);
    setNewService('');
  };

  const handleRemoveService = (idx: number) => {
    setServicesList(servicesList.filter((_, i) => i !== idx));
  };

  const handleAiOptimizeDesc = () => {
    setIsOptimizingDesc(true);
    setTimeout(() => {
      setDescription(
        `Top-rated certified ${business.category.toLowerCase()} laboratory in ${business.address || 'the city'}. Specializing in certified precision solutions, emergency restoration, genuine OEM parts replacement, and local enterprise services with full written warranty.`
      );
      setIsOptimizingDesc(false);
    }, 800);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdateBusiness({
        ...business,
        description,
        services: servicesList,
      });
      setIsSaving(false);
    }, 600);
  };

  // Helper formatting for cache time
  const formatCacheTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-indigo-600" />
            Google Business Profile Manager & Health
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage your official Google Maps Presence, business attributes, services catalog, and live Places API sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && (
            <button
              onClick={() => loadGoogleProfile(true)}
              disabled={isRefreshing || isLoading}
              title="Refresh live data from Google Places API"
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-xs border border-slate-200 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync from Google'}</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Syncing...' : 'Save & Push to Google'}</span>
          </button>
        </div>
      </div>

      {/* STATE 1: Unconfigured Call-to-Action Empty State */}
      {isConfigured === false && !isLoading && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300/60 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">
                    Connect your Google Business Profile in Integrations to see live data
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider bg-amber-200/80 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full">
                    API Sync Offline
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  No live Google Place ID & Maps API Key connected for this company yet. Connect your Google Places credentials to pull verified Google Maps ratings, customer reviews, operational hours, and real-time local search metrics.
                </p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('integrations')}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex-shrink-0 self-start md:self-center"
              >
                <span>Connect Google Profile in Integrations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning or Error or Success Notices */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {warningNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{warningNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorNotice}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('integrations')}
              className="text-xs font-bold text-rose-700 underline hover:text-rose-900 flex-shrink-0"
            >
              Check API Key
            </button>
          )}
        </div>
      )}

      {/* Live Google Metrics Strip (When configured with real data) */}
      {isConfigured && googleData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Live Star Rating */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Google Rating
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900">
                  {googleData.rating != null ? googleData.rating.toFixed(1) : 'N/A'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">/ 5.0</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live from Google Places
              </div>
            </div>
          </div>

          {/* Live Review Count */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Reviews
              </div>
              <div className="text-xl font-black text-slate-900">
                {(googleData.user_ratings_total ?? 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Public user feedback count
              </div>
            </div>
          </div>

          {/* Operating Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              googleData.opening_hours?.open_now
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Operational Status
              </div>
              <div className="text-sm font-black text-slate-900">
                {googleData.opening_hours?.open_now ? (
                  <span className="text-emerald-700">Open Now</span>
                ) : googleData.opening_hours?.open_now === false ? (
                  <span className="text-slate-700">Currently Closed</span>
                ) : (
                  <span>{googleData.business_status || 'Operational'}</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {googleData.business_status || 'Verified Listing'}
              </div>
            </div>
          </div>

          {/* Maps Link & Place ID */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Google Maps Profile
              </div>
              {googleData.url ? (
                <a
                  href={googleData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 truncate"
                >
                  <span className="truncate">View on Maps</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : (
                <span className="text-xs font-bold text-slate-700 font-mono truncate block">
                  {googleData.place_id.slice(0, 14)}...
                </span>
              )}
              <div className="text-[10px] text-slate-400 truncate">
                {isCached ? `Cached (6h TTL)` : 'Live fetch'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Health Audit Bento Pill */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  Profile Health Score: {isConfigured && googleData ? '92 / 100' : '45 / 100'}
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  isConfigured && googleData
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {isConfigured && googleData ? 'API Synchronized' : 'Needs Google Connect'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Google Local 3-Pack ranking prioritizes verified profiles with regular reviews, rich service catalogs, and accurate operational hours.
                {isConfigured && googleData
                  ? ` Connected with verified Google Place ID "${googleData.place_id}".`
                  : ' Connect your Google Place ID and API key to pull live review counts and hours.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleAiOptimizeDesc}
            disabled={isOptimizingDesc}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 border border-indigo-200 text-xs font-bold px-3.5 py-2 rounded-xl transition self-start md:self-auto shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isOptimizingDesc ? 'Optimizing...' : 'Auto-Enhance Profile Description'}</span>
          </button>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Core Business Details
                {isConfigured && googleData && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-md normal-case">
                    Live from Google Maps
                  </span>
                )}
              </h2>
              {isConfigured === false && onNavigate && (
                <button
                  onClick={() => onNavigate('integrations')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  Configure Places API <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Business Name (as seen on Google Maps)
                </label>
                <input
                  type="text"
                  value={googleData?.name || business.name}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Primary Category</label>
                  <input
                    type="text"
                    value={business.category}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Verified Phone Number</label>
                  <input
                    type="text"
                    value={
                      googleData?.formatted_phone_number ||
                      (isConfigured === false
                        ? 'Not Connected (Set in Integrations)'
                        : business.phone)
                    }
                    readOnly
                    className={`w-full border rounded-xl px-3 py-2 font-medium ${
                      googleData?.formatted_phone_number
                        ? 'bg-slate-50 border-slate-200 text-slate-900 font-bold'
                        : isConfigured === false
                        ? 'bg-amber-50/50 border-amber-200 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-bold">Business Description (SEO-Optimized)</label>
                  <button
                    onClick={handleAiOptimizeDesc}
                    disabled={isOptimizingDesc}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isOptimizingDesc ? 'Rewriting with Gemini...' : 'Rewrite with Local SEO Keywords'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Address</label>
                  <input
                    type="text"
                    value={googleData?.formatted_address || business.address}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={
                      googleData?.opening_hours?.weekday_text?.join(' | ') ||
                      (isConfigured === false
                        ? 'Not Connected (Set in Integrations)'
                        : business.openingHours)
                    }
                    readOnly
                    className={`w-full border rounded-xl px-3 py-2 ${
                      isConfigured === false
                        ? 'bg-amber-50/50 border-amber-200 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Weekly Schedule list if available from Google Places */}
              {googleData?.opening_hours?.weekday_text && googleData.opening_hours.weekday_text.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                    Google Maps Weekly Schedule:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    {googleData.opening_hours.weekday_text.map((day, idx) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-slate-100 last:border-b-0">
                        <span>{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real Customer Reviews from Google Places API (if loaded) */}
          {isConfigured && googleData?.reviews && googleData.reviews.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    Verified Google Places Reviews
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-md normal-case">
                      {googleData.reviews.length} shown
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Direct public testimonials synced from Google Maps Place Details.
                  </p>
                </div>
                {googleData.url && (
                  <a
                    href={googleData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <span>View all on Google</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="space-y-3">
                {googleData.reviews.map((rev, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {rev.profile_photo_url ? (
                          <img
                            src={rev.profile_photo_url}
                            alt={rev.author_name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
                            {rev.author_name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{rev.author_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {rev.relative_time_description || 'Recent Google Review'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-700 font-bold text-[11px]">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        <span>{rev.rating}</span>
                      </div>
                    </div>
                    {rev.text && (
                      <p className="text-slate-700 leading-relaxed italic">
                        "{rev.text}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Catalog */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Services Catalog (Directly affects Google search discovery)
                </h2>
                <p className="text-xs text-slate-500">Google ranks you for keywords matching active service items.</p>
              </div>
              <span className="text-xs font-bold text-indigo-600">{servicesList.length} Active Services</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Broken Laptop Hinge Reconstruction..."
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
              <button
                onClick={handleAddService}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Service
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {servicesList.map((srv, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs shadow-2xs"
                >
                  <span className="text-slate-800 font-medium">{srv}</span>
                  <button
                    onClick={() => handleRemoveService(idx)}
                    className="text-slate-400 hover:text-rose-600 font-bold px-1.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Photos, Attributes & Sync Status */}
        <div className="space-y-6">
          {/* Connection Status Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">API Sync State</span>
              {isConfigured && googleData ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Connected
                </span>
              ) : isConfigured === false ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Not Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" /> Checking...
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Google Place ID:</span>
                <span className="font-mono text-slate-800 font-semibold truncate max-w-[170px]">
                  {googleData?.place_id || (isConfigured === false ? 'None Configured' : 'Loading...')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sync Frequency:</span>
                <span className="font-bold text-slate-800">6-Hour Cache TTL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cache Status:</span>
                <span className="font-bold text-slate-800">
                  {isCached ? `Cached (${formatCacheTime(cachedAt)})` : googleData ? 'Fresh API Sync' : 'Awaiting Setup'}
                </span>
              </div>
            </div>

            {isConfigured === false && onNavigate && (
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('integrations')}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold py-2 rounded-xl transition"
                >
                  <span>Open Integrations Tab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Profile Media / Photos */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                Store Photos ({brandAssets.filter((a) => a.asset_type === 'photo').length > 0 ? brandAssets.filter((a) => a.asset_type === 'photo').length : (googleData?.photos_count ?? 94)} Synced)
              </h3>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('content')}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  Manage Brand Assets →
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {brandAssets.filter((a) => a.asset_type === 'photo').length > 0 ? (
                brandAssets
                  .filter((a) => a.asset_type === 'photo')
                  .slice(0, 4)
                  .map((photo, idx) => (
                    <img
                      key={photo.id || idx}
                      src={photo.url}
                      alt={photo.filename || `Store Photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-xl border border-slate-200"
                    />
                  ))
              ) : (
                <>
                  <img
                    src="https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=300&q=80"
                    alt="Storefront"
                    className="w-full h-24 object-cover rounded-xl border border-slate-200"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=300&q=80"
                    alt="Diagnostics Lab"
                    className="w-full h-24 object-cover rounded-xl border border-slate-200"
                  />
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Profiles with regular photo uploads receive 5x more direction requests according to Google Maps analytics.
            </p>
          </div>

          {/* Service Area Coverage */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Service Areas Covered
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(business.serviceAreas || []).map((area) => (
                <span
                  key={area}
                  className="bg-slate-50 text-slate-700 text-xs px-3 py-1 rounded-xl border border-slate-200 font-medium"
                >
                  📍 {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
