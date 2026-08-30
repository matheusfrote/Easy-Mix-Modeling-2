import React from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
  DollarSign,
  TrendingUp,
  Tag
} from 'lucide-react';
import { ColumnMapping, ColumnType } from '../../types/mmm';
import { ScrollableTableWrapper } from '../ui/ScrollableTableWrapper';

interface SmartMappingPreviewProps {
  mappings: ColumnMapping[];
  onNavigateToFullMapping: () => void;
}

export const SmartMappingPreview: React.FC<SmartMappingPreviewProps> = ({
  mappings,
  onNavigateToFullMapping
}) => {
  const getTypeBadge = (type: ColumnType) => {
    switch (type) {
      case 'date':
        return { label: 'Data (Índice)', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'kpi':
        return { label: 'KPI de Negócio', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'media_spend':
        return { label: 'Investimento (Spend)', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'media_impressions':
        return { label: 'Impressões / Exposição', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
      case 'media_clicks':
        return { label: 'Cliques / Engajamento', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'control':
        return { label: 'Variável de Controle', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      default:
        return { label: 'Ignorar', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
    }
  };

  const getConfidenceLevel = (mapping: ColumnMapping) => {
    if (mapping.mappedType === 'date' || mapping.mappedType === 'kpi') {
      return { label: 'Alta (99%)', color: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (mapping.mappedType === 'media_spend' && mapping.channelName) {
      return { label: 'Alta (95%)', color: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (mapping.mappedType === 'control') {
      return { label: 'Média (85%)', color: 'text-blue-600 dark:text-blue-400' };
    }
    return { label: 'Automático', color: 'text-slate-500' };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Mapeamento Inteligente Meridian ({mappings.length} variáveis identificadas)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Classificação automática via Catálogo de Mídia e Nomes Canônicos do Google Meridian.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToFullMapping}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 self-start sm:self-center bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <span>Editar Mapeamento Completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <ScrollableTableWrapper minWidth="650px" hintText="Arraste para visualizar todas as variáveis mapeadas" className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-2.5">Coluna no Arquivo</th>
              <th className="p-2.5">Papel no Modelo MMM</th>
              <th className="p-2.5">Canal / Categoria</th>
              <th className="p-2.5">Confiança da IA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {mappings.map(m => {
              const badge = getTypeBadge(m.mappedType);
              const conf = getConfidenceLevel(m);
              return (
                <tr key={m.columnName} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="p-2.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    {m.columnName}
                  </td>
                  <td className="p-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    {m.channelName ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white">{m.channelName}</span>
                        {m.channelCategory && (
                          <span className="text-[10px] text-slate-400">({m.channelCategory})</span>
                        )}
                      </span>
                    ) : m.description ? (
                      <span className="text-slate-500 dark:text-slate-400">{m.description}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-2.5 text-[11px] font-semibold">
                    <span className={conf.color}>{conf.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTableWrapper>
    </div>
  );
};
