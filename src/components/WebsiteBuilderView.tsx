import React, { useState, useEffect } from 'react';
import {
  Globe,
  Smartphone,
  Monitor,
  ExternalLink,
  Sparkles,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Star,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Download,
  Server,
  RefreshCw,
  Trash2,
  Plus,
  Palette,
  Sliders,
  FileCode,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import {
  CompanyDomainRecord,
  WebsiteConfigRecord,
  fetchCompanyDomainsApi,
  addCompanyDomainApi,
  verifyCompanyDomainApi,
  deleteCompanyDomainApi,
  fetchWebsiteConfigApi,
  saveWebsiteConfigApi,
  downloadStaticWebsiteZip,
} from '../services/authService';

interface WebsiteBuilderViewProps {
  business: BusinessProfile;
}

export const WebsiteBuilderView: React.FC<WebsiteBuilderViewProps> = ({ business }) => {
  const companyId = business.id || 'comp_aaditech_main';
  const [activeTab, setActiveTab] = useState<'preview' | 'domains' | 'seo_branding' | 'export'>('preview');
  const [activePageId, setActivePageId] = useState('main');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedDns, setCopiedDns] = useState<string | null>(null);

  // Custom Domains State
  const [domains, setDomains] = useState<CompanyDomainRecord[]>([]);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<{ [domainId: string]: string }>({});

  // Website Config State
  const [websiteConfig, setWebsiteConfig] = useState<WebsiteConfigRecord | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState(false);

  // Static Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Form State for Config
  const [primaryColor, setPrimaryColor] = useState(business.brandKit?.primaryColor || '#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState(business.brandKit?.secondaryColor || '#06b6d4');
  const [tagline, setTagline] = useState(business.brandKit?.tagline || 'Autonomous AI Growth Engine & Local SEO Authority');
  const [heroTitle, setHeroTitle] = useState(`${business.name} — Official ${business.category || 'Services'} Hub`);
  const [heroSubtitle, setHeroSubtitle] = useState(
    `Trusted professional solutions serving clients across ${business.city || 'Thane'} and surrounding MMR regions with guaranteed satisfaction.`
  );
  const [metaDesc, setMetaDesc] = useState(
    `${business.name} is the premier provider of ${business.category || 'services'} in ${business.city || 'Thane'}. Contact us for WhatsApp consultations and quote estimates.`
  );
  const [keywords, setKeywords] = useState(
    `${business.category || 'services'}, ${business.city || 'Thane'}, local services, business growth, top rated`
  );
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState('');
  const [enableWhatsAppCta, setEnableWhatsAppCta] = useState(true);
  const [enableDirectCallCta, setEnableDirectCallCta] = useState(true);
  const [enableInquiryForm, setEnableInquiryForm] = useState(true);

  // Load Domains and Config on Mount
  useEffect(() => {
    loadDomains();
    loadWebsiteConfig();
  }, [companyId]);

  const loadDomains = async () => {
    try {
      const data = await fetchCompanyDomainsApi(companyId);
      setDomains(data);
    } catch (err) {
      console.warn('Failed to load domains:', err);
    }
  };

  const loadWebsiteConfig = async () => {
    try {
      const cfg = await fetchWebsiteConfigApi(companyId);
      if (cfg) {
        setWebsiteConfig(cfg);
        if (cfg.primary_color) setPrimaryColor(cfg.primary_color);
        if (cfg.secondary_color) setSecondaryColor(cfg.secondary_color);
        if (cfg.tagline) setTagline(cfg.tagline);
        if (cfg.hero_title) setHeroTitle(cfg.hero_title);
        if (cfg.hero_subtitle) setHeroSubtitle(cfg.hero_subtitle);
        if (cfg.meta_description) setMetaDesc(cfg.meta_description);
        if (cfg.keywords) setKeywords(cfg.keywords);
        if (cfg.google_analytics_id) setGoogleAnalyticsId(cfg.google_analytics_id);
        if (cfg.enable_whatsapp_cta !== undefined) setEnableWhatsAppCta(cfg.enable_whatsapp_cta);
        if (cfg.enable_direct_call_cta !== undefined) setEnableDirectCallCta(cfg.enable_direct_call_cta);
        if (cfg.enable_inquiry_form !== undefined) setEnableInquiryForm(cfg.enable_inquiry_form);
      }
    } catch (err) {
      console.warn('Failed to load website config:', err);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    setIsAddingDomain(true);
    try {
      const added = await addCompanyDomainApi(companyId, newDomainInput.trim());
      setDomains([added, ...domains]);
      setNewDomainInput('');
    } catch (err: any) {
      alert(err?.message || 'Failed to add custom domain');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setIsVerifyingDomain(domainId);
    try {
      const result = await verifyCompanyDomainApi(companyId, domainId);
      setVerificationFeedback((prev) => ({
        ...prev,
        [domainId]: result.verification?.diagnostics || 'Verification check completed.',
      }));
      await loadDomains();
    } catch (err: any) {
      setVerificationFeedback((prev) => ({
        ...prev,
        [domainId]: `Verification check failed: ${err?.message || 'Network error'}`,
      }));
    } finally {
      setIsVerifyingDomain(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this custom domain binding?')) return;
    try {
      await deleteCompanyDomainApi(companyId, domainId);
      setDomains(domains.filter((d) => d.id !== domainId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete domain');
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigSuccessMsg(false);
    try {
      const updated = await saveWebsiteConfigApi(companyId, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        tagline,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        meta_description: metaDesc,
        keywords,
        google_analytics_id: googleAnalyticsId,
        enable_whatsapp_cta: enableWhatsAppCta,
        enable_direct_call_cta: enableDirectCallCta,
        enable_inquiry_form: enableInquiryForm,
      });
      setWebsiteConfig(updated);
      setConfigSuccessMsg(true);
      setTimeout(() => setConfigSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save website configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const primaryDomain = domains.find((d) => d.status === 'active')?.domain || 'bga.aaditechs.in';
      await downloadStaticWebsiteZip(companyId, primaryDomain);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to export static website package');
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedDns(id);
    setTimeout(() => setCopiedDns(null), 2000);
  };

  // Compute initials
  const initials = (business.name || 'AB')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const cleanPhone = (business.whatsapp || business.phone || '918898278453').replace(/[^0-9]/g, '');
  const primaryArea = business.city || 'Thane';
  const secondaryArea = business.serviceAreas?.[0] || 'Mumbai MMR';

  const pages = [
    {
      id: 'main',
      path: '/',
      label: 'Main Storefront',
      title: heroTitle,
      heroSub: heroSubtitle,
    },
    {
      id: 'local-seo',
      path: `/local-seo`,
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
  const activeDomain = domains.find((d) => d.status === 'active')?.domain || 'bga.aaditechs.in';
  const liveStorefrontUrl = `/storefront/${companyId}?page=${activePageId}`;
  const displayUrl = `https://${activeDomain}${currentPage.path === '/' ? '' : currentPage.path}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(displayUrl).catch(() => {});
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
            Mini Website Builder & Static Hosting Export
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Auto-generate SEO-optimized static storefronts, bind custom domains with SSL, and export production-ready bundles.
          </p>
        </div>

        {/* Live URL badge with Copy Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-indigo-600 shadow-2xs">
            <span className="truncate max-w-[200px] sm:max-w-xs">{displayUrl}</span>
            <button
              onClick={handleCopyUrl}
              title="Copy URL"
              className="p-1 text-slate-400 hover:text-indigo-600 transition"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <a
            href={liveStorefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition border border-indigo-200 shadow-2xs"
          >
            <span>Live Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'preview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Interactive Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('domains')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'domains'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Custom Domains ({domains.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('seo_branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'seo_branding'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>SEO & Branding Config</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'export'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Static Export (.zip)</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
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
                  {activeDomain}{currentPage.path}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> SSL Active
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
                      <div className="text-[10px] text-slate-500">{tagline}</div>
                    </div>
                  </div>
                  {enableDirectCallCta && (
                    <a
                      href={`tel:${business.phone}`}
                      style={{ backgroundColor: primaryColor }}
                      className="text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition hover:opacity-90"
                    >
                      <Phone className="w-3 h-3" /> Call Specialist
                    </a>
                  )}
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
                    {enableWhatsAppCta && (
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
                    )}
                    {enableDirectCallCta && (
                      <a
                        href={`tel:${business.phone}`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition flex items-center gap-1.5"
                      >
                        <Phone className="w-3 h-3 text-slate-600" /> {business.phone || 'Call Us'}
                      </a>
                    )}
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
      )}

      {/* TAB 2: CUSTOM DOMAINS */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          {/* Add Domain Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-black text-slate-900">Connect Custom Domain</h2>
            </div>
            <p className="text-xs text-slate-500">
              Point your domain name (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">bga.aaditechs.in</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">app.yourcompany.com</code>) to our Edge CDN. Free SSL certificates are automatically provisioned.
            </p>

            <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                placeholder="e.g. services.mybusiness.in or mybrand.com"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAddingDomain || !newDomainInput.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingDomain ? 'Connecting...' : 'Add Domain'}</span>
              </button>
            </form>
          </div>

          {/* Registered Domains List */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Configured Domains</span>
              <span className="text-xs font-medium text-slate-500">({domains.length})</span>
            </h3>

            {domains.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                No custom domains added yet. Enter a domain above to configure DNS routing.
              </div>
            ) : (
              domains.map((dom) => (
                <div key={dom.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 font-mono">{dom.domain}</span>
                        {dom.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active & Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3 h-3" /> Pending DNS
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck className="w-3 h-3" /> SSL: {dom.ssl_status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Added on {new Date(dom.created_at || Date.now()).toLocaleDateString()}
                        {dom.verified_at && ` • Verified on ${new Date(dom.verified_at).toLocaleString()}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifyDomain(dom.id)}
                        disabled={isVerifyingDomain === dom.id}
                        className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition border border-indigo-200 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDomain === dom.id ? 'animate-spin' : ''}`} />
                        <span>{isVerifyingDomain === dom.id ? 'Checking DNS...' : 'Verify DNS'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDomain(dom.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-200"
                        title="Delete Domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* DNS Record Instructions Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Required DNS Configuration at your Domain Registrar (GoDaddy, Cloudflare, Namecheap):</span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-slate-50">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5">Name / Host</th>
                            <th className="px-4 py-2.5">Value / Target</th>
                            <th className="px-4 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px] font-mono text-slate-700">
                          <tr>
                            <td className="px-4 py-2 font-bold text-indigo-600">CNAME</td>
                            <td className="px-4 py-2">www or @</td>
                            <td className="px-4 py-2">{dom.cname_target}</td>
                            <td className="px-4 py-2 text-right font-sans">
                              <button
                                onClick={() => copyToClipboard(dom.cname_target, `${dom.id}_cname`)}
                                className="text-slate-500 hover:text-indigo-600 font-bold inline-flex items-center gap-1"
                              >
                                {copiedDns === `${dom.id}_cname` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>Copy</span>
                              </button>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-bold text-indigo-600">A Record</td>
                            <td className="px-4 py-2">@ (Apex)</td>
                            <td className="px-4 py-2">{dom.a_record_target}</td>
                            <td className="px-4 py-2 text-right font-sans">
                              <button
                                onClick={() => copyToClipboard(dom.a_record_target, `${dom.id}_a`)}
                                className="text-slate-500 hover:text-indigo-600 font-bold inline-flex items-center gap-1"
                              >
                                {copiedDns === `${dom.id}_a` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>Copy</span>
                              </button>
                            </td>
                          </tr>
                          {dom.dns_txt_record && (
                            <tr>
                              <td className="px-4 py-2 font-bold text-indigo-600">TXT</td>
                              <td className="px-4 py-2">@</td>
                              <td className="px-4 py-2 truncate max-w-xs">{dom.dns_txt_record}</td>
                              <td className="px-4 py-2 text-right font-sans">
                                <button
                                  onClick={() => copyToClipboard(dom.dns_txt_record, `${dom.id}_txt`)}
                                  className="text-slate-500 hover:text-indigo-600 font-bold inline-flex items-center gap-1"
                                >
                                  {copiedDns === `${dom.id}_txt` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>Copy</span>
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Verification Feedback diagnostics */}
                  {verificationFeedback[dom.id] && (
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-900 font-medium">
                      {verificationFeedback[dom.id]}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SEO & BRANDING CONFIG */}
      {activeTab === 'seo_branding' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-black text-slate-900">SEO Meta Tags & Brand Customizer</h2>
            </div>
            {configSuccessMsg && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settings Saved!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Title (H1)</label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tagline / Subheading</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Subtitle / Value Proposition</label>
                <textarea
                  rows={3}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Description</label>
                <textarea
                  rows={2}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SEO Keywords (Comma-separated)</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Google Analytics Measurement ID</label>
                <input
                  type="text"
                  value={googleAnalyticsId}
                  onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                  placeholder="e.g. G-XXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Interactive Features & CTAs</label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableWhatsAppCta}
                    onChange={(e) => setEnableWhatsAppCta(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable Floating WhatsApp Click-to-Chat CTA</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableDirectCallCta}
                    onChange={(e) => setEnableDirectCallCta(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable Direct Phone Call Header Button</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableInquiryForm}
                    onChange={(e) => setEnableInquiryForm(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable Live Project Inquiry Lead Capture Form</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-xs transition"
            >
              {isSavingConfig ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: STATIC EXPORT (.ZIP) */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FileCode className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Production Static Hosting Export</h2>
                <p className="text-xs text-slate-500">
                  Export complete static bundle with HTML5 pages, JSON-LD Schema.org, XML Sitemaps, and deployment manifests.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Included Files in Bundle:</span>
                </div>
                <ul className="text-[11px] text-slate-600 font-mono space-y-1 pl-5 list-disc">
                  <li>index.html (Main Storefront)</li>
                  <li>local-seo.html (Geo Landing Page)</li>
                  <li>instant-inquiry.html (Lead Capture)</li>
                  <li>sitemap.xml (Google Search Console)</li>
                  <li>robots.txt & manifest.json (PWA)</li>
                  <li>netlify.toml & _headers (Cloudflare)</li>
                  <li>README.md (Deploy Instructions)</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Supported Deployment Targets:</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1 pl-5 list-disc">
                  <li><strong>Hostinger cPanel / Apache:</strong> Extract to <code className="text-indigo-600">public_html</code></li>
                  <li><strong>Netlify:</strong> Drag-and-drop zip to Netlify Drop</li>
                  <li><strong>Vercel:</strong> Run <code className="text-indigo-600">npx vercel deploy --prod</code></li>
                  <li><strong>Cloudflare Pages / GitHub Pages:</strong> Direct commit</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleExportZip}
                disabled={isExporting}
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-3"
              >
                <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>{isExporting ? 'Packaging Static Assets...' : 'Download Static Website Bundle (.zip)'}</span>
              </button>

              {exportSuccess && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Static zip bundle downloaded successfully! Ready to deploy.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
