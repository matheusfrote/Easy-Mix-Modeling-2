import { MeridianModelResults, BudgetOptimizationResult } from '../../types/mmm';
import { ChannelFeatures, DecisionResult, PortfolioBenchmarks, ReallocationPair, InsightCategory } from './types';
import { evaluateChannelDecisionTree, identifyReallocationOpportunities } from './decisionTree';
import { calculateRecommendationScore } from './scoringEngine';
import { formatInsightNarrative } from './insightEngine';

/**
 * Builds structured decisions and recommendations for all channels and portfolio
 */
export function buildChannelDecisions(
  channelsFeatures: ChannelFeatures[],
  benchmarks: PortfolioBenchmarks,
  results: MeridianModelResults,
  optResult?: BudgetOptimizationResult
): DecisionResult[] {
  const decisions: DecisionResult[] = [];

  // Map each channel through Feature -> Tree -> Scoring -> Narrative
  for (const feat of channelsFeatures) {
    const treeOut = evaluateChannelDecisionTree(feat, benchmarks, results.diagnostics);
    const scoreOut = calculateRecommendationScore(feat, treeOut.decision);

    // Link with Budget Optimizer if available
    const reallocMatch = optResult?.reallocations?.find(r => r.channelName === feat.channelName);

    let category: InsightCategory = 'RECOMMENDATION';
    if (treeOut.decision === 'INCREASE') {
      category = 'OPPORTUNITY';
    } else if (treeOut.decision === 'DECREASE') {
      category = 'RISK';
    } else if (treeOut.decision === 'INVESTIGATE') {
      category = 'INVESTIGATION';
    } else if (treeOut.decision === 'TEST') {
      category = 'OPPORTUNITY';
    } else {
      category = 'PERFORMANCE';
    }

    const narrative = formatInsightNarrative(feat, treeOut.decision, treeOut.reasonCodes, reallocMatch);

    decisions.push({
      entity: feat.channelName,
      category,
      decision: treeOut.decision,
      score: scoreOut.score,
      priority: scoreOut.priority,
      confidence: feat.confidence,
      reasonCodes: treeOut.reasonCodes,
      metrics: {
        roi: feat.roi,
        marginalRoi: feat.marginalRoi,
        saturation: feat.saturationLevel,
        contribution: feat.kpi,
        spend: feat.spend,
        trend: feat.trendPct
      },
      recommendation: {
        action: treeOut.suggestedActionRationale,
        suggestedChangePct: reallocMatch?.percentageChange,
        suggestedDeltaSpend: reallocMatch?.deltaSpend
      },
      explanation: narrative,
      auditTrail: {
        ruleTriggered: treeOut.ruleTriggered,
        metricsUsed: {
          roi: feat.roi,
          marginalRoi: feat.marginalRoi,
          saturation: feat.saturationLevel,
          contribution: feat.kpi,
          spend: feat.spend,
          trend: feat.trendPct,
          confidence: feat.confidence,
          ciWidth: feat.mroiCiWidth
        },
        benchmarksUsed: {
          mroiP75: benchmarks.marginalRoi.p75,
          mroiP25: benchmarks.marginalRoi.p25,
          satP75: benchmarks.saturation.p75,
          satP25: benchmarks.saturation.p25,
          blendedRoi: benchmarks.blendedRoi
        },
        scoreBreakdown: scoreOut.scoreBreakdown,
        confidenceAssessment: treeOut.confidenceAssessment
      }
    });
  }

  // Portfolio-level Reallocation Decisions
  const reallocationPairs = identifyReallocationOpportunities(channelsFeatures, benchmarks);
  if (reallocationPairs.length > 0) {
    const pair = reallocationPairs[0];
    const narrative = {
      whatIsHappening: `O canal ${pair.targetChannel} entrega retorno marginal significativamente superior (${pair.targetMarginalRoi.toFixed(2)}x vs ${pair.sourceMarginalRoi.toFixed(2)}x) com menor saturação (${pair.targetSaturation.toFixed(0)}% vs ${pair.sourceSaturation.toFixed(0)}%).`,
      whyItMatters: `Manter investimento em ${pair.sourceChannel} gera desperdício por retornos decrescentes, enquanto ${pair.targetChannel} possui capacidade de absorver capital com alta rentabilidade.`,
      whatToDo: `Considerar a realocação gradual de verba de ${pair.sourceChannel} para ${pair.targetChannel}.`
    };

    decisions.push({
      entity: `${pair.sourceChannel} ➔ ${pair.targetChannel}`,
      category: 'REALLOCATION',
      decision: 'REALLOCATE',
      score: 89,
      priority: 'HIGH',
      confidence: 'Alta',
      reasonCodes: ['REALLOCATION_OPPORTUNITY', 'HIGH_MARGINAL_ROI', 'HIGH_SATURATION'],
      metrics: {
        roi: benchmarks.blendedRoi,
        marginalRoi: pair.targetMarginalRoi,
        saturation: pair.sourceSaturation
      },
      recommendation: {
        action: `Realocar orçamento de ${pair.sourceChannel} para ${pair.targetChannel}`,
        targetChannel: pair.targetChannel,
        sourceChannel: pair.sourceChannel
      },
      explanation: narrative,
      auditTrail: {
        ruleTriggered: 'PORTFOLIO_REALLOCATION_EFFICIENCY_SPREAD',
        metricsUsed: {
          marginalRoi: pair.targetMarginalRoi,
          saturation: pair.sourceSaturation,
          roi: benchmarks.blendedRoi
        },
        benchmarksUsed: {
          blendedRoi: benchmarks.blendedRoi
        },
        scoreBreakdown: {
          marginalRoiComponent: 30,
          opportunityComponent: 20,
          contributionComponent: 15,
          roiComponent: 14,
          confidenceComponent: 10,
          trendComponent: 0,
          totalScore: 89
        },
        confidenceAssessment: 'Forte oportunidade de otimização de portfólio baseada na disparidade de curvas de resposta.'
      }
    });
  }

  return decisions;
}
