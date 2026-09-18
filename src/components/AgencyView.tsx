import React, { useState } from 'react';
import {
  Building,
  TrendingUp,
  Globe,
  ExternalLink,
  Plus,
  ArrowUpRight,
  Sparkles,
  MapPin,
  Settings,
  ChevronRight,
  ShieldCheck,
  X,
  Building2,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { BusinessProfile, CompanyRecord } from '../types';

interface AgencyViewProps {
  business: BusinessProfile;
  onNavigate?: (tab: any) => void;
  companies?: CompanyRecord[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
  onOpenCreateCompany?: () => void;
}

interface ClientBranch {
  id: string;
  name: string;
  location: string;
  category: string;
  growthScore: number;
  unansweredReviews: number;
  monthlyLeads: number;
  rankStatus: string;
  status: 'active' | 'warning' | 'paused';
}

export const AgencyView: React.FC<AgencyViewProps> = ({
  business,
  onNavigate = (_tab: any) => {},
  companies = [],
  activeCompanyId,
  onSelectCompany,
  onOpenCreateCompany,
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'whitelabel' | 'reports'>('branches');
  const [customDomain, setCustomDomain] = useState('portal.aaditech.agency');
  const [agencyName, setAgencyName] = useState(business?.name || 'Aaditech Solution');
  const [whitelabelSaved, setWhitelabelSaved] = useState(false);

  // Modal State for adding Branch / Client
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('Aaditech Solution (Thane West Hub)');
  const [newBranchLocation, setNewBranchLocation] = useState('Naupada, Thane West');
  const [newBranchCategory, setNewBranchCategory] = useState('Laptop & IT Solutions');

  const [branches, setBranches] = useState<ClientBranch[]>([
    {
      id: 'br-1',
      name: 'Apex Tech Solutions (Sector 17 Flagship)',
      location: 'Vashi, Navi Mumbai',
      category: 'Computer & Laptop Repair',
      growthScore: 84,
      unansweredReviews: 0,
      monthlyLeads: 142,
      rankStatus: '#2 in 3-Pack',
      status: 'active',
    },
    {
      id: 'br-2',
      name: 'Apex Tech Care (Nerul West Branch)',
      location: 'Nerul, Navi Mumbai',
      category: 'Laptop & Screen Care',
      growthScore: 71,
      unansweredReviews: 4,
      monthlyLeads: 88,
      rankStatus: '#6 in 3-Pack',
      status: 'warning',
    },
    {
      id: 'br-3',
      name: 'Apex Mac Lab (Pune Kothrud)',
      location: 'Kothrud, Pune',
      category: 'Apple Mac & Logic Board Lab',
      growthScore: 89,
      unansweredReviews: 1,
      monthlyLeads: 195,
      rankStatus: '#1 in 3-Pack',
      status: 'active',
    },
    {
      id: 'br-4',
      name: 'Apex Express Diagnostics (South Mumbai)',
      location: 'Fort, Mumbai',
      category: 'Corporate IT & Laptop Diagnostics',
      growthScore: 77,
      unansweredReviews: 2,
      monthlyLeads: 110,
      rankStatus: '#3 in 3-Pack',
      status: 'active',
    },
  ]);

  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const newBranch: ClientBranch = {
      id: `br-${Date.now()}`,
      name: newBranchName,
      location: newBranchLocation,
      category: newBranchCategory,
      growthScore: 86,
      unansweredReviews: 0,
      monthlyLeads: 94,
      rankStatus: '#2 in 3-Pack',
      status: 'active',
    };

    setBranches((prev) => [newBranch, ...prev]);
    setIsAddBranchOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Building className="w-7 h-7 text-indigo-600" />
            Agency & Multi-Branch Command Center
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Centralized governance for 4 multi-city branches, agency white-label portals, and cross-location growth analytics.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'branches' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Multi-Location Hub (4)
          </button>
          <button
            onClick={() => setActiveTab('whitelabel')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'whitelabel' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            White-Label Settings
          </button>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total Active Branches</div>
          <div className="text-2xl font-black text-slate-900 mt-1">4 Locations</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Navi Mumbai, Mumbai, Pune
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Aggregate Monthly Leads</div>
          <div className="text-2xl font-black text-slate-900 mt-1">535 Inquiries</div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">+28% vs last month</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Average Network Growth Score</div>
          <div className="text-2xl font-black text-slate-900 mt-1">80.2 / 100</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">3/4 in Google Top 3</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Pending Actions Required</div>
          <div className="text-2xl font-black text-amber-600 mt-1">7 Tasks</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">Nerul Branch needs attention</div>
        </div>
      </div>

      {activeTab === 'branches' && (
        <div className="space-y-6">
          {/* Registered Database Workspaces */}
          {companies.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 border border-indigo-500/20 text-white rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      MySQL Database Workspaces
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-black rounded-full border border-indigo-400/30">
                      {companies.length} Active
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">Multi-Client Tenant Accounts</h3>
                  <p className="text-xs text-slate-300">
                    Switch between customer workspaces instantly. Data, leads, keywords, and review channels remain completely isolated.
                  </p>
                </div>
                {onOpenCreateCompany && (
                  <button
                    onClick={onOpenCreateCompany}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition shadow-sm flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Register New Client
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {companies.map((c) => {
                  const isCurrent = c.id === activeCompanyId;
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-white/10 border-indigo-400/60 shadow-inner ring-1 ring-indigo-400/40'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-sm text-white truncate">{c.name}</div>
                          {isCurrent ? (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black rounded-full flex-shrink-0">
                              CURRENT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-full flex-shrink-0">
                              {c.city}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span className="truncate">{c.city} • {c.category}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Score: <strong className="text-white">{c.score || 82}/100</strong>
                        </span>
                        {!isCurrent && onSelectCompany ? (
                          <button
                            onClick={() => onSelectCompany(c.id)}
                            className="text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/40 hover:bg-indigo-600 px-2.5 py-1 rounded-lg transition"
                          >
                            Switch Workspace →
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Active Session
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Branch Performance Matrix</h2>
              <p className="text-xs text-slate-500">Physical branches, franchise outlets, and localized hub tracking</p>
            </div>
            <button
              onClick={() => setIsAddBranchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Branch / Outlet
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-indigo-200 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                      {b.status === 'warning' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                          Needs Review
                        </span>
                      )}
                      {b.status === 'active' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Top Tier
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{b.location}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-indigo-600">{b.growthScore}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Growth Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[10px]">Rank Position</div>
                    <div className="font-bold text-slate-800 mt-0.5">{b.rankStatus}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[10px]">Pending Reviews</div>
                    <div className={`font-bold mt-0.5 ${b.unansweredReviews > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {b.unansweredReviews} unreplied
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[10px]">Leads (30d)</div>
                    <div className="font-bold text-slate-800 mt-0.5">{b.monthlyLeads}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Autonomous Autopilot: Active</span>
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Manage Location <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'whitelabel' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                White-Label Agency Branding
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Deploy this dashboard under your agency's domain with custom logo, colors, and report emails.
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Agency Pro Tier
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Agency Brand Name</label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Custom CNAME Domain</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">DNS Setup Instructions:</div>
              <div className="mt-1 text-indigo-800 leading-relaxed font-mono text-[11px]">
                CNAME target: cname.aaditechs.in | Status: SSL Provisioned & Active
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {whitelabelSaved ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>White-label brand & CNAME settings saved successfully</span>
              </div>
            ) : <div />}

            <button
              onClick={() => {
                setWhitelabelSaved(true);
                setTimeout(() => setWhitelabelSaved(false), 4000);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Agency Branding
            </button>
          </div>
        </div>
      )}

      {/* Add Branch / Client Modal */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Add New Branch or Client Account</h3>
                  <p className="text-[11px] text-slate-500">Syncs GBP, Local SEO & Review inbox</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddBranchOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {onOpenCreateCompany && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-950 flex items-center justify-between">
                <div>
                  <div className="font-bold">Need a standalone client workspace?</div>
                  <div className="text-[11px] text-indigo-700">Creates separate MySQL database tenant</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBranchOpen(false);
                    onOpenCreateCompany();
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Create Tenant →
                </button>
              </div>
            )}

            <form onSubmit={handleAddBranchSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Branch / Business Name</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Location & City Area</label>
                <input
                  type="text"
                  value={newBranchLocation}
                  onChange={(e) => setNewBranchLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Primary Business Category</label>
                <input
                  type="text"
                  value={newBranchCategory}
                  onChange={(e) => setNewBranchCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBranchOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Connect & Sync Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
