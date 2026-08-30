import { MeridianModelResults, ChannelMetrics } from '../../types/mmm';
import { ChannelFeatures } from './types';
import { DECISION_THRESHOLDS } from './config';

/**
 * Derives normalized analytic features for a specific channel
 */
export function extractChannelFeatures(
  channel: ChannelMetrics,
  results: MeridianModelResults
): ChannelFeatures {
  const totalSpend = results.totalSpend || 1;
  const totalMediaKpi = results.diagnostics?.mediaContribution || results.totalKpi || 1;

  // Credible interval relative width (uncertainty indicator)
  const roiWidth = channel.roi > 0 && channel.roiInterval
    ? Math.max(0, (channel.roiInterval.ci975 - channel.roiInterval.ci025) / channel.roi)
    : 1.0;

  const mroiWidth = channel.marginalRoi > 0 && channel.marginalRoiInterval
    ? Math.max(0, (channel.marginalRoiInterval.ci975 - channel.marginalRoiInterval.ci025) / channel.marginalRoi)
    : 1.0;

  // Derive confidence numeric score (0 - 1)
  let confidenceScore = 0.5;
  if (channel.confidence === 'Alta') {
    confidenceScore = 0.85;
  } else if (channel.confidence === 'Média') {
    confidenceScore = 0.65;
  } else {
    confidenceScore = 0.35;
  }
  // Penalize confidence if CI width is excessively broad
  if (roiWidth > DECISION_THRESHOLDS.uncertainty.highCiWidthRatio) {
    confidenceScore = Math.max(0.2, confidenceScore - 0.2);
  }

  // Calculate trend slope from time series if available
  const trendPct = calculateChannelTrend(channel.channelName, results);

  // Saturation headroom (0 - 100)
  const saturationLevel = Math.min(100, Math.max(0, channel.saturationLevel || 0));
  const opportunityHeadroom = Math.max(0, 100 - saturationLevel);

  // Normalization scores (0 - 100 scale)
  // 1. Marginal ROI Score: capped around 5.0x for max score
  const mroiScore = Math.min(100, Math.max(0, (channel.marginalRoi / 4.0) * 100));

  // 2. Average ROI Score: capped around 6.0x
  const roiScore = Math.min(100, Math.max(0, (channel.roi / 5.0) * 100));

  // 3. Saturation Score: inverted (lower saturation -> higher scale potential)
  const saturationScore = opportunityHeadroom;

  // 4. Contribution Score: share of media incremental KPI
  const kpiShare = channel.kpiShare || (channel.incrementalKpi / totalMediaKpi) * 100;
  const contributionScore = Math.min(100, Math.max(0, kpiShare * 2.5));

  // 5. Efficiency Score: ROI & mROI blend
  const efficiencyScore = Math.min(100, Math.max(0, (mroiScore * 0.6 + roiScore * 0.4)));

  // 6. Opportunity Score: mROI + Headroom + Confidence
  const opportunityScore = Math.min(
    100,
    Math.max(
      0,
      mroiScore * 0.45 + opportunityHeadroom * 0.35 + (confidenceScore * 100) * 0.20
    )
  );

  // 7. Risk Score: High Saturation + Low mROI + High Uncertainty
  const riskScore = Math.min(
    100,
    Math.max(
      0,
      saturationLevel * 0.45 +
      Math.max(0, 100 - mroiScore) * 0.35 +
      (1 - confidenceScore) * 100 * 0.20
    )
  );

  // 8. Trend Score
  const trendScore = Math.min(100, Math.max(0, 50 + (trendPct * 250)));

  const isUnderinvested = channel.marginalRoi > (results.blendedRoi * 0.8) && saturationLevel < DECISION_THRESHOLDS.saturation.low;
  const isOverinvested = saturationLevel > DECISION_THRESHOLDS.saturation.high || (channel.marginalRoi < 1.0 && saturationLevel > DECISION_THRESHOLDS.saturation.moderate);

  return {
    channelName: channel.channelName,
    spend: channel.spend,
    spendShare: channel.spendShare || (channel.spend / totalSpend) * 100,
    kpi: channel.incrementalKpi,
    kpiShare,
    roi: channel.roi,
    roiInterval: channel.roiInterval || { ci025: channel.roi * 0.7, ci050: channel.roi, ci975: channel.roi * 1.3 },
    marginalRoi: channel.marginalRoi,
    marginalRoiInterval: channel.marginalRoiInterval || { ci025: channel.marginalRoi * 0.7, ci050: channel.marginalRoi, ci975: channel.marginalRoi * 1.3 },
    saturationLevel,
    adstockDecay: channel.adstockDecay || 0.3,
    adstockHalfLifeWeeks: channel.adstockHalfLifeWeeks || 1.0,
    halfSaturationSpend: channel.halfSaturationSpend || channel.spend,
    confidence: channel.confidence || 'Média',
    confidenceScore,
    roiCiWidth: roiWidth,
    mroiCiWidth: mroiWidth,
    trendPct,
    isUnderinvested,
    isOverinvested,
    mroiScore,
    roiScore,
    saturationScore,
    contributionScore,
    efficiencyScore,
    opportunityScore,
    riskScore,
    trendScore
  };
}

/**
 * Estimates recent performance trend percentage from time series fit
 */
function calculateChannelTrend(channelName: string, results: MeridianModelResults): number {
  const ts = results.diagnostics?.timeSeriesFit;
  if (!ts || ts.length < 8) {
    return 0;
  }

  const mid = Math.floor(ts.length / 2);
  const firstHalf = ts.slice(0, mid);
  const secondHalf = ts.slice(mid);

  const getMediaSum = (slice: typeof ts) => {
    return slice.reduce((sum, item) => {
      if (item.channelSpends && item.channelSpends[channelName] !== undefined) {
        return sum + item.channelSpends[channelName];
      }
      return sum + (item.media || 0);
    }, 0);
  };

  const sum1 = getMediaSum(firstHalf) / Math.max(1, firstHalf.length);
  const sum2 = getMediaSum(secondHalf) / Math.max(1, secondHalf.length);

  if (sum1 <= 0) return 0;
  const change = (sum2 - sum1) / sum1;
  return Math.max(-0.5, Math.min(0.5, change));
}
