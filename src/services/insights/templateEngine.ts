import { AIInsightItem } from '../../types/mmm';
import { StructuredInsight } from './insightTypes';

function money(value: number | null): string {
  return value === null ? 'indisponível' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const templates: Record<string, (insight: StructuredInsight) => Pick<AIInsightItem, 'title' | 'summary' | 'detail' | 'actionableStep'>> = {
  BUDGET_INCREASE_001: insight => ({
    title: `${insight.channel} apresenta oportunidade de expansão`,
    summary: `O optimizer recomenda alterar o investimento de ${money(insight.recommendedChange?.currentSpend ?? null)} para ${money(insight.recommendedChange?.recommendedSpend ?? null)}.`,
    detail: 'A decisão combina retorno marginal, saturação, incerteza, posição na curva de resposta e a alocação do optimizer.',
    actionableStep: `Aumentar o orçamento em ${money(insight.recommendedChange?.delta ?? null)}.`
  }),
  BUDGET_REDUCE_001: insight => ({
    title: `${insight.channel} apresenta oportunidade de redução`,
    summary: `O optimizer recomenda alterar o investimento de ${money(insight.recommendedChange?.currentSpend ?? null)} para ${money(insight.recommendedChange?.recommendedSpend ?? null)}.`,
    detail: 'A decisão combina retorno marginal abaixo do portfólio, saturação elevada, incerteza e a alocação do optimizer.',
    actionableStep: `Reduzir o orçamento em ${money(
      insight.recommendedChange?.delta == null ? null : Math.abs(insight.recommendedChange.delta)
    )}.`
  }),
  INSUFFICIENT_EVIDENCE_001: insight => {
    const unavailable = insight.evidence
      .filter(item => item.value === null)
      .map(item => item.metric);
    return {
      title: `Evidência insuficiente para ${insight.channel}`,
      summary: unavailable.length > 0
        ? `Não foi possível aplicar uma regra de realocação porque faltam: ${unavailable.join(', ')}.`
        : 'A incerteza observada é ampla demais para sustentar uma realocação.',
      detail: 'Nenhum aumento ou corte é recomendado sem os sinais científicos exigidos pela regra versionada.',
      actionableStep: 'Manter a alocação e melhorar a evidência antes de decidir.'
    };
  },
  BUDGET_MAINTAIN_001: insight => ({
    title: `Manter orçamento de ${insight.channel}`,
    summary: 'Os sinais conjuntos não satisfazem as regras de aumento ou redução.',
    detail: 'ROI isolado nunca é usado como justificativa para elevar orçamento.',
    actionableStep: 'Manter a alocação indicada pelo cenário atual.'
  })
};

export function renderInsight(insight: StructuredInsight, index = 0): AIInsightItem {
  const rendered = templates[insight.ruleId] || {
    title: 'Impacto do cenário',
    summary: `Resultado determinístico: ${insight.action}.`,
    detail: 'Os valores foram calculados pelo posterior do Meridian.',
    actionableStep: 'Comparar o cenário com a referência atual.'
  };
  const content = typeof rendered === 'function' ? rendered(insight) : rendered;
  return {
    id: `${insight.modelId}:${insight.ruleId}:${insight.channel || 'portfolio'}:${index}`,
    type: insight.action === 'INCREASE_BUDGET' ? 'opportunity' : insight.action === 'REDUCE_BUDGET' ? 'saturation' : 'risk',
    ...content,
    channel: insight.channel || undefined,
    metric: insight.evidence.map(item => `${item.metric}=${item.value === null ? 'null' : item.value}`).join('; ')
  };
}

export function renderInsights(insights: StructuredInsight[]): AIInsightItem[] {
  return insights.map(renderInsight);
}
