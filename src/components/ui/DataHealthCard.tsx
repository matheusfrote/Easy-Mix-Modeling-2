import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronRight } from 'lucide-react';

export type HealthStatus = 'good' | 'warning' | 'critical';

interface DataHealthCardProps {
  id?: string;
  pillar: string;
  title: string;
  status: HealthStatus;
  statusLabel?: string;
  explanation: string;
  impactOnBusiness?: string;
  recommendation?: string;
  technicalMetric?: string;
  onFixAction?: () => void;
  fixActionLabel?: string;
}

export const DataHealthCard: React.FC<DataHealthCardProps> = ({
  id,
  pillar,
  title,
  status,
  statusLabel,
  explanation,
  impactOnBusiness,
  recommendation,
  technicalMetric,
  onFixAction,
  fixActionLabel
}) => {
  const config = {
    good: {
      icon: CheckCircle2,
      label: statusLabel || 'Pronto & Saudável',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      borderLeft: 'border-l-4 border-l-emerald-500',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    warning: {
      icon: AlertTriangle,
      label: statusLabel || 'Ponto de Atenção',
      badgeBg: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      borderLeft: 'border-l-4 border-l-amber-500',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    critical: {
      icon: XCircle,
      label: statusLabel || 'Requer Ajuste',
      badgeBg: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      borderLeft: 'border-l-4 border-l-rose-500',
      iconColor: 'text-rose-600 dark:text-rose-400'
    }
  }[status];

  const Icon = config.icon;

  return (
    <div
      id={id}
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3 ${config.borderLeft}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.iconColor} shrink-0`} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {pillar}
          </span>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.badgeBg}`}>
          {config.label}
        </span>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{explanation}</p>
      </div>

      {impactOnBusiness && (
        <div className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
          <strong className="text-slate-700 dark:text-slate-200">O que significa para você: </strong>
          {impactOnBusiness}
        </div>
      )}

      {recommendation && (
        <div className="text-xs p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Recomendação: </strong>
            {recommendation}
          </div>
        </div>
      )}

      {(technicalMetric || onFixAction) && (
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          {technicalMetric ? (
            <span className="text-[11px] font-mono text-slate-400">
              Métrica: {technicalMetric}
            </span>
          ) : <span />}

          {onFixAction && fixActionLabel && (
            <button
              onClick={onFixAction}
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition"
            >
              <span>{fixActionLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
