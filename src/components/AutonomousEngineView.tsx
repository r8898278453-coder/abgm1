import React, { useState, useEffect } from 'react';
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
  XCircle,
  Activity,
  FileText,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { AutonomousAction, AutonomousRecommendation, AutonomousAuditLog } from '../types';

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
  companyId?: string;
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
  actions: initialActions,
  isAutopilotOn,
  setIsAutopilotOn,
  isEmergencyPaused,
  setIsEmergencyPaused,
  onApproveAction,
  approvalSettings: propSettings,
  onUpdateApprovalSettings,
  companyId = 'comp_aaditech_main',
}) => {
  const [localSettings, setLocalSettings] = useState<ApprovalRules>(propSettings || DEFAULT_SETTINGS);
  const [actions, setActions] = useState<AutonomousAction[]>(initialActions);
  const [recommendations, setRecommendations] = useState<AutonomousRecommendation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AutonomousAuditLog[]>([]);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'recommendations' | 'audit'>('actions');
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const approvalSettings = propSettings || localSettings;

  const fetchAutonomousData = async () => {
    try {
      const token = localStorage.getItem('abga_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [actionsRes, recsRes, logsRes] = await Promise.all([
        fetch(`/api/autonomous/actions?companyId=${companyId}`, { headers }),
        fetch(`/api/autonomous/recommendations?companyId=${companyId}`, { headers }),
        fetch(`/api/autonomous/audit-logs?companyId=${companyId}`, { headers }),
      ]);

      if (actionsRes.ok) {
        const data = await actionsRes.json();
        if (data.actions && data.actions.length > 0) {
          setActions(data.actions);
        }
      }
      if (recsRes.ok) {
        const data = await recsRes.json();
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        if (data.logs) {
          setAuditLogs(data.logs);
        }
      }
    } catch {
      // Keep existing state on error
    }
  };

  useEffect(() => {
    fetchAutonomousData();
  }, [companyId]);

  const toggleSetting = (key: keyof ApprovalRules) => {
    const updated: ApprovalRules = {
      ...approvalSettings,
      [key]: approvalSettings[key] === 'auto' ? 'approval' : 'auto',
    };
    setLocalSettings(updated);
    onUpdateApprovalSettings?.(updated);
  };

  const handleRunCycle = async () => {
    setIsRunningCycle(true);
    try {
      const token = localStorage.getItem('abga_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/autonomous/run-cycle', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companyId,
          approvalPolicy: approvalSettings,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setStatusNotice({
          type: 'success',
          message: data.result.message || 'Observation cycle completed successfully.',
        });
        await fetchAutonomousData();
      } else {
        setStatusNotice({
          type: 'error',
          message: data.error || data.result?.message || 'Failed to complete autonomous cycle.',
        });
      }
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err?.message || 'Network error running autonomous cycle.' });
    } finally {
      setIsRunningCycle(false);
      setTimeout(() => setStatusNotice(null), 6000);
    }
  };

  const handleApproveAndExecute = async (actionId: string) => {
    try {
      const token = localStorage.getItem('abga_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Step 1: Approve
      await fetch(`/api/autonomous/actions/${actionId}/approve`, {
        method: 'POST',
        headers,
      });

      // Step 2: Execute through 8-Stage Gate
      const execRes = await fetch(`/api/autonomous/actions/${actionId}/execute`, {
        method: 'POST',
        headers,
      });
      const execData = await execRes.json();

      if (execData.success && execData.result?.status === 'EXECUTED') {
        setStatusNotice({
          type: 'success',
          message: `Verified & Executed: ${execData.result.message}`,
        });
        onApproveAction(actionId);
      } else {
        setStatusNotice({
          type: 'error',
          message: execData.result?.message || execData.error || 'Execution blocked by guardrails.',
        });
      }
      await fetchAutonomousData();
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err?.message || 'Error approving action.' });
    } finally {
      setTimeout(() => setStatusNotice(null), 6000);
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      const token = localStorage.getItem('abga_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/autonomous/actions/${actionId}/reject`, {
        method: 'POST',
        headers,
      });
      setStatusNotice({ type: 'info', message: 'Action rejected by user.' });
      await fetchAutonomousData();
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err?.message || 'Error rejecting action.' });
    } finally {
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Cpu className="w-7 h-7 text-indigo-600" />
            Autonomous Governance & Decision Engine
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Operating the continuous 8-stage lifecycle: Observe → Detect → Analyze → Recommend → Approve → Execute → Verify → Measure.
          </p>
        </div>

        {/* Action Controls & Emergency Stop */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunCycle}
            disabled={isRunningCycle || isEmergencyPaused}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border shadow-xs ${
              isRunningCycle
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRunningCycle ? 'animate-spin' : ''}`} />
            {isRunningCycle ? 'Evaluating Telemetry...' : 'Run Observation Cycle'}
          </button>

          <button
            onClick={() => setIsAutopilotOn(!isAutopilotOn)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border shadow-xs ${
              isAutopilotOn
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Autopilot: {isAutopilotOn ? 'Active' : 'Paused'}
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
            {isEmergencyPaused ? 'Emergency Stop Engaged' : 'Emergency Stop'}
          </button>
        </div>
      </div>

      {/* Kill Switch Alert Banner */}
      {isEmergencyPaused && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-medium text-rose-900 flex items-center gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">EMERGENCY KILL SWITCH ENGAGED:</span> All outbound autonomous executions and provider dispatches are blocked. Human approval and verification gates remain active.
          </div>
        </div>
      )}

      {/* Notice Banner */}
      {statusNotice && (
        <div
          className={`border rounded-2xl p-4 text-xs font-medium flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
            statusNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : statusNotice.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            ) : (
              <Activity className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            )}
            <span>{statusNotice.message}</span>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-slate-600 hover:text-slate-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 8-Stage Lifecycle Architecture */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Governance Lifecycle</span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">8-Stage Autonomous Loop</h2>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic verification at every stage. Never invents observations or claims unverified success.
            </p>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            {[
              { stage: '1. OBSERVE', desc: 'Scan real DB observations (Local SEO, Reviews, Leads, Meta Ads).', state: 'active' },
              { stage: '2. DETECT', desc: 'Identify verified triggers without synthetic hallucinations.', state: 'complete' },
              { stage: '3. ANALYZE', desc: 'Compute deterministic impact and risk classification.', state: 'complete' },
              { stage: '4. RECOMMEND', desc: 'Generate actionable advice with evidence IDs & confidence.', state: 'complete' },
              { stage: '5. APPROVE', desc: 'Route through policy gates; High-risk strictly requires approval.', state: 'active' },
              { stage: '6. EXECUTE', desc: 'Pass 8-stage outbound safety gate (Auth, Kill Switch, Rate Limit, Idempotency).', state: 'active' },
              { stage: '7. VERIFY', desc: 'Require provider-confirmed post/message/review ID (no fake success).', state: 'idle' },
              { stage: '8. MEASURE', desc: 'Track empirical delta on business growth metrics.', state: 'idle' },
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
                  <div className="font-bold text-slate-900">{s.stage}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-normal">{s.desc}</div>
                </div>
                {s.state === 'active' ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping mt-1" />
                ) : s.state === 'complete' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Navigation Tabs & Content Panes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Approval Matrix Policies */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  Human-in-the-Loop Approval Policies
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-risk actions (budgets, offers, profile edits) strictly require human approval.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3 cursor-pointer hover:border-indigo-300 transition shadow-2xs"
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
                      {isAuto ? '⚡ Auto-Execute' : '🛡️ Needs Approval'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tab Navigation: Actions / Recommendations / Audit Trail */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'actions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Action Execution Queue ({actions.length})
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'recommendations'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Grounded Recommendations ({recommendations.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Immutable Audit Logs ({auditLogs.length})
            </button>
          </div>

          {/* Tab 1: Actions Execution Queue */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
                  No active autonomous actions queued. Click "Run Observation Cycle" to evaluate verified telemetry.
                </div>
              ) : (
                actions.map((act) => {
                  const isPending = act.approval_status === 'pending_approval' || act.status === 'pending_approval';
                  const isExecuted = act.execution_state === 'executed' || act.status === 'auto_executed' || act.status === 'executed';
                  const isBlocked = act.execution_state === 'blocked' || act.status === 'blocked';
                  const isFailed = act.execution_state === 'failed' || act.status === 'failed';

                  return (
                    <div
                      key={act.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-700">{act.agent || act.action_type || 'Autonomous Agent'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400 font-mono text-[11px]">{act.id}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {act.verification_state === 'verified' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Provider Verified
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              isExecuted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isBlocked || isFailed
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {act.execution_state || act.status}
                          </span>
                        </div>
                      </div>

                      <div className="font-bold text-slate-900 text-sm">
                        {act.action || act.details || (act.payload ? JSON.stringify(act.payload) : 'Automated Action')}
                      </div>

                      {act.source_evidence && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] space-y-1">
                          <div className="font-bold text-slate-700 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-indigo-600" /> Evidence Grounding:
                          </div>
                          <div className="text-slate-600">{act.source_evidence.observation}</div>
                          <div className="text-slate-400 font-mono text-[10px]">
                            Source: {act.source_evidence.source} | Evidence IDs: {JSON.stringify(act.source_evidence.evidence_ids)}
                          </div>
                        </div>
                      )}

                      {act.error && (
                        <div className="text-rose-600 text-[11px] font-medium bg-rose-50 p-2 rounded-lg">
                          Error: {act.error}
                        </div>
                      )}

                      {isPending && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRejectAction(act.id)}
                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-xl transition text-xs flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5 text-slate-500" /> Reject
                          </button>
                          <button
                            onClick={() => handleApproveAndExecute(act.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-xl transition shadow-xs text-xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Execute
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Grounded Recommendations */}
          {activeTab === 'recommendations' && (
            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
                  No recommendations found. Run an observation cycle to generate evidence-grounded recommendations.
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{rec.source.toUpperCase()}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-mono text-[10px]">{rec.timestamp}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            rec.risk === 'low'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.risk === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          Risk: {rec.risk}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          {rec.confidence}% Confidence
                        </span>
                      </div>
                    </div>

                    <div className="font-bold text-slate-900 text-sm">
                      {rec.recommended_action}
                    </div>

                    <p className="text-slate-600 leading-relaxed">
                      {rec.observation}
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-700">Affected Metric: </span>
                        <span className="text-slate-600">{rec.affected_metric}</span>
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        Evidence: {rec.evidence_ids.join(', ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Immutable Audit Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
                  No audit logs recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs flex items-start justify-between gap-3 shadow-2xs font-mono"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700">{log.event_type}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 text-[11px]">Actor: {log.actor}</span>
                      </div>
                      {log.details && (
                        <div className="text-slate-600 text-[11px]">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                    <span className="text-slate-400 text-[10px] flex-shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
