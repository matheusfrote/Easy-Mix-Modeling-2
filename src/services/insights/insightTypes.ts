import { BudgetOptimizationResult, MeridianModelResults, ScenarioDefinition } from '../../types/mmm';

export const DECISION_ENGINE_VERSION = '1.1.0';

export type InsightPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type InsightConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type InsightAction =
  | 'INCREASE_BUDGET'
  | 'REDUCE_BUDGET'
  | 'MAINTAIN_BUDGET'
  | 'INSUFFICIENT_EVIDENCE'
  | 'SCENARIO_POSITIVE'
  | 'SCENARIO_NEGATIVE'
  | 'SCENARIO_NEUTRAL';

export interface InsightEvidence {
  metric: string;
  value: number | null;
}

export interface StructuredInsight {
  type: 'BUDGET_REALLOCATION' | 'SCENARIO_IMPACT' | 'INSUFFICIENT_EVIDENCE';
  channel: string | null;
  priority: InsightPriority;
  confidence: InsightConfidence;
  evidence: InsightEvidence[];
  ruleId: string;
  action: InsightAction;
  recommendedChange: {
    currentSpend: number | null;
    recommendedSpend: number | null;
    delta: number | null;
  } | null;
  modelId: string;
  decisionEngineVersion: string;
}

export interface ChannelDecisionFeatures {
  channel: string;
  roi: number | null;
  mroi: number | null;
  contribution: number | null;
  spendShare: number | null;
  saturation: number | null;
  credibleIntervalWidth: number | null;
  recommendedSpend: number | null;
  currentSpend: number | null;
  budgetDelta: number | null;
  incrementalKpi: number | null;
  responseCurvePosition: number | null;
  blendedRoi: number | null;
}

export interface OptimizationInsightInput {
  model: MeridianModelResults;
  optimization: BudgetOptimizationResult;
}

export interface ScenarioInsightInput {
  model: MeridianModelResults;
  scenario: ScenarioDefinition;
}
