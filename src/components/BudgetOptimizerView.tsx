import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart,
  CheckCircle2,
  RefreshCw,
  Info,
  HelpCircle,
  Sliders,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Filter,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { BudgetOptimizationResult, MeridianModelResults, BudgetReallocation } from '../types/mmm';
import { apiClient } from '../services/apiClient';
import { InfoTooltip, StepGuidanceBanner } from './ContextualGuide';
import { TechnicalDetails } from './ui/TechnicalDetails';
import { ConfidenceBadge } from './ui/ConfidenceBadge';
import { MetricCard } from './ui/MetricCard';
import { ThresholdMeter, ThresholdAlertBanner } from './ui/ThresholdIndicator';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';

interface BudgetOptimizerViewProps {
  results: MeridianModelResults | null;
  onNavigateToSimulator: () => void;
  onOpenFullTour?: () => void;
}

export const BudgetOptimizerView: React.FC<BudgetOptimizerViewProps> = ({
  results,
  onNavigateToSimulator,
  onOpenFullTour
}) => {
  const [targetBudget, setTargetBudget] = useState<number>(results?.totalSpend || 500000);
  const [constraints, setConstraints] = useState<Record<string, { minSpend?: number; maxSpend?: number }>>({});
  const [isSafetyClampActive, setIsSafetyClampActive] = useState<boolean>(false);
  const [channelFilter, setChannelFilter] = useState<'all' | 'exceeded' | 'safe'>('all');
  const [optResult, setOptResult] = useState<BudgetOptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('Se eu tenho mais R$ 10.000 para investir, onde devo colocar e por quê?');

  const runOptimization = async (budget: number, activeConstraints = constraints) => {
    if (!results) return;
    setIsLoading(true);
    try {
      const res = await apiClient.optimizeBudget(budget, activeConstraints);
      setOptResult(res);

      // Trigger AI Explanation
      setIsExplaining(true);
      const exp = await apiClient.getBudgetExplanation(res, customQuestion);
      setAiExplanation(exp);
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setIsLoading(false);
      setIsExplaining(false);
    }
  };

  useEffect(() => {
    if (results) {
      setTargetBudget(results.totalSpend);
      runOptimization(results.totalSpend, constraints);
    }
  }, [results]);

  const handlePreset = (multiplier: number) => {
    if (!results) return;
    const newBudget = Math.round(results.totalSpend * multiplier);
    setTargetBudget(newBudget);
    runOptimization(newBudget, constraints);
  };

  // Handler to automatically apply safe threshold constraints (clamping channel spend to ±safeThreshold%)
  const handleApplySafetyClamp = () => {
    if (!results) return;

    if (isSafetyClampActive) {
      // Toggle off: remove constraints
      setConstraints({});
      setIsSafetyClampActive(false);
      runOptimization(targetBudget, {});
    } else {
      // Toggle on: set safe constraints for each channel
      const safeConstraints: Record<string, { minSpend?: number; maxSpend?: number }> = {};
      
      results.channels.forEach(ch => {
        const safePct = ch.confidence === 'Alta' ? 0.35 : ch.confidence === 'Média' ? 0.25 : 0.15;
        safeConstraints[ch.channelName] = {
          minSpend: Math.round(ch.spend * (1 - safePct)),
          maxSpend: Math.round(ch.spend * (1 + safePct))
        };
      });

      setConstraints(safeConstraints);
      setIsSafetyClampActive(true);
      runOptimization(targetBudget, safeConstraints);
    }
  };

  const handleAskQuestion = async () => {
    if (!optResult) return;
    setIsExplaining(true);
    try {
      const exp = await apiClient.getBudgetExplanation(optResult, customQuestion);
      setAiExplanation(exp);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExplaining(false);
    }
  };

  if (!results) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12">
        <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Modelo não disponível</h3>
        <p className="text-xs text-slate-500 mt-1">Execute o modelo Meridian para habilitar o otimizador de orçamento.</p>
      </div>
    );
  }

  // Calculate threshold warning channels
  const allReallocations = optResult?.reallocations || [];
  const exceededChannels = allReallocations.filter(
    r => r.thresholdRiskLevel === 'high' || r.exceedsThreshold || Math.abs(r.percentageChange || 0) > (r.safeThresholdPercentage || 25)
  );
  const safeChannels = allReallocations.filter(
    r => !(r.thresholdRiskLevel === 'high' || r.exceedsThreshold || Math.abs(r.percentageChange || 0) > (r.safeThresholdPercentage || 25))
  );

  const filteredReallocations =
    channelFilter === 'exceeded'
      ? exceededChannels
      : channelFilter === 'safe'
      ? safeChannels
      : allReallocations;

  const chartData = allReallocations.map(r => ({
    name: r.channelName,
    'Atual (R$)': r.currentSpend,
    'Recomendado (R$)': r.recommendedSpend,
    'Variação (R$)': r.deltaSpend
  }));

  return (
    <div id="budget-optimizer-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Otimizador de Orçamento de Mídia por Equimarginalidade: Maximização de Receita e Realocação Causal no Marketing Mix Modeling
      </h1>

      {/* Contextual Step Guidance Banner */}
      <StepGuidanceBanner
        id="budget-optimizer"
        stepNumber="6"
        title="Etapa 6: Otimizador de Orçamento & Realocação Eficiente"
        subtitle="Descubra a distribuição ideal da sua verba para extrair o maior retorno total em vendas."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '💡', text: 'Mesmo Orçamento, Mais Vendas: Apenas redistribuindo verba entre canais, o retorno total cresce.' },
          { icon: '⚖️', text: 'Redução de Desperdício: O sistema retira verba de canais saturados e direciona para canais com espaço para crescer.' },
          { icon: '🎯', text: 'Margem de Segurança: Todas as projeções consideram a incerteza e indicam canais com risco de extrapolação.' }
        ]}
        proTip="Use os botões de atalho (+10%, +20%, -10%) para simular expansões ou cortes de orçamento com 1 clique."
      />

      {/* 1. Core Lift Banner ("O que aconteceria se você mudasse seu orçamento?") */}
      {optResult && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-md space-y-4 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-emerald-400/30 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Distribuição Recomendada pelo Modelo
                </span>
                <ConfidenceBadge level="high" />
                {isSafetyClampActive && (
                  <span className="bg-blue-500/30 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/40 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-300" />
                    Trava de Segurança Ativa (±Margem Segura)
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
                Ganho Potencial Estimado: +{optResult.overallLiftPercentage}% em Vendas ({optResult.totalIncrementalKpi >= 0 ? '+' : ''}R$ {(optResult.totalIncrementalKpi / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k)
              </h2>

              <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
                Ao reequilibrar seus investimentos — diminuindo gastos em mídias que já atingiram o teto de saturação e aumentando em canais com maior potencial — você gera mais receita com a mesma verba.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3.5 sm:p-4 rounded-xl border border-white/10 text-center shrink-0 min-w-[140px] sm:min-w-48">
              <span className="text-[10px] uppercase font-semibold text-slate-300 block">Novo Retorno Estimado (ROI)</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-0.5 font-mono">
                {optResult.blendedProjectedRoi.toFixed(2)}x
              </div>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                vs {optResult.blendedCurrentRoi.toFixed(2)}x atual ({optResult.blendedProjectedRoi >= optResult.blendedCurrentRoi ? '+' : ''}{(((optResult.blendedProjectedRoi - optResult.blendedCurrentRoi) / optResult.blendedCurrentRoi) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Visual Threshold Alert Banner when proposed reallocations exceed recommended error margins */}
      {optResult && (
        <ThresholdAlertBanner
          exceededChannels={exceededChannels}
          onApplySafetyClamp={handleApplySafetyClamp}
        />
      )}

      {/* 3. Budget Controls: Input + Presets + Safety Clamp Toggle */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Defina o Orçamento Total para Otimizar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Escolha quanto deseja investir no total e veja a melhor divisão recomendada com limites de segurança.
            </p>
          </div>

          {/* Quick Presets & Safety Clamp */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-toggle-safety-clamp"
              onClick={handleApplySafetyClamp}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 shadow-xs ${
                isSafetyClampActive
                  ? 'bg-blue-600 border-blue-700 text-white shadow-blue-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Limita as sugestões de cada canal para que não excedam a margem de erro histórica (±15% a ±35%)"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isSafetyClampActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{isSafetyClampActive ? 'Margem Segura Ativada' : 'Ativar Trava Segura'}</span>
            </button>

            <span className="text-xs text-slate-400 dark:text-slate-600 hidden sm:inline">|</span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePreset(1.0)}
                className="px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition"
              >
                100%
              </button>
              <button
                onClick={() => handlePreset(1.1)}
                className="px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 transition"
              >
                +10%
              </button>
              <button
                onClick={() => handlePreset(1.2)}
                className="px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 transition"
              >
                +20%
              </button>
              <button
                onClick={() => handlePreset(0.85)}
                className="px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 transition"
              >
                -15%
              </button>
            </div>
          </div>
        </div>

        {/* Input & Slider */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-center pt-2">
          <div className="md:col-span-2 space-y-2 min-w-0">
            <div className="flex justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>R$ {((results.totalSpend * 0.5) / 1000).toFixed(0)}k (-50%)</span>
              <span className="font-bold text-slate-900 dark:text-white">
                R$ {(targetBudget / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k selecionado
              </span>
              <span>R$ {((results.totalSpend * 2.0) / 1000).toFixed(0)}k (+100%)</span>
            </div>
            <input
              type="range"
              min={Math.round(results.totalSpend * 0.5)}
              max={Math.round(results.totalSpend * 2.0)}
              step={5000}
              value={targetBudget}
              onChange={e => setTargetBudget(Number(e.target.value))}
              onMouseUp={() => runOptimization(targetBudget, constraints)}
              onTouchEnd={() => runOptimization(targetBudget, constraints)}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">R$</span>
              <input
                type="number"
                value={targetBudget}
                onChange={e => setTargetBudget(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 text-xs font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => runOptimization(targetBudget, constraints)}
              disabled={isLoading}
              className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs shrink-0 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Calculando...' : 'Recalcular'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Reallocation Side-by-Side Comparison Table with Visual Threshold Indicators */}
      {optResult && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors space-y-0">
          {/* Table Header with Filter Tabs */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>Distribuição Recomendada & Margem de Segurança por Canal</span>
                <InfoTooltip
                  title="Margem de Erro & Extrapolação"
                  content="Modelos estatísticos têm maior precisão na vizinhança dos gastos históricos. Variações muito drásticas (fora da faixa segura) possuem margem de erro ampliada devido à incerteza dos parâmetros Bayesianos."
                />
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Acompanhe o ajuste sugerido, os limites recomendados e os indicadores de risco de cada mídia.
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  channelFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({allReallocations.length})
              </button>

              <button
                type="button"
                onClick={() => setChannelFilter('exceeded')}
                className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  channelFilter === 'exceeded'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Excedem Margem ({exceededChannels.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setChannelFilter('safe')}
                className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  channelFilter === 'safe'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Na Margem ({safeChannels.length})</span>
              </button>
            </div>
          </div>

          <ScrollableTableWrapper minWidth="880px" hintText="Arraste para ver todas as colunas de realocação">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Canal de Mídia</th>
                  <th className="p-3">Investimento Atual</th>
                  <th className="p-3">Divisão (%)</th>
                  <th className="p-3">Investimento Recomendado</th>
                  <th className="p-3">Nova Divisão (%)</th>
                  <th className="p-3">Ajuste Sugerido</th>
                  <th className="p-3 min-w-[210px]">
                    <div className="flex items-center gap-1">
                      <span>Margem de Segurança & Limite</span>
                      <InfoTooltip
                        title="Indicador Visual de Margem de Erro"
                        content="A barra verde representa a faixa de variação segura recomendada pelo modelo com base na densidade de dados e intervalos de credibilidade. O marcador indica a posição da proposta."
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReallocations.map(r => {
                  const currentPct = ((r.currentSpend / results.totalSpend) * 100).toFixed(1);
                  const newPct = ((r.recommendedSpend / targetBudget) * 100).toFixed(1);
                  const isIncrease = r.deltaSpend > 0;
                  const isDecrease = r.deltaSpend < 0;
                  const deltaPct = r.percentageChange ?? (r.currentSpend > 0 ? (r.deltaSpend / r.currentSpend) * 100 : 0);
                  const safePct = r.safeThresholdPercentage ?? 25;
                  const isExceeded = Math.abs(deltaPct) > safePct;

                  return (
                    <tr
                      key={r.channelName}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isExceeded ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {r.channelName}
                          {isExceeded && (
                            <span title="Este canal ultrapassa a margem de segurança recomendada">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          mROI: {r.marginalRoi.toFixed(2)}x
                        </div>
                      </td>

                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        R$ {r.currentSpend.toLocaleString('pt-BR')}
                      </td>

                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                        {currentPct}%
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        R$ {r.recommendedSpend.toLocaleString('pt-BR')}
                      </td>

                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {newPct}%
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-md font-mono ${
                            isIncrease
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isDecrease
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isIncrease ? <ArrowUpRight className="w-3.5 h-3.5" /> : isDecrease ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                          {isIncrease ? '+' : ''}R$ {Math.abs(r.deltaSpend).toLocaleString('pt-BR')} ({deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Visual Threshold Indicator Column */}
                      <td className="p-3">
                        <ThresholdMeter
                          reallocation={r}
                          showDetails={false}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollableTableWrapper>
        </div>
      )}

      {/* 5. Visual Comparison Chart */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Como seu orçamento poderia ser distribuído? (Atual vs Recomendado)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo gráfico de volume financeiro por canal
          </span>
        </div>

        <div className="h-64 sm:h-72 md:h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-15}
                textAnchor="end"
                interval={0}
                height={35}
              />
              <YAxis
                tickFormatter={val => `R$ ${(val / 1000).toFixed(0)}k`}
                width={42}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip
                formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`]}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', maxWidth: '90vw' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Atual (R$)" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Recomendado (R$)" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Strategic AI Explanation */}
      {aiExplanation && (
        <div className="p-5 bg-gradient-to-br from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/40 dark:to-blue-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
              Análise Estratégica da Redistribuição & Limites de Risco
            </h4>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {aiExplanation}
          </p>
        </div>
      )}

      {/* 7. Progressive Disclosure: Metodologia de Equimarginalidade e Margens de Erro */}
      <TechnicalDetails
        id="budget-technical-details"
        title="Fundamentação Econométrica do Otimizador & Controle de Incerteza"
        summary="Acesse detalhes sobre como o algoritmo equilibra os retornos marginais (mROI) e como as margens de segurança previnem extrapolações perigosas."
        badge="Teoria Microeconômica"
      >
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 pt-1">
          <p>
            O algoritmo de alocação de verba do Google Meridian busca o ponto em que a última unidade monetária investida em cada canal gere exatamente o mesmo retorno adicional:
          </p>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold text-blue-600 dark:text-blue-400">
            mROI(Canal 1) = mROI(Canal 2) = ... = mROI(Canal N)
          </div>
          <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <p>
              <strong>Por que existem margens de erro nas alocações?</strong> O modelo Meridian é ajustado a partir dos dados históricos reais de investimento. Quando a alocação proposta exige um salto de investimento muito superior ou inferior ao observado (ex: +60%), o cálculo entra em zona de extrapolação matemática da curva de Hill, aumentando a dispersão das distribuições posteriores.
            </p>
            <p>
              *Nota de transparência: As projeções são estimativas estatísticas baseadas no histórico observado e não constituem garantia absoluta de faturamento futuro.
            </p>
          </div>
        </div>
      </TechnicalDetails>
    </div>
  );
};
