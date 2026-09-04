import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Calculator, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BudgetOptimizationResult, MeridianModelResults } from '../types/mmm';
import { apiClient } from '../services/apiClient';
import { StepGuidanceBanner } from './ContextualGuide';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';

interface BudgetOptimizerViewProps {
  results: MeridianModelResults | null;
  onNavigateToSimulator: () => void;
  onOpenFullTour?: () => void;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function money(value: unknown): string {
  return finite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : 'Indisponível';
}

function decimal(value: unknown, suffix = ''): string {
  return finite(value) ? `${value.toFixed(2)}${suffix}` : 'Indisponível';
}

function outcome(value: unknown, type: MeridianModelResults['kpiType']): string {
  if (!finite(value)) return 'Indisponível';
  return type === 'non_revenue' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : money(value);
}

function roiMetric(value: unknown, type: MeridianModelResults['kpiType']): string {
  return decimal(value, type === 'non_revenue' ? ' KPI/R$' : 'x');
}

export const BudgetOptimizerView: React.FC<BudgetOptimizerViewProps> = ({ results, onNavigateToSimulator, onOpenFullTour }) => {
  const [targetBudget, setTargetBudget] = useState<number>(
    finite(results?.totalSpend) ? results.totalSpend : Number.NaN
  );
  const [optimization, setOptimization] = useState<BudgetOptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const runOptimization = async (budget: number) => {
    if (!results || !finite(budget) || budget <= 0) return;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.optimizeBudget(budget);
      if (sequence === requestSequence.current) {
        setOptimization(response);
        setExplanation(null);
      }
    } catch (reason: any) {
      if (sequence === requestSequence.current) {
        setOptimization(null);
        setError(reason?.message || 'O Meridian não concluiu a otimização.');
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!results) return;
    setTargetBudget(results.totalSpend);
    setOptimization(null);
    setExplanation(null);
    setError(null);
    // Merely opening the page must not trigger a derived scientific calculation.
  }, [results?.modelId]);

  if (!results) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12">
        <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold">Modelo não disponível</h3>
        <p className="text-xs text-slate-500 mt-1">Execute o modelo Meridian para habilitar o BudgetOptimizer oficial.</p>
      </div>
    );
  }

  const chartData = (optimization?.reallocations || []).filter(item => finite(item.currentSpend) && finite(item.recommendedSpend)).map(item => ({
    name: item.channelName,
    Atual: item.currentSpend,
    Recomendado: item.recommendedSpend
  }));

  return (
    <div id="budget-optimizer-view" className="p-3.5 sm:p-5 md:p-6 space-y-5 max-w-7xl w-full mx-auto min-w-0">
      <StepGuidanceBanner
        id="budget-optimizer"
        stepNumber="6"
        title="Budget Optimizer oficial do Google Meridian"
        subtitle={`A otimização usa exclusivamente o posterior identificado por ${results.modelId}.`}
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '🧮', text: 'A alocação e o KPI esperado são calculados pelo BudgetOptimizer.' },
          { icon: '🔗', text: 'Nenhum resultado é reconstruído a partir de dados enviados pelo frontend.' },
          { icon: '📊', text: 'Valores não disponíveis são apresentados como indisponíveis.' }
        ]}
      />

      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <label className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Orçamento-alvo
            <input type="number" min="1" step="1000" value={targetBudget} onChange={event => setTargetBudget(Number(event.target.value))} className="mt-1 w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </label>
          <div className="flex flex-wrap gap-2">
            {[0.85, 1, 1.1, 1.2].map(multiplier => (
              <button key={multiplier} onClick={() => { const budget = Math.round(results.totalSpend * multiplier); setTargetBudget(budget); void runOptimization(budget); }} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                {Math.round(multiplier * 100)}%
              </button>
            ))}
            <button disabled={loading || !finite(targetBudget) || targetBudget <= 0} onClick={() => void runOptimization(targetBudget)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5">
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Otimizar
            </button>
          </div>
        </div>
        {error && <div role="alert" className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      </div>

      {optimization && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Orçamento atual', money(optimization.currentTotalBudget)],
              ['Orçamento-alvo', money(optimization.targetTotalBudget)],
              ['KPI atual esperado', outcome(optimization.expectedCurrentKpi, results.kpiType)],
              ['KPI otimizado esperado', outcome(optimization.expectedOptimizedKpi, results.kpiType)],
              ['KPI incremental', outcome(optimization.totalIncrementalKpi, results.kpiType)],
              ['Lift', finite(optimization.overallLiftPercentage) ? `${optimization.overallLiftPercentage.toFixed(2)}%` : 'Indisponível'],
              ['ROI atual', roiMetric(optimization.blendedCurrentRoi, results.kpiType)],
              ['ROI otimizado', roiMetric(optimization.blendedProjectedRoi, results.kpiType)]
            ].map(([label, value]) => <div key={label} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><div className="text-[10px] uppercase font-semibold text-slate-500">{label}</div><div className="text-lg font-bold mt-1">{value}</div></div>)}
          </div>

          <ScrollableTableWrapper>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800"><tr>{['Canal', 'Atual', 'Recomendado', 'Delta', 'Delta %', 'ROI atual', 'ROI otimizado', 'mROI otimizado'].map(label => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {optimization.reallocations.map(item => <tr key={item.channelName}>
                  <td className="p-3 font-semibold">{item.channelName}</td><td className="p-3">{money(item.currentSpend)}</td><td className="p-3">{money(item.recommendedSpend)}</td><td className="p-3">{money(item.deltaSpend)}</td><td className="p-3">{finite(item.deltaPercentage ?? item.percentageChange) ? `${Number(item.deltaPercentage ?? item.percentageChange).toFixed(2)}%` : 'Indisponível'}</td><td className="p-3">{roiMetric(item.currentRoi, results.kpiType)}</td><td className="p-3">{roiMetric(item.optimizedRoi ?? item.projectedRoi, results.kpiType)}</td><td className="p-3">{roiMetric(item.marginalRoi, results.kpiType)}</td>
                </tr>)}
              </tbody>
            </table>
          </ScrollableTableWrapper>

          {chartData.length > 0 && <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={value => money(Number(value))} /><Tooltip formatter={value => money(Number(value))} /><Legend /><Bar dataKey="Atual" fill="#94a3b8" /><Bar dataKey="Recomendado" fill="#2563eb" /></BarChart></ResponsiveContainer></div>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={async () => { try { setError(null); setExplanation(await apiClient.getBudgetExplanation(optimization.targetTotalBudget)); } catch (reason: any) { setError(reason?.message || 'Falha ao gerar interpretação determinística.'); } }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold">Gerar interpretação determinística</button>
            <button onClick={onNavigateToSimulator} className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5">Abrir What-If <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          {explanation && <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs whitespace-pre-line">{explanation}</div>}
        </>
      )}
    </div>
  );
};
