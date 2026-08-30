import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Database,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { DataReadinessScore, ColumnMapping } from '../../types/mmm';
import { StatisticalValidationReport } from '../../services/dataValidator';

interface DataQualityReadinessWidgetProps {
  readiness: DataReadinessScore;
  validation: StatisticalValidationReport;
  mappings: ColumnMapping[];
  rowCount: number;
  filename: string;
  onNavigateToMapping: () => void;
  onNavigateToReadiness: () => void;
}

export const DataQualityReadinessWidget: React.FC<DataQualityReadinessWidgetProps> = ({
  readiness,
  validation,
  mappings,
  rowCount,
  filename,
  onNavigateToMapping,
  onNavigateToReadiness
}) => {
  const mediaChannels = mappings.filter(m => m.mappedType === 'media_spend');
  const kpiColumn = mappings.find(m => m.mappedType === 'kpi');
  const dateColumn = mappings.find(m => m.mappedType === 'date');
  const controlColumns = mappings.filter(m => m.mappedType === 'control');

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Diagnóstico Instantâneo de Qualidade & Model Readiness
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Origem: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{filename}</span> • {rowCount} semanas processadas
          </p>
        </div>

        {/* Big Score Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 ${getScoreColor(readiness.score)}`}>
            <div className="text-left">
              <span className="text-[9px] uppercase font-bold tracking-wider block opacity-80">Model Readiness Score</span>
              <span className="text-lg font-black font-mono leading-none">{readiness.score}/100</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30">
              {readiness.tier}
            </span>
          </div>

          <button
            type="button"
            id="btn-nav-to-mapping-cta"
            onClick={onNavigateToMapping}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <span>Validar Mapeamento</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Instant Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Temporal Depth */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Histórico</span>
            {rowCount >= 52 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ideal
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Curto
              </span>
            )}
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-1">
            {rowCount} semanas
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {rowCount >= 104
              ? '✓ 24+ meses para capturar adstock longo e sazonalidade'
              : rowCount >= 52
              ? '✓ 12 meses suficientes para estimativa básica'
              : '⚠️ Recomenda-se 52+ semanas'}
          </p>
        </div>

        {/* Media Channels */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Canais de Mídia</span>
            {mediaChannels.length >= 1 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Identificados
              </span>
            ) : (
              <span className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Nenhum
              </span>
            )}
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-1">
            {mediaChannels.length} canais
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {mediaChannels.map(c => c.channelName || c.columnName).slice(0, 3).join(', ')}
            {mediaChannels.length > 3 ? ` +${mediaChannels.length - 3}` : ''}
          </p>
        </div>

        {/* KPI Output */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">KPI Principal</span>
            {kpiColumn ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Encontrado
              </span>
            ) : (
              <span className="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Ausente
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-1 truncate">
            {kpiColumn ? kpiColumn.columnName : 'Não definido'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {kpiColumn ? 'Variável de resultado de negócio' : 'Defina a receita/pedidos'}
          </p>
        </div>

        {/* Data Integrity / Missing */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Integridade</span>
            {(validation?.integritySummary?.totalMissingCells ?? 0) === 0 && (validation?.integritySummary?.duplicateRowCount ?? 0) === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 100% Íntegro
              </span>
            ) : (
              <span className="text-amber-600 font-semibold text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Ajustes
              </span>
            )}
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-1">
            {validation?.integritySummary?.totalMissingCells ?? 0} células vazias
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {(validation?.integritySummary?.duplicateRowCount ?? 0) === 0 ? 'Sem linhas duplicadas' : `${validation?.integritySummary?.duplicateRowCount} duplicadas`}
          </p>
        </div>
      </div>

      {/* Checklist bullets */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{rowCount} semanas ({Math.round(rowCount / 4.3)} meses) de histórico</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{mediaChannels.length} canais identificados</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>KPI de negócio mapeado</span>
          </span>
          {controlColumns.length > 0 && (
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{controlColumns.length} controles externos</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onNavigateToReadiness}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          Ver Check-up Completo →
        </button>
      </div>
    </div>
  );
};
