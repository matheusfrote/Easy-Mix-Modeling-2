import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  TrendingUp,
  Info,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { BudgetReallocation } from '../../types/mmm';

interface ThresholdMeterProps {
  reallocation: BudgetReallocation;
  showDetails?: boolean;
}

export const ThresholdMeter: React.FC<ThresholdMeterProps> = ({
  reallocation,
  showDetails = false
}) => {
  const currentSpend = reallocation.currentSpend;
  const recSpend = reallocation.recommendedSpend;
  const safePct = reallocation.safeThresholdPercentage ?? 25;
  const deltaPct = reallocation.percentageChange ?? (currentSpend > 0 ? ((recSpend - currentSpend) / currentSpend) * 100 : 0);
  const absDeltaPct = Math.abs(deltaPct);
  
  const minSafe = reallocation.minSafeSpend ?? Math.round(currentSpend * (1 - safePct / 100));
  const maxSafe = reallocation.maxSafeSpend ?? Math.round(currentSpend * (1 + safePct / 100));

  const riskLevel: 'safe' | 'moderate' | 'high' =
    reallocation.thresholdRiskLevel ??
    (absDeltaPct <= safePct ? 'safe' : absDeltaPct <= safePct * 1.5 ? 'moderate' : 'high');

  // Calculate percentage along a normalized scale [-100%, +100%]
  // Range is from -80% to +80% for visual balance, clamped between 5% and 95%
  const scaleMax = 80;
  const clampedDelta = Math.max(-scaleMax, Math.min(scaleMax, deltaPct));
  const needlePos = ((clampedDelta + scaleMax) / (2 * scaleMax)) * 100;

  // Safe band boundaries on the same 0-100% scale
  const safeLeft = ((-safePct + scaleMax) / (2 * scaleMax)) * 100;
  const safeRight = ((safePct + scaleMax) / (2 * scaleMax)) * 100;
  const safeWidth = safeRight - safeLeft;

  const getRiskColors = () => {
    switch (riskLevel) {
      case 'high':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/60',
          border: 'border-rose-200 dark:border-rose-800',
          text: 'text-rose-700 dark:text-rose-300',
          indicator: 'bg-rose-600 ring-rose-300 dark:ring-rose-900',
          label: 'Excede Margem de Erro',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          indicator: 'bg-amber-500 ring-amber-300 dark:ring-amber-900',
          label: 'Atenção: Variação Moderada',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        };
      case 'safe':
      default:
        return {
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
          border: 'border-emerald-200 dark:border-emerald-800/80',
          text: 'text-emerald-700 dark:text-emerald-300',
          indicator: 'bg-emerald-600 ring-emerald-300 dark:ring-emerald-900',
          label: 'Dentro da Margem Segura',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        };
    }
  };

  const colors = getRiskColors();

  return (
    <div className="space-y-1.5 min-w-[170px]" id={`threshold-indicator-${reallocation.channelName.toLowerCase().replace(/\s+/g, '-')}`}>
      {/* Top Status & Badge */}
      <div className="flex items-center justify-between gap-1.5">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${colors.bg} ${colors.border} ${colors.text}`}
          title={`Margem de segurança estimada para este canal: ±${safePct}%. Variação proposta: ${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%.`}
        >
          {colors.icon}
          <span>{colors.label}</span>
        </span>
        <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          ±{safePct}%
        </span>
      </div>

      {/* Visual Track Gauge */}
      <div className="relative pt-1 pb-1">
        {/* Background track */}
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
          {/* Safe Corridor Band */}
          <div
            className="absolute top-0 bottom-0 bg-emerald-300/80 dark:bg-emerald-600/50 rounded-xs"
            style={{ left: `${safeLeft}%`, width: `${safeWidth}%` }}
            title={`Faixa Segura Recomendada: -${safePct}% a +${safePct}%`}
          />
          {/* Baseline Center Tick (0% delta) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-0"
            style={{ left: '50%' }}
          />
        </div>

        {/* Needle Marker Indicator */}
        <div
          className="absolute top-0.5 -ml-1.5 z-10 transition-all duration-300"
          style={{ left: `${needlePos}%` }}
          title={`Proposta: ${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
        >
          <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ring-2 shadow-xs ${colors.indicator}`} />
        </div>
      </div>

      {/* Numerical Safe Window Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span title="Limite inferior seguro">Min: R$ {(minSafe / 1000).toFixed(0)}k</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">Atual</span>
        <span title="Limite superior seguro">Max: R$ {(maxSafe / 1000).toFixed(0)}k</span>
      </div>

      {showDetails && (
        <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
          {riskLevel === 'high' ? (
            <p className="text-rose-600 dark:text-rose-400 font-medium leading-tight">
              ⚠️ Incerteza elevada (+{((reallocation.uncertaintyMultiplier ?? 1.3) * 10 - 10).toFixed(0)}% na projeção). Recomenda-se transição gradual.
            </p>
          ) : riskLevel === 'moderate' ? (
            <p className="text-amber-600 dark:text-amber-400 leading-tight">
              Aproximando-se do limite de confiança histórica.
            </p>
          ) : (
            <p className="text-emerald-600 dark:text-emerald-400 leading-tight">
              Projeção com alta robustez estatística.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface ThresholdAlertBannerProps {
  exceededChannels: BudgetReallocation[];
  onApplySafetyClamp?: () => void;
}

export const ThresholdAlertBanner: React.FC<ThresholdAlertBannerProps> = ({
  exceededChannels,
  onApplySafetyClamp
}) => {
  if (!exceededChannels || exceededChannels.length === 0) {
    return null;
  }

  const count = exceededChannels.length;

  return (
    <div
      id="budget-threshold-alert-banner"
      className="p-4 bg-amber-50/95 dark:bg-amber-950/40 border-l-4 border-amber-500 dark:border-amber-400 rounded-r-xl rounded-l-xs shadow-xs space-y-3 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                Aviso de Margem de Erro & Extrapolação de Orçamento
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                {count} {count === 1 ? 'canal excede' : 'canais excedem'} o limite recomendado
              </span>
            </div>

            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
              Grandes variações de investimento em relação ao histórico observado aumentam a margem de erro econométrica das projeções. Os seguintes canais receberam propostas fora da faixa de segurança:
            </p>

            {/* List of affected channels with badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {exceededChannels.map(ch => {
                const delta = ch.percentageChange ?? (ch.currentSpend > 0 ? ((ch.recommendedSpend - ch.currentSpend) / ch.currentSpend) * 100 : 0);
                const safe = ch.safeThresholdPercentage ?? 25;
                const isHigh = ch.thresholdRiskLevel === 'high';

                return (
                  <div
                    key={ch.channelName}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      isHigh
                        ? 'bg-rose-100/90 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        : 'bg-amber-100/90 dark:bg-amber-900/80 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <span className="font-bold">{ch.channelName}:</span>
                    <span className="font-mono">
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                    </span>
                    <span className="text-[10px] opacity-75 font-normal">
                      (limite: ±{safe}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {onApplySafetyClamp && (
          <button
            type="button"
            id="btn-apply-safety-clamp"
            onClick={onApplySafetyClamp}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5 self-start sm:self-center"
            title="Aplica restrições para limitar a variação de cada canal à margem segura recomendada"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Limitar à Margem Segura</span>
          </button>
        )}
      </div>

      <div className="text-[11px] text-amber-800 dark:text-amber-300/80 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Recomendação Prática:</strong> Implemente mudanças que ultrapassam ±30% gradualmente em sprints quinzenais (ex: +15% a cada 2 semanas) para medir o ponto real de saturação com segurança antes de atingir o orçamento máximo.
        </span>
      </div>
    </div>
  );
};
