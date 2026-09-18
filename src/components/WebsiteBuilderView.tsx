import React, { useState } from 'react';
import {
  Globe,
  Smartphone,
  Monitor,
  ExternalLink,
  Sparkles,
  Phone,
  MapPin,
  CheckCircle2,
  Star,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { BusinessProfile } from '../types';

interface WebsiteBuilderViewProps {
  business: BusinessProfile;
}

export const WebsiteBuilderView: React.FC<WebsiteBuilderViewProps> = ({ business }) => {
  const [activePageId, setActivePageId] = useState('main');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Compute initials
  const initials = (business.name || 'AB')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const primaryColor = business.brandKit?.primaryColor || '#4f46e5';
  const secondaryColor = business.brandKit?.secondaryColor || '#06b6d4';

  const cleanPhone = (business.whatsapp || business.phone || '918898278453').replace(/[^0-9]/g, '');

  // Dynamic pages based on business areas & category
  const primaryArea = business.city || 'Thane';
  const secondaryArea = business.serviceAreas?.[0] || 'Mumbai MMR';
  const tertiaryArea = business.serviceAreas?.[1] || 'Navi Mumbai';

  const pages = [
    {
      id: 'main',
      path: '/',
      label: 'Main Storefront',
      title: `${business.name} - Official ${business.category || 'Services'} Hub`,
      heroSub: `Trusted ${business.category || 'Professional Solutions'} serving clients across ${primaryArea} and surrounding regions with guaranteed satisfaction.`,
    },
    {
      id: 'local-seo',
      path: `/local-${primaryArea.toLowerCase().replace(/\s+/g, '-')}`,
      label: `${primaryArea} Hub`,
      title: `Top Rated ${business.category || 'Solutions'} in ${primaryArea} & ${secondaryArea}`,
      heroSub: `Dedicated localized services for ${primaryArea} businesses. Quick turnaround, on-demand consultation, and verified local expertise.`,
    },
    {
      id: 'whatsapp-consult',
      path: `/instant-inquiry`,
      label: 'Instant Consultation',
      title: `Connect Directly with ${business.name} Specialists`,
      heroSub: `Skip the queue. Connect via WhatsApp or direct call to receive tailored quotes, project estimates, and expert guidance.`,
    },
  ];

  const currentPage = pages.find((p) => p.id === activePageId) || pages[0];
  const fullLiveUrl = `https://bga.aaditechs.in${currentPage.path}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullLiveUrl).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-7 h-7 text-indigo-600" />
            Mini Website Builder & Local SEO Storefront
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Auto-generated, high-converting local storefront with dedicated geo-targeted landing pages on bga.aaditechs.in.
          </p>
        </div>

        {/* Live URL badge with Copy Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-indigo-600 shadow-2xs">
            <span className="truncate max-w-[200px] sm:max-w-xs">{fullLiveUrl}</span>
            <button
              onClick={handleCopyUrl}
              title="Copy URL"
              className="p-1 text-slate-400 hover:text-indigo-600 transition"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <a
            href={fullLiveUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition border border-indigo-200 shadow-2xs"
          >
            <span>Visit</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Controls Bar: Page selector + Device preview toggle Bento Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">Local SEO Pages:</span>
          {pages.map((pg) => (
            <button
              key={pg.id}
              onClick={() => setActivePageId(pg.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activePageId === pg.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {pg.label}
            </button>
          ))}
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              deviceMode === 'desktop' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              deviceMode === 'mobile' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* Website Preview Container Bento Card */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm flex justify-center">
        <div
          className={`bg-white text-slate-900 rounded-2xl overflow-hidden shadow-md transition-all duration-300 border border-slate-200 flex flex-col ${
            deviceMode === 'mobile' ? 'w-[375px] min-h-[640px]' : 'w-full max-w-4xl min-h-[650px]'
          }`}
        >
          {/* Browser Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            </div>
            <div className="bg-white px-4 py-0.5 rounded-lg border border-slate-200 text-[11px] font-medium truncate max-w-xs shadow-2xs">
              bga.aaditechs.in{currentPage.path}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> SSL 🔒
            </div>
          </div>

          {/* Website Content */}
          <div className="p-6 space-y-8 overflow-y-auto flex-1">
            {/* Nav */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                {business.brandKit?.logoUrl ? (
                  <img
                    src={business.brandKit.logoUrl}
                    alt={business.name}
                    className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1"
                  />
                ) : (
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="w-10 h-10 rounded-xl text-white font-black flex items-center justify-center text-sm shadow-2xs"
                  >
                    {initials}
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-sm leading-tight text-slate-900">{business.name}</div>
                  <div className="text-[10px] text-slate-500">{business.brandKit?.tagline || business.category}</div>
                </div>
              </div>
              <a
                href={`tel:${business.phone}`}
                style={{ backgroundColor: primaryColor }}
                className="text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition hover:opacity-90"
              >
                <Phone className="w-3 h-3" /> Call Specialist
              </a>
            </div>

            {/* Hero Section */}
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3.5 py-1 rounded-full border border-indigo-100 shadow-2xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                4.9★ Rated Local Partner in {primaryArea}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {currentPage.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                {currentPage.heroSub}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Namaste ${business.name}! I would like to inquire about your ${business.category || 'services'}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" /> WhatsApp Consultation
                </a>
                <a
                  href={`tel:${business.phone}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition flex items-center gap-1.5"
                >
                  <Phone className="w-3 h-3 text-slate-600" /> {business.phone || 'Call Us'}
                </a>
              </div>
            </div>

            {/* Services Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                Featured Services & Solutions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(business.services || []).slice(0, 3).map((srv, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        style={{ backgroundColor: primaryColor }}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                      />
                      <div className="text-xs font-bold text-slate-900">{srv}</div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Professional delivery with guaranteed SLA, dedicated support, and verified quality standards.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Storefront Location & Hours Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>{business.address}, {business.city}, {business.state}</span>
              </div>
              <div className="text-slate-500 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {business.openingHours || 'Mon-Sat: 10:00 AM - 8:00 PM'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
