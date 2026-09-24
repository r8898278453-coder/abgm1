import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Database,
  UserCheck,
  HelpCircle,
  XCircle,
  Radio,
  Calculator,
} from 'lucide-react';
import { DataTruthStatus } from '../types';

interface DataStatusBadgeProps {
  status: DataTruthStatus | string;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export const DataStatusBadge: React.FC<DataStatusBadgeProps> = ({
  status,
  label,
  className = '',
  showIcon = true,
}) => {
  const normalizedStatus = (status || 'UNAVAILABLE').toUpperCase() as DataTruthStatus;

  switch (normalizedStatus) {
    case 'LIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          {label || 'LIVE'}
        </span>
      );

    case 'VERIFIED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <ShieldCheck className="w-3 h-3 text-sky-600 flex-shrink-0" />}
          {label || 'VERIFIED'}
        </span>
      );

    case 'CALCULATED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <Calculator className="w-3 h-3 text-indigo-600 flex-shrink-0" />}
          {label || 'CALCULATED'}
        </span>
      );

    case 'ESTIMATED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <Radio className="w-3 h-3 text-amber-600 flex-shrink-0" />}
          {label || 'ESTIMATED'}
        </span>
      );

    case 'AI_ESTIMATED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <Sparkles className="w-3 h-3 text-purple-600 flex-shrink-0" />}
          {label || 'AI ESTIMATED'}
        </span>
      );

    case 'USER_ENTERED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <UserCheck className="w-3 h-3 text-teal-600 flex-shrink-0" />}
          {label || 'USER ENTERED'}
        </span>
      );

    case 'SEEDED':
    case 'DEMO':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <Database className="w-3 h-3 text-slate-500 flex-shrink-0" />}
          {label || (normalizedStatus === 'DEMO' ? 'DEMO DATA' : 'SEEDED DATA')}
        </span>
      );

    case 'ERROR':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs tracking-wide uppercase ${className}`}
        >
          {showIcon && <XCircle className="w-3 h-3 text-rose-600 flex-shrink-0" />}
          {label || 'ERROR'}
        </span>
      );

    case 'UNAVAILABLE':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200 tracking-wide uppercase ${className}`}
        >
          {showIcon && <HelpCircle className="w-3 h-3 text-slate-400 flex-shrink-0" />}
          {label || 'UNAVAILABLE'}
        </span>
      );
  }
};
