import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Compass, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MeridianModelResults, ScenarioDefinition } from '../types/mmm';
import { apiClient } from '../services/apiClient';
import { StepGuidanceBanner } from './ContextualGuide';
import { FloatingPrintButton } from './ui/FloatingPrintButton';

interface WhatIfSimulatorViewProps {
  results: MeridianModelResults | null;
  onOpenFullTour?: () => void;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function money(value: unknown): string {
  return finite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : 'Indisponível';
}

function outcome(value: unknown, type: MeridianModelResults['kpiType']): string {
  if (!finite(value)) return 'Indisponível';
  return type === 'non_revenue' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : money(value);
}

function roiMetric(value: unknown, type: MeridianModelResults['kpiType']): string {
  if (!finite(value)) return 'Indisponível';
  return `${value.toFixed(2)}${type === 'non_revenue' ? ' KPI/R$' : 'x'}`;
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({ results, onOpenFullTour }) => {
  const [spends, setSpends] = useState<Record<string, number>>({});
  const [scenario, setScenario] = useState<ScenarioDefinition | null>(null);
  const [history, setHistory] = useState<ScenarioDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const historicalSpends = () => Object.fromEntries(
    (results?.channels || []).map(channel => [channel.channelName, finite(channel.spend) ? channel.spend : Number.NaN])
  );

  useEffect(() => {
    if (!results) return;
    setSpends(historicalSpends());
    setScenario(null);
    setHistory([]);
    setError(null);
  }, [results?.modelId]);

  const runSimulation = async () => {
    if (!results) return;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.simulateScenario(spends);
      if (sequence === requestSequence.current) {
        setScenario(response);
        setHistory(previous => previous.some(item => item.id === response.id) ? previous : [...previous, response]);
      }
    } catch (reason: any) {
      if (sequence === requestSequence.current) {
        setScenario(null);
        setError(reason?.message || 'O posterior do Meridian não concluiu a simulação.');
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };

  if (!results) {
    return <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto my-12"><Compass className="w-12 h-12 text-slate-400 mx-auto mb-3" /><h3 className="text-lg font-bold">Modelo não disponível</h3><p className="text-xs text-slate-500 mt-1">Execute o modelo para habilitar cenários posteriores.</p></div>;
  }

  const comparison = results.channels.map(channel => ({
    name: channel.channelName,
    Histórico: channel.spend,
    Cenário: spends[channel.channelName]
  })).filter(item => finite(item.Histórico) && finite(item.Cenário));

  return (
    <div id="whatif-simulator-view" className="p-3.5 sm:p-5 md:p-6 space-y-5 max-w-7xl w-full mx-auto min-w-0">
      <StepGuidanceBanner
        id="whatif-simulator"
        stepNumber="7"
        title="What-If científico"
        subtitle={`Cada cenário é calculado pelo posterior real identificado por ${results.modelId}.`}
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '🔗', text: 'O navegador envia apenas os spends e o servidor usa o modelId ativo.' },
          { icon: '📐', text: 'Não existe regra proporcional local para estimar o KPI.' },
          { icon: '🧾', text: 'Cenários diferentes ficam listados para comparação auditável.' }
        ]}
      />

      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-3"><div><h1 className="text-base font-bold">Investimento por canal</h1><p className="text-xs text-slate-500">Altere os valores e execute explicitamente o cenário.</p></div><button onClick={() => { setSpends(historicalSpends()); setScenario(null); setError(null); }} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Redefinir</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.channels.map(channel => <label key={channel.channelName} className="text-xs font-semibold text-slate-600 dark:text-slate-300">{channel.channelName}<input type="number" min="0" step="100" value={spends[channel.channelName] ?? ''} onChange={event => setSpends(current => ({ ...current, [channel.channelName]: Number(event.target.value) }))} className="mt-1 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" /><span className="font-normal text-slate-400">Histórico: {money(channel.spend)}</span></label>)}
        </div>
        <button disabled={loading || Object.values(spends).some(value => !finite(value) || value < 0)} onClick={() => void runSimulation()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5">{loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Calcular cenário pelo Meridian</button>
        {error && <div role="alert" className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      </div>

      {scenario && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Spend total', money(scenario.totalSpend)],
          ['KPI esperado', outcome(scenario.expectedKpi, results.kpiType)],
          ['Limite inferior', outcome(scenario.expectedKpiLower, results.kpiType)],
          ['Limite superior', outcome(scenario.expectedKpiUpper, results.kpiType)],
          ['KPI incremental', outcome(scenario.incrementalKpi, results.kpiType)],
          ['ROI blended', roiMetric(scenario.blendedRoi, results.kpiType)]
        ].map(([label, value]) => <div key={label} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><div className="text-[10px] uppercase font-semibold text-slate-500">{label}</div><div className="text-base font-bold mt-1 break-words">{value}</div></div>)}
      </div>}

      {comparison.length > 0 && <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={value => money(Number(value))} /><Tooltip formatter={value => money(Number(value))} /><Legend /><Bar dataKey="Histórico" fill="#94a3b8" /><Bar dataKey="Cenário" fill="#2563eb" /></BarChart></ResponsiveContainer></div>}

      {history.length > 0 && <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"><div className="p-4 font-bold text-sm">Cenários calculados nesta sessão</div><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3 text-left">ID</th><th className="p-3 text-left">Spend</th><th className="p-3 text-left">KPI esperado</th><th className="p-3 text-left">Incremental</th></tr></thead><tbody>{history.map(item => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-mono">{item.id}</td><td className="p-3">{money(item.totalSpend)}</td><td className="p-3">{outcome(item.expectedKpi, results.kpiType)}</td><td className="p-3">{outcome(item.incrementalKpi, results.kpiType)}</td></tr>)}</tbody></table></div></div>}
      <FloatingPrintButton />
    </div>
  );
};
