import React, { useState } from 'react';
import {
  Layers,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Sparkles,
  ArrowUpRight,
  Plus,
  BarChart3,
  Calculator,
  CheckCircle2,
  Share2,
  Compass,
  X,
  Rocket,
} from 'lucide-react';
import { Campaign } from '../types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  companyId?: string;
  onUpdateCampaigns?: (campaigns: Campaign[]) => void;
  onAddNewPost?: (post: any) => void;
  onPublishPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns: initialCampaignsData,
  companyId,
  onUpdateCampaigns,
  onAddNewPost,
  onPublishPost,
  onDeletePost,
}) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'roi'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaignsData || []);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  React.useEffect(() => {
    setCampaigns(initialCampaignsData || []);
  }, [initialCampaignsData]);

  // New Campaign Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampName, setNewCampName] = useState('Diwali SME Corporate IT & Laptop AMC Special');
  const [newCampObjective, setNewCampObjective] = useState('Acquire 50+ corporate AMC client contracts in Vashi & Belapur');
  const [newCampBudget, setNewCampBudget] = useState(6000);
  const [newCampChannels, setNewCampChannels] = useState<string[]>(['Google Business', 'Instagram Reels', 'WhatsApp']);

  // Interactive ROI Dashboard State (Section 40)
  const [customSpend, setCustomSpend] = useState<number>(20000);
  const [customLeads, setCustomLeads] = useState<number>(143);
  const [customCustomers, setCustomCustomers] = useState<number>(31);
  const [customRevenue, setCustomRevenue] = useState<number>(182000);

  const totalSpend = campaigns.reduce((acc, c) => acc + c.budget, 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.revenue, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + c.conversions, 0);
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : '0';

  const customRoas = customSpend > 0 ? (customRevenue / customSpend).toFixed(1) : '0';
  const customCac = customCustomers > 0 ? Math.round(customSpend / customCustomers) : 0;
  const customConversionRate = customLeads > 0 ? ((customCustomers / customLeads) * 100).toFixed(1) : '0';

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampName.trim()) return;

    const created: Campaign = {
      id: `camp_${Date.now()}`,
      name: newCampName,
      status: 'active',
      channels: newCampChannels,
      budget: newCampBudget,
      reach: 1200,
      clicks: 84,
      leads: 6,
      conversions: 2,
      revenue: 14500,
      objective: newCampObjective,
      startDate: '2026-09-06',
      endDate: '2026-09-30',
    };

    const updated = [created, ...campaigns];
    setCampaigns(updated);
    onUpdateCampaigns?.(updated);
    setIsModalOpen(false);
    setFeedbackToast('✓ Campaign launched & auto-synced to MySQL database!');
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleToggleStatus = (campId: string) => {
    const updated = campaigns.map((c) =>
      c.id === campId ? { ...c, status: (c.status === 'active' ? 'paused' : 'active') as any } : c
    );
    setCampaigns(updated);
    onUpdateCampaigns?.(updated);
    setFeedbackToast('✓ Campaign status updated and synced to MySQL!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleDeleteCampaign = (campId: string, name: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm(`Delete campaign "${name}"?`)) return;
      }
    } catch {
      // In restricted iframe environments, proceed safely
    }
    const updated = campaigns.filter((c) => c.id !== campId);
    setCampaigns(updated);
    onUpdateCampaigns?.(updated);
    setFeedbackToast('✓ Campaign removed and synced to MySQL!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-7 h-7 text-indigo-600" />
              Campaign Manager & Attribution ROI
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              MySQL Synced
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Multi-touch channel tracking connecting Google, Meta & WhatsApp spend directly to real customer revenue.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 text-xs shadow-xs">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'campaigns' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('roi')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'roi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ROI & Attribution Model
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackToast}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black px-2 py-0.5 rounded-md hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ROI & Financial Metrics Top Bar Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold">Total Marketing Spend</span>
          <div className="text-xl font-black text-slate-900 mt-1">₹{totalSpend.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">Across Google & Meta</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold">Generated Inquiries</span>
          <div className="text-xl font-black text-indigo-600 mt-1">{totalLeads} Leads</div>
          <span className="text-[10px] text-emerald-600 font-bold">₹142 cost per lead</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold">Won Customers</span>
          <div className="text-xl font-black text-emerald-600 mt-1">{totalConversions} Converted</div>
          <span className="text-[10px] text-slate-400">23.2% close rate</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold">Tracked Gross Revenue</span>
          <div className="text-xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-600 font-bold">+18% vs last month</span>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 col-span-2 sm:col-span-1 shadow-xs">
          <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider">Overall ROAS</span>
          <div className="text-2xl font-black text-indigo-950 mt-0.5">{roas}x</div>
          <span className="text-[10px] text-indigo-600 font-semibold">₹9.10 return per ₹1 spent</span>
        </div>
      </div>

      {/* AI Attribution Explanation Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              AI Campaign Attribution Intelligence
            </span>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed max-w-3xl">
              "Your <strong className="text-slate-900">Back-to-College Campaign</strong> delivered the highest return this month. 
              While Instagram Reel Ads drove 64% of first-touch discovery, 81% of final bookings closed after customers checked your 
              <strong className="text-slate-900"> 4.8★ Google Maps rating</strong> and initiated a direct WhatsApp quote. 
              Multi-channel synergy increased conversions by 3.2x compared to isolated ad campaigns."
            </p>
          </div>
        </div>
      </div>

      {/* View Switcher: Campaigns List or Interactive ROI & Attribution Dashboard */}
      {activeTab === 'campaigns' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Active Multi-Channel Campaigns
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Launch New Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{camp.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          camp.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{camp.objective}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggleStatus(camp.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition ${
                        camp.status === 'active'
                          ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                      title={camp.status === 'active' ? 'Pause campaign' : 'Resume campaign'}
                    >
                      {camp.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                      title="Delete campaign"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs py-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Reach</div>
                    <div className="font-bold text-slate-800 mt-0.5">{camp.reach.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Clicks</div>
                    <div className="font-bold text-slate-800 mt-0.5">{camp.clicks.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Leads</div>
                    <div className="font-bold text-indigo-600 mt-0.5">{camp.leads}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Revenue</div>
                    <div className="font-bold text-emerald-600 mt-0.5">₹{(camp.revenue / 1000).toFixed(0)}k</div>
                  </div>
                </div>

                {/* Channels & ROAS Footer */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {camp.channels.map((ch) => (
                      <span
                        key={ch}
                        className="bg-slate-50 text-slate-700 text-[10px] px-2.5 py-1 rounded-xl border border-slate-200 font-medium"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                  <span className="font-black text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                    ROAS: {(camp.revenue / camp.budget).toFixed(1)}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Section 39 & 40: ROI Dashboard & Multi-Touch Attribution Engine */
        <div className="space-y-6">
          {/* Interactive Calculator Bento Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  Live Business ROI & Revenue Calculator (Section 40)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your monthly numbers below to see instant ROAS, CAC, and conversion efficiency.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                Real-Time Recalculation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Marketing Spend (₹)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customSpend}
                    onChange={(e) => setCustomSpend(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Blueprint default: ₹20,000</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Generated Inquiries</label>
                <input
                  type="number"
                  value={customLeads}
                  onChange={(e) => setCustomLeads(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-indigo-600 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Blueprint default: 143</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Paying Customers</label>
                <input
                  type="number"
                  value={customCustomers}
                  onChange={(e) => setCustomCustomers(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-emerald-600 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Blueprint default: 31</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Tracked Revenue (₹)</label>
                <input
                  type="number"
                  value={customRevenue}
                  onChange={(e) => setCustomRevenue(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Blueprint default: ₹1,82,000</span>
              </div>
            </div>

            {/* Calculated Results Bento Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Calculated ROAS</span>
                <div className="text-3xl font-black text-indigo-950 mt-1">{customRoas}x</div>
                <span className="text-xs text-indigo-600 font-medium">Return on Ad Spend</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Customer Acquisition (CAC)</span>
                <div className="text-3xl font-black text-emerald-950 mt-1">₹{customCac.toLocaleString()}</div>
                <span className="text-xs text-emerald-600 font-medium">Cost per paying customer</span>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Sales Close Rate</span>
                <div className="text-3xl font-black text-purple-950 mt-1">{customConversionRate}%</div>
                <span className="text-xs text-purple-600 font-medium">Lead-to-customer ratio</span>
              </div>
            </div>
          </div>

          {/* Section 39: Attribution Channel Matrix */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                Multi-Touch Attribution Journey Tracking (Section 39)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full funnel tracking across Google, Instagram, Facebook, WhatsApp, Website, and Telegram.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Channel Source</th>
                    <th className="px-4 py-3">First-Touch Discovery</th>
                    <th className="px-4 py-3">Assisted Evaluation</th>
                    <th className="px-4 py-3">Final Closing Touch</th>
                    <th className="px-4 py-3 rounded-r-xl">Attributed Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Google Business Profile & Search
                    </td>
                    <td className="px-4 py-3">38% (54 inquiries)</td>
                    <td className="px-4 py-3">71% (Reviews Check)</td>
                    <td className="px-4 py-3 font-bold text-indigo-600">42% (Direct Phone Call)</td>
                    <td className="px-4 py-3 font-black text-slate-900">₹76,440</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-pink-500" />
                      Instagram Reel Ads (Campaign #42)
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-600">44% (63 inquiries)</td>
                    <td className="px-4 py-3">22% (Profile Visits)</td>
                    <td className="px-4 py-3">18% (DM Direct)</td>
                    <td className="px-4 py-3 font-black text-slate-900">₹58,240</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      WhatsApp Business Cloud Inquiries
                    </td>
                    <td className="px-4 py-3">10% (14 referrals)</td>
                    <td className="px-4 py-3">68% (Catalog Browsing)</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">32% (Payment link clicked)</td>
                    <td className="px-4 py-3 font-black text-slate-900">₹32,760</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      Website (aaditechs.in) & Telegram Bot
                    </td>
                    <td className="px-4 py-3">8% (12 direct visits)</td>
                    <td className="px-4 py-3">34% (Audit tool)</td>
                    <td className="px-4 py-3">8% (Quotation form)</td>
                    <td className="px-4 py-3 font-black text-slate-900">₹14,560</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Individual Lead Attribution Sample Logs */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Recent Attributed Lead Journey Logs (Section 39 Spec)
              </span>
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                      Source: Instagram Campaign #42
                    </span>
                    <span className="font-bold text-slate-900">Lead: Dr. Rakesh Verma</span>
                    <span className="text-slate-400">• Pathology Lab ERP</span>
                  </div>
                  <span className="text-emerald-700 font-bold text-[11px]">Attributed Deal: Won ₹45,000</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                      Source: Google Maps Direct Call
                    </span>
                    <span className="font-bold text-slate-900">Lead: Priya Sharma</span>
                    <span className="text-slate-400">• Mobile E-Commerce App</span>
                  </div>
                  <span className="text-emerald-700 font-bold text-[11px]">Attributed Deal: Won ₹65,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Creator Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Rocket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Launch New Multi-Channel Campaign</h3>
                  <p className="text-[11px] text-slate-500">Autonomous campaign deployer (Section 38 & 39)</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Strategic Objective</label>
                <input
                  type="text"
                  value={newCampObjective}
                  onChange={(e) => setNewCampObjective(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Budget (₹ INR)</label>
                <input
                  type="number"
                  value={newCampBudget}
                  onChange={(e) => setNewCampBudget(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Channels</label>
                <div className="flex flex-wrap gap-2">
                  {['Google Business', 'Instagram Reels', 'WhatsApp', 'Facebook Ads'].map((ch) => {
                    const selected = newCampChannels.includes(ch);
                    return (
                      <button
                        type="button"
                        key={ch}
                        onClick={() => {
                          if (selected) {
                            setNewCampChannels((prev) => prev.filter((c) => c !== ch));
                          } else {
                            setNewCampChannels((prev) => [...prev, ch]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Rocket className="w-3.5 h-3.5" /> Deploy Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
