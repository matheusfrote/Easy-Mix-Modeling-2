import React, { memo } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { MeridianModelResults } from '../types/mmm';

interface ProjectedRoiTrendCardProps {
  results: MeridianModelResults;
  onNavigateToBudget?: () => void;
  onNavigateToChannels?: () => void;
}

export const ProjectedRoiTrendCard: React.FC<ProjectedRoiTrendCardProps> = memo(({
  results,
  onNavigateToBudget
}) => {
  const availableCurves = Object.values(results.responseCurves || {})
    .filter(curve => Array.isArray(curve?.points) && curve.points.length > 0).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-5 md:p-6 transition-colors min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Projeções somente com cenário científico
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            O modelo {results.modelId} possui {availableCurves} curvas de resposta reais. Forecasts são calculados apenas no What-If pelo posterior do Meridian; o Dashboard não cria projeções locais.
          </p>
        </div>
        {onNavigateToBudget && (
          <button
            type="button"
            onClick={onNavigateToBudget}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shrink-0"
          >
            Abrir análise científica
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

ProjectedRoiTrendCard.displayName = 'ProjectedRoiTrendCard';
