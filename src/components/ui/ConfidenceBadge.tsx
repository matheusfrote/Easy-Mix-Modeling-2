import React from 'react';
import { ShieldCheck, AlertCircle, Info } from 'lucide-react';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel | string;
  label?: string;
  showExplanation?: boolean;
  explanationText?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  label,
  showExplanation = false,
  explanationText
}) => {
  const normLevel =
    level === 'high' || level === 'Alta' || level === 'alta'
      ? 'high'
      : level === 'medium' || level === 'Moderada' || level === 'Média' || level === 'moderada'
      ? 'medium'
      : 'low';

  const config = {
    high: {
      text: label || 'Alta Certeza',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: ShieldCheck,
      defaultExplanation: 'Os dados históricos e o modelo estatístico apresentam consistência elevada para esta estimativa.'
    },
    medium: {
      text: label || 'Certeza Moderada',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: Info,
      defaultExplanation: 'O modelo aponta uma tendência clara, mas existe uma faixa de variação normal nos dados.'
    },
    low: {
      text: label || 'Incerteza Relevante',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icon: AlertCircle,
      defaultExplanation: 'Pouco volume de dados ou alta sobreposição entre canais. Trate como uma hipótese a ser validada.'
    }
  }[normLevel];

  const Icon = config.icon;

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.badgeClass}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{config.text}</span>
      </span>
      {showExplanation && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {explanationText || config.defaultExplanation}
        </span>
      )}
    </div>
  );
};
