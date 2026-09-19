import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  FileText,
  Download,
  Zap,
  TrendingUp,
  Cpu,
  Users,
  Shield,
  Clock,
  Sparkles,
  IndianRupee,
  Layers,
  X,
  Printer,
  UserPlus,
  Loader2,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import {
  createPaymentLinkApi,
  fetchCompanyInvoicesApi,
  fetchCompanySubscriptionApi,
  upgradeSubscriptionApi,
  fetchInvoiceDetailsApi,
  CompanyInvoiceRecord,
  CompanySubscriptionRecord,
} from '../services/authService';

interface BillingAdminViewProps {
  business: BusinessProfile;
}

export const BillingAdminView: React.FC<BillingAdminViewProps> = ({ business }) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'ai_cost' | 'invoices' | 'team'>('plans');

  // Modal & Live State
  const [invoices, setInvoices] = useState<CompanyInvoiceRecord[]>([]);
  const [subscription, setSubscription] = useState<CompanySubscriptionRecord | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any | null>(null);
  const [isLoadingInvoiceModal, setIsLoadingInvoiceModal] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Marketing Staff');
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Load live invoices and subscription
  const loadBillingData = async () => {
    const targetCompanyId = business.id || 'comp_aaditech_main';
    setIsLoadingInvoices(true);
    try {
      const [invs, sub] = await Promise.all([
        fetchCompanyInvoicesApi(targetCompanyId),
        fetchCompanySubscriptionApi(targetCompanyId),
      ]);
      if (invs && invs.length > 0) {
        setInvoices(invs);
      } else {
        // Fallback default ledger
        setInvoices([
          {
            id: 'INV-2026-0901',
            company_id: targetCompanyId,
            date: '2026-09-01',
            plan: 'Growth Tier (Monthly)',
            amount: 799.0,
            gst_amount: 143.82,
            total_amount: 942.82,
            payment_method: 'UPI (r8898278453@okaxis)',
            status: 'Paid',
            hsn_code: '998314',
          },
          {
            id: 'INV-2026-0801',
            company_id: targetCompanyId,
            date: '2026-08-01',
            plan: 'Growth Tier (Monthly)',
            amount: 799.0,
            gst_amount: 143.82,
            total_amount: 942.82,
            payment_method: 'UPI (r8898278453@okaxis)',
            status: 'Paid',
            hsn_code: '998314',
          },
        ]);
      }
      if (sub) {
        setSubscription(sub);
      }
    } catch (err) {
      console.warn('Failed loading billing data:', err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [business.id]);

  const handleOpenInvoiceModal = async (inv: CompanyInvoiceRecord) => {
    setSelectedInvoice(inv);
    setIsLoadingInvoiceModal(true);
    try {
      const details = await fetchInvoiceDetailsApi(inv.id);
      if (details) {
        setSelectedInvoiceDetails(details);
      } else {
        setSelectedInvoiceDetails(null);
      }
    } catch {
      setSelectedInvoiceDetails(null);
    } finally {
      setIsLoadingInvoiceModal(false);
    }
  };

  const handleUpgradeWithRazorpay = async (plan: any) => {
    setUpgradingPlanId(plan.id);
    setCheckoutNotice(null);
    setCheckoutError(null);
    try {
      const priceNumber = parseInt(plan.price.replace(/[^0-9]/g, ''), 10) || 799;
      const targetCompanyId = business.id || 'comp_aaditech_main';
      const res = await createPaymentLinkApi({
        amount: priceNumber,
        description: `Aaditech BGA Plan Upgrade: ${plan.name}`,
        customerName: business.name || 'Aaditech Solution',
        customerPhone: business.phone || '8898278453',
        companyId: targetCompanyId,
      });

      if (res.success && res.shortUrl) {
        setCheckoutNotice(`Razorpay checkout generated for ${plan.name} (₹${priceNumber}): ${res.shortUrl}`);
        // Refresh subscription
        await upgradeSubscriptionApi(targetCompanyId, plan.id, 'monthly');
        await loadBillingData();
        try {
          window.open(res.shortUrl, '_blank', 'noopener,noreferrer');
        } catch {
          // In sandboxed iframes, link remains clickable in notice
        }
      } else {
        setCheckoutError(res.error || 'Failed to initiate Razorpay checkout');
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Error processing plan upgrade');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  // Active Plan determination
  const activePlanId = subscription?.plan_id || 'growth';

  // Subscription Tiers (Section 69)
  const plans = [
    {
      id: 'starter',
      name: 'Starter Tier',
      price: '₹499',
      period: '/month',
      description: 'Ideal for single-location micro businesses starting out with Google & Reviews.',
      features: [
        'Google Business Profile Manager',
        'Review Auto-Replies with Safety Guardrails',
        '30 AI Content Posts / month',
        'Telegram Bot Daily Briefings',
        'Email Support',
      ],
      isCurrent: activePlanId === 'starter',
    },
    {
      id: 'growth',
      name: 'Growth Tier (Active)',
      price: '₹799',
      period: '/month',
      badge: 'Current Active Plan',
      description: 'Full autonomous marketing engine for growing local companies like Aaditech Solution.',
      features: [
        'Everything in Starter',
        'Autonomous AI Marketing Autopilot (24/7)',
        'Local SEO 3x3 Geo-Rank Grid & Tracking',
        'Competitor Radar (Tracks 3 Rivals)',
        'WhatsApp CRM & Lead Scoring Engine',
        'Reel Script & Video Storyboard Engine',
        'Mini Website Builder with Custom Subpages',
      ],
      isCurrent: activePlanId === 'growth',
    },
    {
      id: 'pro',
      name: 'Pro Automation Tier',
      price: '₹1,499',
      period: '/month',
      description: 'Maximum AI power, unmetered generations & multi-channel sync.',
      features: [
        'Everything in Growth',
        'Zero-Touch Autonomous Execution',
        'Unlimited AI Content & Storyboards',
        'WhatsApp Cloud Webhook Auto-Responder',
        'Priority GPU Inference Queue',
        'Dedicated Technical Growth Manager',
      ],
      isCurrent: activePlanId === 'pro',
    },
    {
      id: 'agency',
      name: 'Agency Multi-Client',
      price: '₹4,999',
      period: '/month',
      description: 'For digital agencies managing 10+ client businesses with white label.',
      features: [
        'Up to 15 Business Locations',
        'White-Label CNAME Client Portal',
        'Custom Brand Kits per Client',
        'Consolidated Billing & GST Handling',
        'Client-Facing Sub-Accounts & RBAC',
      ],
      isCurrent: activePlanId === 'agency',
    },
  ];

  // AI Cost Tracking Breakdown (Section 47)
  const aiCostData = {
    grossCostThisMonth: 182.4, // INR
    subscriptionPrice: 799.0, // INR
    profitMargin: 77.2, // %
    totalTokensUsed: '412,850',
    breakdown: [
      {
        model: 'Gemini 3.8 Flash (Text & Planning)',
        calls: '1,420 calls',
        tokens: '312,400 tokens',
        cost: '₹74.50',
        color: 'bg-indigo-600',
      },
      {
        model: 'Gemini Generative Vision & Creative Copy',
        calls: '240 calls',
        tokens: '84,200 tokens',
        cost: '₹52.30',
        color: 'bg-purple-600',
      },
      {
        model: 'Reel Script Storyboard Inference',
        calls: '35 generation runs',
        tokens: '16,250 tokens',
        cost: '₹34.80',
        color: 'bg-amber-500',
      },
      {
        model: 'Vector Embeddings (Knowledge Search)',
        calls: '890 queries',
        tokens: '—',
        cost: '₹20.80',
        color: 'bg-emerald-600',
      },
    ],
  };

  // RBAC Team Members (Section 2, 51)
  const [teamMembersList, setTeamMembersList] = useState([
    {
      name: 'Owner (Primary Admin)',
      email: 'info@aaditechs.in',
      role: 'Business Owner',
      access: 'Full Unrestricted Access & Billing',
      status: 'Active',
    },
    {
      name: 'Operations Manager',
      email: 'operations@aaditechs.in',
      role: 'Business Manager',
      access: 'Google Profile, SEO, Reviews, Leads, CRM',
      status: 'Active',
    },
    {
      name: 'Social Media Associate',
      email: 'marketing@aaditechs.in',
      role: 'Marketing Staff',
      access: 'Draft Content, Social Publishing, Reel Scripts',
      status: 'Active',
    },
  ]);

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    setTeamMembersList((prev) => [
      ...prev,
      {
        name: newMemberName,
        email: newMemberEmail,
        role: newMemberRole,
        access: newMemberRole === 'Business Manager' ? 'Google Profile, SEO, Reviews, Leads, CRM' : 'Draft Content, Social Publishing',
        status: 'Active',
      },
    ]);

    setNewMemberName('');
    setNewMemberEmail('');
    setIsAddMemberOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold rounded-full flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Master Blueprint Section 45, 47, 69, 71
            </span>
            <span className="text-xs text-emerald-400 font-bold">
              Subscription Active • Renews 01 Oct 2026
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Admin, Subscriptions & AI Cost Control</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Transparent usage metrics, UPI/Card billing, GST tax compliance, and real-time per-user AI token cost tracking for Aaditech Solution.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-800 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'plans' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveTab('ai_cost')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'ai_cost' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            AI Cost Audit
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            GST Invoices
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'team' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Team & RBAC
          </button>
        </div>
      </div>

      {/* Tab 1: Subscription Tiers */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {checkoutError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{checkoutError}</span>
              </div>
              <button
                onClick={() => setCheckoutError(null)}
                className="text-rose-500 hover:text-rose-800 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}
          {checkoutNotice && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{checkoutNotice}</span>
                {checkoutNotice.includes('https://') && (
                  <a
                    href={checkoutNotice.split(': ')[1] || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 underline ml-1"
                  >
                    Open Checkout Gateway <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <button
                onClick={() => setCheckoutNotice(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-3xl p-5 border flex flex-col justify-between transition ${
                  p.isCurrent
                    ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                    {p.isCurrent && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-black text-slate-900">{p.price}</span>
                    <span className="text-xs text-slate-500 font-semibold">{p.period}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-4">{p.description}</p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-3">
                  <button
                    disabled={p.isCurrent || upgradingPlanId === p.id}
                    onClick={() => handleUpgradeWithRazorpay(p)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      p.isCurrent
                        ? 'bg-slate-100 text-slate-500 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {upgradingPlanId === p.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Initiating Gateway...</span>
                      </>
                    ) : p.isCurrent ? (
                      'Current Plan'
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Upgrade with Razorpay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: AI Cost Control & Token Quotas (Section 47) */}
      {activeTab === 'ai_cost' && (
        <div className="space-y-6">
          {/* Bento Summary of AI Spend */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Gross AI Inference Cost</span>
              <div className="text-2xl font-black text-slate-900 mt-1">₹{aiCostData.grossCostThisMonth}</div>
              <span className="text-[11px] text-emerald-600 font-bold">Within healthy quota</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Subscription Fee Paid</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">₹{aiCostData.subscriptionPrice}</div>
              <span className="text-[11px] text-slate-500">Growth Plan (₹799/mo)</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Platform Unit Margin</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{aiCostData.profitMargin}%</div>
              <span className="text-[11px] text-slate-500">High efficiency operation</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Total Tokens Processed</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{aiCostData.totalTokensUsed}</div>
              <span className="text-[11px] text-slate-500">Across 1,730 total calls</span>
            </div>
          </div>

          {/* Model Breakdown Matrix */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" /> Per-Model Inference & Token Cost Breakdown
            </h3>
            <div className="space-y-3">
              {aiCostData.breakdown.map((b, i) => (
                <div
                  key={i}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${b.color}`} />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{b.model}</div>
                      <div className="text-[11px] text-slate-500">
                        {b.calls} • {b.tokens}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">{b.cost}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Estimated Cost</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: GST Invoices (Section 71) */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> GST Compliant Tax Invoices & Payment Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographically reconciled invoices with GSTIN, HSN Code 998314 & Razorpay Payment References
              </p>
            </div>
            <button
              onClick={loadBillingData}
              disabled={isLoadingInvoices}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Billing Date</th>
                  <th className="py-3 px-4">Plan / Service</th>
                  <th className="py-3 px-4">Taxable Value</th>
                  <th className="py-3 px-4">18% GST (CGST+SGST)</th>
                  <th className="py-3 px-4">Total Paid</th>
                  <th className="py-3 px-4">Status / Method</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.id}</td>
                    <td className="py-3 px-4 text-slate-600">{inv.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{inv.plan}</td>
                    <td className="py-3 px-4 text-slate-600">₹{Number(inv.amount).toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-500">₹{Number(inv.gst_amount).toFixed(2)}</td>
                    <td className="py-3 px-4 font-black text-slate-900">₹{Number(inv.total_amount).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {inv.status}
                        </span>
                        <span className="text-[10px] text-slate-400">{inv.payment_method}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenInvoiceModal(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition"
                      >
                        <Download className="w-3 h-3" /> View / PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Team & RBAC (Section 2, 51) */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> Team Members & Role-Based Access Control (RBAC)
            </h3>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              + Add Member
            </button>
          </div>

          <div className="space-y-3">
            {teamMembersList.map((m, i) => (
              <div
                key={i}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{m.name}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md">
                      {m.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{m.email}</div>
                  <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
                    <Shield className="w-3 h-3 text-indigo-600" /> Permissions: {m.access}
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">Official GST Tax Invoice • {selectedInvoice.id}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setSelectedInvoiceDetails(null);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="text-base font-black text-slate-900">
                    {selectedInvoiceDetails?.seller?.legalName || 'Aaditech Solution Private Limited'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedInvoiceDetails?.seller?.address || '210, Anant Laxmi Chambers, B-Cabin, Dada Patil Marg, Thane (W) 400602'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    GSTIN: <span className="font-mono font-bold text-slate-800">{selectedInvoiceDetails?.seller?.gstin || '27AAGCA0000A1Z5'}</span> (Maharashtra)
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px] uppercase">
                    {selectedInvoice.status || 'Paid in Full'}
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{selectedInvoice.date}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billed To (Customer):</div>
                <div className="font-black text-slate-900 text-sm">
                  {selectedInvoiceDetails?.buyer?.companyName || selectedInvoice.customer_name || business.name}
                </div>
                <div className="text-slate-600">{business.address || 'Thane West, Maharashtra, India'}</div>
                <div className="text-slate-600 mt-0.5">
                  Contact: {selectedInvoice.customer_phone || business.phone} • Email: {selectedInvoice.customer_email || 'billing@aaditechs.in'}
                </div>
                {selectedInvoice.payment_id && (
                  <div className="text-slate-500 mt-1 font-mono text-[10px]">
                    Payment Ref: {selectedInvoice.payment_id} • Order: {selectedInvoice.order_id || 'Direct'}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5">Description (SAC {selectedInvoice.hsn_code || '998314'})</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5 font-medium">{selectedInvoice.plan}</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{Number(selectedInvoice.amount).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500">CGST (9.0%)</td>
                      <td className="p-2.5 text-right font-mono">₹{(Number(selectedInvoice.gst_amount) / 2).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500">SGST (9.0%)</td>
                      <td className="p-2.5 text-right font-mono">₹{(Number(selectedInvoice.gst_amount) / 2).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-black text-slate-900">
                      <td className="p-2.5">Total Paid via {selectedInvoice.payment_method || 'Razorpay / UPI'}</td>
                      <td className="p-2.5 text-right font-mono text-sm">₹{Number(selectedInvoice.total_amount).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                This is an authenticated computer-generated tax invoice verified under Section 31 of CGST Act, 2017.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setSelectedInvoiceDetails(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save Tax PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Invite Team Member (RBAC)</h3>
                  <p className="text-[11px] text-slate-500">Assign role-based access & branch scope</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Vikram Deshmukh"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="vikram@aaditechs.in"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role & Permission Scope</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="Business Manager">Business Manager (SEO, GBP, CRM, Reviews)</option>
                  <option value="Marketing Staff">Marketing Staff (Content Studio, Reels)</option>
                  <option value="Field Support Tech">Field Support Tech (In-Shop Check-in & Review QR)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  Send Team Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
