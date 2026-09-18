import React from 'react';
import {
  TrendingUp,
  MapPin,
  PhoneCall,
  Navigation,
  Globe,
  Star,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Share2,
  Calendar,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { BusinessProfile, GrowthScore, AuditItem, ReviewItem, ContentPost, LeadItem } from '../types';
import { initialGrowthScore } from '../data/initialData';

interface DashboardViewProps {
  business: BusinessProfile;
  growthScore?: GrowthScore;
  auditItems?: AuditItem[];
  reviews?: ReviewItem[];
  posts?: ContentPost[];
  leads?: LeadItem[];
  onNavigate: (tab: any) => void;
  onQuickApproveReviews?: () => void;
  onPublishPost?: (postId: string) => void;
  unansweredReviews?: number;
  newLeadsCount?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  business,
  growthScore = initialGrowthScore,
  auditItems = [],
  reviews = [],
  posts = [],
  leads = [],
  onNavigate = (_tab: any) => {},
  onQuickApproveReviews = () => {},
  onPublishPost = (_postId: string) => {},
}) => {
  const safeReviews = reviews || [];
  const safePosts = posts || [];
  const safeAudit = auditItems || [];
  const unansweredReviews = safeReviews.filter((r) => !r.replied);
  const pendingPost = safePosts.find((p) => p.status === 'scheduled' || p.status === 'draft');
  const criticalAudit = safeAudit.filter((a) => a.severity === 'critical' && !a.resolved);

  return (
    <div className="space-y-6 pb-12">
      {/* TOP BENTO ROW: Executive AI Briefing & Core Health Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Bento Hero 1: Live Executive Summary (col-span-2) */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                AI Executive Summary • Today
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                LIVE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Aapka business Sector 17 me <span className="text-indigo-600">#2 pe dominate kar raha hai</span>, par Nerul me visibility 14% drop hui.
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
              Google Maps calls is hafte <strong>+22% badhi hain</strong> (312 calls). Nerul me competitor <em>Star Computers</em> ne 23 naye reviews gain kiye hain, isliye aaj 4 pending reviews aur weekend campaign approve karna sabse important hai.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Customer Calls</span>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                312<span className="text-sm font-semibold text-emerald-600 ml-1">+22%</span>
              </div>
            </div>
            {/* Visual graduated bar meter inspired by Bento aesthetic */}
            <div className="h-12 flex items-end gap-1.5 pb-1">
              <div className="w-2.5 bg-indigo-100 h-2/5 rounded-t-sm" />
              <div className="w-2.5 bg-indigo-200 h-3/5 rounded-t-sm" />
              <div className="w-2.5 bg-indigo-300 h-1/2 rounded-t-sm" />
              <div className="w-2.5 bg-indigo-400 h-4/5 rounded-t-sm" />
              <div className="w-2.5 bg-indigo-600 h-full rounded-t-sm shadow-xs" />
              <div className="w-2.5 bg-indigo-500 h-3/4 rounded-t-sm" />
              <div className="w-2.5 bg-indigo-600 h-5/6 rounded-t-sm" />
            </div>
          </div>
        </div>

        {/* Bento Hero 2: Dark Contrast Tile - Local Rank & Oxygen/Visibility Saturation */}
        <div className="md:col-span-1 bg-slate-900 rounded-3xl p-6 shadow-xl flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              Local SEO 3-Pack
            </h2>
            <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
              RANK #2
            </span>
          </div>

          <div className="my-3">
            <div className="text-4xl font-black tracking-tight">
              92<span className="text-lg text-slate-400 font-medium ml-0.5">%</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium">Navi Mumbai Core Coverage</p>
            <div className="h-1.5 bg-slate-800 w-full rounded-full mt-3">
              <div className="h-full bg-indigo-400 w-[92%] rounded-full shadow-[0_0_10px_rgba(129,140,248,0.6)]" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Nerul Drop: #4 → #7</span>
            <button
              onClick={() => onNavigate('seo')}
              className="text-indigo-400 hover:text-indigo-300 font-bold"
            >
              Fix Grid →
            </button>
          </div>
        </div>

        {/* Bento Hero 3: Vibrant Indigo Tile - Health & Growth Score Ring Gauge */}
        <div className="md:col-span-1 bg-indigo-600 rounded-3xl p-6 shadow-lg shadow-indigo-600/20 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-indigo-200 text-xs font-bold uppercase tracking-widest">
              Growth Score
            </h2>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              OPTIMAL
            </span>
          </div>

          <div className="relative w-24 h-24 mx-auto my-1">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-indigo-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={251}
                strokeDashoffset={251 - (251 * growthScore.overall) / 100}
                strokeLinecap="round"
                className="text-white"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black leading-none">{growthScore.overall}</span>
              <span className="text-[10px] text-indigo-200 font-medium">/100</span>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => onNavigate('audit')}
              className="w-full bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold py-1.5 px-3 rounded-xl transition shadow-xs"
            >
              10 Audit Fixes Available
            </button>
          </div>
        </div>
      </div>

      {/* BENTO ROW 2: Today's AI Priorities (Modeled after Daily Protocol in Bento Theme) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Marketing Protocol</span>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              Today’s Priority Actions (Calculated from Real-time Signals)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            1-Click Autonomous Approvals
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Priority 1: Unanswered Reviews with Orange Bento Tag */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold flex-shrink-0 text-sm">
                  01
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {unansweredReviews.length > 0 ? `${unansweredReviews.length} Reviews Pending Reply` : 'All Reviews Replied'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Reputation Safeguard</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {unansweredReviews.length > 0
                  ? 'AI has drafted polite, compliant responses embedding localized keywords to maintain 100% response rate.'
                  : 'Customer sentiment is healthy and all public reviews have verified professional responses.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={unansweredReviews.length > 0 ? onQuickApproveReviews : () => onNavigate('reviews')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition text-center shadow-xs"
              >
                {unansweredReviews.length > 0 ? `Approve & Post ${unansweredReviews.length} Replies` : 'Open Review Manager'}
              </button>
            </div>
          </div>

          {/* Priority 2: Weekend Campaign with Blue Bento Tag */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold flex-shrink-0 text-sm">
                  02
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Weekend 30-Min Offer</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Google Profile & Social Post</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Creative poster, Marathi/Hindi caption & localized hashtags generated to increase Saturday foot traffic in Sector 17.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
              <button
                onClick={() => pendingPost && onPublishPost(pendingPost.id)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition text-center shadow-xs"
              >
                Publish to Google
              </button>
              <button
                onClick={() => onNavigate('content')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2.5 bg-white border border-slate-200 rounded-xl"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Priority 3: Local SEO Recovery with Slate/Violet Bento Tag */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0 text-sm">
                  03
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Nerul Rank Dropped to #7</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Map 3-Pack Gap Alert</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Competitor Star Computers added 23 reviews. Send automated WhatsApp review invites to past Nerul customers to recover.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={() => onNavigate('seo')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition text-center shadow-xs"
              >
                Open Map Rank Grid
              </button>
            </div>
          </div>
        </div>

        {/* Dashed Protocol Notice */}
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="text-xs font-bold text-slate-700">Daily Autonomous Protocol Status</span>
          </div>
          <span className="text-xs font-medium text-slate-500">Next Scheduled Sweep: Today at 2:00 PM (Google API)</span>
        </div>
      </div>

      {/* BENTO ROW 3: Google Performance & Local Insights (5 Bento Stat Tiles) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            Google Business & Maps Performance (Last 30 Days)
          </h2>
          <span className="text-xs text-slate-500 font-medium">Live API Sync • Verified</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search Views */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Search Views</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center">
                +14% <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1">18,420</div>
            <p className="text-[11px] text-slate-500">Queries in Navi Mumbai</p>
          </div>

          {/* Maps Views */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Maps Visibility</span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center">
                -4% <ArrowDownRight className="w-3 h-3" />
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1">24,190</div>
            <p className="text-[11px] text-amber-600 font-medium">Activity down in Nerul</p>
          </div>

          {/* Customer Calls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Phone Calls</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center">
                +22% <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 flex items-center gap-1.5">
              <PhoneCall className="w-5 h-5 text-indigo-600" /> 312
            </div>
            <p className="text-[11px] text-slate-500">High intent inquiries</p>
          </div>

          {/* Direction Requests */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Directions</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center">
                +16% <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 flex items-center gap-1.5">
              <Navigation className="w-5 h-5 text-indigo-600" /> 520
            </div>
            <p className="text-[11px] text-slate-500">Walk-in navigations</p>
          </div>

          {/* Website Clicks */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-sm transition col-span-2 sm:col-span-1 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Site Clicks</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center">
                +8% <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 my-1 flex items-center gap-1.5">
              <Globe className="w-5 h-5 text-indigo-600" /> 840
            </div>
            <p className="text-[11px] text-slate-500">Landing on mini site</p>
          </div>
        </div>
      </div>

      {/* BENTO ROW 4: TWO COLUMNS (CRM Pipeline & Reviews Bento Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Bento: Lead Pipeline & Sales Funnel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unified CRM</span>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Live Lead Pipeline
              </h3>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl transition"
            >
              Open CRM →
            </button>
          </div>

          {/* Pipeline stage capsules in Bento Style */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold">New</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">14</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Contacted</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">28</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-indigo-600 uppercase font-bold">Qualified</div>
              <div className="text-lg font-black text-indigo-600 mt-0.5">19</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Quote</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">11</div>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200">
              <div className="text-[10px] text-emerald-700 uppercase font-bold">Won</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">31</div>
            </div>
          </div>

          {/* Latest Hot Lead Bento Block */}
          {leads[0] && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span>{leads[0].name}</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Hot Intent: {leads[0].intentScore}%
                  </span>
                </div>
                <span className="text-slate-500 font-medium">{leads[0].source}</span>
              </div>
              <p className="text-slate-700 font-medium">{leads[0].serviceRequested}</p>
              <div className="mt-2.5 bg-white p-3 rounded-xl text-xs text-slate-600 border border-slate-200 flex items-start gap-2 shadow-2xs">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-indigo-600 font-bold">AI Quick Reply: </span>
                  {leads[0].aiSuggestedReply}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Bento: Review & Reputation Health */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reputation Guard</span>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Reviews & Reputation Health
              </h3>
            </div>
            <button
              onClick={() => onNavigate('reviews')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl transition"
            >
              Manage Inbox →
            </button>
          </div>

          {/* Review metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold">This Month</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">+32 Reviews</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold">Avg Response Time</div>
              <div className="text-base font-black text-slate-900 mt-0.5">18 Mins</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold">Sentiment</div>
              <div className="text-base font-black text-indigo-600 mt-0.5">96% Positive</div>
            </div>
          </div>

          {/* Highlighted review */}
          {unansweredReviews[0] ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span>{unansweredReviews[0].author}</span>
                  <span className="text-amber-500 font-bold">★ {unansweredReviews[0].rating}.0</span>
                </div>
                <span className="text-slate-500">{unansweredReviews[0].relativeTime}</span>
              </div>
              <p className="text-slate-700 line-clamp-2 italic">"{unansweredReviews[0].content}"</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold">
                  Topic: {unansweredReviews[0].topic}
                </span>
                <button
                  onClick={() => onNavigate('reviews')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                >
                  Generate AI Reply →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
              All incoming customer reviews have been answered!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
