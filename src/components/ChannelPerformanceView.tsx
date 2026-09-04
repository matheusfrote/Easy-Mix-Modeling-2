import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, BarChart3, Info, TrendingUp } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DateRangeFilter, MeridianModelResults } from '../types/mmm';
import { InfoTooltip } from './ContextualGuide';
import { FloatingPrintButton } from './ui/FloatingPrintButton';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';

interface ChannelPerformanceViewProps {
  results: MeridianModelResults | null;
  onNavigateToOptimizer: () => void;
  availableDates?: string[];
  dateRange?: DateRangeFilter;
  onChangeDateRange?: (range: DateRangeFilter) => void;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function metric(value: unknown, digits = 2, suffix = ''): string {
  return finite(value) ? `${value.toFixed(digits)}${suffix}` : 'Indisponível';
}

function money(value: unknown): string {
  return finite(value)
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : 'Indisponível';
}

function kpi(value: unknown, type: MeridianModelResults['kpiType']): string {
  if (!finite(value)) return 'Indisponível';
  return type === 'non_revenue'
    ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
    : money(value);
}

function interval(low: unknown, high: unknown, suffix = ''): string {
  return finite(low) && finite(high)
    ? `[${low.toFixed(2)}${suffix} – ${high.toFixed(2)}${suffix}]`
    : 'Intervalo indisponível';
}

function roiMetric(value: unknown, type: MeridianModelResults['kpiType']): string {
  return metric(value, 2, type === 'non_revenue' ? ' KPI/R$' : 'x');
}

function roiInterval(low: unknown, high: unknown, type: MeridianModelResults['kpiType']): string {
  return interval(low, high, type === 'non_revenue' ? ' KPI/R$' : 'x');
}

export const ChannelPerformanceView: React.FC<ChannelPerformanceViewProps> = ({ results, onNavigateToOptimizer }) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const channelName = selectedChannel || results?.channels[0]?.channelName || '';
  const selected = results?.channels.find(channel => channel.channelName === channelName) || null;
  const curve = channelName ? results?.responseCurves?.[channelName] : undefined;
  const curveData = useMemo(
    () => (curve?.points || []).filter(point => finite(point.spend) && finite(point.incrementalKpi)),
    [curve]
  );

  if (!results) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Modelo não disponível</h3>
        <p className="text-xs text-slate-500 mt-1">Execute o posterior e o Analyzer para consultar resultados por canal.</p>
      </div>
    );
  }

  return (
    <div id="channel-performance-view" className="p-3.5 sm:p-5 md:p-6 space-y-5 max-w-7xl w-full mx-auto min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> Performance científica por canal
          </h1>
          <p className="text-xs text-slate-500 mt-1">ROI, mROI, contribuição e curvas vêm do Analyzer do modelo {results.modelId}.</p>
        </div>
        <button onClick={onNavigateToOptimizer} className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg">
          Abrir Budget Optimizer <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <label htmlFor="scientific-channel" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Canal</label>
        <select id="scientific-channel" value={channelName} onChange={event => setSelectedChannel(event.target.value)} className="mt-1 w-full sm:max-w-sm p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
          {results.channels.map(channel => <option key={channel.channelName}>{channel.channelName}</option>)}
        </select>
      </div>

      {selected && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Investimento', money(selected.spend), 'Analyzer.summary_metrics'],
              ['ROI', roiMetric(selected.roi, results.kpiType), roiInterval(selected.roiInterval?.ci025, selected.roiInterval?.ci975, results.kpiType)],
              ['mROI', roiMetric(selected.marginalRoi, results.kpiType), roiInterval(selected.marginalRoiInterval?.ci025, selected.marginalRoiInterval?.ci975, results.kpiType)],
              ['KPI incremental', kpi(selected.incrementalKpi, results.kpiType), 'Posterior do Analyzer'],
              ['Contribuição', metric(selected.contribution ?? selected.contributionShare, 2, '%'), 'Analyzer.summary_metrics']
            ].map(([label, value, note]) => (
              <div key={label} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-500">{label}</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 break-words">{value}</div>
                <span className="text-[10px] text-slate-400">{note}</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Curva de resposta posterior
                <InfoTooltip title="Fonte científica" content="Pontos produzidos por Analyzer.response_curves(use_posterior=True). Valores ausentes não são interpolados no navegador." />
              </h2>
              <p className="text-xs text-slate-500">Investimento versus KPI incremental, com limites de credibilidade quando disponíveis.</p>
            </div>
            {curveData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveData} margin={{ top: 10, right: 20, left: 5, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="spend" tickFormatter={value => money(Number(value))} minTickGap={24} />
                    <YAxis tickFormatter={value => Number(value).toLocaleString('pt-BR')} />
                    <Tooltip formatter={(value: unknown, name: string) => [kpi(value, results.kpiType), name]} labelFormatter={value => `Spend: ${money(Number(value))}`} />
                    <Legend />
                    <Line type="monotone" dataKey="incrementalKpi" name="KPI incremental" stroke="#2563eb" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="incrementalKpiLower" name="Limite inferior" stroke="#94a3b8" strokeDasharray="4 4" dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="incrementalKpiUpper" name="Limite superior" stroke="#64748b" strokeDasharray="4 4" dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0" /> Curva de resposta indisponível para este canal.
              </div>
            )}
          </div>
        </>
      )}

      <ScrollableTableWrapper>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
            <tr>{['Canal', 'Spend', 'ROI', 'mROI', 'KPI incremental', 'Saturação Hill típica', 'Adstock (lag 1)'].map(label => <th key={label} className="p-3 text-left">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.channels.map(channel => (
              <tr key={channel.channelName}>
                <td className="p-3 font-semibold">{channel.channelName}</td>
                <td className="p-3">{money(channel.spend)}</td>
                <td className="p-3">{roiMetric(channel.roi, results.kpiType)}</td>
                <td className="p-3">{roiMetric(channel.marginalRoi, results.kpiType)}</td>
                <td className="p-3">{kpi(channel.incrementalKpi, results.kpiType)}</td>
                <td className="p-3">{metric(channel.saturationLevel, 1, '%')}</td>
                <td className="p-3">{metric(channel.adstockDecay, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTableWrapper>
      <FloatingPrintButton />
    </div>
  );
};
