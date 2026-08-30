import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  TrendingUp,
  Sliders,
  Award,
  AlertCircle,
  Clock,
  Zap,
  Info,
  ChevronRight,
  Sparkles,
  Filter,
  CheckSquare,
  Square,
  BarChart3,
  Activity,
  Layers,
  Check,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Percent,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { ChannelMetrics, MeridianModelResults, DateRangeFilter } from '../types/mmm';
import { InfoTooltip } from './ContextualGuide';
import { GlobalDateRangeFilter, formatDateBR } from './GlobalDateRangeFilter';
import { FloatingPrintButton } from './ui/FloatingPrintButton';

interface ChannelPerformanceViewProps {
  results: MeridianModelResults | null;
  onNavigateToOptimizer: () => void;
  availableDates?: string[];
  dateRange?: DateRangeFilter;
  onChangeDateRange?: (newRange: DateRangeFilter) => void;
}

const PALETTE = [
  '#2563eb', // Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#6366f1'  // Indigo
];

type TrendMetricMode = 'revenue' | 'growth' | 'incremental';
type TrendGranularityMode = 'weekly' | 'ma4' | 'monthly';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Ótimo':
      return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'Subinvestido':
      return 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'Próximo à Saturação':
      return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    default:
      return 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
  }
};

// ----------------------------------------------------
// Memoized Subcomponent: Historical Trend Section
// ----------------------------------------------------
interface HistoricalTrendSectionProps {
  trendData: Array<any>;
  trendStats: {
    totalSpend: number;
    totalRevenue: number;
    avgWeeklySpend: number;
    avgWeeklyRevenue: number;
    pearsonR: number;
    overallGrowth: number;
    blendedRoas: number;
  };
  trendMetric: TrendMetricMode;
  trendGranularity: TrendGranularityMode;
  showOrganicBaseline: boolean;
  filteredChannelsCount: number;
  onSetTrendMetric: (m: TrendMetricMode) => void;
  onSetTrendGranularity: (g: TrendGranularityMode) => void;
  onToggleOrganicBaseline: () => void;
}

const HistoricalTrendSection = memo<HistoricalTrendSectionProps>(({
  trendData,
  trendStats,
  trendMetric,
  trendGranularity,
  showOrganicBaseline,
  filteredChannelsCount,
  onSetTrendMetric,
  onSetTrendGranularity,
  onToggleOrganicBaseline
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Tendência Histórica: Investimento em Mídia vs. Crescimento de Receita
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Eixo Duplo
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Análise longitudinal sincronizada entre o investimento em mídia paga (eixo esquerdo) e o faturamento / crescimento (eixo direito).
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => onSetTrendMetric('revenue')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                trendMetric === 'revenue'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Receita Total (R$)
            </button>
            <button
              onClick={() => onSetTrendMetric('growth')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                trendMetric === 'growth'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Crescimento (%)
            </button>
            <button
              onClick={() => onSetTrendMetric('incremental')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                trendMetric === 'incremental'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Receita Incremental
            </button>
          </div>

          {/* Granularity Selector */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => onSetTrendGranularity('weekly')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                trendGranularity === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => onSetTrendGranularity('ma4')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                trendGranularity === 'ma4'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Média Móvel de 4 Semanas para suavizar sazonalidades pontuais"
            >
              Média Móvel (4s)
            </button>
            <button
              onClick={() => onSetTrendGranularity('monthly')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                trendGranularity === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mensal
            </button>
          </div>

          {/* Scope & Baseline Toggles */}
          {trendMetric === 'revenue' && (
            <button
              onClick={onToggleOrganicBaseline}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                showOrganicBaseline
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              {showOrganicBaseline ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Baseline Orgânico</span>
            </button>
          )}
        </div>
      </div>

      {/* Trend Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-500" />
              <span>Investimento Mídia</span>
            </span>
            <InfoTooltip
              title="Investimento em Mídia (Período)"
              content="Total financeiro investido na soma dos canais de mídia selecionados durante o intervalo temporal ativo no filtro."
            />
          </span>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
            R$ {(trendStats.totalSpend / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Média: R$ {(trendStats.avgWeeklySpend / 1000).toFixed(1)}k/{trendGranularity === 'monthly' ? 'mês' : 'sem'}
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Receita Observada</span>
            </span>
            <InfoTooltip
              title="Receita Total Observada"
              content="Faturamento bruto total registrado no período, composto pela soma das vendas naturais de marca (baseline) e o ganho incremental trazido pelos anúncios."
            />
          </span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            R$ {(trendStats.totalRevenue / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Média: R$ {(trendStats.avgWeeklyRevenue / 1000).toFixed(1)}k/{trendGranularity === 'monthly' ? 'mês' : 'sem'}
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Correlação Mídia (r)</span>
            </span>
            <InfoTooltip
              title="Correlação Linear (Pearson r)"
              content="Mede a sincronia entre os picos de investimento em anúncios e os picos de vendas (+1.0 é sincronia perfeita). Valores acima de 0.7 indicam forte resposta do faturamento ao ritmo das campanhas."
            />
          </span>
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-mono flex items-center gap-1.5">
            {trendStats.pearsonR >= 0 ? `+${trendStats.pearsonR}` : trendStats.pearsonR}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-sans font-medium">
              {trendStats.pearsonR > 0.7 ? 'Forte' : trendStats.pearsonR > 0.4 ? 'Moderada' : 'Fraca'}
            </span>
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Sinergia temporal entre os ciclos
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>Crescimento / ROAS</span>
            </span>
            <InfoTooltip
              title="Crescimento Líquido e ROAS Global"
              content="O ROAS representa a receita total observada por real gasto em publicidade. O percentual indica a variação de vendas entre a primeira e a última semana do período."
            />
          </span>
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono flex items-center gap-1.5">
            {trendStats.overallGrowth > 0 ? `+${trendStats.overallGrowth}%` : `${trendStats.overallGrowth}%`}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-sans font-medium">
              {trendStats.blendedRoas.toFixed(1)}x ROAS
            </span>
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Evolução do início ao fim do período
          </p>
        </div>
      </div>

      {/* Dual-Axis Trend Chart Canvas */}
      <div className="h-64 sm:h-72 md:h-80 w-full min-w-0 pt-2">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <ComposedChart data={trendData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
            <defs>
              <linearGradient id="spendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />

            {/* X Axis */}
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              minTickGap={25}
              tickFormatter={val => (val.length > 10 ? val.substring(5, 10) : val)}
            />

            {/* Left Y Axis (Media Spend) */}
            <YAxis
              yAxisId="spendAxis"
              orientation="left"
              stroke="#3b82f6"
              width={45}
              tick={{ fontSize: 10, fill: '#3b82f6' }}
              tickFormatter={val => `R$ ${(val / 1000).toFixed(0)}k`}
            />

            {/* Right Y Axis (Revenue / Growth) */}
            <YAxis
              yAxisId="revenueAxis"
              orientation="right"
              stroke="#10b981"
              width={45}
              tick={{ fontSize: 10, fill: '#10b981' }}
              tickFormatter={val =>
                trendMetric === 'growth'
                  ? `${val > 0 ? '+' : ''}${val.toFixed(0)}%`
                  : `R$ ${(val / 1000).toFixed(0)}k`
              }
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0]?.payload;
                if (!data) return null;

                return (
                  <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-lg shadow-xl text-xs space-y-2 min-w-[200px] max-w-[calc(100vw-32px)]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {label}
                      </span>
                      {data.roas > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                          ROAS {data.roas.toFixed(2)}x
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                          Investimento em Mídia:
                        </span>
                        <span className="font-mono font-bold text-white">
                          R$ {data.spend.toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          {trendMetric === 'growth'
                            ? 'Crescimento de Receita:'
                            : trendMetric === 'incremental'
                            ? 'Receita Incremental MMM:'
                            : 'Receita Total:'}
                        </span>
                        <span className="font-mono font-bold text-white">
                          {trendMetric === 'growth'
                            ? `${data.growthRate > 0 ? '+' : ''}${data.growthRate}%`
                            : `R$ ${data.revenue.toLocaleString('pt-BR')}`}
                        </span>
                      </div>

                      {trendMetric === 'growth' && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-800">
                          <span>Receita Observada:</span>
                          <span className="font-mono text-slate-200">
                            R$ {data.revenue.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}

                      {trendMetric === 'revenue' && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-800">
                          <span>Baseline Orgânico:</span>
                          <span className="font-mono text-slate-300">
                            R$ {data.baseline.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-indigo-300">
                        <span>Contribuição de Mídia (Lift):</span>
                        <span className="font-mono font-medium">
                          R$ {data.mediaRevenue.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

            {/* Left Axis: Media Spend Area / Line */}
            <Area
              yAxisId="spendAxis"
              type="monotone"
              dataKey="spend"
              name={`Investimento em Mídia (${filteredChannelsCount} canais)`}
              fill="url(#spendAreaGradient)"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />

            {/* Right Axis: Revenue / Growth Line */}
            {trendMetric === 'growth' && (
              <Line
                yAxisId="revenueAxis"
                type="monotone"
                dataKey="growthRate"
                name="Taxa de Crescimento de Receita (%)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            )}

            {trendMetric === 'revenue' && (
              <Line
                yAxisId="revenueAxis"
                type="monotone"
                dataKey="revenue"
                name="Receita Total Observada (R$)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            )}

            {trendMetric === 'incremental' && (
              <Line
                yAxisId="revenueAxis"
                type="monotone"
                dataKey="mediaRevenue"
                name="Receita Incremental de Mídia MMM (R$)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            )}

            {/* Organic Baseline Line */}
            {trendMetric === 'revenue' && showOrganicBaseline && (
              <Line
                yAxisId="revenueAxis"
                type="monotone"
                dataKey="baseline"
                name="Baseline Orgânico (Sem Mídia)"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Insight & Econometric Note */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Interpretação da Dinâmica Temporal:</strong> O gráfico de eixo duplo correlaciona a escala de investimento com a resposta de vendas ao longo do tempo. O efeito de adstock (carryover) explica por que picos de investimento frequentemente sustentam o crescimento de receita por semanas subsequentes, mesmo quando o investimento volta ao patamar basal.
        </p>
      </div>
    </div>
  );
});
HistoricalTrendSection.displayName = 'HistoricalTrendSection';

// ----------------------------------------------------
// Memoized Subcomponent: Overlaid Response Curves
// ----------------------------------------------------
interface OverlaidCurvesSectionProps {
  data: Array<Record<string, any>>;
  channels: ChannelMetrics[];
  channelColorMap: Record<string, string>;
}

const OverlaidResponseCurvesSection = memo<OverlaidCurvesSectionProps>(({
  data,
  channels,
  channelColorMap
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="flex items-center">
              <span>Curvas de Resposta Sobrepostas ({channels.length} Canais)</span>
              <InfoTooltip
                title="Curvas de Resposta de Hill Sobrepostas"
                content="Modela a resposta não-linear de vendas à medida que a verba aumenta. Canais com curvas mais íngremes no início geram mais retorno antes de atingir o teto de saturação."
              />
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparação direta da receita incremental gerada à medida que o investimento escala.
          </p>
        </div>
      </div>

      <div className="h-60 sm:h-64 md:h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <LineChart data={data} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis
              dataKey="pctSpend"
              tick={{ fontSize: 10, fill: '#64748b' }}
              label={{ value: 'Escala de Investimento (% do Orçamento Médio)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
            />
            <YAxis
              tickFormatter={val => `R$ ${(val / 1000).toFixed(0)}k`}
              width={42}
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <Tooltip
              formatter={(val: number, name: string) => {
                const channelClean = name.replace('_revenue', '');
                return [`R$ ${Number(val).toLocaleString('pt-BR')}`, channelClean];
              }}
              labelFormatter={label => `Nível de Investimento: ${label}`}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', maxWidth: '90vw' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            {channels.map(ch => (
              <Line
                key={ch.channelName}
                type="monotone"
                dataKey={`${ch.channelName}_revenue`}
                name={ch.channelName}
                stroke={channelColorMap[ch.channelName] || '#2563eb'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
        Canais com curvas mais íngremes no início geram retornos mais rápidos antes de atingirem a zona de saturação.
      </p>
    </div>
  );
});
OverlaidResponseCurvesSection.displayName = 'OverlaidResponseCurvesSection';

// ----------------------------------------------------
// Memoized Subcomponent: Comparative Metrics Bar Section
// ----------------------------------------------------
interface ComparativeMetricsSectionProps {
  data: Array<{
    name: string;
    roi: number;
    marginalRoi: number;
    saturationLevel: number;
    spendK: number;
    kpiK: number;
    color: string;
  }>;
}

const ComparativeMetricsBarSection = memo<ComparativeMetricsSectionProps>(({ data }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="flex items-center">
              <span>Comparativo: ROI Médio vs Retorno Marginal (mROI)</span>
              <InfoTooltip
                title="ROI Médio vs Retorno Marginal (mROI)"
                content="O ROI Médio (azul) mede o retorno global histórico por real gasto. O Retorno Marginal ou mROI (verde) indica o retorno gerado pelo PRÓXIMO R$ 1,00 investido. Quando o mROI cai abaixo do ROI médio, o canal está operando com retornos decrescentes."
              />
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            O mROI (verde) indica a eficiência do próximo R$ 1,00 investido versus a média histórica (azul).
          </p>
        </div>
      </div>

      <div className="h-60 sm:h-64 md:h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              angle={-15}
              textAnchor="end"
              interval={0}
              height={35}
            />
            <YAxis unit="x" width={38} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip
              formatter={(val: number, name: string) => [`${Number(val).toFixed(2)}x`, name]}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', maxWidth: '90vw' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="roi" name="ROI Médio Histórico" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="marginalRoi" name="Retorno Marginal (mROI)" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
        Quando o mROI está substancialmente abaixo do ROI médio, o canal está operando perto da saturação.
      </p>
    </div>
  );
});
ComparativeMetricsBarSection.displayName = 'ComparativeMetricsBarSection';

// ----------------------------------------------------
// Memoized Subcomponent: Adstock Decay Section
// ----------------------------------------------------
interface AdstockDecaySectionProps {
  data: Array<Record<string, any>>;
  channels: ChannelMetrics[];
  channelColorMap: Record<string, string>;
}

const AdstockDecayCurvesSection = memo<AdstockDecaySectionProps>(({
  data,
  channels,
  channelColorMap
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="flex items-center">
              <span>Curvas de Decaimento Temporal Adstock (Efeito de Carryover)</span>
              <InfoTooltip
                title="Efeito Adstock (Carryover & Memória do Consumidor)"
                content="Mede a taxa de retenção do impacto publicitário nas semanas após a veiculação. O decaimento geométrico (α) determina a meia-vida do anúncio, mostrando por quanto tempo o efeito das campanhas continua gerando vendas residuais."
              />
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Persistência do impacto publicitário nas semanas subsequentes à veiculação para os canais selecionados.
          </p>
        </div>
      </div>

      <div className="h-56 sm:h-60 md:h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <LineChart data={data} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis unit="%" width={40} domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip
              formatter={(val: number, name: string) => [`${val}% de retenção`, name]}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', maxWidth: '90vw' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            {channels.map(ch => (
              <Line
                key={ch.channelName}
                type="monotone"
                dataKey={ch.channelName}
                stroke={channelColorMap[ch.channelName] || '#2563eb'}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
AdstockDecayCurvesSection.displayName = 'AdstockDecayCurvesSection';

// ----------------------------------------------------
// Memoized Subcomponent: Single Channel Hill Curve Section
// ----------------------------------------------------
interface SingleHillCurveProps {
  channel: ChannelMetrics;
  curveData: Array<{ spend: number; incrementalKpi: number; marginalRoi: number; roi?: number }>;
  onNavigateToOptimizer: () => void;
  avgWeeklySpend: number;
}

const SingleChannelHillCurveSection = memo<SingleHillCurveProps>(({
  channel,
  curveData,
  onNavigateToOptimizer,
  avgWeeklySpend
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="flex items-center">
              <span>Curva de Resposta de Hill & Ponto Operacional Atual: {channel.channelName}</span>
              <InfoTooltip
                title="Curva de Resposta de Hill & Ponto Operacional"
                content="Modela a receita incremental estimada em diferentes níveis de orçamento semanal. O ponto tracejado vermelho indica o gasto médio atual do canal. A inclinação da curva nesse ponto exato define o Retorno Marginal (mROI)."
              />
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Relação não-linear entre investimento e receita gerada (área azul) e decaimento do retorno marginal (linha âmbar).
          </p>
        </div>

        <button
          onClick={onNavigateToOptimizer}
          className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Ver Otimização de Orçamento
        </button>
      </div>

      <div className="h-64 sm:h-72 md:h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <ComposedChart data={curveData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis
              dataKey="spend"
              tickFormatter={val => `R$ ${(val / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={val => `R$ ${(val / 1000).toFixed(0)}k`}
              width={45}
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              unit="x"
              width={38}
              domain={[0, 'auto']}
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <Tooltip
              formatter={(val: number, name: string) => {
                if (name === 'Receita Incremental') return [`R$ ${val.toLocaleString('pt-BR')}`, name];
                if (name === 'Retorno Marginal (mROI)') return [`${val.toFixed(2)}x`, name];
                return [val, name];
              }}
              labelFormatter={val => `Investimento Semanal: R$ ${Number(val).toLocaleString('pt-BR')}`}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', maxWidth: '90vw' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="incrementalKpi"
              name="Receita Incremental"
              fill="#93c5fd"
              fillOpacity={0.3}
              stroke="#2563eb"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="marginalRoi"
              name="Retorno Marginal (mROI)"
              stroke="#d97706"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {/* Reference point for current spend */}
            <ReferenceLine
              yAxisId="left"
              x={avgWeeklySpend}
              stroke="#dc2626"
              strokeDasharray="4 4"
              label={{ value: 'Spend Médio Atual', fill: '#dc2626', fontSize: 10, position: 'top' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Channel Econometric Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between mb-1">
            <span>Efeito Adstock (Carryover)</span>
            <InfoTooltip
              title="Adstock Geometric Carryover"
              content="O fator de decaimento α (entre 0 e 1) quantifica a persistência semanal do anúncio. Uma meia-vida de 2 semanas significa que 50% do impacto residual ainda reverbera 2 semanas após o anúncio ir ao ar."
            />
          </span>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            O canal possui coeficiente de retenção α = <strong>{channel?.adstockDecay ?? 0.35}</strong>, resultando em uma meia-vida de <strong>{channel?.adstockHalfLifeWeeks ?? 1.5} semanas</strong>. O impacto da mídia continua ecoando nas vendas por até {Math.round((channel?.adstockHalfLifeWeeks ?? 1.5) * 2.5)} semanas após a veiculação.
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between mb-1">
            <span>Ponto de Saturação (Hill Half-Sat)</span>
            <InfoTooltip
              title="Ponto de Meia-Saturação (K) e Inclinação (Slope S)"
              content="A meia-saturação (Half-Sat) é o valor de investimento onde o canal atinge exatamente 50% do seu teto máximo de vendas. A inclinação (Hill Slope S) define a velocidade da transição: valores maiores geram uma curva em 'S' mais pronunciada."
            />
          </span>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            A meia-saturação ocorre em <strong>R$ {(((channel?.halfSaturationSpend ?? (channel?.spend || 100000) * 1.2)) / 1000).toFixed(0)}k</strong> com inclinação S = <strong>{channel?.slope ?? 1.1}</strong>. Atualmente, o canal opera em <strong>{channel?.saturationLevel ?? 50}%</strong> do seu teto de eficácia.
          </p>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-800">
          <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between mb-1">
            <span>Recomendação Estratégica</span>
            <InfoTooltip
              title="Classificação Estratégica de Saturação"
              content="Diagnóstico econométrico automatizado: Subinvestido (espaço fértil para acelerar), Ótimo (ponto de equilíbrio ideal), Próximo à Saturação (atenção a retornos decrescentes) ou Saturado (necessidade de realocação para outros canais)."
            />
          </span>
          <p className="text-blue-800 dark:text-blue-300 leading-relaxed text-[11px]">
            {channel.saturationStatus === 'Subinvestido' && 'Canal com alto potencial de expansão. Cada real adicional tem ROI marginal superior à média do mix.'}
            {channel.saturationStatus === 'Ótimo' && 'Canal em equilíbrio ideal de eficiência. Mantenha os níveis de investimento com ajustes finos sazonais.'}
            {channel.saturationStatus === 'Próximo à Saturação' && 'Atenção aos retornos decrescentes. Evite aumentos expressivos sem novos testes de criativo ou público.'}
            {channel.saturationStatus === 'Saturado' && 'Canal em zona de desperdício de capital. Reduza verba e migre para canais com mROI mais elevado.'}
          </p>
        </div>
      </div>
    </div>
  );
});
SingleChannelHillCurveSection.displayName = 'SingleChannelHillCurveSection';

// ====================================================
// Main ChannelPerformanceView Component
// ====================================================
export const ChannelPerformanceView: React.FC<ChannelPerformanceViewProps> = memo(({
  results,
  onNavigateToOptimizer,
  availableDates = [],
  dateRange,
  onChangeDateRange
}) => {
  if (!results) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12 transition-colors">
        <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Modelo não executado</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Execute o modelo para analisar as curvas de saturação e adstock dos canais.</p>
      </div>
    );
  }

  const { channels, responseCurves } = results;

  const timeSeries = useMemo(() => results?.diagnostics?.timeSeriesFit || [], [results]);
  const minDate = availableDates[0] || timeSeries[0]?.date || '';
  const maxDate = availableDates[availableDates.length - 1] || timeSeries[timeSeries.length - 1]?.date || '';
  const activeStartDate = dateRange?.startDate || minDate;
  const activeEndDate = dateRange?.endDate || maxDate;

  // Filter time series based on the global date range
  const filteredTimeSeries = useMemo(() => {
    if (!timeSeries.length) return [];
    return timeSeries.filter(
      t => (!activeStartDate || t.date >= activeStartDate) && (!activeEndDate || t.date <= activeEndDate)
    );
  }, [timeSeries, activeStartDate, activeEndDate]);

  const totalWeeks = timeSeries.length || 1;
  const filteredWeeks = filteredTimeSeries.length || 1;

  // Map each channel to a fixed brand color
  const channelColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    channels.forEach((ch, idx) => {
      map[ch.channelName] = PALETTE[idx % PALETTE.length];
    });
    return map;
  }, [channels]);

  // Multi-select state: Set of selected channel names
  const [selectedChannelNames, setSelectedChannelNames] = useState<string[]>(() =>
    channels.map(c => c.channelName)
  );

  // Active channel for detailed single-channel drilldown
  const [detailedChannelName, setDetailedChannelName] = useState<string>(
    channels[0]?.channelName || ''
  );

  // Toggle single channel in multi-select filter
  const handleToggleChannel = useCallback((channelName: string) => {
    setSelectedChannelNames(prev => {
      if (prev.includes(channelName)) {
        return prev.filter(name => name !== channelName);
      } else {
        return [...prev, channelName];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedChannelNames(channels.map(c => c.channelName));
  }, [channels]);

  const handleClearAll = useCallback(() => {
    if (channels.length > 0) {
      setSelectedChannelNames([channels[0].channelName]);
      setDetailedChannelName(channels[0].channelName);
    } else {
      setSelectedChannelNames([]);
    }
  }, [channels]);

  // Filtered channels list
  const filteredChannels = useMemo(() => {
    return channels.filter(c => selectedChannelNames.includes(c.channelName));
  }, [channels, selectedChannelNames]);

  // Ensure detailed channel is valid
  const currentChannel = useMemo(() => {
    const found = channels.find(c => c.channelName === detailedChannelName);
    if (found) return found;
    return filteredChannels[0] || channels[0];
  }, [channels, detailedChannelName, filteredChannels]);

  // Single-channel Hill Curve data
  const curveData = useMemo(() => {
    if (!currentChannel) return [];
    return responseCurves[currentChannel.channelName]?.points || [];
  }, [currentChannel, responseCurves]);

  // Comparative Multi-Channel Response Curves dataset
  const comparativeCurvesData = useMemo(() => {
    if (filteredChannels.length === 0) return [];
    const numPoints = 40;
    const data: Array<Record<string, any>> = [];

    for (let i = 0; i <= numPoints; i++) {
      const pct = (i / numPoints) * 2.5; // 0x to 2.5x of average spend
      const row: Record<string, any> = {
        pctSpend: `${Math.round(pct * 100)}%`,
        pctVal: pct
      };

      filteredChannels.forEach(ch => {
        const points = responseCurves[ch.channelName]?.points || [];
        if (points.length > 0) {
          const pointIdx = Math.min(
            points.length - 1,
            Math.floor((i / numPoints) * (points.length - 1))
          );
          row[`${ch.channelName}_revenue`] = points[pointIdx]?.incrementalKpi || 0;
          row[`${ch.channelName}_mroi`] = points[pointIdx]?.marginalRoi || 0;
          row[`${ch.channelName}_spend`] = points[pointIdx]?.spend || 0;
        }
      });

      data.push(row);
    }
    return data;
  }, [filteredChannels, responseCurves]);

  // Comparative Bar Metrics data for all filtered channels (adjusted for filtered time series)
  const comparativeMetricsData = useMemo(() => {
    const mediaSum = filteredTimeSeries.reduce((sum, t) => sum + (t.media || 0), 0);
    const fullMedia = results.diagnostics.mediaContribution || 1;

    return filteredChannels.map(ch => {
      // Calculate channel spend in filtered weeks
      const chFilteredSpend = filteredTimeSeries.reduce((sum, t) => {
        if (t.channelSpends && t.channelSpends[ch.channelName] !== undefined) {
          return sum + t.channelSpends[ch.channelName];
        }
        return sum + ((t.spend || (results.totalSpend / totalWeeks)) * (ch.spend / (results.totalSpend || 1)));
      }, 0);

      // Channel incremental KPI in filtered weeks
      const chFilteredKpi = mediaSum * (ch.incrementalKpi / fullMedia);
      const chRoi = chFilteredSpend > 0 ? chFilteredKpi / chFilteredSpend : ch.roi;

      return {
        name: ch.channelName,
        roi: Number(chRoi.toFixed(2)),
        marginalRoi: Number((ch.marginalRoi || 0).toFixed(2)),
        saturationLevel: ch.saturationLevel,
        spendK: Math.round(chFilteredSpend / 1000),
        kpiK: Math.round(chFilteredKpi / 1000),
        color: channelColorMap[ch.channelName]
      };
    });
  }, [filteredChannels, channelColorMap, filteredTimeSeries, results, totalWeeks]);

  // Adstock Decay comparison (0 to 8 weeks) for filtered channels
  const adstockDecayData = useMemo(() => {
    if (filteredChannels.length === 0) return [];
    const weeks = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    return weeks.map(w => {
      const row: Record<string, any> = { week: `Semana ${w}`, weekNum: w };
      filteredChannels.forEach(ch => {
        const decayAlpha = ch.adstockDecay ?? 0.35;
        const remainingImpact = Math.round(Math.pow(decayAlpha, w) * 100);
        row[ch.channelName] = remainingImpact;
      });
      return row;
    });
  }, [filteredChannels]);

  // ----------------------------------------------------
  // Historical Media Spend vs Revenue Growth (Dual-Axis Trend)
  // ----------------------------------------------------
  const [trendMetric, setTrendMetric] = useState<TrendMetricMode>('revenue');
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularityMode>('weekly');
  const [showOrganicBaseline, setShowOrganicBaseline] = useState<boolean>(true);

  // Compute raw weekly series combining selected channels
  const trendData = useMemo(() => {
    if (filteredTimeSeries.length === 0) return [];

    const activeChannels = filteredChannels;

    const baseInitialRevenue =
      filteredTimeSeries.slice(0, Math.min(4, filteredTimeSeries.length)).reduce((acc, t) => acc + t.actual, 0) /
        Math.min(4, filteredTimeSeries.length) || 1;

    const baseInitialSpend =
      filteredTimeSeries.slice(0, Math.min(4, filteredTimeSeries.length)).reduce((acc, t) => {
        let s = 0;
        if (t.channelSpends) {
          activeChannels.forEach(c => {
            s += t.channelSpends?.[c.channelName] || 0;
          });
        } else {
          const share =
            results.totalSpend > 0
              ? activeChannels.reduce((sum, c) => sum + c.spend, 0) / results.totalSpend
              : 1;
          s = (t.spend || (t.media / (results.diagnostics.mediaContribution || 1)) * results.totalSpend) * share;
        }
        return acc + s;
      }, 0) / Math.min(4, filteredTimeSeries.length) || 1;

    // Build raw points
    const rawPoints = filteredTimeSeries.map((t, idx) => {
      let channelSpendAtT = 0;
      if (t.channelSpends) {
        activeChannels.forEach(c => {
          channelSpendAtT += t.channelSpends?.[c.channelName] || 0;
        });
      } else {
        const totalFilterSpend = activeChannels.reduce((sum, c) => sum + c.spend, 0);
        const share = results.totalSpend > 0 ? totalFilterSpend / results.totalSpend : 1;
        const totalEstimatedSpend = t.spend || results.totalSpend / totalWeeks;
        channelSpendAtT = totalEstimatedSpend * share;
      }

      const totalFilteredMediaKpi = activeChannels.reduce((sum, c) => sum + c.incrementalKpi, 0);
      const mediaShare =
        results.diagnostics.mediaContribution > 0
          ? totalFilteredMediaKpi / results.diagnostics.mediaContribution
          : 1;
      const incrementalMediaAtT = Math.round(t.media * mediaShare);

      const revenueGrowth = Number((((t.actual - baseInitialRevenue) / baseInitialRevenue) * 100).toFixed(1));
      const spendGrowth = Number((((channelSpendAtT - baseInitialSpend) / baseInitialSpend) * 100).toFixed(1));

      return {
        date: t.date,
        rawIndex: idx,
        spend: Math.round(channelSpendAtT),
        revenue: Math.round(t.actual),
        mediaRevenue: incrementalMediaAtT,
        baseline: Math.round(t.baseline),
        controls: Math.round(t.controls),
        growthRate: revenueGrowth,
        spendGrowthRate: spendGrowth,
        roas: channelSpendAtT > 0 ? Number((t.actual / channelSpendAtT).toFixed(2)) : 0
      };
    });

    if (trendGranularity === 'weekly') {
      return rawPoints;
    }

    if (trendGranularity === 'ma4') {
      return rawPoints.map((pt, idx, arr) => {
        const start = Math.max(0, idx - 3);
        const subset = arr.slice(start, idx + 1);
        const avgSpend = Math.round(subset.reduce((sum, s) => sum + s.spend, 0) / subset.length);
        const avgRevenue = Math.round(subset.reduce((sum, s) => sum + s.revenue, 0) / subset.length);
        const avgMedia = Math.round(subset.reduce((sum, s) => sum + s.mediaRevenue, 0) / subset.length);
        const avgBaseline = Math.round(subset.reduce((sum, s) => sum + s.baseline, 0) / subset.length);
        const avgGrowth = Number((subset.reduce((sum, s) => sum + s.growthRate, 0) / subset.length).toFixed(1));
        const avgSpendGrowth = Number((subset.reduce((sum, s) => sum + s.spendGrowthRate, 0) / subset.length).toFixed(1));

        return {
          ...pt,
          spend: avgSpend,
          revenue: avgRevenue,
          mediaRevenue: avgMedia,
          baseline: avgBaseline,
          growthRate: avgGrowth,
          spendGrowthRate: avgSpendGrowth,
          roas: avgSpend > 0 ? Number((avgRevenue / avgSpend).toFixed(2)) : 0
        };
      });
    }

    if (trendGranularity === 'monthly') {
      const monthlyPoints: typeof rawPoints = [];
      const chunkSize = 4;
      for (let i = 0; i < rawPoints.length; i += chunkSize) {
        const chunk = rawPoints.slice(i, i + chunkSize);
        const monthNum = Math.floor(i / chunkSize) + 1;
        const totalSpend = chunk.reduce((sum, s) => sum + s.spend, 0);
        const totalRevenue = chunk.reduce((sum, s) => sum + s.revenue, 0);
        const totalMedia = chunk.reduce((sum, s) => sum + s.mediaRevenue, 0);
        const totalBaseline = chunk.reduce((sum, s) => sum + s.baseline, 0);
        const avgGrowth = Number((chunk.reduce((sum, s) => sum + s.growthRate, 0) / chunk.length).toFixed(1));
        const avgSpendGrowth = Number((chunk.reduce((sum, s) => sum + s.spendGrowthRate, 0) / chunk.length).toFixed(1));

        const label = `Mês ${monthNum} (${chunk[0].date.length > 10 ? chunk[0].date.substring(5, 10) : chunk[0].date})`;

        monthlyPoints.push({
          date: label,
          rawIndex: i,
          spend: Math.round(totalSpend),
          revenue: Math.round(totalRevenue),
          mediaRevenue: Math.round(totalMedia),
          baseline: Math.round(totalBaseline),
          controls: chunk.reduce((sum, s) => sum + s.controls, 0),
          growthRate: avgGrowth,
          spendGrowthRate: avgSpendGrowth,
          roas: totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0
        });
      }
      return monthlyPoints;
    }

    return rawPoints;
  }, [results, filteredChannels, trendGranularity, filteredTimeSeries, totalWeeks]);

  // Statistical calculations for trend ribbon
  const trendStats = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return {
        totalSpend: 0,
        totalRevenue: 0,
        avgWeeklySpend: 0,
        avgWeeklyRevenue: 0,
        pearsonR: 0,
        overallGrowth: 0,
        blendedRoas: 0
      };
    }

    const totalSpend = trendData.reduce((acc, d) => acc + d.spend, 0);
    const totalRevenue = trendData.reduce((acc, d) => acc + d.revenue, 0);
    const avgWeeklySpend = Math.round(totalSpend / trendData.length);
    const avgWeeklyRevenue = Math.round(totalRevenue / trendData.length);

    // Pearson correlation between Spend and Revenue
    const n = trendData.length;
    const meanSpend = totalSpend / n;
    const meanRev = totalRevenue / n;
    let num = 0;
    let denSpend = 0;
    let denRev = 0;

    trendData.forEach(d => {
      const diffS = d.spend - meanSpend;
      const diffR = d.revenue - meanRev;
      num += diffS * diffR;
      denSpend += diffS * diffS;
      denRev += diffR * diffR;
    });

    const pearsonR =
      denSpend > 0 && denRev > 0 ? Number((num / Math.sqrt(denSpend * denRev)).toFixed(2)) : 0;

    const firstPt = trendData[0];
    const lastPt = trendData[trendData.length - 1];
    const overallGrowth =
      firstPt.revenue > 0 ? Number((((lastPt.revenue - firstPt.revenue) / firstPt.revenue) * 100).toFixed(1)) : 0;
    const blendedRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;

    return {
      totalSpend,
      totalRevenue,
      avgWeeklySpend,
      avgWeeklyRevenue,
      pearsonR,
      overallGrowth,
      blendedRoas
    };
  }, [trendData]);

  const handleToggleOrganicBaseline = useCallback(() => {
    setShowOrganicBaseline(prev => !prev);
  }, []);

  const handleSelectDetailedChannel = useCallback((name: string) => {
    setDetailedChannelName(name);
    setSelectedChannelNames(prev => {
      if (!prev.includes(name)) {
        return [...prev, name];
      }
      return prev;
    });
  }, []);

  const avgWeeklySpendForCurrentChannel = useMemo(() => {
    return currentChannel ? currentChannel.spend / (results?.diagnostics?.timeSeriesFit?.length || results?.actualVsPredicted?.length || 52) : 0;
  }, [currentChannel, results]);

  return (
    <div id="channel-performance-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Desempenho de Canais de Mídia, Curvas de Saturação de Hill e Retenção de Adstock no Marketing Mix Modeling
      </h1>

      {/* Global Date Range Filter Banner Bar */}
      {availableDates.length > 0 && dateRange && onChangeDateRange && (
        <GlobalDateRangeFilter
          availableDates={availableDates}
          dateRange={dateRange}
          onChangeDateRange={onChangeDateRange}
          variant="banner"
        />
      )}

      {/* 1. Multi-Select Channel Filter Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Filtro Multi-Seleção de Canais
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {filteredChannels.length} de {channels.length} visíveis
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alterne a visibilidade dos canais para comparar curvas de resposta, ROI e decaimento adstock nos gráficos abaixo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={filteredChannels.length === channels.length}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Marcar Todos
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Isolar 1 Canal
            </button>
          </div>
        </div>

        {/* Channel Checkbox Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {channels.map(ch => {
            const isVisible = selectedChannelNames.includes(ch.channelName);
            const color = channelColorMap[ch.channelName] || '#2563eb';

            return (
              <button
                key={ch.channelName}
                onClick={() => handleToggleChannel(ch.channelName)}
                className={`group px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                  isVisible
                    ? 'bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Custom Styled Checkbox Icon */}
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors ${
                    isVisible
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
                </span>

                {/* Color Dot indicator */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />

                <span className="truncate">{ch.channelName}</span>

                <span className="text-[10px] font-mono opacity-80">
                  {(ch.roi || 0).toFixed(1)}x
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredChannels.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Nenhum canal selecionado</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
            Selecione pelo menos um canal no filtro acima para visualizar os gráficos de performance.
          </p>
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Selecionar Todos os Canais
          </button>
        </div>
      ) : (
        <>
          {/* 2. Centerpiece: Dual-Axis Trend Chart (Historical Media Spend vs. Revenue Growth) */}
          <HistoricalTrendSection
            trendData={trendData}
            trendStats={trendStats}
            trendMetric={trendMetric}
            trendGranularity={trendGranularity}
            showOrganicBaseline={showOrganicBaseline}
            filteredChannelsCount={filteredChannels.length}
            onSetTrendMetric={setTrendMetric}
            onSetTrendGranularity={setTrendGranularity}
            onToggleOrganicBaseline={handleToggleOrganicBaseline}
          />

          {/* 3. Comparative Section Header & Tabs */}
          <div className="channel-performance-comparison-container space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Análise Comparativa de Eficiência & Saturação
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare canais diretamente para avaliar saturação de Hill, retornos marginais e persistência adstock.
                </p>
              </div>
            </div>

            {/* Tab 2: Multi-Channel Overview Grid */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Curvas de Resposta Comparativas (Overlaid Hill Curves) */}
                <OverlaidResponseCurvesSection
                  data={comparativeCurvesData}
                  channels={filteredChannels}
                  channelColorMap={channelColorMap}
                />

                {/* Chart 2: Comparativo de ROI vs Retorno Marginal (mROI) */}
                <ComparativeMetricsBarSection
                  data={comparativeMetricsData}
                />
              </div>

              {/* Chart 3: Comparativo de Decaimento Adstock (Carryover Multi-Canal) */}
              <AdstockDecayCurvesSection
                data={adstockDecayData}
                channels={filteredChannels}
                channelColorMap={channelColorMap}
              />
            </div>
          </div>

          {/* 3. Single Channel Deep Dive Header Tabs */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Detalhamento Individual do Canal: <span className="text-blue-600 dark:text-blue-400">{currentChannel.channelName}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selecione um canal abaixo para examinar seus parâmetros econométricos individuais e recomendações.
                </p>
              </div>
            </div>

            {/* Channel Selection Buttons for Deep Dive */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {channels.map(ch => {
                const isSelected = ch.channelName === currentChannel.channelName;
                const color = channelColorMap[ch.channelName] || '#2563eb';

                return (
                  <button
                    key={ch.channelName}
                    onClick={() => handleSelectDetailedChannel(ch.channelName)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#ffffff' : color }}
                    />
                    <span>{ch.channelName}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        isSelected
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {(ch.roi || 0).toFixed(1)}x ROI
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Channel Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Investimento Total */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center">
                <span>Investimento Total</span>
                <InfoTooltip
                  title="Investimento Total no Canal"
                  content="Montante acumulado investido exclusivamente neste canal de mídia durante todo o período histórico analisado."
                />
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                R$ {(((currentChannel?.spend ?? 0)) / 1000).toFixed(0)}k
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{currentChannel?.spendShare ?? 0}% do budget</span>
            </div>

            {/* ROI Médio */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center">
                <span>ROI Médio (Mediana)</span>
                <InfoTooltip
                  title="ROI Histórico Médio"
                  content="Receita total gerada pelo canal dividida pelo investimento acumulado ao longo de todo o período histórico analisado."
                />
              </span>
              <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                {(currentChannel?.roi ?? 0).toFixed(2)}x
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                [{currentChannel?.roiInterval?.ci025 !== undefined ? currentChannel.roiInterval.ci025.toFixed(1) : '0.0'}x – {currentChannel?.roiInterval?.ci975 !== undefined ? currentChannel.roiInterval.ci975.toFixed(1) : '0.0'}x]
              </span>
            </div>

            {/* Retorno Marginal (mROI) */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center">
                <span>Retorno Marginal (mROI)</span>
                <InfoTooltip
                  title="Marginal ROI (mROI)"
                  content="A derivada da curva de Hill no nível atual de investimento. Indica exatamente quanta receita adicional o próximo R$ 1,00 investido gerará."
                />
              </span>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {(currentChannel?.marginalRoi ?? 0).toFixed(2)}x
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Por R$ 1 extra</span>
            </div>

            {/* Nível de Saturação */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center">
                <span>Nível de Saturação</span>
                <InfoTooltip
                  title="Saturação de Hill"
                  content="Percentual de esgotamento do retorno. Acima de 75-80%, aumentos de verba sofrem retornos decrescentes severos (desperdício de verba)."
                />
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                {currentChannel?.saturationLevel ?? 0}%
              </div>
              <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(currentChannel?.saturationStatus || 'Ótimo')}`}>
                {currentChannel?.saturationStatus || 'Ótimo'}
              </span>
            </div>

            {/* Adstock / Carryover */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center">
                <span>Meia-vida Adstock</span>
                <InfoTooltip
                  title="Adstock Geometric Carryover"
                  content="Número de semanas necessárias para que o efeito de uma campanha publicitária caia para 50% na mente do consumidor."
                />
              </span>
              <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {currentChannel?.adstockHalfLifeWeeks ?? 1.5} sem.
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Decaimento: α = {currentChannel?.adstockDecay ?? (currentChannel as any)?.adstockAlpha ?? 0.35}</span>
            </div>

            {/* Receita Incremental */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center">
                <span>Receita Incremental</span>
                <InfoTooltip
                  title="Receita Incremental (MMM Lift)"
                  content="Faturamento gerado exclusivamente pela presença deste canal de mídia, isolado do baseline orgânico e efeitos sazonais pelo modelo econométrico."
                />
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                R$ {(((currentChannel?.incrementalKpi ?? 0)) / 1000).toFixed(0)}k
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{currentChannel?.kpiShare ?? 0}% do total</span>
            </div>
          </div>

          {/* Main Curve Chart: Hill Saturation & Marginal ROI for Selected Channel */}
          <SingleChannelHillCurveSection
            channel={currentChannel}
            curveData={curveData}
            onNavigateToOptimizer={onNavigateToOptimizer}
            avgWeeklySpend={avgWeeklySpendForCurrentChannel}
          />
        </>
      )}
      
      {/* Floating Print / PDF Action Button */}
      <FloatingPrintButton />
    </div>
  );
});

ChannelPerformanceView.displayName = 'ChannelPerformanceView';
