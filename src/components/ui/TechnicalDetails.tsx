import React, { useState } from 'react';
import { Microscope, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface TechnicalDetailsProps {
  id?: string;
  title?: string;
  summary?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Universal Progressive Disclosure container for econometrics, statistical formulas,
 * MCMC diagnostics, and technical data.
 * Keeps initial UI clean and accessible for executives while allowing analysts to deep dive.
 */
export const TechnicalDetails: React.FC<TechnicalDetailsProps> = ({
  id,
  title = 'Detalhes Técnicos & Diagnóstico Estatístico',
  summary = 'Clique para expandir dados metodológicos, parâmetros do modelo e métricas avançadas.',
  badge = 'Para Analistas',
  defaultOpen = false,
  children,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 transition-all ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/40 rounded-xl transition"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Microscope className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                {title}
              </span>
              {badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100/80 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {badge}
                </span>
              )}
            </div>
            {summary && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {summary}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0 ml-3">
          <span>{isOpen ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};
