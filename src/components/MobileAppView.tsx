import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Star,
  Contact2,
  Bot,
  Zap,
  Phone,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { BusinessProfile, GrowthScore, AuditItem, ReviewItem, ContentPost, LeadItem } from '../types';
import { initialGrowthScore } from '../data/initialData';

interface MobileAppViewProps {
  business: BusinessProfile;
  growthScore?: GrowthScore;
  auditItems?: AuditItem[];
  reviews?: ReviewItem[];
  posts?: ContentPost[];
  leads?: LeadItem[];
  onOpenTelegram: () => void;
  onNavigateToTab: (tab: any) => void;
  isAutopilotOn: boolean;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  business,
  growthScore = initialGrowthScore,
  auditItems = [],
  reviews = [],
  posts = [],
  leads = [],
  onOpenTelegram,
  onNavigateToTab,
  isAutopilotOn,
}) => {
  const [mobileTab, setMobileTab] = useState<'home' | 'growth' | 'content' | 'reviews' | 'leads'>('home');

  const unansweredReviews = (reviews || []).filter((r) => !r.replied);
  const criticalAudit = (auditItems || []).filter((a) => a.severity === 'critical' && !a.resolved);
  const hotLeads = (leads || []).filter((l) => l.stage === 'new');

  return (
    <div className="flex flex-col items-center justify-center py-6">
      {/* Informative Header Above Frame */}
      <div className="text-center mb-4">
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
          Blueprint Section 1 & 66: Dedicated Native Mobile App Preview
        </span>
        <h2 className="text-lg font-black text-slate-900 mt-1">
          LocalPulse AI Mobile Management Companion
        </h2>
        <p className="text-xs text-slate-500">
          Optimized for on-the-go business owners with bottom navigation & instant Ask AI voice/chat.
        </p>
      </div>

      {/* Realistic Smartphone Chassis */}
      <div className="w-full max-w-[390px] h-[780px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col overflow-hidden">
        {/* Notch / Dynamic Island */}
        <div className="h-6 w-full flex items-center justify-between px-6 pt-1 text-[11px] text-white font-medium z-20">
          <span>09:41</span>
          <div className="w-24 h-4 bg-black rounded-full mx-auto" />
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Mobile App Header */}
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl mt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs">
              AS
            </div>
            <div>
              <div className="font-bold text-xs truncate max-w-[170px]">{business.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-indigo-400" /> Thane - Mumbai MMR
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> {isAutopilotOn ? 'AI Active' : 'Manual'}
          </span>
        </div>

        {/* Mobile Screen Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-100 text-slate-900 rounded-2xl my-2">
          {mobileTab === 'home' && (
            <>
              {/* Score Bento */}
              <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Business Health</span>
                  <span className="text-xs font-extrabold text-indigo-600">
                    {growthScore.overall}/100
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${growthScore.overall}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                  <div>Google Maps Rank: <strong className="text-slate-900">#1 in Thane</strong></div>
                  <div>Monthly Views: <strong className="text-slate-900">24,850</strong></div>
                </div>
              </div>

              {/* Priority Alerts */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Urgent Actions Today</div>
                {unansweredReviews.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-amber-900">{unansweredReviews.length} Unreplied Client Reviews</div>
                      <div className="text-[10px] text-amber-700">AI tech drafts ready for 1-tap approval</div>
                    </div>
                    <button
                      onClick={() => setMobileTab('reviews')}
                      className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold"
                    >
                      Reply
                    </button>
                  </div>
                )}

                {criticalAudit.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-rose-900">{criticalAudit.length} Critical Growth Fixes</div>
                      <div className="text-[10px] text-rose-700">Missing Android app & cloud tags</div>
                    </div>
                    <button
                      onClick={() => setMobileTab('growth')}
                      className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                    >
                      Fix
                    </button>
                  </div>
                )}
              </div>

              {/* Quick AI Proactive Message */}
              <div className="p-3 bg-indigo-600 text-white rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" /> AI Growth Intelligence
                </div>
                <p className="text-[11px] text-indigo-100 leading-snug">
                  "Competitor Digitron gained 18 reviews. Releasing your post-project WhatsApp review trigger will secure your #1 Google 3-Pack rank."
                </p>
              </div>
            </>
          )}

          {mobileTab === 'growth' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800">Local SEO & Growth Audit</div>
              {auditItems.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{item.title}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full font-bold uppercase">
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'content' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800">Scheduled Social & Reels</div>
              {posts.slice(0, 4).map((p) => (
                <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900 truncate">{p.title}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-[10px]">
                      {p.platform}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{p.caption}</p>
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'reviews' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800">Customer Reviews & Replies</div>
              {reviews.map((r) => (
                <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{r.reviewerName}</span>
                    <span className="text-amber-500 text-xs font-bold">★ {r.rating}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic">"{r.text}"</p>
                  {r.replyText ? (
                    <div className="p-2 bg-slate-50 rounded-lg text-[10px] text-slate-600 border border-slate-100">
                      <strong>AI Reply:</strong> {r.replyText}
                    </div>
                  ) : (
                    <button
                      onClick={() => onNavigateToTab('reviews')}
                      className="w-full py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold"
                    >
                      Draft Reply with AI
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'leads' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800">Active Inquiries ({leads.length})</div>
              {leads.map((l) => (
                <div key={l.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{l.name}</span>
                    <span className="text-[10px] font-bold text-emerald-600">{l.estimatedValue}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{l.service} • {l.source}</p>
                  <a
                    href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp Lead
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating "Ask AI" Command Capsule */}
        <button
          onClick={onOpenTelegram}
          className="absolute bottom-20 right-6 z-30 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg text-xs font-bold transition transform active:scale-95"
        >
          <Bot className="w-4 h-4" /> Ask AI
        </button>

        {/* Bottom 5-Icon Navigation (Section 66 Specification) */}
        <div className="h-16 bg-white border-t border-slate-200 rounded-b-[36px] flex items-center justify-around px-2 z-20">
          <button
            onClick={() => setMobileTab('home')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
              mobileTab === 'home' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Home
          </button>
          <button
            onClick={() => setMobileTab('growth')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
              mobileTab === 'growth' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Growth
          </button>
          <button
            onClick={() => setMobileTab('content')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
              mobileTab === 'content' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Content
          </button>
          <button
            onClick={() => setMobileTab('reviews')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
              mobileTab === 'reviews' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Star className="w-4 h-4" /> Reviews
          </button>
          <button
            onClick={() => setMobileTab('leads')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
              mobileTab === 'leads' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Contact2 className="w-4 h-4" /> Leads
          </button>
        </div>

        {/* Home Indicator Bar */}
        <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto my-1" />
      </div>
    </div>
  );
};
