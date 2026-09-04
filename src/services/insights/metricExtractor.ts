import { ChannelDecisionFeatures, OptimizationInsightInput } from './insightTypes';
import { MeridianModelResults } from '../../types/mmm';

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function relativeIntervalWidth(center: number | null, low: unknown, high: unknown): number | null {
  const lo = finite(low);
  const hi = finite(high);
  if (center === null || center === 0 || lo === null || hi === null) return null;
  return Math.abs(hi - lo) / Math.abs(center);
}

function curveFeatures(points: any[], currentSpend: number | null) {
  const valid = points
    .map(point => ({ spend: finite(point?.spend), outcome: finite(point?.incrementalOutcome ?? point?.incrementalKpi) }))
    .filter(point => point.spend !== null && point.outcome !== null)
    .sort((a, b) => (a.spend as number) - (b.spend as number));
  if (!valid.length || currentSpend === null) {
    return { responseCurvePosition: null };
  }
  const maxSpend = valid[valid.length - 1].spend as number;
  return {
    responseCurvePosition: maxSpend <= 0 ? null : currentSpend / maxSpend
  };
}

function maxChannel(channels: MeridianModelResults['channels'], metric: 'roi' | 'marginalRoi'): string | null {
  return [...channels]
    .filter(channel => finite(channel[metric]) !== null)
    .sort((left, right) => Number(right[metric]) - Number(left[metric]))[0]?.channelName ?? null;
}

export function deriveModelLabels(model: MeridianModelResults): Pick<
  MeridianModelResults,
  'mostEfficientChannel' | 'bestOpportunityChannel' | 'saturatedChannel'
> {
  const saturation = model.channels
    .map(channel => ({ channelName: channel.channelName, value: finite(channel.saturationLevel) }))
    .filter(item => item.value !== null)
    .sort((left, right) => Number(right.value) - Number(left.value));
  return {
    mostEfficientChannel: maxChannel(model.channels, 'roi'),
    bestOpportunityChannel: maxChannel(model.channels, 'marginalRoi'),
    saturatedChannel: saturation[0]?.channelName ?? null
  };
}

export function extractOptimizationFeatures({ model, optimization }: OptimizationInsightInput): ChannelDecisionFeatures[] {
  return optimization.reallocations.map(allocation => {
    const channel = model.channels.find(item => item.channelName === allocation.channelName);
    const roi = finite(channel?.roi);
    const mroi = finite(channel?.marginalRoi);
    const currentSpend = finite(allocation.currentSpend);
    const curve = curveFeatures(model.responseCurves?.[allocation.channelName]?.points || [], currentSpend);
    return {
      channel: allocation.channelName,
      roi,
      mroi,
      contribution: finite((channel as any)?.contribution ?? (channel as any)?.contributionShare),
      spendShare: finite(channel?.spendShare),
      saturation: finite(channel?.saturationLevel),
      credibleIntervalWidth: relativeIntervalWidth(
        mroi,
        channel?.marginalRoiInterval?.ci025,
        channel?.marginalRoiInterval?.ci975
      ),
      recommendedSpend: finite(allocation.recommendedSpend),
      currentSpend,
      budgetDelta: finite(allocation.deltaSpend),
      incrementalKpi: finite(allocation.deltaKpi),
      responseCurvePosition: curve.responseCurvePosition,
      blendedRoi: finite(model.blendedRoi)
    };
  });
}
