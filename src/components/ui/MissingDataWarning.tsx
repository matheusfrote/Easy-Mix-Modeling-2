import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Wrench,
  Info
} from 'lucide-react';
import { DateRangeMissingDataAnalysis } from '../../utils/missingDataChecker';
import { DateRangeFilter } from '../../types/mmm';

interface MissingDataWarningProps {
  analysis: DateRangeMissingDataAnalysis;
  onNavigateToReadiness?: () => void;
  onResetDateRange?: () => void;
  className?: string;
}

/**
 * Compact interactive warning badge for the main top navigation Header.
 */
export const MissingDataHeaderBadge: React.FC<MissingDataWarningProps> = ({
  analysis,
  onNavigateToReadiness,
  onResetDateRange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!analysis.hasHighMissingData) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Warning Trigger Button in Header */}
      <button
        id="btn-header-missing-data-warning"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition text-xs font-bold shadow-xs cursor-pointer"
        title="Alerta de Qualidade de Dados: >10% de dados ausentes no período"
        aria-label="Aviso de dados ausentes no período atual"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="hidden sm:inline">
          Aviso: <strong className="font-extrabold">{analysis.missingPercentage.toFixed(0)}% Ausente</strong>
        </span>
        <span className="sm:hidden font-extrabold">{analysis.missingPercentage.toFixed(0)}% !</span>
      </button>

      {/* Popover / Dropdown Details */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-amber-300 dark:border-amber-700/70 p-4 z-50 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Alerta: Alto Volume de Dados Ausentes
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {analysis.isDateFiltered ? `Filtro atual: ${analysis.dateRangeLabel}` : 'Dataset Geral'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-3 space-y-2.5 text-xs">
            {/* Metric pill */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Taxa de Células Vazias / Nulas:
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-extrabold text-sm">
                {analysis.missingPercentage.toFixed(1)}% ({'>'} 10% limite)
              </span>
            </div>

            {/* Econometric Impact */}
            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                Impacto Econométrico no Meridian MMM:
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {analysis.econometricImpact}
              </p>
            </div>

            {/* Affected Columns if any */}
            {analysis.affectedColumns.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Colunas mais afetadas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.affectedColumns.slice(0, 4).map(col => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                    >
                      {col}
                    </span>
                  ))}
                  {analysis.affectedColumns.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                      +{analysis.affectedColumns.length - 4} outras
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {onNavigateToReadiness && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToReadiness();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Tratar e Imputar no Check-up</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {analysis.isDateFiltered && onResetDateRange && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onResetDateRange();
                }}
                className="w-full text-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
              >
                Redefinir Filtro de Datas para Total
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Prominent visual warning banner positioned in the Dashboard Header area.
 */
export const MissingDataWarningBanner: React.FC<MissingDataWarningProps> = ({
  analysis,
  onNavigateToReadiness,
  onResetDateRange,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If no high missing data or dismissed for now, return null
  if (!analysis.hasHighMissingData || isDismissed) {
    return null;
  }

  return (
    <div
      id="dashboard-missing-data-warning-banner"
      className={`rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 p-3.5 sm:p-4 transition-all duration-200 shadow-xs text-slate-800 dark:text-slate-200 ${className}`}
      role="alert"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left icon & summary */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                Aviso: Alto Volume de Dados Ausentes no Período Selecionado ({analysis.missingPercentage.toFixed(1)}% {'>'} 10%)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0">
                Status: {analysis.readinessItem?.status === 'fail' ? 'Ação Necessária' : 'Atenção'}
              </span>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
              O período {analysis.isDateFiltered ? `(${analysis.dateRangeLabel})` : 'atual'} possui lacunas de preenchimento que podem distorcer o cálculo bayesiano de ROI e inflar a margem de incerteza do modelo.
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 text-xs font-semibold flex items-center gap-1 transition"
          >
            <span>{isExpanded ? 'Menos Detalhes' : 'Ver Detalhes'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {onNavigateToReadiness && (
            <button
              id="btn-banner-fix-missing-data"
              onClick={onNavigateToReadiness}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tratar no Check-up</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-amber-700 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
            title="Ocultar este aviso temporariamente"
            aria-label="Ocultar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Accordion: Breakdown & Econometric Explanation */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-amber-200 dark:border-amber-800/40 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Impacto no Google Meridian MMM
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              {analysis.econometricImpact}
            </p>
          </div>

          <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-amber-200 dark:border-amber-800/40 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Recomendação Prática
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              {analysis.recommendation}
            </p>
            {analysis.isDateFiltered && onResetDateRange && (
              <button
                onClick={onResetDateRange}
                className="mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-block"
              >
                Clique aqui para restaurar todo o histórico de datas →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
