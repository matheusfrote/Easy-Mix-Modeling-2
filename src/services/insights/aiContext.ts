import { BudgetOptimizationResult, MeridianModelResults } from '../../types/mmm';
import { DECISION_ENGINE_VERSION, StructuredInsight } from './insightTypes';

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface AIContext {
  modelId: string;
  decisionEngineVersion: string;
  modelQuality: {
    r2: number | null;
    mape: number | null;
    wmape: number | null;
    rhat: number | null;
    converged: boolean | null;
  };
  budget: {
    current: number | null;
    target: number | null;
    expectedIncrementalKpi: number | null;
    liftPercentage: number | null;
  };
  recommendations: Array<{
    channel: string | null;
    action: StructuredInsight['action'];
    priority: StructuredInsight['priority'];
    confidence: StructuredInsight['confidence'];
    ruleId: string;
    currentSpend: number | null;
    recommendedSpend: number | null;
    delta: number | null;
    evidence: Array<{ metric: string; value: number | null }>;
  }>;
  risks: Array<{ ruleId: string; channel: string | null }>;
}

export function buildAIContext(
  model: MeridianModelResults,
  optimization: BudgetOptimizationResult,
  insights: StructuredInsight[]
): AIContext {
  const ranked = [...insights].sort((left, right) => {
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    return rank[left.priority] - rank[right.priority]
      || (left.channel || '').localeCompare(right.channel || '')
      || left.ruleId.localeCompare(right.ruleId);
  });

  return {
    modelId: model.modelId,
    decisionEngineVersion: DECISION_ENGINE_VERSION,
    modelQuality: {
      r2: finite(model.diagnostics?.rSquared),
      mape: finite(model.diagnostics?.mape),
      wmape: finite((model.diagnostics as any)?.wmape),
      rhat: finite(model.diagnostics?.gelmanRubinRhat),
      converged: typeof model.diagnostics?.isConverged === 'boolean' ? model.diagnostics.isConverged : null
    },
    budget: {
      current: finite(optimization.currentTotalBudget),
      target: finite(optimization.targetTotalBudget),
      expectedIncrementalKpi: finite(optimization.totalIncrementalKpi),
      liftPercentage: finite(optimization.overallLiftPercentage)
    },
    recommendations: ranked.slice(0, 5).map(insight => ({
      channel: insight.channel,
      action: insight.action,
      priority: insight.priority,
      confidence: insight.confidence,
      ruleId: insight.ruleId,
      currentSpend: finite(insight.recommendedChange?.currentSpend),
      recommendedSpend: finite(insight.recommendedChange?.recommendedSpend),
      delta: finite(insight.recommendedChange?.delta),
      evidence: insight.evidence.map(item => ({ metric: item.metric, value: finite(item.value) }))
    })),
    risks: ranked
      .filter(insight => insight.action === 'INSUFFICIENT_EVIDENCE')
      .slice(0, 5)
      .map(insight => ({ ruleId: insight.ruleId, channel: insight.channel }))
  };
}
