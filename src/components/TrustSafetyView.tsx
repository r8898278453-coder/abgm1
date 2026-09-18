import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  FileText,
  Scale,
  CalendarOff,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Bot,
  Zap,
  TrendingUp,
  MessageSquare,
  Users2,
  Globe,
  Building,
} from 'lucide-react';

interface FeatureFlagItem {
  label: string;
  icon: any;
  enabled: boolean;
  desc: string;
}

interface TrustSafetyViewProps {
  isEmergencyPaused: boolean;
  setIsEmergencyPaused: (paused: boolean) => void;
  isHolidayPaused?: boolean;
  setIsHolidayPaused?: (paused: boolean) => void;
  featureFlags?: Record<string, FeatureFlagItem>;
  setFeatureFlags?: (flags: Record<string, FeatureFlagItem>) => void;
}

export const TrustSafetyView: React.FC<TrustSafetyViewProps> = ({
  isEmergencyPaused,
  setIsEmergencyPaused,
  isHolidayPaused: propHoliday,
  setIsHolidayPaused: propSetHoliday,
  featureFlags: propFlags,
  setFeatureFlags: propSetFlags,
}) => {
  // Section 75: Business Pause / Holiday Mode
  const [localHolidayPaused, setLocalHolidayPaused] = useState(false);
  const isHolidayPaused = propHoliday !== undefined ? propHoliday : localHolidayPaused;
  const setIsHolidayPaused = propSetHoliday || setLocalHolidayPaused;

  // Section 83: Feature Flags Controller
  const [localFeatureFlags, setLocalFeatureFlags] = useState<Record<string, FeatureFlagItem>>({
    telegram_bot: {
      label: 'Telegram AI Bot Interface',
      icon: Bot,
      enabled: true,
      desc: 'Owner natural language command center and approval notifications (Sec 28-31)',
    },
    ai_autopilot: {
      label: 'Autonomous Marketing Autopilot',
      icon: Zap,
      enabled: true,
      desc: 'Continuous Observe → Decide → Plan → Publish loop (Sec 25, 73)',
    },
    rank_tracking: {
      label: '3x3 Map Rank Geo-Grid & SEO',
      icon: TrendingUp,
      enabled: true,
      desc: 'Hyperlocal pin-point coordinate rank radar (Sec 9)',
    },
    whatsapp: {
      label: 'WhatsApp Business Cloud Platform',
      icon: MessageSquare,
      enabled: true,
      desc: 'Official Meta Cloud API for review links, inquiries & quotes (Sec 32)',
    },
    competitor_ai: {
      label: 'Competitor Intelligence Radar',
      icon: Users2,
      enabled: true,
      desc: 'Weekly review velocity, SEO gaps & counter-promotions (Sec 10)',
    },
    website_builder: {
      label: 'Mini Website & Local SEO Engine',
      icon: Globe,
      enabled: true,
      desc: 'Auto-generated fast web storefronts with local schema (Sec 35-37)',
    },
    agency_mode: {
      label: 'Agency Multi-Client & White Label',
      icon: Building,
      enabled: true,
      desc: 'Multi-branch management with custom domain branding (Sec 43-44)',
    },
  });

  const featureFlags = propFlags || localFeatureFlags;

  const toggleFlag = (key: string) => {
    const updated = {
      ...featureFlags,
      [key]: {
        ...featureFlags[key],
        enabled: !featureFlags[key].enabled,
      },
    };
    setLocalFeatureFlags(updated);
    propSetFlags?.(updated);
  };
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Safety Guardrails, Anti-Spam & Platform Compliance
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Strict policy enforcement for Google Business, WhatsApp Business, Meta Ads & AI content liability safeguards.
          </p>
        </div>
      </div>

      {/* Emergency Kill Switch Bento Card */}
      <div
        className={`rounded-3xl p-6 transition-all duration-300 shadow-sm border ${
          isEmergencyPaused
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isEmergencyPaused ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black tracking-wide">
                  Autonomous Marketing Emergency Kill Switch
                </h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    isEmergencyPaused
                      ? 'bg-rose-200 text-rose-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isEmergencyPaused ? 'All Systems Halted' : 'Systems Normal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                One-click master kill switch immediately freezes all scheduled social posts, AI review replies,
                outbound WhatsApp broadcasts, ad campaigns, and website updates.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEmergencyPaused(!isEmergencyPaused)}
            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-xs flex items-center gap-2 flex-shrink-0 self-start sm:self-auto ${
              isEmergencyPaused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {isEmergencyPaused ? (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Resume Autonomous Automations</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4" />
                <span>🛑 Freeze All Automations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 75: Business Holiday & Closure Pause Mode */}
      <div className={`rounded-3xl p-6 transition-all duration-300 shadow-sm border ${
        isHolidayPaused ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isHolidayPaused ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              <CalendarOff className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black tracking-wide">
                  Business Holiday & Temporary Closure Mode (Section 75)
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  isHolidayPaused ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-700'
                }`}>
                  {isHolidayPaused ? '🌴 Holiday Auto-Responder Active' : 'Regular Business Hours'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Automatically pauses outbound marketing & promotional campaigns during festivals or holidays. 
                WhatsApp and website bots auto-respond: "Our office is temporarily closed for the festive break; support resumes on the next working day."
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsHolidayPaused(!isHolidayPaused)}
            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-xs flex items-center gap-2 flex-shrink-0 self-start sm:self-auto ${
              isHolidayPaused
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {isHolidayPaused ? 'Resume Normal Hours' : '🌴 Activate Holiday Mode'}
          </button>
        </div>
      </div>

      {/* Section 83: Feature Flags Controller */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Platform Feature Flags & Controlled Rollout (Section 83)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise capability switches allowing modular rollout of core engines without code deployments.
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
            All 7 Flags Controlled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {(Object.entries(featureFlags) as [string, FeatureFlagItem][]).map(([key, flag]) => {
            const Icon = flag.icon;
            return (
              <div
                key={key}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-2xs hover:bg-slate-50/80 transition"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    flag.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{flag.label}</span>
                      <code className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                        {key}
                      </code>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{flag.desc}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleFlag(key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                    flag.enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}
                >
                  {flag.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Business Policy Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Google Business Profile Integrity
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              100% Compliant
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong className="text-slate-800">Zero Review Gating:</strong> Positive and negative customer reviews are treated with equal access to the public review URL.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong className="text-slate-800">No Fake or Incentivized Reviews:</strong> Pure organic review solicitation via customer QR and invoice links.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong className="text-slate-800">Anti-Keyword Stuffing:</strong> Name and categories strictly match official registration.</span>
            </li>
          </ul>
        </div>

        {/* WhatsApp & Meta Policy Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              WhatsApp & Meta Anti-Spam Guard
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
              Tier 1 Official API
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">✓</span>
              <span><strong className="text-slate-800">Opt-In Verification:</strong> Messages sent exclusively to verified customers who initiated inquiry or service drop-off.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">✓</span>
              <span><strong className="text-slate-800">Rate Limiting:</strong> Enforces maximum 1 broadcast every 14 days per user to prevent churn or spam reports.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">✓</span>
              <span><strong className="text-slate-800">Instant Opt-Out:</strong> Every message includes "Reply STOP to unsubscribe".</span>
            </li>
          </ul>
        </div>

        {/* Legal & Liability Safety Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              AI Reply Liability Guardrails
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
              Active Pre-Check
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All AI-generated responses pass through a strict semantic safety layer. The model is forbidden from admitting legal fault, promising unwarranted cash refunds, or using confrontational language in negative review responses.
          </p>
        </div>

        {/* Website Anti-Doorway SEO Rules */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Helpful Content & Anti-Doorway Engine
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
              Google Helpful Content Standard
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Location landing pages (/vashi, /nerul) are capped to actual physical service hubs. Each page contains unique diagnostic case studies, local pricing, and real store directions rather than spun doorway text.
          </p>
        </div>
      </div>
    </div>
  );
};
