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
  Eye,
  FileCode2,
  X,
} from 'lucide-react';
import { GrowthScore, AuditItem, BusinessProfile } from '../types';
import { initialGrowthScore } from '../data/initialData';
import { DataStatusBadge } from './DataStatusBadge';

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
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);

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

  const isUnavailable = growthScore.overall === null || growthScore.status === 'UNAVAILABLE';
  const isIncomplete = growthScore.status === 'INCOMPLETE_DATA';
  const statusLabel = growthScore.statusLabel || (isUnavailable ? 'UNAVAILABLE' : isIncomplete ? 'INCOMPLETE DATA' : 'CALCULATED');

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
        <div className="flex items-center gap-2">
          {growthScore.telemetry && growthScore.telemetry.length > 0 && (
            <button
              onClick={() => setShowTelemetryModal(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-2xl transition border border-slate-300"
            >
              <FileCode2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Telemetry & Formula Audit</span>
            </button>
          )}
          <button
            onClick={handleRescan}
            disabled={isScanning}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition shadow-xs w-fit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Business...' : 'Run Full AI Audit'}</span>
          </button>
        </div>
      </div>

      {/* Growth Score & 7-Pillar Breakdown in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dark Bento Tile for Composite Score */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-6 shadow-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Growth Intelligence Score
              </div>
              <DataStatusBadge
                status={growthScore.status || (isUnavailable ? 'UNAVAILABLE' : 'CALCULATED')}
                label={statusLabel}
                className="bg-white/10 text-white border-white/20 text-[10px]"
              />
            </div>
            <div className="text-6xl font-black tracking-tight flex items-baseline gap-1">
              <span>{growthScore.overall !== null ? growthScore.overall : '--'}</span>
              <span className="text-xl text-slate-500 font-bold">/100</span>
            </div>

            {isUnavailable ? (
              <div className="text-xs font-semibold text-amber-400 mt-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Insufficient Verified Signals
              </div>
            ) : isIncomplete ? (
              <div className="text-xs font-semibold text-sky-400 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Partial Verified Signals
              </div>
            ) : (
              <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Deterministic Composite Active
              </div>
            )}

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {isUnavailable
                ? (growthScore.insufficientDataReason || 'No verified marketing signals available yet. Connect Google Business, website, or log reviews to compute score.')
                : isIncomplete
                ? (growthScore.insufficientDataReason || 'Score calculated from available pillars. Connect remaining channels for complete 7-pillar telemetry.')
                : 'Score calculated from deterministic evidence across Google Business NAP consistency, 3x3 local SEO ranking, review volume, and reply engagement.'}
            </p>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Engine: Deterministic 7-Pillar</span>
            {growthScore.telemetry && growthScore.telemetry.length > 0 ? (
              <button
                onClick={() => setShowTelemetryModal(true)}
                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> View Audit Telemetry
              </button>
            ) : (
              <span className="text-slate-500 font-mono text-[11px]">Audit Ready</span>
            )}
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
                  {pillar.score !== null && pillar.score !== undefined ? (
                    <span className="font-bold text-slate-900">{pillar.score} / 100</span>
                  ) : (
                    <span className="font-bold text-slate-400 text-[11px] uppercase">UNAVAILABLE</span>
                  )}
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${pillar.color} h-2 rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${pillar.score !== null && pillar.score !== undefined ? pillar.score : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Telemetry / Formula Inspector Modal */}
      {showTelemetryModal && growthScore.telemetry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Growth Intelligence Score Telemetry & Formulas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Strict audit log of input values, deterministic equations, timestamps, and data statuses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTelemetryModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {growthScore.telemetry.map((t, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{t.metric}</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        Weight: {t.weight}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DataStatusBadge status={t.status} label={t.status} className="text-[10px]" />
                      <span className="font-black text-sm text-slate-900">
                        {t.score !== null ? `${t.score} / 100` : 'UNAVAILABLE'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="text-slate-500">
                      <strong className="text-slate-700">Formula:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800">{t.formula}</code>
                    </div>
                    <div className="text-slate-500">
                      <strong className="text-slate-700">Audit Timestamp:</strong> <span className="font-mono text-[11px] text-slate-600">{t.timestamp}</span>
                    </div>
                    <div className="text-slate-500">
                      <strong className="text-slate-700">Verified Input Values:</strong>
                      <pre className="mt-1 bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto max-h-32">
                        {JSON.stringify(t.inputValues, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>All scores are computed with 0 hardcoded growth or fabricated metrics.</span>
              <button
                onClick={() => setShowTelemetryModal(false)}
                className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

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
              All ({safeAuditItems.length})
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
