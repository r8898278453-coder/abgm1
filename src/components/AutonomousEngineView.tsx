import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Settings,
  AlertTriangle,
  Play,
  RotateCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Send,
  ThumbsUp,
} from 'lucide-react';
import { AutonomousAction } from '../types';

export interface ApprovalRules {
  googlePosts: 'approval' | 'auto';
  reviewReplies: 'approval' | 'auto';
  socialPosts: 'approval' | 'auto';
  promotionalOffers: 'approval' | 'auto';
  profileEdits: 'approval' | 'auto';
  analyticsReports: 'approval' | 'auto';
}

interface AutonomousEngineViewProps {
  actions: AutonomousAction[];
  isAutopilotOn: boolean;
  setIsAutopilotOn: (on: boolean) => void;
  isEmergencyPaused: boolean;
  setIsEmergencyPaused: (paused: boolean) => void;
  onApproveAction: (actionId: string) => void;
  approvalSettings?: ApprovalRules;
  onUpdateApprovalSettings?: (settings: ApprovalRules) => void;
}

const DEFAULT_SETTINGS: ApprovalRules = {
  googlePosts: 'approval',
  reviewReplies: 'approval',
  socialPosts: 'auto',
  promotionalOffers: 'approval',
  profileEdits: 'approval',
  analyticsReports: 'auto',
};

export const AutonomousEngineView: React.FC<AutonomousEngineViewProps> = ({
  actions,
  isAutopilotOn,
  setIsAutopilotOn,
  isEmergencyPaused,
  setIsEmergencyPaused,
  onApproveAction,
  approvalSettings: propSettings,
  onUpdateApprovalSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<ApprovalRules>(propSettings || DEFAULT_SETTINGS);
  const [approvedNotice, setApprovedNotice] = useState<string | null>(null);

  const approvalSettings = propSettings || localSettings;

  const toggleSetting = (key: keyof ApprovalRules) => {
    const updated: ApprovalRules = {
      ...approvalSettings,
      [key]: approvalSettings[key] === 'auto' ? 'approval' : 'auto',
    };
    setLocalSettings(updated);
    onUpdateApprovalSettings?.(updated);
  };

  const handleApprove = (action: AutonomousAction) => {
    onApproveAction(action.id);
    setApprovedNotice(`Approved & Dispatched: "${action.action}" has been queued for real-time publishing.`);
    setTimeout(() => setApprovedNotice(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Cpu className="w-7 h-7 text-indigo-600" />
            Autonomous AI Marketing Engine & Approval Control
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Your 24/7 AI employee operating the continuous cycle: Observe → Analyze → Decide → Plan → Generate → Approve → Publish → Measure.
          </p>
        </div>

        {/* Emergency Stop & Autopilot Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutopilotOn(!isAutopilotOn)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border shadow-xs ${
              isAutopilotOn
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutopilotOn ? 'animate-spin' : ''}`} />
            Autopilot: {isAutopilotOn ? 'Active (Continuous)' : 'Paused'}
          </button>

          <button
            onClick={() => setIsEmergencyPaused(!isEmergencyPaused)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border shadow-xs ${
              isEmergencyPaused
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {isEmergencyPaused ? 'Emergency Kill-Switch Engaged' : 'Emergency Stop'}
          </button>
        </div>
      </div>

      {approvedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs font-medium text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{approvedNotice}</span>
          </div>
          <button
            onClick={() => setApprovedNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Control loop visualizer + Approval Rules + Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: 8-Step Autonomous Loop Visualizer (Bento Card) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The 8-Step Architecture</span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">Continuous Marketing Loop</h2>
            <p className="text-xs text-slate-500 mt-1">
              Runs in the background every 4 hours or upon real-time triggers (e.g., incoming 1-star review or competitor rank drop).
            </p>
          </div>

          <div className="space-y-2.5 pt-2 text-xs">
            {[
              { step: '1. Observe', desc: 'Scan Google Maps, Reviews, Competitors, and WhatsApp leads.', state: 'active' },
              { step: '2. Analyze', desc: 'Detect sentiment trends, rank drop alerts, keyword opportunities.', state: 'complete' },
              { step: '3. Decide', desc: 'Choose highest-ROI action (e.g., draft reply, run weekend offer).', state: 'complete' },
              { step: '4. Plan', desc: 'Formulate localized campaign with target hashtags & tone.', state: 'complete' },
              { step: '5. Generate', desc: 'Gemini Generative AI produces copy, image prompt, & reply draft.', state: 'complete' },
              { step: '6. Approve', desc: 'Check Guardrails & route to human approval or auto-publish.', state: 'active' },
              { step: '7. Publish', desc: 'Dispatch to Google Business Profile, WhatsApp CRM, and Socials.', state: 'idle' },
              { step: '8. Measure', desc: 'Log feedback, customer conversions, and rank delta into memory.', state: 'idle' },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  s.state === 'active'
                    ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold">{s.step}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-normal">{s.desc}</div>
                </div>
                {s.state === 'active' ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping mt-1" />
                ) : s.state === 'complete' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-300 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Middle & Right: Approval Matrix & Live Action Log */}
        <div className="lg:col-span-2 space-y-6">
          {/* Approval Matrix Settings Card (Bento Card) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  Approval Workflow & Human-in-the-Loop Policies
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure which marketing actions execute instantly vs which require owner sign-off.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { key: 'googlePosts', label: 'Google Business Profile Posts', desc: 'Promotional updates, offers, and seasonal posts.' },
                { key: 'reviewReplies', label: 'Customer Review Replies', desc: 'Public responses to Google and social client reviews.' },
                { key: 'socialPosts', label: 'Social Media Updates', desc: 'LinkedIn, Instagram, & Facebook content drafts.' },
                { key: 'promotionalOffers', label: 'Discount & WhatsApp Offers', desc: 'Broadcast deals with financial concessions or quotes.' },
                { key: 'profileEdits', label: 'Business Profile & Hours Edits', desc: 'Holiday timings, phone changes, category adjustments.' },
                { key: 'analyticsReports', label: 'Weekly Performance Summaries', desc: 'WhatsApp owner notifications & audit digests.' },
              ].map((item) => {
                const isAuto = approvalSettings[item.key as keyof ApprovalRules] === 'auto';
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleSetting(item.key as keyof ApprovalRules)}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3 cursor-pointer hover:border-indigo-300 transition shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl flex-shrink-0 transition ${
                        isAuto
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isAuto ? '⚡ Auto-Publish' : '🛡️ Needs Approval'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Approvals & Action History (Bento Card) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Live Action Log & Pending Approvals
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Autonomous actions executed by specialized sub-agents.</p>
            </div>

            <div className="space-y-3">
              {actions.map((act) => (
                <div
                  key={act.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-700">{act.agent}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-medium">{act.timestamp}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        act.status === 'auto_executed' || act.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {act.status === 'auto_executed'
                        ? 'Auto-Executed'
                        : act.status === 'approved'
                        ? 'Approved'
                        : 'Awaiting Approval'}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm">
                    {act.action}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {act.details}
                  </p>

                  {act.status === 'pending_approval' && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleApprove(act)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Execute
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
