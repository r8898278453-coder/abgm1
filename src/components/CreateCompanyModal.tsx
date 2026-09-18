import React, { useState } from 'react';
import { Building2, Sparkles, MapPin, Globe, Phone, Tag, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { createCompanyApi, saveCompanyData } from '../services/authService';
import { CompanyRecord } from '../types';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isFirstCompany?: boolean;
  onCompanyCreated: (newCompany: CompanyRecord) => void;
}

const CATEGORY_PRESETS = [
  'IT Services & Software Development',
  'Healthcare, Dental & Clinic',
  'Retail & E-commerce Store',
  'Real Estate & Property Advisory',
  'Logistics, Transport & Fleet',
  'Restaurant, Cafe & Cloud Kitchen',
  'Manufacturing & Industrial Supplies',
  'Education, Coaching & Training Institute',
  'Digital Marketing & Creative Agency',
  'Financial, CA & Legal Consultancy',
];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  isFirstCompany = false,
  onCompanyCreated,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [city, setCity] = useState('Thane');
  const [phone, setPhone] = useState('+91 ');
  const [website, setWebsite] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter the Company / Brand Name');
      return;
    }

    setLoading(true);
    try {
      const company = await createCompanyApi({
        name: name.trim(),
        category,
        city: city.trim(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        google_place_id: googlePlaceId.trim() || undefined,
      });

      // Generate localized fresh initial data for this specific company
      const initialPayload = {
        growth_score: {
          overall: 78,
          localSeo: 82,
          reputation: 80,
          contentVelocity: 70,
          responseRate: 92,
          conversionRate: 75,
        },
        audit_items: [
          {
            id: 'audit_1',
            title: 'Verify Google Business Profile NAP Consistency',
            category: 'local_seo',
            status: 'action_required',
            impact: 'high',
            description: `Ensure Name, Address (${city}), and Phone match website metadata for optimal 3-Pack placement.`,
            solution: 'Sync Google Business listing with schema.org JSON-LD tag on homepage.',
          },
          {
            id: 'audit_2',
            title: 'Enable WhatsApp 1-Click Instant Lead Capture',
            category: 'conversion',
            status: 'in_progress',
            impact: 'critical',
            description: 'Direct high-intent mobile visitors to an automated WhatsApp booking flow.',
            solution: 'Integrate Aaditech smart QR and floating WhatsApp widget.',
          },
          {
            id: 'audit_3',
            title: 'Generate Local Area Review Request Link',
            category: 'reputation',
            status: 'action_required',
            impact: 'high',
            description: `Boost local trust in ${city} by collecting 5-star reviews from recent customers.`,
            solution: 'Trigger automated SMS/WhatsApp review invite upon service completion.',
          },
        ],
        keywords: [
          { keyword: `${category.toLowerCase().split(',')[0]} in ${city}`, rank: 2, volume: 1850, change: 1 },
          { keyword: `best ${category.toLowerCase().split(',')[0]} near me`, rank: 3, volume: 3200, change: 2 },
          { keyword: `${name.toLowerCase()} ${city}`, rank: 1, volume: 920, change: 0 },
        ],
        competitors: [
          { name: `Top Competitor A (${city})`, rank: 1, reviews: 142, rating: 4.6, callsEstimate: 280 },
          { name: name, rank: 2, reviews: 38, rating: 4.8, callsEstimate: 195, isSelf: true },
          { name: `Regional Competitor B`, rank: 3, reviews: 89, rating: 4.3, callsEstimate: 140 },
        ],
        reviews: [],
        posts: [],
        campaigns: [],
        autonomous_actions: [],
      };

      await saveCompanyData(company.id, initialPayload);
      onCompanyCreated(company);
    } catch (err: any) {
      setError(err.message || 'Failed to create company profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isFirstCompany ? 'Welcome to ABGA — Setup First Business' : 'Add New Company / Project'}
              </h2>
              <p className="text-xs text-slate-400">
                {isFirstCompany
                  ? 'Enter your business details to configure your autonomous growth workspace'
                  : 'Add another business or client profile to manage from this dashboard'}
              </p>
            </div>
          </div>
          {!isFirstCompany && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Company / Brand Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aaditech Tech Labs / Apex Dental Care"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Industry / Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Primary City / Region <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Thane, Mumbai, Pune"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Business Phone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Website URL (Optional)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Google Maps / Business Profile Link (Optional)
            </label>
            <input
              type="text"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
              placeholder="https://maps.google.com/?cid=... or Place ID"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            {!isFirstCompany && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>{isFirstCompany ? 'Initialize Workspace' : 'Add Business Profile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
