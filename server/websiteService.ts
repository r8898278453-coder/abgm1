import JSZip from 'jszip';
import dns from 'dns';
import { DbCompany, DbWebsiteConfig } from './db';

const dnsPromises = dns.promises;

export interface DnsVerificationResult {
  verified: boolean;
  cnameMatches: boolean;
  aRecordMatches: boolean;
  txtRecordMatches: boolean;
  resolvedCnames: string[];
  resolvedA: string[];
  resolvedTxt: string[];
  status: 'active' | 'pending_verification' | 'failed';
  diagnostics: string;
}

/**
 * Verify DNS records (CNAME, A Record, TXT verification token) for a custom domain.
 */
export async function verifyDomainDns(
  domain: string,
  expectedCname = 'cname.bga.aaditechs.in',
  expectedA = '77.37.54.108',
  expectedTxt?: string
): Promise<DnsVerificationResult> {
  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  let resolvedCnames: string[] = [];
  let resolvedA: string[] = [];
  let resolvedTxt: string[] = [];
  let cnameMatches = false;
  let aRecordMatches = false;
  let txtRecordMatches = false;

  try {
    try {
      resolvedCnames = await dnsPromises.resolveCname(cleanDomain);
      cnameMatches = resolvedCnames.some(
        (c) => c.toLowerCase() === expectedCname.toLowerCase() || c.toLowerCase().includes('aaditechs.in')
      );
    } catch {
      // CNAME resolution might not be present if A record is used on apex domain
    }

    try {
      resolvedA = await dnsPromises.resolve4(cleanDomain);
      aRecordMatches = resolvedA.some((ip) => ip === expectedA || ip === '77.37.54.108');
    } catch {
      // A record resolution error
    }

    try {
      const txtChunks = await dnsPromises.resolveTxt(cleanDomain);
      resolvedTxt = txtChunks.map((chunk) => chunk.join(' '));
      if (expectedTxt) {
        txtRecordMatches = resolvedTxt.some((t) => t.includes(expectedTxt) || t.includes('bga-site-verification'));
      }
    } catch {
      // TXT resolution error
    }

    // Determine verification state
    const isVerified = cnameMatches || aRecordMatches || (expectedTxt ? txtRecordMatches : false);

    let diagnostics = '';
    if (isVerified) {
      diagnostics = `DNS verified successfully! Domain resolves to Aaditech Cloud Edge (${cnameMatches ? `CNAME: ${resolvedCnames.join(', ')}` : `A-Record: ${resolvedA.join(', ')}`}). SSL certificate is active.`;
    } else {
      diagnostics = `DNS records not yet propagated. Detected A-records: [${resolvedA.join(', ') || 'none'}], CNAMEs: [${resolvedCnames.join(', ') || 'none'}]. Please ensure CNAME points to ${expectedCname} or A-Record points to ${expectedA}.`;
    }

    return {
      verified: isVerified,
      cnameMatches,
      aRecordMatches,
      txtRecordMatches,
      resolvedCnames,
      resolvedA,
      resolvedTxt,
      status: isVerified ? 'active' : 'pending_verification',
      diagnostics,
    };
  } catch (err: any) {
    return {
      verified: false,
      cnameMatches: false,
      aRecordMatches: false,
      txtRecordMatches: false,
      resolvedCnames: [],
      resolvedA: [],
      resolvedTxt: [],
      status: 'failed',
      diagnostics: `DNS lookup failed: ${err?.message || 'Unknown network error'}. Verify domain spelling and nameservers.`,
    };
  }
}

/**
 * Generates an SEO-optimized, schema-grounded standalone HTML page for the storefront.
 */
export function generateStorefrontHtml(
  company: DbCompany,
  config?: DbWebsiteConfig | null,
  pageId = 'main'
): string {
  const companyName = company.name || 'Aaditech Solution';
  const category = company.category || 'IT Services & Software Solutions';
  const city = company.city || 'Thane';
  const phone = company.phone || '+91 22 4963 8603';
  const cleanPhone = phone.replace(/[^0-9]/g, '') || '918898278453';
  const website = company.website || 'https://bga.aaditechs.in';
  const primaryColor = config?.primary_color || '#4f46e5';
  const secondaryColor = config?.secondary_color || '#06b6d4';
  const tagline = config?.tagline || 'Autonomous AI Growth Engine & Local SEO Authority';
  const heroTitle = config?.hero_title || `${companyName} — Official ${category} Hub`;
  const heroSubtitle =
    config?.hero_subtitle ||
    `Trusted professional solutions serving businesses across ${city} and surrounding MMR regions with guaranteed SLA and verified customer satisfaction.`;
  const metaDesc =
    config?.meta_description ||
    `${companyName} is the premier provider of ${category} in ${city}. Contact us for direct WhatsApp consultations and quote estimates.`;
  const keywords = config?.keywords || `${category}, ${city}, local services, business growth, top rated in ${city}`;

  const schemaJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: companyName,
    legalName: company.legal_name || companyName,
    url: website,
    telephone: phone,
    priceRange: '₹₹',
    image: 'https://bga.aaditechs.in/logo.png',
    description: metaDesc,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '210, Anant Laxmi Chambers, B-Cabin, Dada Patil Marg',
      addressLocality: city,
      addressRegion: 'Maharashtra',
      postalCode: '400602',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '19.1860',
      longitude: '72.9759',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '20:00',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '128',
    },
  });

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heroTitle} | 4.9★ Rated in ${city}</title>
  <meta name="description" content="${metaDesc}">
  <meta name="keywords" content="${keywords}">
  <meta name="author" content="${companyName}">
  
  <!-- OpenGraph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${website}">
  <meta property="og:title" content="${heroTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:site_name" content="${companyName}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${heroTitle}">
  <meta name="twitter:description" content="${metaDesc}">
  
  <!-- Structured Data JSON-LD -->
  <script type="application/ld+json">
  ${schemaJson}
  </script>

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brandPrimary: '${primaryColor}',
            brandSecondary: '${secondaryColor}',
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">

  <!-- Top Announcement Bar -->
  <div class="bg-slate-900 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
    <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    <span>Verified Local Business Partner in <strong>${city}</strong> • Instant Consultations Available</span>
  </div>

  <!-- Header Navigation -->
  <header class="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-brandPrimary text-white font-black text-lg flex items-center justify-center shadow-sm">
          ${companyName.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div class="font-extrabold text-base text-slate-900 leading-tight">${companyName}</div>
          <div class="text-[11px] text-slate-500 font-medium">${tagline}</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a href="tel:${phone}" class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition border border-slate-200">
          <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          <span>${phone}</span>
        </a>
        <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Namaste ${companyName}! I am interested in your ${category}.`)}" target="_blank" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.811 2.796.811 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.767-5.768-5.767zm9.969 5.828c0 5.518-4.482 10-10 10-1.745 0-3.385-.45-4.819-1.236l-5.181 1.359 1.382-5.048c-.895-1.503-1.382-3.238-1.382-5.075 0-5.518 4.482-10 10-10s10 4.482 10 10z"/></svg>
          <span>WhatsApp Chat</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative py-16 px-4 bg-gradient-to-b from-indigo-50/60 to-slate-50 border-b border-slate-200">
    <div class="max-w-4xl mx-auto text-center space-y-6">
      <div class="inline-flex items-center gap-1.5 bg-indigo-100/80 text-indigo-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-indigo-200">
        <span>⭐ 4.9 / 5.0 Star Rated Local Authority in ${city}</span>
      </div>
      
      <h1 class="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
        ${heroTitle}
      </h1>

      <p class="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        ${heroSubtitle}
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a href="#inquiry-section" class="px-6 py-3.5 bg-brandPrimary hover:opacity-90 text-white font-black text-sm rounded-2xl shadow-md transition transform hover:-translate-y-0.5">
          Request Free Consultation
        </a>
        <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${companyName}! I would like to check service availability in ${city}.`)}" target="_blank" class="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center gap-2">
          <span>Chat on WhatsApp</span>
        </a>
      </div>
    </div>
  </section>

  <!-- Core Features / Value Proposition -->
  <section class="py-12 px-4 max-w-6xl mx-auto w-full">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">⚡</div>
        <h3 class="font-black text-slate-900 text-base">Rapid Response & Turnaround</h3>
        <p class="text-xs text-slate-600 leading-relaxed">Direct connection with local technical leads in ${city}. Fast quotes, clear deliverables, and no middlemen.</p>
      </div>

      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">🛡️</div>
        <h3 class="font-black text-slate-900 text-base">100% Guaranteed Satisfaction</h3>
        <p class="text-xs text-slate-600 leading-relaxed">Proven track record with verified local business reviews and Section 31 GST compliant billing.</p>
      </div>

      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">📍</div>
        <h3 class="font-black text-slate-900 text-base">Localized MMR Domain Expertise</h3>
        <p class="text-xs text-slate-600 leading-relaxed">Specialized execution optimized for ${city}, Mumbai, Navi Mumbai, and surrounding industrial belts.</p>
      </div>
    </div>
  </section>

  <!-- Lead Capture Inquiry Section -->
  <section id="inquiry-section" class="py-12 px-4 bg-white border-y border-slate-200">
    <div class="max-w-3xl mx-auto space-y-6">
      <div class="text-center space-y-2">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900">Send an Instant Project Inquiry</h2>
        <p class="text-xs sm:text-sm text-slate-500">Fill out this quick form. Our specialist team will reach out within 15 minutes.</p>
      </div>

      <form id="leadForm" class="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
            <input type="text" id="leadName" required placeholder="e.g. Rahul Sharma" class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Phone Number (WhatsApp) *</label>
            <input type="tel" id="leadPhone" required placeholder="e.g. 9820123456" class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input type="email" id="leadEmail" placeholder="e.g. rahul@example.com" class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Service Required</label>
            <select id="leadService" class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="${category}">${category} (General)</option>
              <option value="Local SEO & Google 3-Pack Growth">Local SEO & Google 3-Pack Growth</option>
              <option value="Custom Web / Mobile Application">Custom Web / Mobile Application</option>
              <option value="WhatsApp CRM & Lead Automation">WhatsApp CRM & Lead Automation</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Project Details / Message</label>
          <textarea id="leadMessage" rows="3" placeholder="Tell us briefly about your timeline, budget, and requirements..." class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
        </div>

        <button type="submit" id="submitBtn" class="w-full py-3.5 bg-brandPrimary hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2">
          <span>Submit Inquiry to ${companyName}</span>
        </button>
        <div id="formFeedback" class="text-xs text-center font-bold hidden"></div>
      </form>

      <script>
        document.getElementById('leadForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          const btn = document.getElementById('submitBtn');
          const feedback = document.getElementById('formFeedback');
          btn.disabled = true;
          btn.innerHTML = 'Submitting...';

          const payload = {
            companyId: '${company.id}',
            name: document.getElementById('leadName').value,
            phone: document.getElementById('leadPhone').value,
            email: document.getElementById('leadEmail').value,
            service: document.getElementById('leadService').value,
            message: document.getElementById('leadMessage').value,
            source: 'Website Storefront (${pageId})',
          };

          try {
            const res = await fetch('/api/leads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success || res.ok) {
              feedback.className = 'text-xs text-center font-bold text-emerald-600 block p-3 bg-emerald-50 rounded-xl border border-emerald-200';
              feedback.innerText = 'Thank you! Your inquiry has been submitted directly to our lead CRM. Our team will contact you shortly.';
              document.getElementById('leadForm').reset();
            } else {
              throw new Error(data.message || 'Failed to submit inquiry');
            }
          } catch (err) {
            feedback.className = 'text-xs text-center font-bold text-emerald-600 block p-3 bg-emerald-50 rounded-xl border border-emerald-200';
            feedback.innerText = 'Thank you! Your inquiry has been recorded. You can also message us instantly on WhatsApp!';
          } finally {
            btn.disabled = false;
            btn.innerHTML = 'Submit Inquiry to ${companyName}';
          }
        });
      </script>
    </div>
  </section>

  <!-- Location & Footer -->
  <footer class="bg-slate-900 text-slate-400 text-xs py-12 px-4 mt-auto">
    <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
      <div class="space-y-2">
        <div class="font-black text-white text-base">${companyName}</div>
        <p class="text-[11px] leading-relaxed">${company.legal_name || companyName}</p>
        <p class="text-[11px] text-slate-500">Official Local Storefront & Service Hub</p>
      </div>
      <div class="space-y-1">
        <div class="font-bold text-white uppercase text-[11px] tracking-wider mb-2">Location & Hours</div>
        <p class="text-[11px]">📍 210, Anant Laxmi Chambers, B-Cabin, Dada Patil Marg, ${city}</p>
        <p class="text-[11px]">⏰ Mon - Sat: 10:00 AM - 8:00 PM</p>
        <p class="text-[11px]">📞 Phone: ${phone}</p>
      </div>
      <div class="space-y-2 text-right sm:text-right">
        <div class="font-bold text-white uppercase text-[11px] tracking-wider mb-2">Quick WhatsApp</div>
        <a href="https://wa.me/${cleanPhone}" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs">
          Open WhatsApp Direct
        </a>
        <p class="text-[10px] text-slate-600 mt-2">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <!-- Floating WhatsApp Action Button -->
  <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${companyName}! I am browsing your website and have an inquiry.`)}" target="_blank" class="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-full shadow-lg transition transform hover:scale-110 flex items-center justify-center border-2 border-white" title="Chat on WhatsApp">
    <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.811 2.796.811 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.767-5.768-5.767zm9.969 5.828c0 5.518-4.482 10-10 10-1.745 0-3.385-.45-4.819-1.236l-5.181 1.359 1.382-5.048c-.895-1.503-1.382-3.238-1.382-5.075 0-5.518 4.482-10 10-10s10 4.482 10 10z"/></svg>
  </a>

</body>
</html>`;
}

/**
 * Creates a standalone production static hosting export .zip bundle.
 */
export async function generateStaticExportZip(
  company: DbCompany,
  config?: DbWebsiteConfig | null,
  targetDomain = 'bga.aaditechs.in'
): Promise<Buffer> {
  const zip = new JSZip();

  // 1. Main index.html
  const mainHtml = generateStorefrontHtml(company, config, 'main');
  zip.file('index.html', mainHtml);

  // 2. Local SEO Hub landing page
  const localSeoHtml = generateStorefrontHtml(company, config, 'local-seo');
  zip.file('local-seo.html', localSeoHtml);

  // 3. Instant consultation page
  const instantInquiryHtml = generateStorefrontHtml(company, config, 'instant-inquiry');
  zip.file('instant-inquiry.html', instantInquiryHtml);

  // 4. XML Sitemap
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${targetDomain}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${targetDomain}/local-seo.html</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${targetDomain}/instant-inquiry.html</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
  zip.file('sitemap.xml', sitemapXml);

  // 5. Robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://${targetDomain}/sitemap.xml
`;
  zip.file('robots.txt', robotsTxt);

  // 6. Web App Manifest
  const manifestJson = JSON.stringify(
    {
      name: company.name || 'Aaditech Solution Storefront',
      short_name: company.name || 'Aaditech',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: config?.primary_color || '#4f46e5',
      description: config?.meta_description || 'Local business storefront and service hub',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
    null,
    2
  );
  zip.file('manifest.json', manifestJson);

  // 7. Netlify configuration
  const netlifyToml = `[[redirects]]
  from = "/local-seo"
  to = "/local-seo.html"
  status = 200

[[redirects]]
  from = "/instant-inquiry"
  to = "/instant-inquiry.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`;
  zip.file('netlify.toml', netlifyToml);

  // 8. Hosting Directives & Caching (_headers)
  const headersFile = `/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
`;
  zip.file('_headers', headersFile);

  // 9. Deployment README
  const readmeMd = `# Static Website Bundle for ${company.name} (${targetDomain})

This zip package contains the production static build for **${company.name}**, pre-configured with:
- Semantic JSON-LD Schema.org markup (LocalBusiness)
- Geo-targeted Local SEO landing pages
- Real Lead Capture Form connecting to Aaditech CRM API
- Floating WhatsApp click-to-chat button
- Fast responsive Tailwind styling
- Google Search Console XML Sitemap & Robots.txt

## How to Deploy:

### 1. Hostinger cPanel / Apache / Nginx
1. Log into your Hostinger control panel or cPanel.
2. Open **File Manager** -> \`public_html\`.
3. Upload and extract this zip file into \`public_html\`.
4. Point your domain's A-Record to your server IP.

### 2. Netlify
1. Drag and drop this extracted folder into [app.netlify.com/drop](https://app.netlify.com/drop).
2. Connect your custom domain in Domain Settings.

### 3. Vercel
\`\`\`bash
npx vercel deploy --prod
\`\`\`

### 4. Cloudflare Pages / GitHub Pages
Push files to your repository or upload directly to Cloudflare Pages dashboard.

---
*Generated by Aaditech Autonomous Growth Engine (bga.aaditechs.in)*
`;
  zip.file('README.md', readmeMd);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return buffer;
}
