import React, { memo } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { InfoTooltip } from '../ContextualGuide';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  tooltipText?: string;
  tooltipTitle?: string;
  badge?: string;
  className?: string;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = memo(({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600 dark:text-blue-400',
  iconBg = 'bg-blue-50 dark:bg-blue-950/60',
  trend,
  tooltipText,
  tooltipTitle,
  badge,
  className = '',
  highlight = false
}) => {
  return (
    <div
      id={id}
      className={`p-4 rounded-xl border transition-all ${
        highlight
          ? 'bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center">
          <span>{title}</span>
          {tooltipText && (
            <InfoTooltip
              title={tooltipTitle || title}
              content={tooltipText}
              size="sm"
            />
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {badge}
            </span>
          )}
          {Icon && (
            <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-2">
        <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
          {value}
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-semibold text-[11px] shrink-0 ml-auto ${
                trend.isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.value}
              {trend.label && <span className="text-slate-400 font-normal ml-0.5">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

