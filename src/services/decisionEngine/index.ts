import { MeridianModelResults, BudgetOptimizationResult } from '../../types/mmm';
import { extractChannelFeatures } from './featureEngine';
import { calculatePortfolioBenchmarks } from './benchmarkEngine';
import { buildChannelDecisions } from './recommendationEngine';
import { transformDecisionsToCards } from './insightEngine';
import { answerStrategicQuestion } from './qaEngine';
import {
  DecisionResult,
  FormattedInsightCardItem,
  ChannelFeatures,
  PortfolioBenchmarks,
  ReasonCode,
  DecisionAction,
  DecisionPriority,
  AuditTrail
} from './types';

export * from './types';
export * from './config';
export * from './featureEngine';
export * from './benchmarkEngine';
export * from './decisionTree';
export * from './scoringEngine';
export * from './recommendationEngine';
export * from './insightEngine';
export * from './qaEngine';

/**
 * Main function: Generates complete deterministic decisions, scores, and formatted cards
 */
export function generateDecisionInsights(
  results: MeridianModelResults,
  optResult?: BudgetOptimizationResult
): {
  decisions: DecisionResult[];
  cards: FormattedInsightCardItem[];
  benchmarks: PortfolioBenchmarks;
  channelsFeatures: ChannelFeatures[];
} {
  if (!results || !results.channels || results.channels.length === 0) {
    return {
      decisions: [],
      cards: [],
      benchmarks: {
        marginalRoi: { min: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std: 0 },
        roi: { min: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std: 0 },
        saturation: { min: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std: 0 },
        contribution: { min: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std: 0 },
        spend: { min: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std: 0 },
        totalSpend: 0,
        totalKpi: 0,
        blendedRoi: 0,
        mediaShare: 0,
        baselineShare: 0,
        controlsShare: 0,
        channelCount: 0
      },
      channelsFeatures: []
    };
  }

  // 1. Feature Engineering
  const channelsFeatures = results.channels.map(c => extractChannelFeatures(c, results));

  // 2. Portfolio Benchmarks
  const benchmarks = calculatePortfolioBenchmarks(channelsFeatures, results);

  // 3. Decisions & Recommendations via Decision Trees and Scoring
  const decisions = buildChannelDecisions(channelsFeatures, benchmarks, results, optResult);

  // 4. Storytelling & UI Card Transformation
  const cards = transformDecisionsToCards(decisions);

  return {
    decisions,
    cards,
    benchmarks,
    channelsFeatures
  };
}
