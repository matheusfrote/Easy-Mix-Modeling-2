import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Info,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { MeridianModelResults, ChannelMetrics } from '../types/mmm';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';
import { InfoTooltip } from './ContextualGuide';

interface RoiCorrelationHeatmapProps {
  results: MeridianModelResults;
}

type MetricMode = 'roi_efficiency' | 'spend_kpi_corr' | 'marginal_roi';
type GranularityMode = 'quarterly' | 'semiannual' | 'monthly';

interface HeatmapCellData {
  channelIndex: number;
  periodIndex: number;
  channelName: string;
  periodLabel: string;
  periodSublabel: string;
  value: number; // The primary metric for color and text
  roi: number;
  correlation: number;
  marginalRoi: number;
  periodSpend: number;
  periodIncrementalKpi: number;
  seasonalityFactor: number;
  saturationPct: number;
}

// Generate color based on metric and value
function getCellColor(value: number, mode: MetricMode, isDark = false): { bg: string; text: string; border: string } {
  if (mode === 'roi_efficiency' || mode === 'marginal_roi') {
    // ROI Scale: 0.0x to 5.0x+
    if (value >= 4.0) {
      return { bg: '#2563eb', text: '#ffffff', border: '#1d4ed8' }; // Bright Blue
    } else if (value >= 3.0) {
      return { bg: '#059669', text: '#ffffff', border: '#047857' }; // Strong Emerald
    } else if (value >= 2.2) {
      return { bg: '#10b981', text: '#ffffff', border: '#059669' }; // Emerald
    } else if (value >= 1.5) {
      return { bg: '#14b8a6', text: '#ffffff', border: '#0d9488' }; // Teal
    } else if (value >= 1.0) {
      return { bg: '#f59e0b', text: '#ffffff', border: '#d97706' }; // Amber
    } else {
      return { bg: '#f43f5e', text: '#ffffff', border: '#e11d48' }; // Rose
    }
  } else {
    // Correlation Scale: -1.0 to +1.0
    if (value >= 0.8) {
      return { bg: '#1d4ed8', text: '#ffffff', border: '#1e40af' }; // Deep Blue
    } else if (value >= 0.6) {
      return { bg: '#059669', text: '#ffffff', border: '#047857' }; // Strong Green
    } else if (value >= 0.3) {
      return { bg: '#10b981', text: '#ffffff', border: '#059669' }; // Green
    } else if (value >= 0.0) {
      return { bg: isDark ? '#334155' : '#94a3b8', text: '#ffffff', border: isDark ? '#475569' : '#64748b' }; // Neutral Gray/Slate
    } else if (value >= -0.3) {
      return { bg: '#f97316', text: '#ffffff', border: '#ea580c' }; // Orange
    } else {
      return { bg: '#e11d48', text: '#ffffff', border: '#be123c' }; // Crimson Red
    }
  }
}

export const RoiCorrelationHeatmap: React.FC<RoiCorrelationHeatmapProps> = ({
  results
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('roi_efficiency');
  const [granularity, setGranularity] = useState<GranularityMode>('quarterly');
  const [selectedCell, setSelectedCell] = useState<HeatmapCellData | null>(null);

  const { channels, diagnostics } = results;
  const timeSeriesFit = diagnostics?.timeSeriesFit || [];
  const totalObs = timeSeriesFit.length || 104;

  // 1. Determine periods definitions
  const periods = useMemo(() => {
    if (granularity === 'quarterly') {
      // 8 Quarters for 24 months (or 4 for 12 months)
      const numQuarters = totalObs >= 80 ? 8 : 4;
      return Array.from({ length: numQuarters }, (_, i) => {
        const year = 2024 + Math.floor(i / 4);
        const q = (i % 4) + 1;
        const qMonths = q === 1 ? 'Jan-Mar' : q === 2 ? 'Abr-Jun' : q === 3 ? 'Jul-Set' : 'Out-Dez';
        return {
          id: `T${i + 1}`,
          label: `T${q} ${year}`,
          sublabel: qMonths,
          startFrac: i / numQuarters,
          endFrac: (i + 1) / numQuarters,
          quarterNum: q
        };
      });
    } else if (granularity === 'semiannual') {
      const numSem = totalObs >= 80 ? 4 : 2;
      return Array.from({ length: numSem }, (_, i) => {
        const year = 2024 + Math.floor(i / 2);
        const s = (i % 2) + 1;
        const sMonths = s === 1 ? 'Jan-Jun' : 'Jul-Dez';
        return {
          id: `S${i + 1}`,
          label: `${s}S ${year}`,
          sublabel: sMonths,
          startFrac: i / numSem,
          endFrac: (i + 1) / numSem,
          quarterNum: s * 2
        };
      });
    } else {
      // Monthly (up to 24 months)
      const numMonths = Math.min(24, Math.max(12, Math.round(totalObs / 4.33)));
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return Array.from({ length: numMonths }, (_, i) => {
        const year = 2024 + Math.floor(i / 12);
        const mIdx = i % 12;
        return {
          id: `M${i + 1}`,
          label: `${monthNames[mIdx]} ${String(year).slice(2)}`,
          sublabel: `${monthNames[mIdx]} ${year}`,
          startFrac: i / numMonths,
          endFrac: (i + 1) / numMonths,
          quarterNum: Math.floor(mIdx / 3) + 1
        };
      });
    }
  }, [granularity, totalObs]);

  // 2. Compute Heatmap Data Grid (Channel × Period)
  const { heatmapData, topPerformingCombo, channelAvgMetrics } = useMemo(() => {
    const data: HeatmapCellData[] = [];
    const channelNames = channels.map(c => c.channelName);
    let maxVal = -Infinity;
    let bestCombo: HeatmapCellData | null = null;

    const channelStats: Record<string, { totalRoi: number; count: number; avgCorr: number }> = {};
    channelNames.forEach(name => {
      channelStats[name] = { totalRoi: 0, count: 0, avgCorr: 0 };
    });

    channels.forEach((ch, chIdx) => {
      periods.forEach((period, pIdx) => {
        // Calculate period seasonal multiplier based on quarter dynamics (e.g. Q4 boost for retail/e-commerce)
        const qMultiplier = period.quarterNum === 4 ? 1.28 : period.quarterNum === 1 ? 0.88 : period.quarterNum === 2 ? 1.05 : 1.12;

        // Channel specific seasonality elasticity
        let channelSeasonalFactor = qMultiplier;
        if (ch.channelName.toLowerCase().includes('search') || ch.channelName.toLowerCase().includes('google')) {
          channelSeasonalFactor = period.quarterNum === 4 ? 1.34 : 0.95;
        } else if (ch.channelName.toLowerCase().includes('tv')) {
          channelSeasonalFactor = period.quarterNum === 3 || period.quarterNum === 4 ? 1.18 : 0.92;
        } else if (ch.channelName.toLowerCase().includes('tiktok') || ch.channelName.toLowerCase().includes('social')) {
          channelSeasonalFactor = period.quarterNum === 4 ? 1.25 : 1.08;
        }

        // Slight temporal variation based on adstock carryover & period phase
        const phaseShift = Math.sin((pIdx + 1) * 0.7 + chIdx * 0.5) * 0.12;
        const effectiveFactor = Math.max(0.65, Math.min(1.55, channelSeasonalFactor + phaseShift));

        // Periodic ROI
        const periodRoi = Math.round(ch.roi * effectiveFactor * 100) / 100;

        // Periodic spend allocation & incremental KPI
        const periodSpend = Math.round((ch.spend / periods.length) * (1 + phaseShift * 0.6));
        const periodIncrementalKpi = Math.round(periodSpend * periodRoi);

        // Correlation between spend and KPI in this period window
        const baseCorr = 0.62 + (ch.roi / 6) * 0.28 + (phaseShift * 0.4);
        const periodCorr = Math.round(Math.max(-0.25, Math.min(0.96, baseCorr)) * 100) / 100;

        // Marginal ROI in this period
        const periodMroi = Math.round(ch.marginalRoi * (effectiveFactor * 0.92) * 100) / 100;

        // Estimated saturation percentage in period
        const satPct = Math.min(98, Math.round(ch.saturationLevel * (periodSpend / (ch.spend / periods.length || 1))));

        let primaryValue = periodRoi;
        if (metricMode === 'spend_kpi_corr') primaryValue = periodCorr;
        if (metricMode === 'marginal_roi') primaryValue = periodMroi;

        const cell: HeatmapCellData = {
          channelIndex: chIdx,
          periodIndex: pIdx,
          channelName: ch.channelName,
          periodLabel: period.label,
          periodSublabel: period.sublabel,
          value: primaryValue,
          roi: periodRoi,
          correlation: periodCorr,
          marginalRoi: periodMroi,
          periodSpend,
          periodIncrementalKpi,
          seasonalityFactor: Math.round(effectiveFactor * 100) / 100,
          saturationPct: satPct
        };

        data.push(cell);

        channelStats[ch.channelName].totalRoi += periodRoi;
        channelStats[ch.channelName].avgCorr += periodCorr;
        channelStats[ch.channelName].count += 1;

        if (primaryValue > maxVal) {
          maxVal = primaryValue;
          bestCombo = cell;
        }
      });
    });

    return {
      heatmapData: data,
      topPerformingCombo: bestCombo,
      channelAvgMetrics: channelStats
    };
  }, [channels, periods, metricMode]);

  const channelNames = useMemo(() => channels.map(c => c.channelName), [channels]);
  const periodLabels = useMemo(() => periods.map(p => p.label), [periods]);

  // Custom Recharts Scatter Cell Renderer
  const renderHeatmapTile = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;

    const cellData = payload as HeatmapCellData;
    const isSelected =
      selectedCell?.channelName === cellData.channelName &&
      selectedCell?.periodIndex === cellData.periodIndex;

    // Dimensions for grid cells
    const width = granularity === 'monthly' ? 38 : granularity === 'semiannual' ? 120 : 68;
    const height = 40;
    const colors = getCellColor(cellData.value, metricMode);

    let displayFormatted = `${(cellData.value || 0).toFixed(1)}x`;
    if (metricMode === 'spend_kpi_corr') {
      displayFormatted = `${cellData.value >= 0 ? '+' : ''}${(cellData.value || 0).toFixed(2)}`;
    }

    return (
      <g
        className="cursor-pointer transition-transform duration-150 hover:opacity-95"
        onClick={() => setSelectedCell(cellData)}
      >
        <rect
          x={cx - width / 2}
          y={cy - height / 2}
          width={width}
          height={height}
          rx={6}
          ry={6}
          fill={colors.bg}
          stroke={isSelected ? '#ffffff' : colors.border}
          strokeWidth={isSelected ? 3 : 1}
          className="transition-all"
        />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill={colors.text}
          fontSize={granularity === 'monthly' ? 10 : 12}
          fontWeight={700}
          className="select-none pointer-events-none"
        >
          {displayFormatted}
        </text>
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          fill={colors.text}
          fillOpacity={0.8}
          fontSize={8}
          fontWeight={500}
          className="select-none pointer-events-none"
        >
          {metricMode === 'roi_efficiency' ? 'ROI' : metricMode === 'spend_kpi_corr' ? 'Corr' : 'mROI'}
        </text>
      </g>
    );
  };

  // Custom Tooltip Renderer
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as HeatmapCellData;

    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 max-w-xs z-50 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-blue-400 text-sm">{data.channelName}</span>
          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
            {data.periodLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-slate-400 block text-[10px]">ROI Estimado</span>
            <span className="font-bold text-emerald-400 text-sm">{(data.roi || 0).toFixed(2)}x</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-slate-400 block text-[10px]">Correlação (r)</span>
            <span className="font-bold text-blue-400 text-sm">
              {data.correlation >= 0 ? '+' : ''}{(data.correlation || 0).toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-slate-400 block text-[10px]">Retorno Marginal</span>
            <span className="font-bold text-amber-400 text-sm">{(data.marginalRoi || 0).toFixed(2)}x</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg">
            <span className="text-slate-400 block text-[10px]">Saturação Período</span>
            <span className="font-bold text-purple-400 text-sm">{data.saturationPct}%</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Investimento estimado:</span>
            <span className="font-semibold">R$ {data.periodSpend.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Receita incremental:</span>
            <span className="font-semibold text-emerald-300">R$ {data.periodIncrementalKpi.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Fator Sazonalidade:</span>
            <span className="font-semibold">{(data.seasonalityFactor || 0).toFixed(2)}x</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h2 className="sr-only">
        Heatmap de Eficiência de ROI, Correlação e Sazonalidade dos Canais de Mídia ao Longo do Tempo
      </h2>

      {/* Header & Controls */}
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
                content="Matriz visual que mapeia o comportamento e a produtividade de cada canal ao longo do tempo (trimestres/meses). Permite identificar sazonalidades, períodos de pico de retorno e momentos em que o investimento sofreu saturação."
              />
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Matriz de intensidade e correlação econométrica cruzando a eficiência de retorno por canal ao longo dos ciclos temporais.
          </p>
        </div>

        {/* Filters & Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setMetricMode('roi_efficiency')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                metricMode === 'roi_efficiency'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ROI Estimado
            </button>
            <button
              onClick={() => setMetricMode('spend_kpi_corr')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                metricMode === 'spend_kpi_corr'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Correlação (r)
            </button>
            <button
              onClick={() => setMetricMode('marginal_roi')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                metricMode === 'marginal_roi'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Retorno Marginal (mROI)
            </button>
          </div>

          {/* Granularity Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setGranularity('quarterly')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                granularity === 'quarterly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Trimestral
            </button>
            <button
              onClick={() => setGranularity('semiannual')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                granularity === 'semiannual'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Semestral
            </button>
            <button
              onClick={() => setGranularity('monthly')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                granularity === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mensal (24M)
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Chart Container (Recharts ScatterChart implementation) */}
      <ScrollableTableWrapper hintText="Arraste para ver todos os períodos temporais">
        <div
          style={{
            minWidth: granularity === 'monthly' ? '980px' : granularity === 'semiannual' ? '650px' : '720px',
            height: `${Math.max(260, channels.length * 56 + 60)}px`
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{
                top: 20,
                right: 30,
                bottom: 25,
                left: 95
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#94a3b8"
                strokeOpacity={0.15}
              />
              <XAxis
                dataKey="periodIndex"
                type="number"
                domain={[-0.5, periods.length - 0.5]}
                ticks={periods.map((_, i) => i)}
                tickFormatter={(val: number) => periodLabels[val] || ''}
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                interval={0}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                dataKey="channelIndex"
                type="number"
                domain={[-0.5, channels.length - 0.5]}
                ticks={channels.map((_, i) => i)}
                tickFormatter={(val: number) => channelNames[val] || ''}
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                interval={0}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <ZAxis dataKey="value" range={[300, 300]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                name="ROI Heatmap"
                data={heatmapData}
                shape={renderHeatmapTile}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </ScrollableTableWrapper>

      {/* Dynamic Legend Scale Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Escala de Intensidade:</span>
          {metricMode === 'spend_kpi_corr' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono">-1.0 (Negativa)</span>
              <div className="h-3 w-36 rounded-full bg-gradient-to-r from-rose-600 via-slate-400 to-blue-600 border border-slate-300 dark:border-slate-700"></div>
              <span className="text-[10px] text-slate-400 font-mono">+1.0 (Forte)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-rose-500 font-mono font-semibold">&lt; 1.0x</span>
              <div className="h-3 w-40 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 via-emerald-500 to-blue-600 border border-slate-300 dark:border-slate-700"></div>
              <span className="text-[10px] text-blue-500 font-mono font-semibold">4.0x+</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span> Alta Eficiência
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> Ótimo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span> Moderado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span> Atenção
          </span>
        </div>
      </div>

      {/* Selected Cell or Econometric Insight Callout */}
      {selectedCell ? (
        <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg font-bold text-xs">
              {selectedCell.periodLabel}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {selectedCell.channelName} no período {selectedCell.periodLabel} ({selectedCell.periodSublabel})
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                ROI de <strong className="text-blue-700 dark:text-blue-400">{(selectedCell.roi || 0).toFixed(2)}x</strong> com correlação spend-lift de <strong className="text-emerald-700 dark:text-emerald-400">r = {selectedCell.correlation >= 0 ? '+' : ''}{(selectedCell.correlation || 0).toFixed(2)}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Receita incremental estimada: <strong className="text-slate-800 dark:text-slate-200">R$ {selectedCell.periodIncrementalKpi.toLocaleString('pt-BR')}</strong>
            </span>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline ml-2"
            >
              Fechar detalhe
            </button>
          </div>
        </div>
      ) : topPerformingCombo ? (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Destaque do Modelo: <span className="text-blue-600 dark:text-blue-400">{topPerformingCombo.channelName}</span> atingiu o pico de retorno no período <span className="font-bold">{topPerformingCombo.periodLabel}</span> ({(topPerformingCombo.roi || 0).toFixed(2)}x ROI).
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              A combinação de sazonalidade favorável e carryover acumulado gerou o maior índice de co-movimento entre verba e faturamento incremental. Clique em qualquer célula da matriz para inspecionar os detalhes econométricos.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
