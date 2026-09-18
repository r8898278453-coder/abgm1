import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Layout,
  Layers,
  Palette,
  Check,
  Loader2,
  Tag,
  Gift,
  Briefcase,
  GraduationCap,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { SocialTemplate } from '../types';

interface TemplateSelectorProps {
  templates: SocialTemplate[];
  selectedTemplateId: string;
  contentType: 'offer' | 'festival' | 'service' | 'educational';
  onSelectTemplate: (templateId: string) => void;
  isRendering?: boolean;
}

export const FALLBACK_TEMPLATES: SocialTemplate[] = [
  // Offer Templates
  {
    id: 'offer-bold-split',
    name: 'Bold Dual Split',
    description: 'High-contrast split layout with prominent headline, photo showcase, and urgency badge.',
    contentType: 'offer',
    styleMood: 'bold',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'offer-minimal-card',
    name: 'Minimal Clean Card',
    description: 'Ultra-clean white frame with elegant typography and crisp product photo container.',
    contentType: 'offer',
    styleMood: 'minimal',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'offer-playful-badge',
    name: 'Vibrant Playful Promo',
    description: 'Punchy discount badge, warm rounded panels, and energetic call-to-action.',
    contentType: 'offer',
    styleMood: 'playful',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'offer-premium-dark',
    name: 'Obsidian Luxury Special',
    description: 'Deep obsidian backdrop with gold metallic accents and refined typography.',
    contentType: 'offer',
    styleMood: 'premium',
    canvas: { width: 1080, height: 1080 },
  },
  // Festival Templates
  {
    id: 'festival-festive-burst',
    name: 'Festive Radiant Burst',
    description: 'Warm celebratory greeting card with festive border, golden motifs, and brand seal.',
    contentType: 'festival',
    styleMood: 'festive',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'festival-bold-banner',
    name: 'Carnival Bold Festive',
    description: 'High-impact celebration banner with full-bleed photo and dual-tone message ribbons.',
    contentType: 'festival',
    styleMood: 'bold',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'festival-minimal-wishes',
    name: 'Serene Festive Wishes',
    description: 'Understated elegant holiday card featuring spacious margins and refined greetings.',
    contentType: 'festival',
    styleMood: 'minimal',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'festival-premium-gold',
    name: 'Royal Heritage Golden',
    description: 'Prestigious golden holiday wishes card with subtle metallic frame and royal seal.',
    contentType: 'festival',
    styleMood: 'premium',
    canvas: { width: 1080, height: 1080 },
  },
  // Service Templates
  {
    id: 'service-professional-split',
    name: 'Corporate Service Split',
    description: 'Professional side-by-side photo and service capability showcase with trust badges.',
    contentType: 'service',
    styleMood: 'professional',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'service-minimal-hero',
    name: 'Modern Service Hero',
    description: 'Clean full-width photo showcase with floating brand pill and crisp value proposition.',
    contentType: 'service',
    styleMood: 'minimal',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'service-bold-impact',
    name: 'High-Impact Service Banner',
    description: 'Punchy angled color blocking, verified badge, and assertive action trigger.',
    contentType: 'service',
    styleMood: 'bold',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'service-premium-executive',
    name: 'Executive Enterprise Suite',
    description: 'Dark mode luxury service presentation with fine gold hairline border and verified insignia.',
    contentType: 'service',
    styleMood: 'premium',
    canvas: { width: 1080, height: 1080 },
  },
  // Educational Templates
  {
    id: 'educational-minimal-quote',
    name: 'Editorial Insight & Wisdom',
    description: 'Editorial article-style layout with large quote headline and author verification.',
    contentType: 'educational',
    styleMood: 'minimal',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'educational-bold-tips',
    name: 'Bold Masterclass Tips',
    description: 'High-contrast knowledge card with bold top header block and visual photo anchor.',
    contentType: 'educational',
    styleMood: 'bold',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'educational-professional-guide',
    name: 'Corporate Best Practices',
    description: 'Grid layout featuring side-by-side photo and guide takeaways with contact CTA.',
    contentType: 'educational',
    styleMood: 'professional',
    canvas: { width: 1080, height: 1080 },
  },
  {
    id: 'educational-premium-insight',
    name: 'Obsidian Analytical Insight',
    description: 'Deep obsidian backdrop with widescreen cinematic image slice and deep-dive badge.',
    contentType: 'educational',
    styleMood: 'premium',
    canvas: { width: 1080, height: 1080 },
  },
];

export const TemplateWireframe: React.FC<{ templateId: string; styleMood: string }> = ({
  templateId,
  styleMood,
}) => {
  const isDark = styleMood === 'premium' || templateId.includes('dark') || templateId.includes('obsidian');

  // Mini wireframe schematics representing the zone layout of each template
  return (
    <div
      className={`relative w-full aspect-square rounded-xl overflow-hidden p-2 flex flex-col justify-between border ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}
    >
      {/* Schematic Layout Wireframes */}
      {templateId === 'offer-bold-split' && (
        <div className="w-full h-full flex flex-col gap-1">
          <div className="w-full h-1/2 bg-indigo-500/20 rounded-md flex items-center justify-center">
            <div className="w-3/4 h-2 bg-indigo-500/40 rounded-sm" />
          </div>
          <div className="w-full h-1/2 bg-slate-800/60 rounded-md p-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-5/6 h-2 bg-white/70 rounded-xs" />
              <div className="w-1/2 h-1.5 bg-white/40 rounded-xs" />
            </div>
            <div className="w-2/5 h-2.5 bg-indigo-500 rounded-sm self-end" />
          </div>
        </div>
      )}

      {templateId === 'offer-minimal-card' && (
        <div className="w-full h-full bg-white rounded-lg p-1.5 flex flex-col justify-between border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="w-4 h-4 rounded-full bg-indigo-600/30" />
            <div className="w-10 h-1.5 bg-slate-300 rounded-xs" />
          </div>
          <div className="space-y-1 my-auto">
            <div className="w-full h-2.5 bg-slate-900/80 rounded-xs" />
            <div className="w-3/4 h-2 bg-slate-400 rounded-xs" />
          </div>
          <div className="w-full h-1/3 bg-slate-100 rounded-md" />
        </div>
      )}

      {templateId === 'offer-playful-badge' && (
        <div className="w-full h-full bg-amber-50 rounded-lg p-1.5 flex flex-col justify-between border border-amber-200">
          <div className="flex justify-between items-center">
            <div className="w-8 h-3 bg-amber-400 rounded-full" />
            <div className="w-3 h-3 rounded-full bg-rose-500" />
          </div>
          <div className="w-full h-1/2 bg-white rounded-lg p-1 flex items-center justify-center">
            <div className="w-3/4 h-3 bg-rose-500/60 rounded-sm" />
          </div>
          <div className="w-full h-3 bg-rose-500 rounded-md" />
        </div>
      )}

      {templateId === 'offer-premium-dark' && (
        <div className="w-full h-full bg-slate-900 border border-amber-500/30 rounded-lg p-1.5 flex flex-col justify-between">
          <div className="flex justify-center">
            <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40" />
          </div>
          <div className="space-y-1 text-center flex flex-col items-center">
            <div className="w-4/5 h-2 bg-amber-200 rounded-xs" />
            <div className="w-3/5 h-1.5 bg-slate-400 rounded-xs" />
          </div>
          <div className="w-full h-1/3 bg-slate-800 rounded-md border border-slate-700" />
        </div>
      )}

      {templateId.startsWith('festival-') && (
        <div className="w-full h-full bg-gradient-to-br from-rose-950/40 to-amber-950/40 border border-amber-500/30 rounded-lg p-1.5 flex flex-col justify-between items-center">
          <div className="w-full flex justify-between">
            <span className="text-[9px]">✨</span>
            <span className="text-[9px]">✨</span>
          </div>
          <div className="w-full text-center space-y-1 flex flex-col items-center">
            <div className="w-3/4 h-2.5 bg-amber-300 rounded-xs" />
            <div className="w-1/2 h-1.5 bg-white/70 rounded-xs" />
          </div>
          <div className="w-full h-6 bg-amber-500/20 border border-amber-500/30 rounded-md flex items-center justify-center">
            <div className="w-1/2 h-1.5 bg-amber-200 rounded-xs" />
          </div>
        </div>
      )}

      {templateId.startsWith('service-') && (
        <div className="w-full h-full flex flex-col justify-between bg-white rounded-lg p-1.5 border border-slate-200">
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-sm bg-blue-600/30" />
            <div className="w-12 h-1.5 bg-slate-400 rounded-xs" />
          </div>
          <div className="flex gap-1 h-1/2 items-center">
            <div className="w-1/2 h-full bg-slate-200 rounded-sm" />
            <div className="w-1/2 space-y-1">
              <div className="w-full h-2 bg-blue-900 rounded-xs" />
              <div className="w-4/5 h-1.5 bg-slate-400 rounded-xs" />
              <div className="w-3/5 h-1.5 bg-slate-300 rounded-xs" />
            </div>
          </div>
          <div className="w-full h-3 bg-blue-600 rounded-md" />
        </div>
      )}

      {templateId.startsWith('educational-') && (
        <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex flex-col justify-between">
          <div className="w-14 h-2 bg-indigo-600/30 rounded-sm" />
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-slate-900 rounded-xs" />
            <div className="w-5/6 h-2 bg-slate-700 rounded-xs" />
          </div>
          <div className="flex gap-1 h-1/3">
            <div className="w-1/3 h-full bg-slate-200 rounded-sm" />
            <div className="w-2/3 space-y-1">
              <div className="w-full h-1.5 bg-slate-300 rounded-xs" />
              <div className="w-4/5 h-1.5 bg-slate-300 rounded-xs" />
            </div>
          </div>
        </div>
      )}

      {/* Style Mood Pill inside preview */}
      <div className="absolute top-1 right-1">
        <span
          className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
            styleMood === 'bold'
              ? 'bg-rose-500 text-white'
              : styleMood === 'minimal'
              ? 'bg-slate-700 text-white'
              : styleMood === 'festive'
              ? 'bg-amber-500 text-slate-950'
              : styleMood === 'professional'
              ? 'bg-blue-600 text-white'
              : styleMood === 'premium'
              ? 'bg-amber-300 text-slate-950'
              : 'bg-emerald-500 text-white'
          }`}
        >
          {styleMood}
        </span>
      </div>
    </div>
  );
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates = FALLBACK_TEMPLATES,
  selectedTemplateId,
  contentType,
  onSelectTemplate,
  isRendering = false,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'offer' | 'festival' | 'service' | 'educational'>('all');
  const [activeMoodFilter, setActiveMoodFilter] = useState<'all' | 'bold' | 'minimal' | 'festive' | 'professional' | 'playful' | 'premium'>('all');

  const availableTemplates = templates.length > 0 ? templates : FALLBACK_TEMPLATES;

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return availableTemplates.filter((t) => {
      const matchCat = activeCategoryFilter === 'all' || t.contentType === activeCategoryFilter;
      const matchMood = activeMoodFilter === 'all' || t.styleMood === activeMoodFilter;
      return matchCat && matchMood;
    });
  }, [availableTemplates, activeCategoryFilter, activeMoodFilter]);

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1 flex-wrap text-xs">
          {[
            { id: 'all', label: 'All 16 Templates', icon: Layout },
            { id: 'offer', label: 'Promos & Offers', icon: Tag },
            { id: 'festival', label: 'Festivals & Wishes', icon: Gift },
            { id: 'service', label: 'Services & B2B', icon: Briefcase },
            { id: 'educational', label: 'Tips & Guides', icon: GraduationCap },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mood Filter Select */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium hidden sm:inline">Mood:</span>
          <select
            value={activeMoodFilter}
            onChange={(e) => setActiveMoodFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-bold text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Styles</option>
            <option value="bold">Bold & Energetic</option>
            <option value="minimal">Minimal & Clean</option>
            <option value="festive">Festive & Celebratory</option>
            <option value="professional">Professional Corporate</option>
            <option value="playful">Playful & Vibrant</option>
            <option value="premium">Premium Obsidian</option>
          </select>
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto p-1">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              disabled={isRendering}
              className={`relative text-left p-3 rounded-2xl border transition group flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
              } disabled:opacity-60`}
            >
              {/* Wireframe Thumbnail */}
              <div className="mb-2 w-full">
                <TemplateWireframe templateId={template.id} styleMood={template.styleMood} />
              </div>

              {/* Template Details */}
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between gap-1">
                  <div className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                    {template.name}
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug">
                  {template.description}
                </p>
              </div>

              {/* Active Badge */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span className="capitalize">{template.contentType}</span>
                <span className="font-mono text-[9px]">1080x1080</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
