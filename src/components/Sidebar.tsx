import {ClientWorkGuide} from './ClientWorkGuide';
import {primaryWorkTabs} from '../../shared/clientWorkGuide';
import type {CapabilityPack} from '../../shared/capabilityPacks';
import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  MapPin,
  TrendingUp,
  Users2,
  Star,
  Sparkles,
  Calendar,
  Layers,
  Contact2,
  Globe,
  Cpu,
  Settings,
  Building,
  Radio,
  CheckCircle,
  Plug,
  Brain,
  CreditCard,
  Bot,
} from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  companyId?:string;
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  unansweredReviewsCount: number;
  criticalIssuesCount: number;
  newLeadsCount: number;
  isAutopilotOn: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  companyId,
  currentTab,
  setCurrentTab,
  unansweredReviewsCount,
  criticalIssuesCount,
  newLeadsCount,
  isAutopilotOn,
}) => {
  const [pack,setPack]=React.useState<CapabilityPack|null>(null),[showAll,setShowAll]=React.useState(false);
  const navSections = [
    {
      title: 'COMMAND CENTER',
      items: [
        {
          id: 'dashboard' as NavTab,
          label: 'Main Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'audit' as NavTab,
          label: 'Business Evidence Audit',
          icon: ShieldCheck,
          badge: criticalIssuesCount > 0 ? `${criticalIssuesCount} alerts` : null,
          badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
        },
        {
          id: 'autonomous' as NavTab,
          label: 'Autonomous Engine',
          icon: Cpu,
          badge: isAutopilotOn ? 'Enabled' : 'Paused',
          badgeColor: isAutopilotOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300',
        },
      ],
    },
    {
      title: 'GOOGLE & LOCAL SEO',
      items: [
        {
          id: 'google' as NavTab,
          label: 'Google Places & Health',
          icon: MapPin,
          badge: null,
        },
        {
          id: 'seo' as NavTab,
          label: 'Map Rank Grid & SEO',
          icon: TrendingUp,
          badge: null,
          badgeColor: 'bg-blue-500/20 text-blue-300',
        },
        {
          id: 'competitors' as NavTab,
          label: 'Competitor Intel',
          icon: Users2,
          badge: null,
          badgeColor: 'bg-amber-500/20 text-amber-300',
        },
      ],
    },
    {
      title: 'REPUTATION & SALES',
      items: [
        {
          id: 'reviews' as NavTab,
          label: 'Review Management',
          icon: Star,
          badge: unansweredReviewsCount > 0 ? `${unansweredReviewsCount} new` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        },
        {
          id: 'leads' as NavTab,
          label: 'Lead CRM & Sales AI',
          icon: Contact2,
          badge: newLeadsCount > 0 ? `${newLeadsCount} new` : null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
      ],
    },
    {
      title: 'CONTENT & CAMPAIGNS',
      items: [
        {
          id: 'content' as NavTab,
          label: 'AI Content & Reels',
          icon: Sparkles,
          badge: 'Hindi/Eng',
          badgeColor: 'bg-purple-500/20 text-purple-300',
        },
        {
          id: 'calendar' as NavTab,
          label: '30-Day Content Plan',
          icon: Calendar,
          badge: null,
        },
        {
          id: 'campaigns' as NavTab,
          label: 'Campaigns & Attribution',
          icon: Layers,
          badge: null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
      ],
    },
    {
      title: 'PRESENCE & PLATFORM',
      items: [
        {
          id: 'website' as NavTab,
          label: 'Mini Website & Local SEO',
          icon: Globe,
          badge: null,
          badgeColor: 'bg-emerald-500/20 text-emerald-400',
        },
        {
          id: 'telegram' as NavTab,
          label: 'Telegram operations',
          icon: Bot,
          badge: null,
          badgeColor: 'bg-sky-500/20 text-sky-400',
        },
        {
          id: 'knowledge' as NavTab,
          label: 'Knowledge & AI Memory',
          icon: Brain,
          badge: null,
          badgeColor: 'bg-indigo-500/20 text-indigo-300',
        },
        {
          id: 'integrations' as NavTab,
          label: 'Connected Accounts',
          icon: Plug,
          badge: null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
        {
          id: 'agency' as NavTab,
          label: 'Agency & Multi-Branch',
          icon: Building,
          badge: null,
        },
        {
          id: 'billing' as NavTab,
          label: 'Admin & Billing / Cost',
          icon: CreditCard,
          badge: null,
          badgeColor: 'bg-slate-700 text-slate-300',
        },
        {
          id: 'ai_control' as NavTab,
          label: 'AI Control & Guardrails',
          icon: Settings,
          badge: null,
          badgeColor: 'bg-slate-800 text-slate-400',
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col flex-shrink-0 h-[calc(100vh-6rem)] sticky top-20 overflow-y-auto p-3 m-3 space-y-4">
      <section className="p-4 bg-slate-900 text-white rounded-2xl text-xs"><h2>Execution preference</h2><p>{isAutopilotOn?'Autopilot requested':'Autopilot paused'}</p><p>Saved preference is not proof of running work or business growth. Review recorded activity in the dashboard.</p></section>
      {companyId&&<ClientWorkGuide key={companyId} companyId={companyId} onNavigate={setCurrentTab} onPack={p=>{setPack(p);setShowAll(false);}}/>}
      {pack&&<label className="text-xs"><input type="checkbox" aria-label="Show all workspace tools" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>Show all workspace tools</label>}
      <nav className="flex-1 space-y-5 px-1 pb-4">
        {navSections.map(section=>({...section,items:section.items.filter(item=>!pack||showAll||primaryWorkTabs(pack).includes(item.id))})).filter(section=>section.items.length).map((section) => (
          <div key={section.title} className="space-y-1.5">
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition group text-left ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                          isActive
                            ? 'bg-indigo-700 text-white'
                            : item.badgeColor || 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer info Bento Box */}
      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between font-medium">
        <span>gemini-3.8-flash</span>
        <span className="flex items-center gap-1 text-emerald-600 font-bold">
          <CheckCircle className="w-3 h-3" /> Zero-Touch
        </span>
      </div>
    </aside>
  );
};
