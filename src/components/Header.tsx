import React, { useState } from 'react';
import {
  ShieldAlert,
  Bot,
  Smartphone,
  Monitor,
  Zap,
  Building2,
  UserCheck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  LogOut,
  Plus,
  ChevronDown,
  User,
  Cloud,
  Loader2,
} from 'lucide-react';
import { BusinessProfile, UserRole, InterfaceView, ViewMode, AuthUser, CompanyRecord } from '../types';

interface HeaderProps {
  business: BusinessProfile;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  interfaceView?: InterfaceView;
  setInterfaceView?: (view: InterfaceView) => void;
  viewMode?: ViewMode;
  setViewMode?: (view: ViewMode) => void;
  isAutopilotOn: boolean;
  setIsAutopilotOn: (on: boolean) => void;
  isEmergencyPaused: boolean;
  setIsEmergencyPaused: (paused: boolean) => void;
  growthScore?: number;
  onOpenOnboarding?: () => void;
  isLiveMode?: boolean;
  onOpenResetModal?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
  // Multi-Company & Auth Props
  user?: AuthUser | null;
  companies?: CompanyRecord[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
  onOpenCreateCompany?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  business,
  activeRole,
  setActiveRole,
  interfaceView,
  setInterfaceView,
  viewMode,
  setViewMode,
  isAutopilotOn,
  setIsAutopilotOn,
  isEmergencyPaused,
  setIsEmergencyPaused,
  growthScore = 88,
  onOpenOnboarding,
  isLiveMode = false,
  onOpenResetModal,
  saveStatus = 'idle',
  user,
  companies = [],
  activeCompanyId,
  onSelectCompany,
  onOpenCreateCompany,
  onLogout,
}) => {
  const currentView = viewMode || interfaceView || 'web';
  const handleSetView = (v: InterfaceView) => {
    if (setViewMode) setViewMode(v);
    if (setInterfaceView) setInterfaceView(v);
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  const displayName = activeCompany ? activeCompany.name : business.name;
  const displayCategory = activeCompany ? activeCompany.category : business.category;
  const displayCity = activeCompany ? activeCompany.city : business.city;

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'AB';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-xs">
      {isEmergencyPaused && (
        <div className="bg-rose-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>EMERGENCY STOP ACTIVE:</strong> All scheduled posts, autonomous review replies, and outbound WhatsApp messages have been paused.
            </span>
          </div>
          <button
            onClick={() => setIsEmergencyPaused(false)}
            className="bg-white text-rose-700 px-3 py-1 rounded-xl text-xs font-bold hover:bg-rose-50 transition shadow-xs"
          >
            Resume Automations
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Dynamic Company Switcher in Bento Style */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-700 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight truncate text-slate-900">
                {displayName}
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-mono font-bold hidden md:inline-block">
                bga.aaditechs.in
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold hidden sm:inline-block">
                Score: {growthScore}/100
              </span>
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                  <span className="hidden sm:inline">Saving to server...</span>
                  <span className="sm:hidden">Saving...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">Saved to server</span>
                  <span className="sm:hidden">Saved</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="truncate max-w-[140px] sm:max-w-none">{displayCategory}</span>
              <span>•</span>
              {/* Dynamic Company Switcher Dropdown */}
              <div className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <select
                  value={activeCompanyId || ''}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      if (onOpenCreateCompany) onOpenCreateCompany();
                    } else if (onSelectCompany) {
                      onSelectCompany(e.target.value);
                    }
                  }}
                  className="bg-slate-100 border border-slate-300 hover:border-indigo-400 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.name} ({c.city})
                    </option>
                  ))}
                  <option value="__add_new__" className="font-bold text-indigo-600 bg-indigo-50">
                    ➕ Add New Company / Project...
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Interface Switcher (Bento Capsule) */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => handleSetView('web')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              currentView === 'web'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Web Platform</span>
          </button>
          <button
            onClick={() => handleSetView('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              currentView === 'mobile'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile App</span>
          </button>
          <button
            onClick={() => handleSetView('telegram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              currentView === 'telegram'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Telegram Bot</span>
          </button>
        </div>

        {/* Right Controls: Autopilot, Emergency Stop, User Session */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Setup Wizard Button */}
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
              title="5-Minute Business Setup & First-Value Audit Wizard"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Audit Wizard</span>
            </button>
          )}

          {/* Autopilot toggle */}
          <button
            onClick={() => setIsAutopilotOn(!isAutopilotOn)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isAutopilotOn
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="When active, low-risk marketing actions run autonomously with safety guardrails"
          >
            <Zap className={`w-3.5 h-3.5 ${isAutopilotOn ? 'text-emerald-600 fill-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Autopilot:</span>
            <span>{isAutopilotOn ? 'ON' : 'OFF'}</span>
          </button>

          {/* Emergency Stop Button */}
          <button
            onClick={() => setIsEmergencyPaused(!isEmergencyPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
              isEmergencyPaused
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEmergencyPaused ? 'Resume' : 'Pause All'}</span>
          </button>

          {/* Logged-in User Profile & Logout */}
          {user && (
            <div className="flex items-center pl-2 border-l border-slate-200 gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {user.full_name}
                </span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {user.role === 'platform_admin' ? (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold rounded-md">
                      Platform Admin
                    </span>
                  ) : (
                    user.role
                  )}
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                  title="Sign Out of ABGA"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

