import React from 'react';
import { MeridianModelResults } from '../types/mmm';
import { Flame } from 'lucide-react';
import { InfoTooltip } from './ContextualGuide';

interface RoiCorrelationHeatmapProps {
  results: MeridianModelResults;
}

export const RoiCorrelationHeatmap: React.FC<RoiCorrelationHeatmapProps> = () => {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
      <h2 className="sr-only">
        Heatmap de Eficiência de ROI, Correlação e Sazonalidade dos Canais de Mídia ao Longo do Tempo
      </h2>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <span>Heatmap de Correlação de ROI: Canais vs Períodos Temporais</span>
              <InfoTooltip
                title="Heatmap de Eficiência de ROI & Correlação Temporal"
                content="Matriz visual que mapeia o comportamento e a produtividade de cada canal ao longo do tempo."
              />
            </h3>
          </div>
        </div>
      </div>

      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        <Flame className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Dados indisponíveis para esta visualização.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          A distribuição temporal de ROI marginal requer inferência bayesiana dinâmica no modelo (Time-varying coefficients), que atualmente não foi extraída pela camada do Meridian.
        </p>
      </div>
    </div>
  );
};

