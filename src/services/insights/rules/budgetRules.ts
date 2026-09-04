import { ChannelDecisionFeatures, DECISION_ENGINE_VERSION, StructuredInsight } from '../insightTypes';

const MAX_ACCEPTABLE_UNCERTAINTY = 1.6;
const HIGH_SATURATION = 0.75;
const LOW_SATURATION = 0.6;

function confidence(width: number | null): StructuredInsight['confidence'] {
  if (width === null || width > MAX_ACCEPTABLE_UNCERTAINTY) return 'LOW';
  return width <= 0.8 ? 'HIGH' : 'MEDIUM';
}

function evidence(feature: ChannelDecisionFeatures): StructuredInsight['evidence'] {
  return [
    { metric: 'ROI', value: feature.roi },
    { metric: 'mROI', value: feature.mroi },
    { metric: 'contribution', value: feature.contribution },
    { metric: 'spendShare', value: feature.spendShare },
    { metric: 'saturation', value: feature.saturation },
    { metric: 'credibleIntervalWidth', value: feature.credibleIntervalWidth },
    { metric: 'responseCurvePosition', value: feature.responseCurvePosition },
    { metric: 'optimizerBudgetDelta', value: feature.budgetDelta }
  ];
}

export function applyBudgetRules(modelId: string, feature: ChannelDecisionFeatures): StructuredInsight {
  const recommendation = {
    currentSpend: feature.currentSpend,
    recommendedSpend: feature.recommendedSpend,
    delta: feature.budgetDelta
  };
  const base = {
    channel: feature.channel,
    evidence: evidence(feature),
    recommendedChange: recommendation,
    modelId,
    decisionEngineVersion: DECISION_ENGINE_VERSION
  };

  if (
    feature.credibleIntervalWidth === null
    || feature.credibleIntervalWidth > MAX_ACCEPTABLE_UNCERTAINTY
    || feature.saturation === null
    || feature.responseCurvePosition === null
    || feature.mroi === null
    || feature.blendedRoi === null
    || feature.budgetDelta === null
  ) {
    return {
      ...base,
      type: 'INSUFFICIENT_EVIDENCE',
      priority: 'HIGH',
      confidence: 'LOW',
      ruleId: 'INSUFFICIENT_EVIDENCE_001',
      action: 'INSUFFICIENT_EVIDENCE'
    };
  }

  const optimizerIncrease = feature.budgetDelta !== null && feature.budgetDelta > 0;
  const optimizerDecrease = feature.budgetDelta !== null && feature.budgetDelta < 0;
  const mroiAbovePortfolio = feature.mroi !== null && feature.blendedRoi !== null && feature.mroi > feature.blendedRoi;
  const mroiBelowPortfolio = feature.mroi !== null && feature.blendedRoi !== null && feature.mroi < feature.blendedRoi;

  if (
    optimizerIncrease &&
    mroiAbovePortfolio &&
    feature.saturation !== null && feature.saturation < LOW_SATURATION &&
    feature.responseCurvePosition !== null && feature.responseCurvePosition <= 0.65
  ) {
    return {
      ...base,
      type: 'BUDGET_REALLOCATION',
      priority: 'HIGH',
      confidence: confidence(feature.credibleIntervalWidth),
      ruleId: 'BUDGET_INCREASE_001',
      action: 'INCREASE_BUDGET'
    };
  }

  if (optimizerDecrease && mroiBelowPortfolio && feature.saturation !== null && feature.saturation >= HIGH_SATURATION) {
    return {
      ...base,
      type: 'BUDGET_REALLOCATION',
      priority: 'HIGH',
      confidence: confidence(feature.credibleIntervalWidth),
      ruleId: 'BUDGET_REDUCE_001',
      action: 'REDUCE_BUDGET'
    };
  }

  return {
    ...base,
    type: 'BUDGET_REALLOCATION',
    priority: 'LOW',
    confidence: confidence(feature.credibleIntervalWidth),
    ruleId: 'BUDGET_MAINTAIN_001',
    action: 'MAINTAIN_BUDGET'
  };
}
