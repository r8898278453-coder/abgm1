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
  CheckCircle2,
} from 'lucide-react';
import { KeywordRank } from '../types';

interface LocalSeoViewProps {
  keywords: KeywordRank[];
  onAddKeyword?: (kw: string) => void;
  onDeleteKeyword?: (id: string) => void;
  city?: string;
  category?: string;
}

export const LocalSeoView: React.FC<LocalSeoViewProps> = ({
  keywords = [],
  onAddKeyword,
  onDeleteKeyword,
  city = 'Thane',
  category = 'IT Services & Web Development',
}) => {
  const [newKw, setNewKw] = useState('');
  const [selectedKwId, setSelectedKwId] = useState<string | null>(null);

  const selectedKw = keywords.length > 0 ? (keywords.find((k) => k.id === selectedKwId) || keywords[0]) : null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKw.trim()) return;
    onAddKeyword?.(newKw.trim());
    setNewKw('');
  };

  const suggestions = [
    `custom website development in ${city}`,
    `mobile app developer near me`,
    `best ${category.toLowerCase().slice(0, 20)} agency`,
    `google 3-pack local seo services`,
  ];

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
            Geographic 3x3 node rank tracking across {city} & regional commercial hubs.
          </p>
        </div>
      </div>

      {/* AI Geo-Visibility Insight Card (Bento Banner) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              AI Local SEO Geo-Diagnosis ({city})
            </span>
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
            <Plus className="w-3.5 h-3.5 text-indigo-600" /> Track New Local Keyword
          </h3>
          <span className="text-[11px] text-slate-400">Track Google 3-Pack rank across coordinates</span>
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
            disabled={!newKw.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Track Keyword
          </button>
        </form>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400 font-medium">Suggestions:</span>
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

      {/* Interactive Rank Grid */}
      {selectedKw ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Geographic Map Rank Grid for: <span className="text-indigo-600 normal-case">"{selectedKw.keyword}"</span>
              </h2>
              <p className="text-xs text-slate-500">Position in Google 3-Pack across geo coordinates</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Search Volume:</span>
              <span className="bg-slate-50 text-slate-800 text-xs px-3 py-1 rounded-xl border border-slate-200 font-bold">
                {selectedKw.searchVolume}
              </span>
            </div>
          </div>

          {/* 4 Node Grid Visualizer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {/* Area A */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center shadow-xs">
              <div className="text-xs text-slate-500 font-bold mb-1">Area A: Central Commercial Hub</div>
              <div className={`text-4xl font-black my-2 ${selectedKw.gridRankings.vashi <= 3 ? 'text-emerald-700' : 'text-amber-600'}`}>
                #{selectedKw.gridRankings.vashi}
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Top 3 Map Pack ⭐
              </span>
            </div>

            {/* Area B */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center shadow-xs">
              <div className="text-xs text-slate-500 font-bold mb-1">Area B: Market District</div>
              <div className={`text-4xl font-black my-2 ${selectedKw.gridRankings.sanpada <= 3 ? 'text-emerald-700' : 'text-amber-600'}`}>
                #{selectedKw.gridRankings.sanpada}
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Top 3 Map Pack ⭐
              </span>
            </div>

            {/* Area C */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center shadow-xs">
              <div className="text-xs text-slate-500 font-bold mb-1">Area C: Transit & Highway Junction</div>
              <div className={`text-4xl font-black my-2 ${selectedKw.gridRankings.nerul <= 3 ? 'text-emerald-700' : 'text-rose-600'}`}>
                #{selectedKw.gridRankings.nerul}
              </div>
              <span className="text-[11px] text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                Position #{selectedKw.gridRankings.nerul}
              </span>
            </div>

            {/* Area D */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center shadow-xs">
              <div className="text-xs text-slate-500 font-bold mb-1">Area D: Tech Park & Suburbs</div>
              <div className={`text-4xl font-black my-2 ${selectedKw.gridRankings.belapur <= 3 ? 'text-emerald-700' : 'text-amber-600'}`}>
                #{selectedKw.gridRankings.belapur}
              </div>
              <span className="text-[11px] text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                Page 1 Organic
              </span>
            </div>
          </div>
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
                <th className="p-3">Trend (30d)</th>
                <th className="p-3">Search Vol</th>
                <th className="p-3">Area A</th>
                <th className="p-3">Area B</th>
                <th className="p-3">Area C</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keywords.map((kw) => {
                const diff = kw.previousRank - kw.rank;
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
                    <td className="p-3 font-bold text-emerald-700">#{kw.gridRankings.vashi}</td>
                    <td className="p-3 font-bold text-amber-700">#{kw.gridRankings.nerul}</td>
                    <td className="p-3 font-bold text-emerald-700">#{kw.gridRankings.sanpada}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
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
