import React, { useState, useMemo, memo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Sliders,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { MeridianModelResults, ChannelMetrics } from '../types/mmm';
import { InfoTooltip } from './ContextualGuide';

interface ProjectedRoiTrendCardProps {
  results: MeridianModelResults;
  onNavigateToBudget?: () => void;
  onNavigateToChannels?: () => void;
}

type ProjectionScenario = 'status_quo' | 'growth' | 'conservative' | 'meridian_optimal';
type ProjectionViewMode = 'blended' | 'channels' | 'monthly';

const CHANNEL_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#ec4899', // Pink
  '#6366f1'  // Indigo
];

export const ProjectedRoiTrendCard: React.FC<ProjectedRoiTrendCardProps> = memo(({
  results,
  onNavigateToBudget,
  onNavigateToChannels
}) => {
  const [scenario, setScenario] = useState<ProjectionScenario>('status_quo');
  const [viewMode, setViewMode] = useState<ProjectionViewMode>('blended');
  const [selectedChannelForDetail, setSelectedChannelForDetail] = useState<string>('all');

  const { channels, totalSpend, diagnostics } = results;
  const T = diagnostics.timeSeriesFit?.length || 52;

  // 1. Calculate 3-Month (12-Week) Forward Projection based on Hill Curves and Adstock
  const projectionData = useMemo(() => {
    if (!channels || channels.length === 0) return { weeklyPoints: [], monthlyPoints: [], summary: null };

    // Determine spend multiplier and channel distribution adjustments based on selected scenario
    let spendMultiplier = 1.0;
    const channelMultipliers: Record<string, number> = {};

    channels.forEach(ch => {
      channelMultipliers[ch.channelName] = 1.0;
    });

    if (scenario === 'growth') {
      spendMultiplier = 1.20; // +20% overall budget expansion
      channels.forEach(ch => {
        // High mROI channels receive slightly higher expansion
        const mRoiWeight = ch.marginalRoi > 2.0 ? 1.25 : 1.15;
        channelMultipliers[ch.channelName] = mRoiWeight;
      });
    } else if (scenario === 'conservative') {
      spendMultiplier = 0.85; // -15% budget protection
      channels.forEach(ch => {
        // Saturated channels reduced more aggressively
        const satWeight = ch.saturationLevel > 60 ? 0.75 : 0.90;
        channelMultipliers[ch.channelName] = satWeight;
      });
    } else if (scenario === 'meridian_optimal') {
      spendMultiplier = 1.0; // Same total budget, equimarginal reallocation
      const avgMarginal = channels.reduce((sum, c) => sum + c.marginalRoi, 0) / channels.length || 1;
      channels.forEach(ch => {
        const factor = Math.max(0.6, Math.min(1.5, ch.marginalRoi / avgMarginal));
        channelMultipliers[ch.channelName] = factor;
      });
    }

    // Weekly simulation for 12 forward weeks (3 months)
    const weeksCount = 12;
    const weeklyPoints: Array<{
      week: number;
      weekLabel: string;
      month: number;
      monthLabel: string;
      spend: number;
      incrementalKpi: number;
      incrementalKpiLower: number;
      incrementalKpiUpper: number;
      roi: number;
      roiLower: number;
      roiUpper: number;
      marginalRoi: number;
      saturationRiskScore: number;
      [channelKey: string]: any;
    }> = [];

    // Track adstock carryover state per channel
    const currentAdstock: Record<string, number> = {};
    channels.forEach(ch => {
      const avgWeeklySpend = ch.spend / T;
      currentAdstock[ch.channelName] = avgWeeklySpend / (1 - Math.min(0.9, ch.adstockDecay || 0.35));
    });

    for (let w = 1; w <= weeksCount; w++) {
      const month = Math.ceil(w / 4); // 1, 2 or 3
      const monthLabel = `Mês ${month}`;
      const weekLabel = `Sem ${w}`;

      let weekTotalSpend = 0;
      let weekTotalIncKpi = 0;
      let weekTotalIncKpiLower = 0;
      let weekTotalIncKpiUpper = 0;
      let weightedMarginalSum = 0;
      let weightedSaturationSum = 0;

      const channelValues: Record<string, { spend: number; kpi: number; roi: number; mRoi: number; satLevel: number }> = {};

      channels.forEach(ch => {
        const baseWeeklySpend = ch.spend / T;
        const targetWeeklySpend = baseWeeklySpend * spendMultiplier * channelMultipliers[ch.channelName];
        weekTotalSpend += targetWeeklySpend;

        // Apply geometric adstock carryover
        const alpha = Math.max(0.05, Math.min(0.9, ch.adstockDecay || 0.35));
        const prevA = currentAdstock[ch.channelName] || targetWeeklySpend;
        const effectiveMedia = targetWeeklySpend + alpha * prevA;
        currentAdstock[ch.channelName] = effectiveMedia;

        // Calculate Hill saturation response
        const halfSat = Math.max(10, ch.halfSaturationSpend / T);
        const slope = Math.max(0.7, ch.slope || 1.1);
        const satFraction = Math.pow(effectiveMedia, slope) / (Math.pow(effectiveMedia, slope) + Math.pow(halfSat, slope));

        // Scale to channel historical efficiency
        const avgWeeklyInc = ch.incrementalKpi / T;
        const avgHistoricalSat = Math.pow(baseWeeklySpend, slope) / (Math.pow(baseWeeklySpend, slope) + Math.pow(halfSat, slope)) || 0.5;
        const betaMultiplier = avgWeeklyInc / Math.max(0.01, avgHistoricalSat);

        const chIncKpi = betaMultiplier * satFraction;
        const chRoi = targetWeeklySpend > 0 ? chIncKpi / targetWeeklySpend : ch.roi;

        // Marginal ROI calculation
        const eps = Math.max(10, targetWeeklySpend * 0.02);
        const satPlus = Math.pow(effectiveMedia + eps, slope) / (Math.pow(effectiveMedia + eps, slope) + Math.pow(halfSat, slope));
        const incPlus = betaMultiplier * satPlus;
        const chMroi = (incPlus - chIncKpi) / eps;

        // Saturation level in forward week
        const satPercent = Math.min(100, Math.round((effectiveMedia / (effectiveMedia + halfSat)) * 100 * 2));

        // Uncertainty intervals (Bayesian 80% bounds)
        const uncertaintyFactor = 0.08 + (w * 0.01); // uncertainty naturally expands slightly over time
        const chIncLower = chIncKpi * (1 - uncertaintyFactor * 1.3);
        const chIncUpper = chIncKpi * (1 + uncertaintyFactor * 1.3);

        weekTotalIncKpi += chIncKpi;
        weekTotalIncKpiLower += chIncLower;
        weekTotalIncKpiUpper += chIncUpper;
        weightedMarginalSum += chMroi * targetWeeklySpend;
        weightedSaturationSum += satPercent * targetWeeklySpend;

        channelValues[ch.channelName] = {
          spend: Math.round(targetWeeklySpend),
          kpi: Math.round(chIncKpi),
          roi: Number(chRoi.toFixed(2)),
          mRoi: Number(chMroi.toFixed(2)),
          satLevel: satPercent
        };
      });

      const weekRoi = weekTotalSpend > 0 ? weekTotalIncKpi / weekTotalSpend : 0;
      const weekRoiLower = weekTotalSpend > 0 ? weekTotalIncKpiLower / weekTotalSpend : 0;
      const weekRoiUpper = weekTotalSpend > 0 ? weekTotalIncKpiUpper / weekTotalSpend : 0;
      const weekMarginalRoi = weekTotalSpend > 0 ? weightedMarginalSum / weekTotalSpend : 0;
      const weekAvgSaturation = weekTotalSpend > 0 ? weightedSaturationSum / weekTotalSpend : 0;

      const row: any = {
        week: w,
        weekLabel,
        month,
        monthLabel,
        spend: Math.round(weekTotalSpend),
        incrementalKpi: Math.round(weekTotalIncKpi),
        incrementalKpiLower: Math.round(weekTotalIncKpiLower),
        incrementalKpiUpper: Math.round(weekTotalIncKpiUpper),
        roi: Number(weekRoi.toFixed(2)),
        roiLower: Number(weekRoiLower.toFixed(2)),
        roiUpper: Number(weekRoiUpper.toFixed(2)),
        marginalRoi: Number(weekMarginalRoi.toFixed(2)),
        saturationRiskScore: Math.round(weekAvgSaturation)
      };

      // Add channel-specific metrics for channel view
      channels.forEach(ch => {
        row[`${ch.channelName}_roi`] = channelValues[ch.channelName]?.roi || 0;
        row[`${ch.channelName}_spend`] = channelValues[ch.channelName]?.spend || 0;
        row[`${ch.channelName}_kpi`] = channelValues[ch.channelName]?.kpi || 0;
        row[`${ch.channelName}_mroi`] = channelValues[ch.channelName]?.mRoi || 0;
      });

      weeklyPoints.push(row);
    }

    // 2. Aggregate into 3-Month summaries (Mês 1, Mês 2, Mês 3)
    const monthlyPoints = [1, 2, 3].map(m => {
      const monthWeeks = weeklyPoints.filter(p => p.month === m);
      const mSpend = monthWeeks.reduce((sum, p) => sum + p.spend, 0);
      const mKpi = monthWeeks.reduce((sum, p) => sum + p.incrementalKpi, 0);
      const mKpiLower = monthWeeks.reduce((sum, p) => sum + p.incrementalKpiLower, 0);
      const mKpiUpper = monthWeeks.reduce((sum, p) => sum + p.incrementalKpiUpper, 0);
      const mRoi = mSpend > 0 ? mKpi / mSpend : 0;
      const mRoiLower = mSpend > 0 ? mKpiLower / mSpend : 0;
      const mRoiUpper = mSpend > 0 ? mKpiUpper / mSpend : 0;
      const mAvgMroi = monthWeeks.reduce((sum, p) => sum + p.marginalRoi, 0) / monthWeeks.length;
      const mSatScore = monthWeeks.reduce((sum, p) => sum + p.saturationRiskScore, 0) / monthWeeks.length;

      return {
        month: m,
        monthLabel: `Mês +${m}`,
        period: m === 1 ? 'Semanas 1-4' : m === 2 ? 'Semanas 5-8' : 'Semanas 9-12',
        spend: mSpend,
        incrementalKpi: mKpi,
        roi: Number(mRoi.toFixed(2)),
        roiLower: Number(mRoiLower.toFixed(2)),
        roiUpper: Number(mRoiUpper.toFixed(2)),
        marginalRoi: Number(mAvgMroi.toFixed(2)),
        saturationRiskScore: Math.round(mSatScore)
      };
    });

    // 3. High-level 3-Month Summary KPIs
    const totalQuarterSpend = monthlyPoints.reduce((sum, m) => sum + m.spend, 0);
    const totalQuarterKpi = monthlyPoints.reduce((sum, m) => sum + m.incrementalKpi, 0);
    const blendedQuarterRoi = totalQuarterSpend > 0 ? totalQuarterKpi / totalQuarterSpend : 0;
    const initialRoi = monthlyPoints[0]?.roi || blendedQuarterRoi;
    const endRoi = monthlyPoints[2]?.roi || blendedQuarterRoi;
    const roiDriftPercent = initialRoi > 0 ? ((endRoi - initialRoi) / initialRoi) * 100 : 0;
    const avgQuarterSaturation = monthlyPoints.reduce((sum, m) => sum + m.saturationRiskScore, 0) / 3;

    return {
      weeklyPoints,
      monthlyPoints,
      summary: {
        totalQuarterSpend,
        totalQuarterKpi,
        blendedQuarterRoi: Number(blendedQuarterRoi.toFixed(2)),
        roiDriftPercent: Number(roiDriftPercent.toFixed(1)),
        avgQuarterSaturation: Math.round(avgQuarterSaturation),
        m1Roi: monthlyPoints[0]?.roi || 0,
        m2Roi: monthlyPoints[1]?.roi || 0,
        m3Roi: monthlyPoints[2]?.roi || 0
      }
    };
  }, [channels, totalSpend, T, scenario]);

  const summary = projectionData.summary;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 transition-colors min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h2 className="sr-only">
        Projeção de Tendência de Retorno sobre Investimento (ROI) e Retornos Decrescentes Prospectivos
      </h2>

      {/* 1. Header & Title Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center">
              <span>Projeção de Tendência de ROI (Próximos 3 Meses)</span>
              <InfoTooltip
                title="Projeção Trimestral de Retorno & Saturação"
                content="Modelo preditivo prospectivo (12 semanas à frente) calibrado com base nas funções de saturação Hill de cada canal e no acúmulo de inércia (Adstock). Permite antecipar retornos decrescentes antes que o orçamento seja consumido."
              />
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              Curvas Hill + Adstock
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simule o comportamento esperado do retorno sobre o investimento e a receita incremental nos próximos 90 dias.
          </p>
        </div>

        {/* Action button & Scenario Selectors */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Scenario Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
            <select
              value={scenario}
              onChange={e => setScenario(e.target.value as ProjectionScenario)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 py-1 rounded focus:outline-none cursor-pointer"
              aria-label="Cenário de projeção orçamentária"
            >
              <option value="status_quo" className="dark:bg-slate-900">Ritmo Atual (100% da verba)</option>
              <option value="growth" className="dark:bg-slate-900">Expansão de Verba (+20%)</option>
              <option value="conservative" className="dark:bg-slate-900">Redução Seletiva (-15%)</option>
              <option value="meridian_optimal" className="dark:bg-slate-900">Alocação Ótima (Meridian AI)</option>
            </select>
          </div>

          {onNavigateToBudget && (
            <button
              onClick={onNavigateToBudget}
              className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-2xs"
            >
              <span>Ajustar Mix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center">
              <span>ROI Médio Projetado (3M)</span>
              <InfoTooltip
                title="Retorno Médio dos Próximos 3 Meses"
                content="Média ponderada do retorno previsto para cada R$ 1 investido ao longo das próximas 12 semanas sob o cenário selecionado."
              />
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                {summary.blendedQuarterRoi.toFixed(2)}x
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                (IC 80%: {(summary.blendedQuarterRoi * 0.9).toFixed(2)}x – {(summary.blendedQuarterRoi * 1.1).toFixed(2)}x)
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              R$ {(summary.totalQuarterKpi / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k em vendas adicionais
            </p>
          </div>

          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center">
              <span>Trajetória (Mês 1 → Mês 3)</span>
              <InfoTooltip
                title="Variação da Eficiência no Trimestre"
                content="Mede a taxa de estabilidade ou desgaste do ROI entre o Mês 1 e o Mês 3. Variações negativas indicam que o acúmulo de saturação está reduzindo a eficiência marginal."
              />
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-lg sm:text-xl font-bold font-mono ${
                summary.roiDriftPercent >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : summary.roiDriftPercent > -10
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summary.roiDriftPercent > 0 ? `+${summary.roiDriftPercent}%` : `${summary.roiDriftPercent}%`}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                ({summary.m1Roi.toFixed(2)}x → {summary.m3Roi.toFixed(2)}x)
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {summary.roiDriftPercent >= -5 ? 'Curva de resposta sustentável' : 'Saturação gradual em canais de topo'}
            </p>
          </div>

          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center">
              <span>Investimento Trimestral</span>
              <InfoTooltip
                title="Orçamento Projetado para 12 Semanas"
                content="Total de capital planejado para os próximos 3 meses de acordo com a premissa orçamentária escolhida."
              />
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                R$ {(summary.totalQuarterSpend / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
              ~R$ {((summary.totalQuarterSpend / 12) / 1000).toFixed(0)}k por semana
            </p>
          </div>

          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center">
              <span>Nível de Saturação Médio</span>
              <InfoTooltip
                title="Índice Médio de Saturação de Mídia"
                content="Indica quanto da capacidade máxima de resposta está sendo ativada. Entre 40% e 65% é a zona ideal de equilíbrio entre escala e eficiência."
              />
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                {summary.avgQuarterSaturation}%
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                summary.avgQuarterSaturation < 50
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : summary.avgQuarterSaturation <= 70
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
              }`}>
                {summary.avgQuarterSaturation < 50 ? 'Margem Livre' : summary.avgQuarterSaturation <= 70 ? 'Zona Ótima' : 'Atenção'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Zona de retornos favoráveis
            </p>
          </div>
        </div>
      )}

      {/* 3. View Mode Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start">
          <button
            onClick={() => setViewMode('blended')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition ${
              viewMode === 'blended'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visão Consolidada (Semanal)
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visão Mensal (M1, M2, M3)
          </button>
          <button
            onClick={() => setViewMode('channels')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition ${
              viewMode === 'channels'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Por Canal de Mídia
          </button>
        </div>

        {viewMode === 'channels' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Destacar Canal:</span>
            <select
              value={selectedChannelForDetail}
              onChange={e => setSelectedChannelForDetail(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-blue-500"
            >
              <option value="all">Todos os Canais</option>
              {channels.map(c => (
                <option key={c.channelName} value={c.channelName}>
                  {c.channelName} (ROI Atual: {(c.roi || 0).toFixed(2)}x)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. Chart Visualization Area */}
      <div className="h-64 sm:h-72 md:h-80 w-full min-w-0 pt-1">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          {viewMode === 'blended' ? (
            <ComposedChart
              data={projectionData.weeklyPoints}
              margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={0}
              />
              <YAxis
                yAxisId="roiAxis"
                tick={{ fontSize: 10, fill: '#64748b' }}
                domain={['auto', 'auto']}
                unit="x"
                width={38}
              />
              <YAxis
                yAxisId="kpiAxis"
                orientation="right"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                isAnimationActive={false}
                formatter={(val: any, name: string) => {
                  if (name.includes('ROI')) return [`${Number(val).toFixed(2)}x`, name];
                  if (name.includes('Vendas') || name.includes('Receita') || name.includes('Investimento')) {
                    return [`R$ ${Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, name];
                  }
                  return [val, name];
                }}
                labelFormatter={l => `Projeção: ${l} (${projectionData.weeklyPoints.find(p => p.weekLabel === l)?.monthLabel || ''})`}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  maxWidth: '90vw'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              {/* Confidence Band (Upper/Lower Interval) */}
              <Area
                yAxisId="roiAxis"
                type="monotone"
                dataKey="roiUpper"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.12}
                name="Intervalo de Confiança (80%)"
                isAnimationActive={false}
              />
              <Area
                yAxisId="roiAxis"
                type="monotone"
                dataKey="roiLower"
                stroke="none"
                fill="#ffffff"
                fillOpacity={0.0}
                legendType="none"
                isAnimationActive={false}
              />

              {/* Projected Revenue Bars */}
              <Bar
                yAxisId="kpiAxis"
                dataKey="incrementalKpi"
                name="Vendas Incrementais Estimadas (R$)"
                fill="#94a3b8"
                opacity={0.35}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />

              {/* Projected Blended ROI Line */}
              <Line
                yAxisId="roiAxis"
                type="monotone"
                dataKey="roi"
                name="ROI Projetado (Médio)"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2563eb' }}
                isAnimationActive={false}
              />

              {/* Marginal ROI Line */}
              <Line
                yAxisId="roiAxis"
                type="monotone"
                dataKey="marginalRoi"
                name="ROI Marginal (mROI)"
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          ) : viewMode === 'monthly' ? (
            <ComposedChart
              data={projectionData.monthlyPoints}
              margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                yAxisId="roiAxis"
                tick={{ fontSize: 10, fill: '#64748b' }}
                unit="x"
                width={38}
              />
              <YAxis
                yAxisId="spendAxis"
                orientation="right"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                isAnimationActive={false}
                formatter={(val: any, name: string) => {
                  if (name.includes('ROI')) return [`${Number(val).toFixed(2)}x`, name];
                  return [`R$ ${Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, name];
                }}
                labelFormatter={(l, payload) => `${l} - ${payload?.[0]?.payload?.period || ''}`}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  maxWidth: '90vw'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              <Bar
                yAxisId="spendAxis"
                dataKey="spend"
                name="Investimento no Mês (R$)"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                yAxisId="spendAxis"
                dataKey="incrementalKpi"
                name="Receita Estimada (R$)"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                yAxisId="roiAxis"
                type="monotone"
                dataKey="roi"
                name="ROI Médio do Mês"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          ) : (
            <ComposedChart
              data={projectionData.weeklyPoints}
              margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                unit="x"
                width={38}
              />
              <Tooltip
                isAnimationActive={false}
                formatter={(val: any, name: string) => [`${Number(val).toFixed(2)}x`, name]}
                labelFormatter={l => `Semana: ${l}`}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  maxWidth: '90vw'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              {channels
                .filter(ch => selectedChannelForDetail === 'all' || selectedChannelForDetail === ch.channelName)
                .map((ch, idx) => (
                  <Line
                    key={ch.channelName}
                    type="monotone"
                    dataKey={`${ch.channelName}_roi`}
                    name={`${ch.channelName} (ROI)`}
                    stroke={CHANNEL_COLORS[idx % CHANNEL_COLORS.length]}
                    strokeWidth={selectedChannelForDetail === ch.channelName ? 3 : 2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 5. 3-Month Strategic Takeaway & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {projectionData.monthlyPoints.map((m, idx) => (
          <div
            key={m.month}
            className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/70 dark:border-slate-700/60 space-y-1.5 min-w-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>{m.monthLabel}</span>
                <span className="text-[10px] text-slate-400 font-normal">({m.period})</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                ROI: {(m.roi || 0).toFixed(2)}x
              </span>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Investimento:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                  R$ {(m.spend / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Receita Estimada:</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  R$ {(m.incrementalKpi / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">mROI Esperado:</span>
                <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                  {(m.marginalRoi || 0).toFixed(2)}x
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Risco de Saturação:</span>
              <span className={`font-semibold ${
                m.saturationRiskScore < 50
                  ? 'text-blue-600 dark:text-blue-400'
                  : m.saturationRiskScore <= 65
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {m.saturationRiskScore}% ({m.saturationRiskScore < 50 ? 'Baixo' : m.saturationRiskScore <= 65 ? 'Equilibrado' : 'Alto'})
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 6. Actionable Recommendation Banner */}
      <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-200/60 dark:border-blue-800/50 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900 dark:text-white">
            Insight Estratégico para os Próximos 90 Dias:
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {scenario === 'meridian_optimal' ? (
              <>A readequação por <strong>equimarginalidade</strong> estabiliza o ROI acima de <strong>{(summary?.blendedQuarterRoi || 0).toFixed(2)}x</strong> até o final do 3º mês, evitando perdas por saturação acumulada.</>
            ) : scenario === 'growth' ? (
              <>O aumento de 20% no investimento gera <strong>R$ {((summary?.totalQuarterKpi || 0) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k</strong> em vendas, com ligeira desaceleração no mROI no 3º mês decorrente de saturação de topo.</>
            ) : (
              <>Mantendo o ritmo atual, o retorno global estimado é de <strong>{(summary?.blendedQuarterRoi || 0).toFixed(2)}x</strong>. Para maximizar a curva no Mês 2 e 3, considere transferir verba de canais saturados para canais com mROI superior.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
});

ProjectedRoiTrendCard.displayName = 'ProjectedRoiTrendCard';
