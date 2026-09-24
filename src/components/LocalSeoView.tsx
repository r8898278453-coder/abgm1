import React, { useState } from 'react';
import {
  TrendingUp,
  MapPin,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  Plus,
  Compass,
  Trash2,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Users2,
  ExternalLink,
  Layers,
  Globe,
  Info,
} from 'lucide-react';
import { KeywordRank, RankObservation } from '../types';
import { DataStatusBadge } from './DataStatusBadge';

interface LocalSeoViewProps {
  keywords: KeywordRank[];
  onAddKeyword?: (kw: string) => Promise<void> | void;
  onDeleteKeyword?: (id: string) => void;
  onRefreshAll?: () => Promise<void> | void;
  onScanSingle?: (kw: string) => Promise<void> | void;
  onAddCompetitor?: (comp: { name: string; rating: number; reviewsCount: number }) => void;
  city?: string;
  category?: string;
  isScanning?: boolean;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  thane: { lat: 19.2183, lng: 72.9781 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  'navi mumbai': { lat: 19.033, lng: 73.0297 },
  pune: { lat: 18.5204, lng: 73.8567 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
};

function fallback9Grid(city: string) {
  const norm = city.toLowerCase().trim();
  const center = CITY_COORDS[norm] || CITY_COORDS.thane;
  const latDelta = 3.5 / 111.32;
  const lngDelta = 3.5 / (111.32 * Math.cos((center.lat * Math.PI) / 180));

  const offsets = [
    { label: 'NW (-3.5km, +3.5km)', dLat: latDelta, dLng: -lngDelta },
    { label: 'N (0km, +3.5km)', dLat: latDelta, dLng: 0 },
    { label: 'NE (+3.5km, +3.5km)', dLat: latDelta, dLng: lngDelta },
    { label: 'W (-3.5km, 0km)', dLat: 0, dLng: -lngDelta },
    { label: 'Center (0km, 0km)', dLat: 0, dLng: 0 },
    { label: 'E (+3.5km, 0km)', dLat: 0, dLng: lngDelta },
    { label: 'SW (-3.5km, -3.5km)', dLat: -latDelta, dLng: -lngDelta },
    { label: 'S (0km, -3.5km)', dLat: -latDelta, dLng: 0 },
    { label: 'SE (+3.5km, -3.5km)', dLat: -latDelta, dLng: lngDelta },
  ];

  return offsets.map((o, idx) => ({
    gridIndex: idx,
    label: o.label,
    lat: Number((center.lat + o.dLat).toFixed(6)),
    lng: Number((center.lng + o.dLng).toFixed(6)),
  }));
}

export const LocalSeoView: React.FC<LocalSeoViewProps> = ({
  keywords = [],
  onAddKeyword,
  onDeleteKeyword,
  onRefreshAll,
  onScanSingle,
  onAddCompetitor,
  city = 'Thane',
  category = 'IT Services & Web Development',
  isScanning = false,
}) => {
  const [newKw, setNewKw] = useState('');
  const [selectedKwId, setSelectedKwId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [activeScanningKw, setActiveScanningKw] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedKw = keywords.length > 0 ? keywords.find((k) => k.id === selectedKwId) || keywords[0] : null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKw.trim() || isScanning) return;
    const target = newKw.trim();
    setNewKw('');
    setActiveScanningKw(target);
    try {
      if (onAddKeyword) {
        await onAddKeyword(target);
        setStatusMessage(`Local SERP scan processed for "${target}".`);
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } finally {
      setActiveScanningKw(null);
    }
  };

  const handleRefreshAllClick = async () => {
    if (isRefreshingAll || keywords.length === 0) return;
    setIsRefreshingAll(true);
    try {
      if (onRefreshAll) {
        await onRefreshAll();
        setStatusMessage('Tracked keyword rank observations refreshed.');
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleRescanSingle = async (kwText: string) => {
    setActiveScanningKw(kwText);
    try {
      if (onScanSingle) {
        await onScanSingle(kwText);
        setStatusMessage(`Refreshed rank radar for "${kwText}".`);
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } finally {
      setActiveScanningKw(null);
    }
  };

  const suggestions = [
    `custom website development in ${city}`,
    `mobile app developer near me`,
    `best ${category.toLowerCase().slice(0, 20)} agency`,
    `google 3-pack local seo services`,
  ];

  const getClassificationBadge = (classification?: string) => {
    return <DataStatusBadge status={classification || 'UNAVAILABLE'} />;
  };

  // Build the 9 nodes for the 3x3 visualizer
  const gridCoords = fallback9Grid(city);
  const observationsList: Array<{
    gridIndex: number;
    label: string;
    lat: number;
    lng: number;
    position: number | null;
    status: string;
    evidence?: string;
  }> = gridCoords.map((c, idx) => {
    const matchedObs = selectedKw?.observations?.find((o) => o.gridIndex === idx);
    if (matchedObs) {
      return {
        gridIndex: idx,
        label: matchedObs.gridLabel || c.label,
        lat: matchedObs.latitude,
        lng: matchedObs.longitude,
        position: matchedObs.position,
        status: matchedObs.status,
        evidence: matchedObs.sourceEvidence,
      };
    }
    // Check fallback gridRankings dictionary
    const posVal = selectedKw?.gridRankings?.[`node_${idx}`];
    return {
      gridIndex: idx,
      label: c.label,
      lat: c.lat,
      lng: c.lng,
      position: typeof posVal === 'number' && posVal > 0 ? posVal : null,
      status: selectedKw?.dataClassification || 'UNAVAILABLE',
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Compass className="w-7 h-7 text-indigo-600" />
            Local SEO 3x3 Geo-Rank Radar
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Real provider-based 9-node Google Maps 3-Pack rank tracking across physical coordinates for {city}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefreshAllClick}
            disabled={isRefreshingAll || keywords.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-2 shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshingAll ? 'animate-spin text-indigo-600' : ''}`} />
            {isRefreshingAll ? 'Scanning Grid...' : 'Refresh All Rankings'}
          </button>
        </div>
      </div>

      {/* Live Status Toast Banner */}
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* Provider Status Notice */}
      {selectedKw?.dataClassification === 'UNAVAILABLE' && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-5 shadow-sm flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-2">
              <span>Verified Rank Tracking Provider Not Configured</span>
              <DataStatusBadge status="UNAVAILABLE" />
            </div>
            <p className="text-amber-800 leading-relaxed">
              Google does not provide arbitrary Local SERP rank queries through the standard Google Places or Business Profile APIs. To collect real 3-Pack ranking observations across the 9 geo-coordinates below, configure a verified provider (such as <strong>DataForSEO</strong> or <strong>SerpAPI</strong>) under Settings &gt; Integrations.
            </p>
          </div>
        </div>
      )}

      {/* Add Keyword Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-600" /> Track & Scan New Local Keyword
          </h3>
          <span className="text-[11px] text-slate-400">Scans 9 physical coordinates across {city}</span>
        </div>

        <form onSubmit={handleAddSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              placeholder="e.g. website development in thane, mobile app company near me"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={!newKw.trim() || Boolean(activeScanningKw)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            {activeScanningKw ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning Grid...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Scan 3x3 Grid
              </>
            )}
          </button>
        </form>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400 font-medium">Quick suggestions:</span>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setNewKw(sug)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              + {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive 3x3 Geo-Rank Grid & SERP Competitors */}
      {selectedKw ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Inspecting Keyword:
                </span>
                {getClassificationBadge(selectedKw.dataClassification)}
                {selectedKw.provider && (
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Provider: {selectedKw.provider}
                  </span>
                )}
                {selectedKw.lastScannedAt && (
                  <span className="text-[10px] text-slate-400">
                    Scanned {new Date(selectedKw.lastScannedAt).toLocaleString()}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-indigo-900">
                "{selectedKw.keyword}"
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Center Position</div>
                <div className="text-base font-black text-slate-900">
                  {selectedKw.rank ? `#${selectedKw.rank}` : <span className="text-slate-400 font-normal">Unranked</span>}
                </div>
              </div>
              <button
                onClick={() => handleRescanSingle(selectedKw.keyword)}
                disabled={activeScanningKw === selectedKw.keyword}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-xs font-semibold flex items-center gap-1.5"
                title="Rescan 3x3 grid for this keyword"
              >
                <RefreshCw className={`w-4 h-4 ${activeScanningKw === selectedKw.keyword ? 'animate-spin text-indigo-600' : ''}`} />
                <span className="hidden sm:inline">Rescan</span>
              </button>
            </div>
          </div>

          {/* 3x3 Geographic Grid Matrix (9 Real Coordinates) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>3x3 Geographic Radius Matrix (9 Points • 3.5 km Radius)</span>
              </div>
              <span className="text-[11px] text-slate-400">Centered at {city}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {observationsList.map((obs) => {
                const isCenter = obs.gridIndex === 4;
                const isRanked = typeof obs.position === 'number' && obs.position > 0;
                const isTop3 = isRanked && (obs.position as number) <= 3;
                const isTop10 = isRanked && (obs.position as number) <= 10;

                return (
                  <div
                    key={obs.gridIndex}
                    className={`border rounded-2xl p-3.5 transition flex flex-col justify-between ${
                      isCenter
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                            isCenter ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {obs.gridIndex + 1}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800 truncate">{obs.label}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{obs.lat.toFixed(4)}°, {obs.lng.toFixed(4)}°</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {isRanked ? (
                          <div className={`text-xl font-black ${isTop3 ? 'text-emerald-600' : isTop10 ? 'text-amber-600' : 'text-slate-700'}`}>
                            #{obs.position}
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-slate-400 mt-1">
                            {obs.status === 'UNAVAILABLE' ? 'N/A' : 'Unranked'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">
                        {isCenter ? 'Center Origin' : `Grid Node #${obs.gridIndex + 1}`}
                      </span>
                      {isRanked ? (
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                          isTop3 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isTop3 ? '3-Pack ⭐' : `Position #${obs.position}`}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          {obs.status === 'UNAVAILABLE' ? 'Provider Required' : '>20 SERP'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real SERP Competitors Discovered */}
          {selectedKw.topCompetitors && selectedKw.topCompetitors.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users2 className="w-3.5 h-3.5 text-indigo-600" /> Discovered SERP Competitors on Google Maps
                </span>
                <span className="text-[11px] text-slate-400">{selectedKw.topCompetitors.length} local listings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {selectedKw.topCompetitors.map((comp, cIdx) => (
                  <div key={cIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center">
                          {comp.position || cIdx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{comp.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>⭐ {comp.rating}</span>
                        <span>•</span>
                        <span>{comp.reviewsCount} reviews</span>
                      </div>
                    </div>
                    {onAddCompetitor && (
                      <button
                        onClick={() => onAddCompetitor({ name: comp.name, rating: comp.rating, reviewsCount: comp.reviewsCount })}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold whitespace-nowrap transition"
                      >
                        + Track
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
          <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">No Keyword Selected</h3>
          <p className="text-xs text-slate-500 mt-1">Add or choose a target keyword above to inspect local 3x3 Google Maps rankings.</p>
        </div>
      )}

      {/* Keywords Performance Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Tracked Local Keywords ({keywords.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">Historical Observations Persisted</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="p-3">Target Keyword</th>
                <th className="p-3">Center Rank</th>
                <th className="p-3">Data Truth</th>
                <th className="p-3">Trend</th>
                <th className="p-3">Search Vol</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keywords.map((kw) => {
                const diff = typeof kw.diff === 'number' ? kw.diff : (kw.previousRank && kw.rank ? kw.previousRank - kw.rank : 0);
                const isSelected = selectedKw?.id === kw.id;
                return (
                  <tr
                    key={kw.id}
                    className={`hover:bg-slate-50 transition cursor-pointer ${
                      isSelected ? 'bg-indigo-50/60 font-semibold' : ''
                    }`}
                    onClick={() => setSelectedKwId(kw.id)}
                  >
                    <td className="p-3 font-bold text-slate-900">
                      {kw.keyword}
                    </td>
                    <td className="p-3 font-black text-slate-900">
                      {kw.rank ? `#${kw.rank}` : <span className="text-slate-400 font-normal">--</span>}
                    </td>
                    <td className="p-3">
                      {getClassificationBadge(kw.dataClassification)}
                    </td>
                    <td className="p-3">
                      {diff > 0 ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-bold">
                          <ArrowUp className="w-3 h-3" /> +{diff} spots
                        </span>
                      ) : diff < 0 ? (
                        <span className="text-rose-700 flex items-center gap-1 font-bold">
                          <ArrowDown className="w-3 h-3" /> {diff} spots
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <Minus className="w-3 h-3" /> Steady
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{kw.searchVolume || '--'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRescanSingle(kw.keyword)}
                          disabled={activeScanningKw === kw.keyword}
                          title="Rescan on Google SERP"
                          className="p-1 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${activeScanningKw === kw.keyword ? 'animate-spin text-indigo-600' : ''}`} />
                        </button>
                        <button
                          onClick={() => setSelectedKwId(kw.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                            isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? 'Viewing' : 'Inspect'}
                        </button>
                        {onDeleteKeyword && (
                          <button
                            onClick={() => onDeleteKeyword(kw.id)}
                            title="Delete tracker"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


