import { DataLineageEntry } from '../../types/mmm';
import { DECISION_ENGINE_VERSION } from './insightTypes';

export function buildDataLineage(modelId: string): DataLineageEntry[] {
  return [
    { metric: 'ROI', source: 'Google Meridian Analyzer.summary_metrics(roi)', modelId, decisionEngineVersion: null },
    { metric: 'mROI', source: 'Google Meridian Analyzer.summary_metrics(marginal_roi)', modelId, decisionEngineVersion: null },
    { metric: 'contribution', source: 'Google Meridian Analyzer.summary_metrics(pct_of_contribution)', modelId, decisionEngineVersion: null },
    { metric: 'incrementalOutcome', source: 'Google Meridian Analyzer.summary_metrics(incremental_outcome)', modelId, decisionEngineVersion: null },
    { metric: 'responseCurves', source: 'Google Meridian Analyzer.response_curves()', modelId, decisionEngineVersion: null },
    { metric: 'saturation', source: 'Google Meridian Analyzer.hill_curves()', modelId, decisionEngineVersion: null },
    { metric: 'adstockDecay', source: 'Google Meridian Analyzer.adstock_decay()', modelId, decisionEngineVersion: null },
    { metric: 'R2/MAPE/wMAPE', source: 'Google Meridian Analyzer.predictive_accuracy()', modelId, decisionEngineVersion: null },
    { metric: 'R-hat', source: 'Google Meridian posterior diagnostics', modelId, decisionEngineVersion: null },
    { metric: 'recommendedSpend', source: 'Google Meridian BudgetOptimizer.optimize()', modelId, decisionEngineVersion: null },
    { metric: 'scenarioExpectedKpi', source: 'Google Meridian Analyzer.expected_outcome()', modelId, decisionEngineVersion: null },
    { metric: 'recommendation', source: 'Deterministic Decision Engine', modelId, decisionEngineVersion: DECISION_ENGINE_VERSION },
    { metric: 'standardNarrative', source: 'Deterministic Template Engine', modelId, decisionEngineVersion: DECISION_ENGINE_VERSION }
  ];
}
