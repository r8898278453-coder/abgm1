import React from 'react';
import { X, Building2, Mail, Phone, MapPin, Shield, FileText, CheckCircle2, Globe, Sparkles } from 'lucide-react';

export type PublicInfoTab = 'about' | 'contact' | 'services' | 'pricing' | 'terms' | 'privacy';

interface PublicInfoModalProps {
  isOpen: boolean;
  activeTab: PublicInfoTab;
  onClose: () => void;
  onSelectTab: (tab: PublicInfoTab) => void;
}

export const PublicInfoModal: React.FC<PublicInfoModalProps> = ({
  isOpen,
  activeTab,
  onClose,
  onSelectTab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              AB
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Aaditech BGA</h2>
              <p className="text-xs text-slate-500">Autonomous Business Growth Accelerator (bga.aaditechs.in)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-bold text-slate-600">
          {(['about', 'services', 'pricing', 'contact', 'terms', 'privacy'] as PublicInfoTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onSelectTab(tab)}
              className={`px-3 py-2 border-b-2 font-bold capitalize transition whitespace-nowrap ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {tab === 'terms' ? 'Terms of Service' : tab === 'privacy' ? 'Privacy Policy' : tab}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm leading-relaxed">
          {activeTab === 'about' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">About Aaditech BGA</h3>
              <p>
                Aaditech BGA (Business Growth Accelerator) is an enterprise-grade autonomous marketing and operations engine built by Aaditech Solutions Private Limited. We empower local businesses, multi-unit franchises, and growing enterprises to achieve dominance in local search, social media, and customer lead generation through autonomous AI systems.
              </p>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-indigo-900">Our Core Philosophy</span>
                <p className="text-xs text-indigo-800">
                  Data truth before marketing vanity. We never fabricate rankings, invent reviews, or report estimated metrics as verified revenue. Every number is classified with rigorous provenance.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong>Headquarters:</strong> Mumbai, Maharashtra, India
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong>Operating Model:</strong> 24/7 Autonomous Agent Execution
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">Platform Capabilities & Services</h3>
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" /> Local SEO 3x3 Geo-Grid Tracking
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Continuous monitoring across 9 geographic points to evaluate map rank density and proximity falloff on Google Maps.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Review Autopilot & Sentiment Analysis
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Automated review ingestion from Google Business Profile with empathetic response generation and liability protection guardrails.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Omnichannel Leads CRM & WhatsApp
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Real-time intent scoring, two-way conversational routing on WhatsApp Cloud API, and verified revenue attribution.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">Transparent Subscription Tiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-sm text-slate-900">Starter</span>
                    <div className="text-2xl font-black text-slate-900 my-2">₹1,999<span className="text-xs font-normal text-slate-500">/mo</span></div>
                    <p className="text-xs text-slate-600">Single location, 3x3 rank scan, review alerts, and lead capture.</p>
                  </div>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-sm text-indigo-950">Growth Pro</span>
                    <div className="text-2xl font-black text-indigo-900 my-2">₹4,999<span className="text-xs font-normal text-slate-500">/mo</span></div>
                    <p className="text-xs text-indigo-800">Full autonomous autopilot, WhatsApp API routing, Remotion reels.</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-sm text-slate-900">Agency Fleet</span>
                    <div className="text-2xl font-black text-slate-900 my-2">₹14,999<span className="text-xs font-normal text-slate-500">/mo</span></div>
                    <p className="text-xs text-slate-600">Multi-company workspaces, custom domain white-labeling, priority queue.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">Contact & Support</h3>
              <p>Reach out directly to our engineering, sales, or customer success teams.</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="block text-xs text-slate-500">Direct Email</span>
                    <a href="mailto:contact@aaditechs.in" className="font-bold text-slate-900 hover:text-indigo-600">
                      contact@aaditechs.in
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="block text-xs text-slate-500">Telephone Hotline</span>
                    <a href="tel:+918898278453" className="font-bold text-slate-900 hover:text-indigo-600">
                      +91 88982 78453
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="block text-xs text-slate-500">Physical Address</span>
                    <span className="font-bold text-slate-900">
                      Tech Hub, Western Express Highway, Mumbai, Maharashtra 400001, India
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">Terms of Service</h3>
              <p className="text-xs text-slate-500">Last updated: November 2026</p>
              <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                <p>
                  1. <strong>Acceptance of Terms:</strong> By accessing bga.aaditechs.in, you agree to these Terms of Service and all applicable laws and regulations.
                </p>
                <p>
                  2. <strong>Autonomous Engine Governance:</strong> The autonomous marketing engine executes campaigns, reviews, and social publishing under user-defined approval policies. Users retain full oversight and may activate the Global Emergency Stop at any time.
                </p>
                <p>
                  3. <strong>Anti-Spam & Zero-Gating:</strong> Use of WhatsApp broadcasts or review collection is subject to zero review gating and strict opt-in verification. Spamming or abusive messaging will result in immediate tenant termination.
                </p>
                <p>
                  4. <strong>Data Truth & Intellectual Property:</strong> All generated creative assets and proprietary data remain the property of the tenant. Aaditech guarantees no customer data is used to train external foundational models without explicit consent.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">Privacy Policy</h3>
              <p className="text-xs text-slate-500">Effective Date: November 2026</p>
              <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                <p>
                  1. <strong>Information Collected:</strong> We collect necessary business credentials, customer inquiries, and integration authentication tokens strictly to operate your marketing automations.
                </p>
                <p>
                  2. <strong>Encryption & Storage:</strong> All OAuth tokens, WhatsApp credentials, and database credentials are encrypted at rest using AES-256 and transmitted exclusively over HTTPS/TLS 1.3.
                </p>
                <p>
                  3. <strong>Third-Party Integrations:</strong> We interface with Google Business Profile, Meta Graph API, and Razorpay solely according to your explicit configuration and tenant boundaries.
                </p>
                <p>
                  4. <strong>Data Rights & Contact:</strong> You have the right to inspect, export, or permanently delete your company records. Contact our Data Protection Officer at <a href="mailto:contact@aaditechs.in" className="text-indigo-600 font-bold">contact@aaditechs.in</a>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>bga.aaditechs.in • Aaditech Solutions</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
