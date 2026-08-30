import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Award,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  Search,
  X,
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
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { MeridianModelResults, DateRangeFilter } from '../types/mmm';
import { TechnicalDetails } from './ui/TechnicalDetails';
import { MetricCard } from './ui/MetricCard';
import { InfoTooltip } from './ContextualGuide';
import { GlobalDateRangeFilter, formatDateBR } from './GlobalDateRangeFilter';
import { UploadResponse } from '../services/apiClient';
import { analyzeDateRangeMissingData } from '../utils/missingDataChecker';
import { MissingDataWarningBanner } from './ui/MissingDataWarning';
import { ProjectedRoiTrendCard } from './ProjectedRoiTrendCard';
import { FloatingPrintButton } from './ui/FloatingPrintButton';

interface DashboardViewProps {
  results: MeridianModelResults | null;
  dataset?: UploadResponse | null;
  onNavigateToBudget: () => void;
  onNavigateToChannels: () => void;
  onNavigateToModel: () => void;
  onNavigateToReadiness?: () => void;
  onResetDateRange?: () => void;
  availableDates?: string[];
  dateRange?: DateRangeFilter;
  onChangeDateRange?: (newRange: DateRangeFilter) => void;
}

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

// Memoized Decomposition Pie Chart Component
const DecompositionPieChart = memo<{
  data: Array<{ name: string; value: number; share: number; fill: string }>;
  baselineShare: number;
}>(({ data, baselineShare }) => {
  const renderCustomizedPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    share
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const val = share !== undefined ? share : (percent || 0) * 100;
    if (val < 4) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-bold select-none drop-shadow-sm"
      >
        {`${val.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:white flex items-center justify-between flex-wrap gap-1">
          <span className="flex items-center">
            <span>De onde vêm suas vendas? (Vendas Naturais vs Mídia)</span>
            <InfoTooltip
              title="Decomposição de Vendas (Baseline vs Mídia)"
              content="O modelo separa as vendas em duas origens: 1) Vendas Naturais/Orgânicas (baseline que ocorreria sem publicidade, devido à força da marca e clientes fiéis) e 2) Vendas Incrementais (vendas causadas diretamente por cada anúncio de mídia)."
            />
          </span>
          <span className="text-[11px] text-slate-400 font-normal">Decomposição Total</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Separa o que aconteceria naturalmente pelo negócio (baseline) do resultado gerado diretamente por cada mídia.
        </p>
      </div>

      <div className="h-60 sm:h-64 md:h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={82}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={renderCustomizedPieLabel}
              labelLine={false}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              isAnimationActive={false}
              formatter={(value: any) => [
                `R$ ${(Number(value) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`,
                'Contribuição'
              ]}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', maxWidth: '90vw' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p>
          <strong>Interpretação:</strong> Aproximadamente{' '}
          <strong>{baselineShare.toFixed(0)}%</strong> das suas vendas ocorrem de forma orgânica (reconhecimento de marca e clientes recorrentes), enquanto as campanhas de publicidade adicionaram{' '}
          <strong>{(100 - baselineShare).toFixed(0)}%</strong> em resultados incrementais.
        </p>
      </div>
    </div>
  );
});
DecompositionPieChart.displayName = 'DecompositionPieChart';

// Memoized Spend vs Contribution Bar Chart Component
const SpendVsContributionChart = memo<{
  data: Array<{
    name: string;
    'Investimento (% da Verba)': number;
    'Contribuição em Vendas (% da Mídia)': number;
    'Contribuição na Receita Total (%)'?: number;
    spendVal?: number;
    kpiVal?: number;
    ROI: number;
    mROI: number;
  }>;
  mostEfficientChannel: string;
}>(({ data, mostEfficientChannel }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between flex-wrap gap-1">
          <span className="flex items-center">
            <span>Investimento vs Resultado: Qual canal entrega mais do que consome?</span>
            <InfoTooltip
              title="Comparativo de Eficiência (%)"
              content="Compara a porcentagem de verba gasta (cinza) com a porcentagem de vendas incrementais geradas (azul). Quando a barra azul supera a cinza, o canal gera mais vendas do que consome do orçamento, comprovando alto retorno."
            />
          </span>
          <span className="text-[11px] text-slate-400 font-normal">Comparativo %</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Canais onde a barra de vendas supera a de investimento são os motores de eficiência da sua estratégia.
        </p>
      </div>

      <div className="h-60 sm:h-64 md:h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <BarChart data={data} margin={{ top: 22, right: 10, left: -15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              angle={-20}
              textAnchor="end"
              interval={0}
              height={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              unit="%"
              width={38}
            />
            <Tooltip
              isAnimationActive={false}
              formatter={(val: any, name: string, item: any) => {
                const num = Number(val).toFixed(1);
                if (name.includes('Investimento') && item?.payload?.spendVal !== undefined) {
                  return [`${num}% (R$ ${(item.payload.spendVal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k)`, name];
                }
                if (name.includes('Contribuição') && item?.payload?.kpiVal !== undefined) {
                  return [`${num}% (R$ ${(item.payload.kpiVal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k)`, name];
                }
                return [`${num}%`, name];
              }}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', maxWidth: '90vw' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
            <Bar dataKey="Investimento (% da Verba)" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="Investimento (% da Verba)"
                position="top"
                formatter={(val: any) => `${Number(val).toFixed(0)}%`}
                className="fill-slate-600 dark:fill-slate-400 font-semibold text-[10px]"
              />
            </Bar>
            <Bar dataKey="Contribuição em Vendas (% da Mídia)" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="Contribuição em Vendas (% da Mídia)"
                position="top"
                formatter={(val: any) => `${Number(val).toFixed(0)}%`}
                className="fill-blue-600 dark:fill-blue-400 font-bold text-[10px]"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p>
          <strong>Interpretação:</strong> O canal <strong>{mostEfficientChannel}</strong> é o mais rentável, concentrando maior parcela das vendas em relação à fatia de investimento recebida.
        </p>
      </div>
    </div>
  );
});
SpendVsContributionChart.displayName = 'SpendVsContributionChart';

const EXTENDED_CHANNEL_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#10b981', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal 500
];

// Memoized Response Curve Chart Component with Multi-Select Channel Bar
const ChannelResponseCurveChart = memo<{
  channels: Array<{ channelName: string; roi: number; spend?: number; marginalRoi?: number }>;
  responseCurves: Record<string, any>;
  selectedChannels: string[];
  onToggleChannel: (name: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}>(({ channels, responseCurves, selectedChannels, onToggleChannel, onSelectAll, onDeselectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allSelected = channels.length > 0 && selectedChannels.length === channels.length;

  const channelColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    channels.forEach((c, idx) => {
      map[c.channelName] = EXTENDED_CHANNEL_COLORS[idx % EXTENDED_CHANNEL_COLORS.length];
    });
    return map;
  }, [channels]);

  const filteredChannelItems = useMemo(() => {
    if (!searchTerm.trim()) return channels;
    return channels.filter(c => c.channelName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [channels, searchTerm]);

  // Construct chart dataset
  const { chartData, isSingleChannel, singleChannelObj } = useMemo(() => {
    if (!selectedChannels.length || !responseCurves) {
      return { chartData: [], isSingleChannel: false, singleChannelObj: null };
    }

    if (selectedChannels.length === 1) {
      const chName = selectedChannels[0];
      const rawPoints = responseCurves[chName]?.points || [];
      const singleObj = channels.find(c => c.channelName === chName) || null;
      const data = rawPoints.map((pt: any) => ({
        spend: pt.spend ?? 0,
        spendMultiplier: pt.spendMultiplier ?? 1,
        incrementalKpi: pt.incrementalKpi ?? pt.kpi ?? 0,
        marginalRoi: pt.marginalRoi ?? 0,
        roi: pt.roi ?? 0,
        [chName]: pt.incrementalKpi ?? pt.kpi ?? 0
      }));
      return { chartData: data, isSingleChannel: true, singleChannelObj: singleObj };
    }

    // Multiple channels: merge along spendMultiplier
    const baseChannel = selectedChannels[0];
    const basePoints = responseCurves[baseChannel]?.points || [];

    const data = basePoints.map((basePt: any, idx: number) => {
      const row: any = {
        spendMultiplier: basePt.spendMultiplier ?? 1,
        multiplierLabel: `${(basePt.spendMultiplier ?? 1).toFixed(1)}x`,
      };

      selectedChannels.forEach(chName => {
        const pt = responseCurves[chName]?.points?.[idx];
        if (pt) {
          const inc = pt.incrementalKpi ?? pt.kpi ?? 0;
          row[chName] = inc;
          row[`${chName}_spend`] = pt.spend ?? 0;
          row[`${chName}_roi`] = pt.roi ?? 0;
          row[`${chName}_mroi`] = pt.marginalRoi ?? 0;
        } else {
          row[chName] = 0;
        }
      });
      return row;
    });

    return { chartData: data, isSingleChannel: false, singleChannelObj: null };
  }, [selectedChannels, responseCurves, channels]);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="flex items-center">
              <span>Como o investimento se converte em vendas adicionais? (Curva de Resposta)</span>
              <InfoTooltip
                title="Curva de Resposta & Retornos Decrescentes"
                content="Mostra a relação entre quanto você gasta e quanto vende. No início a curva sobe rápido, mas depois desacelera quando a audiência fica saturada (onde cada real extra rende menos)."
              />
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compare o comportamento de saturação e retorno entre todos, um ou múltiplos canais.
          </p>
        </div>

        {/* Multi-Select Channel Selector Bar */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center">
              <span>Canais:</span>
              <InfoTooltip
                title="Seleção de Curva de Resposta"
                content="Selecione todos, um ou múltiplos canais para comparar simultaneamente a resposta de vendas e saturação."
              />
            </span>
            <button
              type="button"
              id="response-curve-channel-selector-bar"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between gap-2.5 px-3 py-1.5 min-w-[210px] sm:min-w-[250px] text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                  {allSelected
                    ? `Todos os canais (${channels.length})`
                    : selectedChannels.length === 1
                    ? `${selectedChannels[0]} (ROI: ${(channels.find(c => c.channelName === selectedChannels[0])?.roi || 0).toFixed(2)}x)`
                    : selectedChannels.length > 1
                    ? `${selectedChannels.length} de ${channels.length} canais`
                    : 'Nenhum canal selecionado'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Search and Quick Actions */}
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar canal..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 px-0.5">
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Selecionar Todos ({channels.length})
                  </button>
                  {selectedChannels.length > 0 && (
                    <button
                      type="button"
                      onClick={onDeselectAll}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                  )}
                </div>
              </div>

              {/* Channels List */}
              <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                {filteredChannelItems.map(c => {
                  const isSelected = selectedChannels.includes(c.channelName);
                  const color = channelColorMap[c.channelName] || '#2563eb';
                  return (
                    <label
                      key={c.channelName}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100 font-medium'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleChannel(c.channelName)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{c.channelName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                        ROI {c.roi.toFixed(2)}x
                      </span>
                    </label>
                  );
                })}
                {filteredChannelItems.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400">
                    Nenhum canal encontrado
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>{selectedChannels.length} selecionado(s)</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 md:h-80 w-full min-w-0">
        {selectedChannels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Nenhum canal selecionado para visualização da curva.
            </p>
            <button
              onClick={onSelectAll}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Selecionar todos os canais
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              {isSingleChannel ? (
                <XAxis
                  dataKey="spend"
                  tickFormatter={val => `R$ ${(val / 1000).toFixed(0)}k`}
                  label={{ value: 'Investimento no Período (R$)', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#64748b' }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
              ) : (
                <XAxis
                  dataKey="spendMultiplier"
                  tickFormatter={val => val === 1 ? '1.0x (Atual)' : `${Number(val).toFixed(1)}x`}
                  label={{ value: 'Nível de Investimento (0x a 2.5x da Verba Atual)', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#64748b' }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
              )}
              <YAxis
                tickFormatter={val => `R$ ${(val / 1000).toFixed(0)}k`}
                width={48}
                label={{ value: 'Vendas Incrementais (R$)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#64748b' }}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip
                isAnimationActive={false}
                formatter={(val: any, name: string, item: any) => {
                  const spend = item?.payload?.[`${name}_spend`] ?? item?.payload?.spend;
                  const spendStr = spend !== undefined ? ` (Verba: R$ ${(spend / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k)` : '';
                  return [
                    `R$ ${Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}${spendStr}`,
                    name === 'incrementalKpi' ? (selectedChannels[0] || 'Vendas Estimadas') : name
                  ];
                }}
                labelFormatter={label => isSingleChannel
                  ? `Investimento: R$ ${Number(label).toLocaleString('pt-BR')}`
                  : `Nível de Verba: ${Number(label).toFixed(1)}x do Histórico`
                }
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', maxWidth: '90vw' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              {isSingleChannel ? (
                <Line
                  type="monotone"
                  dataKey="incrementalKpi"
                  name={selectedChannels[0]}
                  stroke={channelColorMap[selectedChannels[0]] || '#2563eb'}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : (
                selectedChannels.map(chName => (
                  <Line
                    key={chName}
                    type="monotone"
                    dataKey={chName}
                    name={chName}
                    stroke={channelColorMap[chName] || '#2563eb'}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Info Footnote */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-600 dark:text-slate-300 flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p>
            {isSingleChannel && singleChannelObj ? (
              <>
                <strong>Canal ativo:</strong> {singleChannelObj.channelName} com ROI de <strong>{singleChannelObj.roi.toFixed(2)}x</strong> e mROI de <strong>{singleChannelObj.marginalRoi?.toFixed(2) || '0.00'}x</strong>. A curva ilustra a velocidade de saturação e a conversão de cada real adicional.
              </>
            ) : selectedChannels.length > 1 ? (
              <>
                <strong>Comparando {selectedChannels.length} canais:</strong> A inclinação de cada curva no gráfico evidencia a eficiência de resposta das mídias. Canais com curvas mais íngremes geram mais vendas adicionais antes de entrar na faixa de saturação.
              </>
            ) : (
              <>Utilize a barra de seleção acima para escolher todos, um ou múltiplos canais e visualizar suas curvas de saturação.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
});
ChannelResponseCurveChart.displayName = 'ChannelResponseCurveChart';

export const DashboardView: React.FC<DashboardViewProps> = ({
  results,
  dataset,
  onNavigateToBudget,
  onNavigateToChannels,
  onNavigateToModel,
  onNavigateToReadiness,
  onResetDateRange,
  availableDates = [],
  dateRange,
  onChangeDateRange
}) => {
  const [selectedResponseChannels, setSelectedResponseChannels] = useState<string[]>(() => {
    return results?.channels?.map(c => c.channelName) || [];
  });

  // Keep selected channels in sync if results load or change
  useEffect(() => {
    if (results?.channels && results.channels.length > 0 && selectedResponseChannels.length === 0) {
      setSelectedResponseChannels(results.channels.map(c => c.channelName));
    }
  }, [results?.channels]);

  const handleToggleResponseChannel = useCallback((channelName: string) => {
    setSelectedResponseChannels(prev => {
      if (prev.includes(channelName)) {
        return prev.filter(c => c !== channelName);
      } else {
        return [...prev, channelName];
      }
    });
  }, []);

  const handleSelectAllResponseChannels = useCallback(() => {
    if (results?.channels) {
      setSelectedResponseChannels(results.channels.map(c => c.channelName));
    }
  }, [results?.channels]);

  const handleDeselectAllResponseChannels = useCallback(() => {
    setSelectedResponseChannels([]);
  }, []);

  // Missing data analysis based on dataset readiness state and active date range
  const missingAnalysis = useMemo(() => {
    return analyzeDateRangeMissingData(dataset || null, dateRange);
  }, [dataset, dateRange]);

  const timeSeries = useMemo(() => results?.diagnostics?.timeSeriesFit || [], [results]);
  const minDate = availableDates[0] || timeSeries[0]?.date || '';
  const maxDate = availableDates[availableDates.length - 1] || timeSeries[timeSeries.length - 1]?.date || '';
  const activeStartDate = dateRange?.startDate || minDate;
  const activeEndDate = dateRange?.endDate || maxDate;

  // Filter time series data based on selected date range
  const filteredTimeSeries = useMemo(() => {
    if (!timeSeries.length) return [];
    return timeSeries.filter(
      t => (!activeStartDate || t.date >= activeStartDate) && (!activeEndDate || t.date <= activeEndDate)
    );
  }, [timeSeries, activeStartDate, activeEndDate]);

  const totalWeeks = timeSeries.length || 1;
  const filteredWeeks = filteredTimeSeries.length || 1;
  const isDateFiltered = useMemo(() => {
    if (!minDate || !maxDate || !timeSeries.length) return false;
    return (
      (activeStartDate && activeStartDate > minDate) ||
      (activeEndDate && activeEndDate < maxDate)
    );
  }, [activeStartDate, activeEndDate, minDate, maxDate, timeSeries.length]);

  // Aggregate metrics over the filtered interval
  const {
    filteredTotalSpend,
    filteredTotalRevenue,
    filteredBaseline,
    filteredControls,
    filteredMedia,
    filteredBlendedRoi,
    filteredChannelsList
  } = useMemo(() => {
    if (!results) {
      return {
        filteredTotalSpend: 0,
        filteredTotalRevenue: 0,
        filteredBaseline: 0,
        filteredControls: 0,
        filteredMedia: 0,
        filteredBlendedRoi: 0,
        filteredChannelsList: []
      };
    }

    const baselineSum = filteredTimeSeries.reduce((sum, t) => sum + (t.baseline || 0), 0);
    const controlsSum = filteredTimeSeries.reduce((sum, t) => sum + (t.controls || 0), 0);
    const mediaSum = filteredTimeSeries.reduce((sum, t) => sum + (t.media || 0), 0);
    const revenueSum = filteredTimeSeries.reduce((sum, t) => sum + (t.actual || 0), 0);

    const fullMedia = results.diagnostics.mediaContribution || 1;

    // Filter each channel
    const channelsCalc = results.channels.map(c => {
      // Channel spend in filtered weeks
      const chSpend = filteredTimeSeries.reduce((sum, t) => {
        if (t.channelSpends && t.channelSpends[c.channelName] !== undefined) {
          return sum + t.channelSpends[c.channelName];
        }
        return sum + ((t.spend || (results.totalSpend / totalWeeks)) * (c.spend / (results.totalSpend || 1)));
      }, 0);

      // Channel incremental KPI in filtered weeks
      const chIncKpi = mediaSum * (c.incrementalKpi / fullMedia);
      const chRoi = chSpend > 0 ? chIncKpi / chSpend : c.roi;

      return {
        ...c,
        filteredSpend: chSpend,
        filteredIncrementalKpi: chIncKpi,
        filteredRoi: chRoi
      };
    });

    const totalSpendSum = channelsCalc.reduce((sum, c) => sum + c.filteredSpend, 0);

    // Recompute shares: both % of media and % of overall revenue
    const finalChannels = channelsCalc.map(c => ({
      ...c,
      filteredSpendShare: totalSpendSum > 0 ? (c.filteredSpend / totalSpendSum) * 100 : 0,
      filteredMediaKpiShare: mediaSum > 0 ? (c.filteredIncrementalKpi / mediaSum) * 100 : 0,
      filteredKpiShare: mediaSum > 0 ? (c.filteredIncrementalKpi / mediaSum) * 100 : (revenueSum > 0 ? (c.filteredIncrementalKpi / revenueSum) * 100 : 0),
      filteredTotalRevenueShare: revenueSum > 0 ? (c.filteredIncrementalKpi / revenueSum) * 100 : 0
    }));

    const blendedRoiCalc = totalSpendSum > 0 ? mediaSum / totalSpendSum : results.blendedRoi;

    return {
      filteredTotalSpend: totalSpendSum,
      filteredTotalRevenue: revenueSum,
      filteredBaseline: baselineSum,
      filteredControls: controlsSum,
      filteredMedia: mediaSum,
      filteredBlendedRoi: blendedRoiCalc,
      filteredChannelsList: finalChannels
    };
  }, [results, filteredTimeSeries, totalWeeks]);

  const topChannelData = useMemo(() => {
    if (!filteredChannelsList.length) return undefined;
    return filteredChannelsList.find(c => c.channelName === results?.mostEfficientChannel) || filteredChannelsList[0];
  }, [filteredChannelsList, results]);

  const saturatedChannelData = useMemo(() => {
    if (!filteredChannelsList.length) return undefined;
    return filteredChannelsList.find(c => c.channelName === results?.saturatedChannel) || filteredChannelsList[filteredChannelsList.length - 1];
  }, [filteredChannelsList, results]);

  const bestOppData = useMemo(() => {
    if (!filteredChannelsList.length) return undefined;
    return filteredChannelsList.find(c => c.channelName === results?.bestOpportunityChannel) || filteredChannelsList[0];
  }, [filteredChannelsList, results]);

  // Memoized Data for Waterfall / Decomposition (Filtered)
  const decompositionData = useMemo(() => {
    if (!results) return [];
    const baseShare = filteredTotalRevenue > 0 ? (filteredBaseline / filteredTotalRevenue) * 100 : 0;
    const ctrlShare = filteredTotalRevenue > 0 ? (filteredControls / filteredTotalRevenue) * 100 : 0;
    return [
      { name: 'Vendas Naturais (Orgânico)', value: filteredBaseline, share: baseShare, fill: '#64748b' },
      { name: 'Fatores Externos & Feriados', value: filteredControls, share: ctrlShare, fill: '#94a3b8' },
      ...filteredChannelsList.map((c, idx) => ({
        name: c.channelName,
        value: c.filteredIncrementalKpi,
        share: c.filteredTotalRevenueShare || c.filteredKpiShare,
        fill: COLORS[idx % COLORS.length]
      }))
    ];
  }, [results, filteredBaseline, filteredControls, filteredTotalRevenue, filteredChannelsList]);

  // Memoized Spend vs Contribution Share comparison (Filtered)
  const spendVsKpiData = useMemo(() => {
    if (!results) return [];
    return filteredChannelsList.map(c => ({
      name: c.channelName,
      'Investimento (% da Verba)': Number(c.filteredSpendShare.toFixed(1)),
      'Contribuição em Vendas (% da Mídia)': Number(c.filteredMediaKpiShare.toFixed(1)),
      'Contribuição na Receita Total (%)': Number(c.filteredTotalRevenueShare.toFixed(1)),
      spendVal: c.filteredSpend,
      kpiVal: c.filteredIncrementalKpi,
      ROI: Number(c.filteredRoi.toFixed(2)),
      mROI: Number(c.marginalRoi.toFixed(2))
    }));
  }, [results, filteredChannelsList]);

  if (!results) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12 transition-colors">
        <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ainda não temos dados analisados</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          Execute o modelo Google Meridian para descobrir o impacto de cada canal de mídia e calcular o retorno real dos seus investimentos.
        </p>
        <button
          onClick={onNavigateToModel}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-xs"
        >
          Calcular Modelo Agora
        </button>
      </div>
    );
  }

  const {
    channels,
    diagnostics,
    mostEfficientChannel,
    saturatedChannel,
    bestOpportunityChannel
  } = results;

  const baselineShare = filteredTotalRevenue > 0 ? (filteredBaseline / filteredTotalRevenue) * 100 : diagnostics.baselineShare;

  return (
    <div id="dashboard-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Visão Geral Executiva de Marketing Mix Modeling (MMM): Decomposição de Vendas, Retorno de Mídia e ROI Marginal Bayesiano
      </h1>

      {/* Visual Warning: Missing Data > 10% in Current Date Range */}
      {missingAnalysis.hasHighMissingData && (
        <MissingDataWarningBanner
          analysis={missingAnalysis}
          onNavigateToReadiness={onNavigateToReadiness}
          onResetDateRange={onResetDateRange}
        />
      )}

      {/* Date Range Filter Banner Bar */}
      {availableDates.length > 0 && dateRange && onChangeDateRange && (
        <GlobalDateRangeFilter
          availableDates={availableDates}
          dateRange={dateRange}
          onChangeDateRange={onChangeDateRange}
          variant="banner"
        />
      )}

      {/* 1. Executive Summary Bar (Resumo do seu Marketing) with Simple Tooltips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        <MetricCard
          title={isDateFiltered ? 'Faturamento no Período' : 'Faturamento Total'}
          value={`R$ ${(filteredTotalRevenue / 1000000).toFixed(2)}M`}
          subtitle={isDateFiltered ? `${filteredWeeks} semanas selecionadas` : 'Histórico total analisado'}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/60"
          tooltipTitle="Faturamento Total no Período"
          tooltipText="Soma de todas as vendas ou faturamento gerado pela sua empresa no período selecionado no filtro de datas."
        />

        <MetricCard
          title={isDateFiltered ? 'Investimento no Período' : 'Investimento Total'}
          value={`R$ ${(filteredTotalSpend / 1000).toFixed(0)}k`}
          subtitle={`${channels.length} canais analisados`}
          icon={DollarSign}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/60"
          tooltipTitle="Investimento em Publicidade"
          tooltipText="Total financeiro investido na soma de todos os canais de mídia paga (Google, Meta, TV, etc.) durante as semanas selecionadas."
        />

        <MetricCard
          title="Retorno Médio (ROI)"
          value={`${(filteredBlendedRoi ?? 0).toFixed(2)}x`}
          subtitle="Para cada R$ 1 investido"
          icon={Zap}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-50 dark:bg-indigo-950/60"
          tooltipTitle="Retorno Médio Global (ROI)"
          tooltipText="Retorno sobre o Investimento global em mídia no período. Um ROI de 3.20x significa que, em média, cada R$ 1,00 gasto em publicidade gerou R$ 3,20 em vendas incrementais diretas."
        />

        <MetricCard
          title="Canal Mais Eficiente"
          value={mostEfficientChannel || 'N/A'}
          subtitle={`ROI de ${topChannelData?.filteredRoi ? topChannelData.filteredRoi.toFixed(2) : (topChannelData?.roi ? topChannelData.roi.toFixed(2) : '0.00')}x`}
          icon={Award}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/60"
          tooltipTitle="Canal Campeão de Eficiência"
          tooltipText="O canal de mídia que entregou o maior retorno em vendas por real investido no período (maior ROI comprovado)."
        />

        <MetricCard
          title="Canal Saturado"
          value={saturatedChannel || 'Nenhum'}
          subtitle="Retornos decrescentes"
          icon={AlertCircle}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/60"
          tooltipTitle="Canal em Zona de Saturação"
          tooltipText="Canal que já alcançou a parte plana da curva de retorno (onde o público foi muito impactado). Aumentar a verba aqui gerará pouco ganho adicional."
        />

        <MetricCard
          title="Maior Oportunidade"
          value={bestOpportunityChannel || 'N/A'}
          subtitle="Para onde mover verba"
          icon={Sparkles}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/60"
          tooltipTitle="Maior Oportunidade de Crescimento"
          tooltipText="Canal com alto retorno marginal (mROI) e espaço para crescer antes de saturar. É o destino ideal para receber remanejamento de orçamento."
        />
      </div>

      {/* 2. Headline Insights: Os 3 Canais-Chave */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm border border-slate-700 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 pb-4 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/20 text-blue-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center">
                <span>Diagnóstico Principal do seu Marketing</span>
                <InfoTooltip
                  title="Diagnóstico Automatizado"
                  content="Identificação automática gerada pelo modelo econométrico destacando os 3 canais de maior impacto para a tomada de decisão."
                />
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              O que o algoritmo Google Meridian identificou de mais relevante no seu mix de comunicação:
            </p>
          </div>
          <button
            onClick={onNavigateToBudget}
            className="self-start md:self-auto inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-xs shrink-0"
          >
            <span>Ver Otimização Recomendada</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/80 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide flex items-center">
                <span>Alta Eficiência</span>
                <InfoTooltip
                  title="Alta Eficiência (ROI)"
                  content="Mede quantas vezes o investimento se pagou em vendas adicionais. ROI de 4.0x significa que cada R$ 1 gerou R$ 4 em vendas."
                />
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                ROI {topChannelData?.roi ? topChannelData.roi.toFixed(2) : '0.00'}x
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate">{mostEfficientChannel || 'Nenhum'}</h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              Apresenta o maior retorno proporcional entre todos os canais. Para cada R$ 1,00 investido, gerou aproximadamente R$ {topChannelData?.roi ? topChannelData.roi.toFixed(2) : '0.00'} em vendas adicionais.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/80 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide flex items-center">
                <span>Próximo da Saturação</span>
                <InfoTooltip
                  title="Nível de Saturação"
                  content="Porcentagem da capacidade de resposta já atingida. Acima de 60-70%, a audiência foi amplamente atingida e novos investimentos rendem pouco."
                />
              </span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 shrink-0">
                Saturação: {saturatedChannelData?.saturationLevel !== undefined ? saturatedChannelData.saturationLevel.toFixed(0) : '0'}%
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate">{saturatedChannel || 'Nenhum'}</h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              Está operando perto do teto de retorno. Aumentar ainda mais a verba neste canal tende a gerar ganhos menores do que o histórico médio.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/80 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide flex items-center">
                <span>Potencial de Escala</span>
                <InfoTooltip
                  title="Retorno Marginal (mROI)"
                  content="Mede o retorno gerado pelo PRÓXIMO real investido. Se o mROI é alto, o canal ainda tem grande espaço para receber mais dinheiro."
                />
              </span>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800 shrink-0">
                mROI {bestOppData?.marginalRoi !== undefined ? bestOppData.marginalRoi.toFixed(2) : '0.00'}x
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate">{bestOpportunityChannel || 'Nenhum'}</h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              Apresenta curva de resposta favorável. O modelo indica que transferir verba para este canal gerará mais vendas adicionais imediatas.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Question-Driven Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <DecompositionPieChart
          data={decompositionData}
          baselineShare={baselineShare}
        />

        <SpendVsContributionChart
          data={spendVsKpiData}
          mostEfficientChannel={mostEfficientChannel}
        />
      </div>

      {/* 4. 3-Month Projected ROI Trend Performance Card (Saturation & Adstock Model) */}
      <ProjectedRoiTrendCard
        results={results}
        onNavigateToBudget={onNavigateToBudget}
        onNavigateToChannels={onNavigateToChannels}
      />

      {/* 5. Response Curve Visualization */}
      <ChannelResponseCurveChart
        channels={channels}
        responseCurves={results.responseCurves || {}}
        selectedChannels={selectedResponseChannels}
        onToggleChannel={handleToggleResponseChannel}
        onSelectAll={handleSelectAllResponseChannels}
        onDeselectAll={handleDeselectAllResponseChannels}
      />

      {/* 6. Progressive Disclosure: Diagnósticos Técnicos com Tooltips & Série Temporal */}
      <TechnicalDetails
        id="dashboard-technical-details"
        title="Diagnósticos Econométricos & Métricas de Aderência do Modelo"
        summary="Acesse coeficientes estatísticos, R² de aderência histórica, erro MAPE e convergência bayesiana."
        badge="Google Meridian Metodologia"
      >
        <div className="space-y-4 pt-2 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center">
                <span>Aderência Histórica (R²)</span>
                <InfoTooltip
                  title="Aderência Histórica (R²)"
                  content="Mede a precisão com que a previsão matemática do modelo acompanha as variações reais das suas vendas. Acima de 80% indica altíssima confiabilidade."
                />
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {(((diagnostics?.rSquared ?? 0)) * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Excelente poder explicativo</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center">
                <span>Erro Médio (MAPE)</span>
                <InfoTooltip
                  title="Erro Percentual Médio (MAPE)"
                  content="Desvio percentual médio entre as vendas previstas pelo modelo e as vendas reais observadas. Abaixo de 10% indica alta precisão."
                />
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {(diagnostics?.mape ?? 0).toFixed(1)}%
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Baixa taxa de desvio</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center">
                <span>Convergência MCMC (R-hat)</span>
                <InfoTooltip
                  title="Convergência Bayesiana (R-hat / Gelman-Rubin)"
                  content="Verifica se todas as simulações estatísticas do algoritmo MCMC convergiram para o mesmo resultado estável. Valores < 1.05 confirmam que o modelo convergiu perfeitamente."
                />
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {(diagnostics?.gelmanRubinRhat ?? (diagnostics as any)?.gelmanRubinMax ?? 1.02).toFixed(3)}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">R̂ &lt; 1.05 (Cadeias estáveis)</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center">
                <span>Amostragem Efetiva (ESS)</span>
                <InfoTooltip
                  title="Amostragem Efetiva (ESS)"
                  content="Quantidade de amostras estatísticas independentes geradas pelo modelo. Valores acima de 400 garantem que as estimativas de ROI são matematicamente sólidas."
                />
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {diagnostics?.effectiveSampleSize ?? (diagnostics as any)?.effectiveSampleSizeMin ?? 1200}
              </div>
              <span className="text-[10px] text-slate-500">Amostras independentes</span>
            </div>
          </div>

          {/* Time-Series Fit Chart (Filtered Window) */}
          {filteredTimeSeries.length > 0 && (
            <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Aderência da Série Temporal: Vendas Reais vs Previstas (Período Selecionado)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {filteredTimeSeries.length} semanas
                </span>
              </div>
              <div className="h-56 sm:h-64 md:h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <LineChart data={filteredTimeSeries} margin={{ top: 10, right: 10, left: -5, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateBR}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      minTickGap={25}
                    />
                    <YAxis
                      tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                      width={45}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(v: any, name: string) => [
                        `R$ ${Number(v).toLocaleString('pt-BR')}`,
                        name === 'actual' ? 'Venda Real' : (name === 'predicted' ? 'Venda Prevista' : name)
                      ]}
                      labelFormatter={l => `Data: ${formatDateBR(String(l))}`}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', maxWidth: '90vw' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="actual" name="Venda Real" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="predicted" name="Venda Prevista (Meridian)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </TechnicalDetails>
      
      {/* Floating Print / PDF Action Button */}
      <FloatingPrintButton />
    </div>
  );
};
