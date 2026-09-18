import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Check,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { GrowthScore, AuditItem, BusinessProfile } from '../types';
import { initialGrowthScore } from '../data/initialData';

interface AuditViewProps {
  growthScore?: GrowthScore;
  auditItems?: AuditItem[];
  onResolveItem?: (id: string) => void;
  onFixItem?: (id: string) => void;
  onNavigate?: (tab: any) => void;
  business?: BusinessProfile;
}

export const AuditView: React.FC<AuditViewProps> = ({
  growthScore = initialGrowthScore,
  auditItems = [],
  onResolveItem,
  onFixItem,
  onNavigate = (_tab: any) => {},
}) => {
  const resolveItem = onResolveItem || onFixItem || (() => {});
  const [filter, setFilter] = useState<'all' | 'critical' | 'important' | 'recommended' | 'resolved'>('all');
  const [isScanning, setIsScanning] = useState(false);

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1200);
  };

  const safeAuditItems = auditItems || [];

  const filteredItems = safeAuditItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return item.resolved;
    return item.severity === filter && !item.resolved;
  });

  const getSeverityBadge = (severity: AuditItem['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            Critical
          </span>
        );
      case 'important':
        return (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Important
          </span>
        );
      case 'recommended':
        return (
          <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            Recommended
          </span>
        );
      case 'good':
        return (
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Good
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
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            AI Business Growth Audit
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Continuous 360° health scan across Google Maps, Reviews, Local SEO, Content & Leads.
          </p>
        </div>
        <button
          onClick={handleRescan}
          disabled={isScanning}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition shadow-xs w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Business...' : 'Run Full AI Audit'}</span>
        </button>
      </div>

      {/* Growth Score & 7-Pillar Breakdown in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dark Bento Tile for Composite Score */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-6 shadow-xl text-white flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">
              Composite Growth Score
            </div>
            <div className="text-6xl font-black tracking-tight flex items-baseline gap-1">
              <span>{growthScore.overall}</span>
              <span className="text-xl text-slate-500 font-bold">/100</span>
            </div>
            <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Strong Local Foundation
            </div>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Your business is outperforming 78% of electronics & repair centers in Navi Mumbai. Fixing the 2 critical items can take you to <strong>88/100</strong> within 7 days.
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Benchmark: Top 10% in Sector 17</span>
            <span className="text-indigo-400 font-bold">Target: 95+</span>
          </div>
        </div>

        {/* Right: White Bento Tile for 7-Pillars */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Performance Breakdown Across 7 Pillars
            </h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Automated Diagnostics
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Google Profile', score: growthScore.breakdown.googleProfile, color: 'bg-indigo-600' },
              { label: 'Local SEO & Map Pack', score: growthScore.breakdown.localSeo, color: 'bg-indigo-500' },
              { label: 'Reviews & Reputation', score: growthScore.breakdown.reviews, color: 'bg-emerald-600' },
              { label: 'Social Media Activity', score: growthScore.breakdown.socialMedia, color: 'bg-purple-600' },
              { label: 'Content Consistency', score: growthScore.breakdown.content, color: 'bg-amber-500' },
              { label: 'Website Experience', score: growthScore.breakdown.website, color: 'bg-cyan-600' },
              { label: 'Customer Engagement', score: growthScore.breakdown.customerEngagement, color: 'bg-teal-600' },
            ].map((pillar) => (
              <div key={pillar.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700 font-semibold">{pillar.label}</span>
                  <span className="font-bold text-slate-900">{pillar.score} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${pillar.color} h-2 rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${pillar.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 10 Prioritized Problems in Bento Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Top 10 Business Growth Bottlenecks
            </h2>
            <p className="text-xs text-slate-500">
              Prioritized by potential revenue and Google ranking impact.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                filter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All (10)
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                filter === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setFilter('important')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                filter === 'important' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Important
            </button>
            <button
              onClick={() => setFilter('recommended')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                filter === 'recommended' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recommended
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                filter === 'resolved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Audit item list */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.resolved
                  ? 'bg-slate-50/70 border-slate-200 opacity-60'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2 flex-wrap">
                  {getSeverityBadge(item.severity)}
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Category: {item.category}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Impact: {item.impact}
                  </span>
                </div>
                <h3 className={`font-bold text-sm ${item.resolved ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.resolved ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <Check className="w-3.5 h-3.5" /> Resolved with AI
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      resolveItem(item.id);
                      if (item.category === 'reviews') onNavigate('reviews');
                      else if (item.category === 'content') onNavigate('content');
                      else if (item.category === 'seo') onNavigate('seo');
                      else if (item.category === 'google') onNavigate('google');
                    }}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{item.actionText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
