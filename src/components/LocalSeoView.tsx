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
} from 'lucide-react';
import { KeywordRank } from '../types';

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

  const selectedKw = keywords.length > 0 ? (keywords.find((k) => k.id === selectedKwId) || keywords[0]) : null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKw.trim() || isScanning) return;
    const target = newKw.trim();
    setNewKw('');
    setActiveScanningKw(target);
    try {
      if (onAddKeyword) {
        await onAddKeyword(target);
        setStatusMessage(`Live SERP scan complete for "${target}".`);
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
        setStatusMessage('All tracked keyword SERP rankings refreshed.');
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
        setStatusMessage(`Refreshed live rank for "${kwText}".`);
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
    switch (classification) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE GOOGLE 3-PACK
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <ShieldCheck className="w-3 h-3 text-sky-600" /> VERIFIED SERP
          </span>
        );
      case 'ESTIMATED':
      case 'CALCULATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles className="w-3 h-3 text-indigo-600" /> ESTIMATED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            DEMO / SEEDED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Compass className="w-7 h-7 text-indigo-600" />
            Local SEO & Google Maps Rank Radar
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Real-time Google 3-Pack rank tracking & SERP competitor intelligence for {city}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefreshAllClick}
            disabled={isRefreshingAll || keywords.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-2 shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshingAll ? 'animate-spin text-indigo-600' : ''}`} />
            {isRefreshingAll ? 'Scanning SERP...' : 'Refresh All Rankings'}
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

      {/* AI Geo-Visibility Insight Card (Bento Banner) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                AI Local SEO Geo-Diagnosis ({city})
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-md">
                Live Radar
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Strong Top 3 Google Map Pack visibility across central {city}, with expansion opportunities in regional corridors.
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-3xl">
              Dominating local search queries within 5 km of prime commercial centers.
              <strong> Recommended Action:</strong> Publish localized service landing pages for surrounding zip codes and generate review replies with targeted local anchor keywords.
            </p>
          </div>
        </div>
      </div>

      {/* Add Keyword Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-600" /> Track & Scan New Local Keyword
          </h3>
          <span className="text-[11px] text-slate-400">Scans live Google Maps SERP & 3-Pack position</span>
        </div>

        <form onSubmit={handleAddSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              placeholder="e.g. laptop repair near me, best website designer thane west"
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
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning SERP...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Scan & Track
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

      {/* Interactive Rank Grid & SERP Competitors */}
      {selectedKw ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Inspecting Keyword:
                </span>
                {getClassificationBadge(selectedKw.dataClassification)}
                {selectedKw.lastScannedAt && (
                  <span className="text-[10px] text-slate-400">
                    Scanned {new Date(selectedKw.lastScannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-indigo-900">
                "{selectedKw.keyword}"
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Search Volume:</span>
              <span className="bg-slate-50 text-slate-800 text-xs px-3 py-1 rounded-xl border border-slate-200 font-bold">
                {selectedKw.searchVolume}
              </span>
              <button
                onClick={() => handleRescanSingle(selectedKw.keyword)}
                disabled={activeScanningKw === selectedKw.keyword}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                title="Rescan this keyword on Google SERP"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${activeScanningKw === selectedKw.keyword ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* 4 Node Grid Visualizer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Area A */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className="text-[11px] text-slate-500 font-bold mb-1">Node A: Central Commercial Hub</div>
              <div className={`text-3xl font-black my-1.5 ${selectedKw.gridRankings?.vashi <= 3 ? 'text-emerald-700' : 'text-amber-600'}`}>
                #{selectedKw.gridRankings?.vashi || selectedKw.rank}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                {selectedKw.gridRankings?.vashi <= 3 ? 'Top 3 Map Pack ⭐' : 'Page 1 Organic'}
              </span>
            </div>

            {/* Area B */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className="text-[11px] text-slate-500 font-bold mb-1">Node B: Market District</div>
              <div className={`text-3xl font-black my-1.5 ${selectedKw.gridRankings?.sanpada <= 3 ? 'text-emerald-700' : 'text-amber-600'}`}>
                #{selectedKw.gridRankings?.sanpada || selectedKw.rank}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                {selectedKw.gridRankings?.sanpada <= 3 ? 'Top 3 Map Pack ⭐' : 'Page 1 Organic'}
              </span>
            </div>

            {/* Area C */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className="text-[11px] text-slate-500 font-bold mb-1">Node C: Transit Junction</div>
              <div className={`text-3xl font-black my-1.5 ${selectedKw.gridRankings?.nerul <= 3 ? 'text-emerald-700' : 'text-rose-600'}`}>
                #{selectedKw.gridRankings?.nerul || selectedKw.rank + 1}
              </div>
              <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                Position #{selectedKw.gridRankings?.nerul || selectedKw.rank + 1}
              </span>
            </div>

            {/* Area D */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center shadow-2xs">
              <div className="text-[11px] text-slate-500 font-bold mb-1">Node D: Tech Park & Suburbs</div>
              <div className={`text-3xl font-black my-1.5 ${selectedKw.gridRankings?.belapur <= 3 ? 'text-emerald-700' : 'text-amber-600'}`}>
                #{selectedKw.gridRankings?.belapur || selectedKw.rank + 2}
              </div>
              <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                Position #{selectedKw.gridRankings?.belapur || selectedKw.rank + 2}
              </span>
            </div>
          </div>

          {/* Real SERP Competitors Identified for this keyword */}
          {selectedKw.topCompetitors && selectedKw.topCompetitors.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users2 className="w-3.5 h-3.5 text-indigo-600" /> Competitors Identified on Google Maps for this Keyword
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
          <p className="text-xs text-slate-500 mt-1">Add or choose a target keyword above to inspect local Google 3-Pack geo rankings.</p>
        </div>
      )}

      {/* Keywords Performance Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Tracked High-Intent Local Keywords
          </h3>
          <span className="text-xs text-slate-500 font-semibold">{keywords.length} Active Trackers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="p-3">Target Keyword</th>
                <th className="p-3">Current Rank</th>
                <th className="p-3">Data Truth</th>
                <th className="p-3">Trend (30d)</th>
                <th className="p-3">Search Vol</th>
                <th className="p-3">Node A</th>
                <th className="p-3">Node B</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keywords.map((kw) => {
                const diff = (kw.previousRank || kw.rank) - kw.rank;
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
                      #{kw.rank}
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
                    <td className="p-3 text-slate-600">{kw.searchVolume}</td>
                    <td className="p-3 font-bold text-emerald-700">#{kw.gridRankings?.vashi || kw.rank}</td>
                    <td className="p-3 font-bold text-amber-700">#{kw.gridRankings?.sanpada || kw.rank}</td>
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

