import React, { useState, useRef } from 'react';
import {
  RotateCcw,
  Sparkles,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Database,
  Building,
  ShieldCheck,
} from 'lucide-react';
import {
  BusinessProfile,
  ReviewItem,
  LeadItem,
  ContentPost,
  Campaign,
  AutonomousAction,
  AuditItem,
  GrowthScore,
} from '../types';

interface ResetSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLiveMode: boolean;
  onFactoryReset: () => void;
  onLoadDemoData: () => void;
  onImportData: (importedData: any) => void;
  currentState: {
    business: BusinessProfile;
    reviews: ReviewItem[];
    leads: LeadItem[];
    posts: ContentPost[];
    campaigns: Campaign[];
    actions: AutonomousAction[];
    auditItems: AuditItem[];
    growthScore: GrowthScore;
  };
}

export const ResetSystemModal: React.FC<ResetSystemModalProps> = ({
  isOpen,
  onClose,
  isLiveMode,
  onFactoryReset,
  onLoadDemoData,
  onImportData,
  currentState,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        isLiveMode,
        ...currentState,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `localpulse-backup-${isLiveMode ? 'live' : 'demo'}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.business) {
          onImportData(json);
          setImportStatus('Backup restored successfully!');
          setTimeout(() => {
            setImportStatus(null);
            onClose();
          }, 1200);
        } else {
          setImportStatus('Invalid backup file format');
        }
      } catch (err) {
        setImportStatus('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">System Data & Environment Reset</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isLiveMode
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isLiveMode ? '🟢 Live Real Data Mode' : '🧪 Master Blueprint Demo Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between full-coverage test scenarios and a clean fresh real business slate.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-slate-700 text-xs">
          {importStatus && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2 text-indigo-900 font-bold">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {/* Current State Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Current Workspace Status:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-black text-slate-900 text-base">{currentState.reviews.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Reviews</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-black text-slate-900 text-base">{currentState.leads.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold">CRM Leads</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-black text-slate-900 text-base">{currentState.posts.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Social Posts</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-black text-slate-900 text-base">{currentState.campaigns.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Campaigns</div>
              </div>
            </div>
          </div>

          {!showConfirmReset ? (
            <div className="space-y-3">
              {/* Option 1: Factory Reset for Live Production */}
              <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span className="font-black text-slate-900 text-sm">
                      Wipe Test Data & Start Fresh Setup
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Wipes all sample reviews, mock leads, test campaigns, and launches the 5-Minute Onboarding Wizard for your real business.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs flex-shrink-0 transition"
                >
                  Start Fresh
                </button>
              </div>

              {/* Option 2: Reload Demo Data */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      Reload Full Blueprint Demo Scenario
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Loads pre-configured 13x13 Geo-Grid SEO, sample reviews, qualified B2B leads, and marketing campaigns for testing.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onLoadDemoData();
                    onClose();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs flex-shrink-0 transition"
                >
                  Load Demo Data
                </button>
              </div>

              {/* Option 3: Export & Import Backups */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export Data (JSON)
                </button>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                  >
                    <Upload className="w-3.5 h-3.5" /> Restore from JSON
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Confirmation Screen */
            <div className="p-5 bg-rose-50 border border-rose-300 rounded-3xl space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-black text-rose-950 text-sm">
                    Confirm Complete Factory Reset?
                  </h3>
                  <p className="text-rose-800 text-[11px] leading-relaxed">
                    This will clear all test reviews, leads CRM records, social posts, and launch the 5-Minute Setup Wizard for your actual business. You can always reload the test scenario anytime from this menu.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onFactoryReset();
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-xs transition"
                >
                  Yes, Wipe & Start Fresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Zero Data Loss: You can export JSON anytime
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
