import { BudgetOptimizationResult, ExecutiveReportData, MeridianModelResults } from '../../types/mmm';
import { buildDataLineage } from './dataLineage';
import { DECISION_ENGINE_VERSION, StructuredInsight } from './insightTypes';
import { renderInsights } from './templateEngine';

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function number(value: number | null, digits = 2): string {
  return value === null ? 'indisponível' : value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
}

function money(value: number | null): string {
  return value === null
    ? 'indisponível'
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function outcome(value: number | null, kpiType?: MeridianModelResults['kpiType']): string {
  return kpiType === 'non_revenue' ? number(value) : money(value);
}

function roi(value: number | null, kpiType?: MeridianModelResults['kpiType']): string {
  return `${number(value)}${kpiType === 'non_revenue' ? ' KPI/R$' : 'x'}`;
}

export function buildDeterministicReport(
  model: MeridianModelResults,
  optimization: BudgetOptimizationResult,
  insights: StructuredInsight[]
): ExecutiveReportData {
  const r2 = finite(model.diagnostics?.rSquared);
  const mape = finite(model.diagnostics?.mape);
  const top = model.channels.find(channel => channel.channelName === model.mostEfficientChannel)
    ?? [...model.channels].filter(channel => finite(channel.roi) !== null).sort((a, b) => Number(b.roi) - Number(a.roi))[0]
    ?? null;
  const opportunity = model.channels.find(channel => channel.channelName === model.bestOpportunityChannel)
    ?? [...model.channels].filter(channel => finite(channel.marginalRoi) !== null).sort((a, b) => Number(b.marginalRoi) - Number(a.marginalRoi))[0]
    ?? null;
  const renderedInsights = renderInsights(insights);
  const risks = [
    ...(model.diagnostics?.warnings || []),
    ...renderedInsights
      .filter((_, index) => insights[index]?.action === 'INSUFFICIENT_EVIDENCE')
      .map(item => item.summary)
  ];
  const createdAt = model.createdAt || '';

  return {
    modelId: model.modelId,
    decisionEngineVersion: DECISION_ENGINE_VERSION,
    source: 'deterministic',
    title: 'Relatório Executivo de Marketing Mix Modeling (MMM)',
    companyName: null,
    generatedAt: createdAt,
    summary: `O modelo Google Meridian ${model.modelId} estimou ROI consolidado de ${roi(finite(model.blendedRoi), model.kpiType)}, com R² ${number(r2, 3)} e MAPE ${number(mape)}%. A otimização oficial estima ${outcome(finite(optimization.totalIncrementalKpi), model.kpiType)} de KPI incremental para o orçamento-alvo de ${money(finite(optimization.targetTotalBudget))}.`,
    dataReadinessSummary: null,
    historicalSpendSummary: `O histórico modelado contém ${model.channels.length} canais e investimento total de ${money(finite(model.totalSpend))}.`,
    channelPerformanceSummary: top
      ? `${top.channelName} possui o maior ROI observado (${roi(finite(top.roi), model.kpiType)}). ${opportunity ? `${opportunity.channelName} possui o maior mROI observado (${roi(finite(opportunity.marginalRoi), model.kpiType)}).` : ''}`.trim()
      : 'Métricas por canal indisponíveis.',
    budgetRecommendationSummary: renderedInsights.map(item => item.summary).join(' '),
    scenariosSummary: null,
    risksAndLimitations: risks,
    methodologyNotes: [
      'Métricas científicas provenientes do Analyzer do Google Meridian.',
      'Alocação proveniente do BudgetOptimizer oficial do Google Meridian.',
      `Recomendações geradas por regras determinísticas ${DECISION_ENGINE_VERSION}.`
    ],
    dataLineage: buildDataLineage(model.modelId),
    aiNarrative: null,
    aiStatus: 'not_requested',
    aiCacheHit: false
  };
}
