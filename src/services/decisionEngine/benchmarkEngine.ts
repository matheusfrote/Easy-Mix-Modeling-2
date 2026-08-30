import { MeridianModelResults } from '../../types/mmm';
import { ChannelFeatures, MetricDistribution, PortfolioBenchmarks } from './types';
import { DECISION_THRESHOLDS } from './config';

/**
 * Calculates statistical distribution (percentiles, mean, std) for a list of numbers
 */
export function calculateDistribution(values: number[]): MetricDistribution {
  if (!values || values.length === 0) {
    return { min: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const getPercentile = (p: number) => {
    if (n === 1) return sorted[0];
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  const min = sorted[0];
  const max = sorted[n - 1];
  const p25 = getPercentile(25);
  const median = getPercentile(50);
  const p75 = getPercentile(75);
  const p90 = getPercentile(90);

  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
  const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);

  return { min, p25, median, p75, p90, max, mean, std };
}

/**
 * Computes portfolio-level benchmarks across all channels
 */
export function calculatePortfolioBenchmarks(
  channelsFeatures: ChannelFeatures[],
  results: MeridianModelResults
): PortfolioBenchmarks {
  const mrois = channelsFeatures.map(c => c.marginalRoi);
  const rois = channelsFeatures.map(c => c.roi);
  const saturations = channelsFeatures.map(c => c.saturationLevel);
  const contributions = channelsFeatures.map(c => c.kpiShare);
  const spends = channelsFeatures.map(c => c.spend);

  return {
    marginalRoi: calculateDistribution(mrois),
    roi: calculateDistribution(rois),
    saturation: calculateDistribution(saturations),
    contribution: calculateDistribution(contributions),
    spend: calculateDistribution(spends),
    totalSpend: results.totalSpend,
    totalKpi: results.totalKpi,
    blendedRoi: results.blendedRoi,
    mediaShare: results.diagnostics?.mediaShare ?? 40,
    baselineShare: results.diagnostics?.baselineShare ?? 45,
    controlsShare: results.diagnostics?.controlsShare ?? 15,
    channelCount: channelsFeatures.length
  };
}

/**
 * Classifies a channel's Marginal ROI relative to the portfolio benchmark
 */
export function classifyMarginalRoi(
  mroi: number,
  benchmarks: PortfolioBenchmarks
): 'high' | 'above_average' | 'below_average' | 'low' {
  if (mroi >= benchmarks.marginalRoi.p75 || mroi > (benchmarks.blendedRoi * 1.15)) {
    return 'high';
  }
  if (mroi >= benchmarks.marginalRoi.median) {
    return 'above_average';
  }
  if (mroi >= benchmarks.marginalRoi.p25) {
    return 'below_average';
  }
  return 'low';
}

/**
 * Classifies saturation level using both fixed threshold safety rails and portfolio percentiles
 */
export function classifySaturation(
  saturationLevel: number,
  benchmarks: PortfolioBenchmarks
): 'low' | 'moderate' | 'high' | 'critical' {
  if (saturationLevel >= DECISION_THRESHOLDS.saturation.critical || (saturationLevel > 80 && saturationLevel >= benchmarks.saturation.p90)) {
    return 'critical';
  }
  if (saturationLevel >= DECISION_THRESHOLDS.saturation.high || saturationLevel >= benchmarks.saturation.p75) {
    return 'high';
  }
  if (saturationLevel >= DECISION_THRESHOLDS.saturation.low || saturationLevel >= benchmarks.saturation.p25) {
    return 'moderate';
  }
  return 'low';
}
