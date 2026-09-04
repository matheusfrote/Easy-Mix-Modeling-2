import { applyBudgetRules } from './rules/budgetRules';
import { extractOptimizationFeatures } from './metricExtractor';
import { DECISION_ENGINE_VERSION, OptimizationInsightInput, ScenarioInsightInput, StructuredInsight } from './insightTypes';

export function buildBudgetInsights(input: OptimizationInsightInput): StructuredInsight[] {
  return extractOptimizationFeatures(input).map(feature => applyBudgetRules(input.model.modelId, feature));
}

export function buildScenarioInsights({ model, scenario }: ScenarioInsightInput): StructuredInsight[] {
  const low = Number.isFinite(scenario.expectedKpiLower) ? scenario.expectedKpiLower : null;
  const high = Number.isFinite(scenario.expectedKpiUpper) ? scenario.expectedKpiUpper : null;
  const expected = Number.isFinite(scenario.expectedKpi) ? scenario.expectedKpi : null;
  const incremental = Number.isFinite(scenario.incrementalKpi) ? scenario.incrementalKpi : null;
  const intervalWidth = low === null || high === null || expected === null || expected === 0
    ? null
    : Math.abs(high - low) / Math.abs(expected);
  const insufficient = low === null
    || high === null
    || expected === null
    || incremental === null
    || intervalWidth === null
    || intervalWidth > 1.6;
  const action = insufficient
    ? 'INSUFFICIENT_EVIDENCE'
    : incremental > 0
      ? 'SCENARIO_POSITIVE'
      : incremental < 0
        ? 'SCENARIO_NEGATIVE'
        : 'SCENARIO_NEUTRAL';
  return [{
    type: insufficient ? 'INSUFFICIENT_EVIDENCE' : 'SCENARIO_IMPACT',
    channel: null,
    priority: insufficient ? 'HIGH' : Math.abs(incremental as number) > Math.abs(expected as number) * 0.05 ? 'HIGH' : 'MEDIUM',
    confidence: insufficient ? 'LOW' : intervalWidth <= 0.8 ? 'HIGH' : 'MEDIUM',
    evidence: [
      { metric: 'expectedKpi', value: expected },
      { metric: 'expectedKpiLower', value: low },
      { metric: 'expectedKpiUpper', value: high },
      { metric: 'incrementalKpi', value: incremental },
      { metric: 'credibleIntervalWidth', value: intervalWidth },
      { metric: 'blendedRoi', value: Number.isFinite(scenario.blendedRoi) ? scenario.blendedRoi : null }
    ],
    ruleId: insufficient ? 'INSUFFICIENT_EVIDENCE_002' : `SCENARIO_${action.replace('SCENARIO_', '')}_001`,
    action,
    recommendedChange: null,
    modelId: model.modelId,
    decisionEngineVersion: DECISION_ENGINE_VERSION
  }];
}
