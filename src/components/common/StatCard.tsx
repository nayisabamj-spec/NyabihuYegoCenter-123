import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  change?: number; // percentage e.g. +12 or -8
  changePeriodLabel?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'sky' | 'white' | 'accent';
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sublabel,
  change,
  changePeriodLabel = 'vs prev period',
  icon,
  variant = 'white',
  highlight = false,
}) => {
  const getChangeBadge = () => {
    if (change === undefined || isNaN(change)) return null;

    if (change > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <ArrowUpRight className="w-3.5 h-3.5" />
          +{change}%
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          <ArrowDownRight className="w-3.5 h-3.5" />
          {change}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  };

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-200 ${
        variant === 'primary'
          ? 'bg-[#23285E] text-white border-[#23285E] shadow-sm'
          : variant === 'sky'
          ? 'bg-[#3591C8] text-white border-[#3591C8] shadow-sm'
          : 'bg-white text-[#1F222C] border-slate-200/80 shadow-xs hover:border-slate-300'
      } ${highlight ? 'ring-2 ring-[#3591C8]' : ''}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            variant === 'primary' || variant === 'sky' ? 'text-white/80' : 'text-slate-500'
          }`}
        >
          {label}
        </span>
        {icon && (
          <div
            className={`p-2 rounded-xl ${
              variant === 'primary'
                ? 'bg-white/10 text-[#E6E65A]'
                : variant === 'sky'
                ? 'bg-white/10 text-white'
                : 'bg-slate-100 text-[#3591C8]'
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div
          className={`text-3xl font-extrabold tracking-tight font-roboto ${
            variant === 'primary' || variant === 'sky' ? 'text-white' : 'text-[#23285E]'
          }`}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {getChangeBadge()}
      </div>

      {(sublabel || (change !== undefined && changePeriodLabel)) && (
        <div
          className={`mt-2 text-xs ${
            variant === 'primary' || variant === 'sky' ? 'text-white/70' : 'text-slate-500'
          }`}
        >
          {sublabel || changePeriodLabel}
        </div>
      )}
    </div>
  );
};
