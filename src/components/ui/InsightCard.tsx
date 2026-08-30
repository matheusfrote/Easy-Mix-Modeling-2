import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, HelpCircle, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { ConfidenceBadge, ConfidenceLevel } from './ConfidenceBadge';

interface InsightCardProps {
  id?: string;
  category?: string;
  title: string;
  finding: string;
  impact?: string;
  actionText?: string;
  confidence?: ConfidenceLevel | string;
  evidence?: {
    metric: string;
    value: string;
    channel?: string;
    period?: string;
    explanation?: string;
  };
  onApplyAction?: () => void;
  actionButtonLabel?: string;
  status?: 'success' | 'warning' | 'info';
}

export const InsightCard: React.FC<InsightCardProps> = ({
  id,
  category = 'Recomendação Estratégica',
  title,
  finding,
  impact,
  actionText,
  confidence = 'high',
  evidence,
  onApplyAction,
  actionButtonLabel = 'Aplicar no Otimizador',
  status = 'info'
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  const statusStyle = {
    success: 'border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900',
    warning: 'border-l-4 border-l-amber-500 bg-white dark:bg-slate-900',
    info: 'border-l-4 border-l-blue-500 bg-white dark:bg-slate-900'
  }[status];

  return (
    <div
      id={id}
      className={`rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-all space-y-3.5 ${statusStyle}`}
    >
      {/* Header with Category & Confidence */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {category}
          </span>
        </div>
        <ConfidenceBadge level={confidence} />
      </div>

      {/* Title & Core Finding */}
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
          {finding}
        </p>
      </div>

      {/* Estimated Financial/Business Impact */}
      {impact && (
        <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Impacto Estimado no Resultado:
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">
            {impact}
          </span>
        </div>
      )}

      {/* Suggested Action */}
      {actionText && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Ação Recomendada:
            </span>
            <p className="text-slate-600 dark:text-slate-400">{actionText}</p>
          </div>
          {onApplyAction && (
            <button
              onClick={onApplyAction}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 shrink-0 self-start sm:self-center transition shadow-xs"
            >
              <span>{actionButtonLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Evidence Accordion ("Por que estamos dizendo isso?") */}
      {evidence && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Por que o modelo recomenda isso?</span>
            {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showEvidence && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Canal / Fator</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{evidence.channel || 'Geral'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Métrica Base</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{evidence.metric}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Valor Estimado</span>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{evidence.value}</p>
                </div>
              </div>
              {evidence.explanation && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  <strong>Interpretação:</strong> {evidence.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
