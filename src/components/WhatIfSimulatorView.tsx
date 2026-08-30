import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Sliders,
  TrendingUp,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  DollarSign,
  ArrowRight,
  Info,
  Filter,
  Layers,
  Search,
  X,
  ChevronDown,
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
import { MeridianModelResults, ScenarioDefinition } from '../types/mmm';
import { apiClient } from '../services/apiClient';
import { StepGuidanceBanner, InfoTooltip } from './ContextualGuide';
import { ConfidenceBadge } from './ui/ConfidenceBadge';
import { MetricCard } from './ui/MetricCard';
import { TechnicalDetails } from './ui/TechnicalDetails';
import { FloatingPrintButton } from './ui/FloatingPrintButton';

interface WhatIfSimulatorViewProps {
  results: MeridianModelResults | null;
  onOpenFullTour?: () => void;
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({ results, onOpenFullTour }) => {
  const [spends, setSpends] = useState<Record<string, number>>({});
  const [currentScenario, setCurrentScenario] = useState<ScenarioDefinition | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [channelSearchTerm, setChannelSearchTerm] = useState<string>('');

  // Initialize sliders and default selected channels with current model values
  useEffect(() => {
    if (results) {
      const initialSpends: Record<string, number> = {};
      results.channels.forEach(c => {
        initialSpends[c.channelName] = c.spend;
      });
      setSpends(initialSpends);
      // Select all channels by default
      setSelectedChannels(results.channels.map(c => c.channelName));
      runSimulation(initialSpends);
    }
  }, [results]);

  const runSimulation = async (channelSpends: Record<string, number>) => {
    if (!results) return;
    setIsSimulating(true);
    try {
      const sim = await apiClient.simulateScenario(channelSpends);
      setCurrentScenario(sim);
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSliderChange = (channelName: string, value: number) => {
    const updated = { ...spends, [channelName]: value };
    setSpends(updated);
    runSimulation(updated);
  };

  const handleResetToCurrent = () => {
    if (!results) return;
    const initial: Record<string, number> = {};
    results.channels.forEach(c => {
      initial[c.channelName] = c.spend;
    });
    setSpends(initial);
    setSelectedChannels(results.channels.map(c => c.channelName));
    runSimulation(initial);
  };

  const handleApplyQuickScenario = (channelName: string, pctChange: number) => {
    if (!results) return;
    const currentVal = results.channels.find(c => c.channelName === channelName)?.spend || 0;
    const updated = { ...spends, [channelName]: Math.max(0, Math.round(currentVal * (1 + pctChange / 100))) };
    setSpends(updated);
    runSimulation(updated);
  };

  // Channels loaded directly from the active spreadsheet / model
  const spreadsheetChannels = useMemo(() => {
    if (!results) return [];
    return results.channels;
  }, [results]);

  const allSelected = useMemo(() => {
    if (!results || results.channels.length === 0) return false;
    return selectedChannels.length === results.channels.length;
  }, [results, selectedChannels]);

  const toggleSelectAll = () => {
    if (!results) return;
    if (allSelected) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(results.channels.map(c => c.channelName));
    }
  };

  const toggleChannel = (channelName: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelName)
        ? prev.filter(c => c !== channelName)
        : [...prev, channelName]
    );
  };

  // Filtered channel list based on multi-selection and optional search
  const displayedChannels = useMemo(() => {
    if (!results) return [];
    return results.channels.filter(ch => {
      const isIncludedInSelection = selectedChannels.includes(ch.channelName);
      const matchesSearch = channelSearchTerm.trim() === '' ||
        ch.channelName.toLowerCase().includes(channelSearchTerm.toLowerCase());
      return isIncludedInSelection && matchesSearch;
    });
  }, [results, selectedChannels, channelSearchTerm]);

  if (!results) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12">
        <Compass className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Modelo não disponível</h3>
        <p className="text-xs text-slate-500 mt-1">Execute o modelo para habilitar o simulador interativo.</p>
      </div>
    );
  }

  const totalCurrentSpend = results.totalSpend || 1;
  const simulatedTotalSpend = (Object.values(spends) as number[]).reduce((acc, val) => acc + (Number(val) || 0), 0);
  const spendDelta = simulatedTotalSpend - totalCurrentSpend;
  const spendDeltaPct = totalCurrentSpend > 0 ? ((spendDelta / totalCurrentSpend) * 100).toFixed(1) : '0.0';

  const kpiLift = currentScenario?.liftOverBaseline || 0;
  const kpiLiftPct = currentScenario?.liftPercentage || '0.0';

  // Comparison Bar Chart data
  const comparisonData = results.channels.map(c => ({
    name: c.channelName,
    'Atual (R$)': c.spend,
    'Simulado (R$)': spends[c.channelName] || 0
  }));

  return (
    <div id="whatif-simulator-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Simulador de Cenários What-If de Marketing: Projeção de Receita Incremental e ROI com Incerteza Bayesiana
      </h1>

      {/* Step Guidance Banner */}
      <StepGuidanceBanner
        id="whatif-simulator"
        stepNumber="7"
        title="Etapa 7: Simulador Interativo de Cenários ('E se...?')"
        subtitle="Mova os controles de investimento de cada canal para testar hipóteses e prever o impacto nas vendas."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '🎛️', text: 'Simulação Livre: Aumente ou diminua canais individuais para ver o impacto instantâneo.' },
          { icon: '📉', text: 'Retorno Marginal: Perceba quando um aumento de +20% em verba traz apenas +8% em vendas (retornos decrescentes).' },
          { icon: '🔄', text: 'Reset Rápido: Volte para o cenário histórico a qualquer momento com o botão de redefinir.' }
        ]}
        proTip="Use os botões de simulação rápida abaixo para testar hipóteses comuns em reuniões executivas."
      />

      {/* Top Banner with Real-Time KPIs */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              O que acontece se você mudar seu investimento?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simule variações de verba e veja o faturamento estimado recalculado instantaneamente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToCurrent}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Redefinir para Histórico
            </button>
          </div>
        </div>

        {/* Real-Time Outcome Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <MetricCard
            title="Investimento Simulado"
            tooltipTitle="Investimento Total no Cenário Simulado"
            tooltipText="Soma dos orçamentos hipotéticos alocados em todos os canais de mídia para testar variações de mix de marketing."
            value={`R$ ${(simulatedTotalSpend / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`}
            subtitle={`vs R$ ${(totalCurrentSpend / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k atual`}
            trend={{
              value: `${Number(spendDeltaPct) >= 0 ? '+' : ''}${spendDeltaPct}%`,
              isPositive: Number(spendDeltaPct) >= 0
            }}
          />

          <MetricCard
            title="Faturamento Projetado"
            tooltipTitle="Projeção Estimada de Faturamento Total"
            tooltipText="Receita bruta total prevista combinando a demanda orgânica de base e o lift incremental calculado a partir das curvas de saturação (Hill) e carryover (Adstock)."
            value={`R$ ${((currentScenario?.projectedTotalKpi || results.totalKpi) / 1000000).toFixed(2)}M`}
            subtitle="Estimativa do modelo"
            trend={{
              value: `${Number(kpiLiftPct) >= 0 ? '+' : ''}${kpiLiftPct}%`,
              isPositive: Number(kpiLiftPct) >= 0
            }}
            highlight
          />

          <MetricCard
            title="Ganho Líquido Projetado"
            tooltipTitle="Ganho Incremental de Vendas (Lift)"
            tooltipText="Volume de receita adicional estimado em comparação com o cenário real histórico atual."
            value={`${kpiLift >= 0 ? '+' : ''}R$ ${(kpiLift / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`}
            subtitle="Vendas incrementais adicionais"
            icon={TrendingUp}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 dark:bg-emerald-950/60"
          />

          <MetricCard
            title="ROI Projetado do Cenário"
            tooltipTitle="Retorno sobre Investimento Projetado (Blended ROI)"
            tooltipText="Razão entre o faturamento incremental gerado por toda a publicidade e o investimento total alocado no cenário (ex: 2.50x significa R$ 2,50 de receita por R$ 1,00 investido)."
            value={`${(currentScenario?.projectedRoi || results.blendedRoi || 0).toFixed(2)}x`}
            subtitle={`vs ${(results.blendedRoi || 0).toFixed(2)}x atual`}
            icon={CheckCircle2}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-50 dark:bg-blue-950/60"
          />
        </div>

        {/* Diminishing Returns Explanation Banner */}
        {Number(spendDeltaPct) > 10 && Number(kpiLiftPct) < Number(spendDeltaPct) * 0.6 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Retornos Decrescentes Identificados:</strong> Apesar do aumento de <strong>{spendDeltaPct}%</strong> no investimento, o resultado estimado cresce apenas <strong>{kpiLiftPct}%</strong>. Isso indica que alguns canais aumentados estão operando próximos do ponto de saturação.
            </p>
          </div>
        )}
      </div>

      {/* Barra de Seleção de Canais da Planilha (Dropdown com Seleção Múltipla) */}
      <div className="relative z-20">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Canais da Planilha
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedChannels.length === spreadsheetChannels.length
                  ? `Todos os ${spreadsheetChannels.length} canais selecionados`
                  : selectedChannels.length === 0
                  ? 'Nenhum canal selecionado'
                  : `${selectedChannels.length} de ${spreadsheetChannels.length} canais selecionados`}
              </span>
            </div>
          </div>

          {/* Interactive Multi-Select Dropdown Trigger */}
          <div className="relative w-full sm:w-80">
            <button
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">
                  {allSelected
                    ? 'Todos os Canais (Selecionados)'
                    : selectedChannels.length === 0
                    ? 'Selecione canais...'
                    : selectedChannels.length === 1
                    ? selectedChannels[0]
                    : `${selectedChannels.length} canais ativos`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {selectedChannels.length}/{spreadsheetChannels.length}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown Menu Overlay */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-full sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  {/* Search inside dropdown */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar canal..."
                      value={channelSearchTerm}
                      onChange={e => setChannelSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    {channelSearchTerm && (
                      <button
                        onClick={() => setChannelSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Actions: Select All / Deselect All */}
                  <div className="flex items-center justify-between px-1 py-1 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                    <button
                      onClick={toggleSelectAll}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                    <span className="text-slate-400 font-medium">
                      {selectedChannels.length} selecionados
                    </span>
                  </div>

                  {/* Scrollable list of channels */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {spreadsheetChannels
                      .filter(ch =>
                        channelSearchTerm.trim() === '' ||
                        ch.channelName.toLowerCase().includes(channelSearchTerm.toLowerCase())
                      )
                      .map(ch => {
                        const isChecked = selectedChannels.includes(ch.channelName);
                        return (
                          <button
                            key={ch.channelName}
                            onClick={() => toggleChannel(ch.channelName)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition text-left ${
                              isChecked
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-semibold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{ch.channelName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              R$ {(ch.spend / 1000).toFixed(0)}k
                            </span>
                          </button>
                        );
                      })}
                  </div>

                  {/* Footer with done button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => setIsDropdownOpen(false)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
                    >
                      Concluído
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Questions / Premade Scenarios */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          Testar Hipóteses Rápidas da Planilha:
        </span>
        {results.channels.slice(0, 3).map(ch => (
          <button
            key={`up-${ch.channelName}`}
            onClick={() => handleApplyQuickScenario(ch.channelName, 20)}
            className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition"
          >
            +20% em {ch.channelName}
          </button>
        ))}
        {results.channels.slice(0, 2).map(ch => (
          <button
            key={`down-${ch.channelName}`}
            onClick={() => handleApplyQuickScenario(ch.channelName, -15)}
            className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition"
          >
            -15% em {ch.channelName}
          </button>
        ))}
      </div>

      {/* Channel Sliders & Precise Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Ajuste de Investimento por Canal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exibindo {displayedChannels.length} de {results.channels.length} canais mapeados
            </p>
          </div>

          {!allSelected && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              Exibir todos os {results.channels.length} canais
            </button>
          )}
        </div>

        <div className="space-y-4">
          {displayedChannels.length > 0 ? (
            displayedChannels.map(ch => {
              const currentVal = spends[ch.channelName] ?? ch.spend;
              const originalVal = ch.spend;
              const channelDelta = currentVal - originalVal;
              const channelDeltaPct = originalVal > 0 ? ((channelDelta / originalVal) * 100).toFixed(0) : '0';

              return (
                <div
                  key={ch.channelName}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center">
                        <span>{ch.channelName}</span>
                        <InfoTooltip
                          title={`Desempenho: ${ch.channelName}`}
                          content={`Investimento histórico observado: R$ ${ch.spend.toLocaleString('pt-BR')} gerando ROI de ${(ch.roi || 0).toFixed(2)}x e mROI de ${(ch.marginalRoi || 0).toFixed(2)}x. Ajustar o controle recalcula o faturamento projetado considerando a saturação (Hill).`}
                          size="sm"
                        />
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-mono">
                        Histórico: R$ {originalVal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        ROI: {(ch.roi || 0).toFixed(2)}x
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick percentage adjustment buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApplyQuickScenario(ch.channelName, -20)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 transition"
                          title="Reduzir 20%"
                        >
                          -20%
                        </button>
                        <button
                          onClick={() => handleApplyQuickScenario(ch.channelName, -10)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 transition"
                          title="Reduzir 10%"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() => handleApplyQuickScenario(ch.channelName, 10)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 transition"
                          title="Aumentar 10%"
                        >
                          +10%
                        </button>
                        <button
                          onClick={() => handleApplyQuickScenario(ch.channelName, 20)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 transition"
                          title="Aumentar 20%"
                        >
                          +20%
                        </button>
                      </div>

                      {/* Spend Currency Input */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600">
                        <span className="text-[11px] text-slate-400 font-bold">R$</span>
                        <input
                          type="number"
                          value={Math.round(currentVal)}
                          onChange={e => handleSliderChange(ch.channelName, Math.max(0, Number(e.target.value) || 0))}
                          className="w-24 bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden text-right"
                          step={500}
                          min={0}
                        />
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded font-mono ${
                          Number(channelDeltaPct) > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : Number(channelDeltaPct) < 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {Number(channelDeltaPct) > 0 ? '+' : ''}{channelDeltaPct}%
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(10000, Math.round(originalVal * 2.5))}
                    step={500}
                    value={currentVal}
                    onChange={e => handleSliderChange(ch.channelName, Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <button
                      onClick={() => handleSliderChange(ch.channelName, 0)}
                      className="hover:text-rose-500 transition"
                    >
                      R$ 0 (Pausar canal)
                    </button>
                    <button
                      onClick={() => handleSliderChange(ch.channelName, originalVal)}
                      className="hover:text-blue-500 font-semibold transition"
                    >
                      R$ {(originalVal / 1000).toFixed(0)}k (Histórico)
                    </button>
                    <button
                      onClick={() => handleSliderChange(ch.channelName, Math.round(originalVal * 2))}
                      className="hover:text-emerald-500 transition"
                    >
                      R$ {((originalVal * 2) / 1000).toFixed(0)}k (Dobrar verba)
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhum canal selecionado ou correspondente ao filtro.
              </p>
              <button
                onClick={() => {
                  setChannelSearchTerm('');
                  if (results) setSelectedChannels(results.channels.map(c => c.channelName));
                }}
                className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
              >
                Selecionar todos os canais
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Comparativo de Investimento: Histórico vs Cenário Simulado
        </h3>

        <div className="h-64 sm:h-72 md:h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
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
              <Bar dataKey="Simulado (R$)" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Floating Print / PDF Action Button */}
      <FloatingPrintButton />
    </div>
  );
};

