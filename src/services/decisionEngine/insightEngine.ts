import { ChannelFeatures, DecisionAction, ReasonCode, FormattedInsightCardItem, DecisionResult } from './types';
import { BudgetReallocation } from '../../types/mmm';

/**
 * Generates the storytelling narrative:
 * 1. O QUE ESTÁ ACONTECENDO?
 * 2. POR QUE ISSO IMPORTA?
 * 3. O QUE FAZER?
 */
export function formatInsightNarrative(
  features: ChannelFeatures,
  decision: DecisionAction,
  reasonCodes: ReasonCode[],
  optReallocation?: BudgetReallocation
): { whatIsHappening: string; whyItMatters: string; whatToDo: string } {
  const mroiFormatted = features.marginalRoi.toFixed(2);
  const roiFormatted = features.roi.toFixed(2);
  const satFormatted = features.saturationLevel.toFixed(0);

  // INCREASE
  if (decision === 'INCREASE') {
    return {
      whatIsHappening: `${features.channelName} apresenta retorno marginal estimado de ${mroiFormatted}x e taxa de saturação moderada de ${satFormatted}%.`,
      whyItMatters: `Cada R$ 1,00 adicional investido possui alto potencial de gerar aproximadamente R$ ${mroiFormatted} em receita incremental antes de atingir retornos decrescentes.`,
      whatToDo: optReallocation && optReallocation.deltaSpend > 0
        ? `O cenário projetado sugere expandir o investimento em aproximadamente +${optReallocation.percentageChange}% (+R$ ${optReallocation.deltaSpend.toLocaleString('pt-BR')}) de forma gradual.`
        : `Avaliar aumento gradual do investimento no canal, monitorando a evolução do retorno marginal.`
    };
  }

  // DECREASE
  if (decision === 'DECREASE') {
    return {
      whatIsHappening: `${features.channelName} atingiu nível elevado de saturação (${satFormatted}%), com retorno marginal reduzido a ${mroiFormatted}x.`,
      whyItMatters: `A maior parte da audiência já foi impactada com frequência suficiente. Novos investimentos neste canal geram pouco incremento de vendas em relação ao custo.`,
      whatToDo: optReallocation && optReallocation.deltaSpend < 0
        ? `O cenário projetado sugere reduzir o investimento em aproximadamente ${optReallocation.percentageChange}% (R$ ${optReallocation.deltaSpend.toLocaleString('pt-BR')}) e realocar para canais com maior potencial marginal.`
        : `Avaliar redução do investimento excedente ou redistribuição da verba para frentes mais eficientes na margem.`
    };
  }

  // TEST
  if (decision === 'TEST') {
    return {
      whatIsHappening: `${features.channelName} demonstra sinais favoráveis de retorno (ROI ${roiFormatted}x, mROI ${mroiFormatted}x), porém com dados limitados ou incerteza estatística.`,
      whyItMatters: `Existe potencial de crescimento, mas aumentar bruscamente o orçamento sem validação controlada pode acarretar riscos.`,
      whatToDo: `Executar um teste controlado com incremento moderado de verba (+10% a +15%) para calibrar a resposta real do canal.`
    };
  }

  // INVESTIGATE
  if (decision === 'INVESTIGATE') {
    return {
      whatIsHappening: `Os dados observados para ${features.channelName} apresentam alta dispersão ou intervalo de incerteza amplo.`,
      whyItMatters: `A evidência estatística disponível ainda não é conclusiva para sustentar alterações significativas de orçamento.`,
      whatToDo: `Investigar a consistência dos dados de rastreamento e manter o investimento estável até consolidar mais semanas de histórico.`
    };
  }

  // MAINTAIN
  return {
    whatIsHappening: `${features.channelName} opera em equilíbrio, com ROI de ${roiFormatted}x, retorno marginal de ${mroiFormatted}x e saturação controlada em ${satFormatted}%.`,
    whyItMatters: `O nível atual de investimento captura adequadamente a demanda sem pressionar a margem por saturação excessiva.`,
    whatToDo: `Manter a alocação atual de verba, acompanhando a estabilidade do custo por aquisição.`
  };
}

/**
 * Transforms Decision Results into UI-ready Formatted Insight Cards
 */
export function transformDecisionsToCards(
  decisions: DecisionResult[]
): FormattedInsightCardItem[] {
  const cards: FormattedInsightCardItem[] = [];

  // Sort by priority (HIGH -> MEDIUM -> LOW) and then score descending
  const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sorted = [...decisions].sort((a, b) => {
    const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return b.score - a.score;
  });

  // Limit to top strategic recommendations to prevent visual clutter
  const selectedDecisions = sorted.slice(0, 6);

  selectedDecisions.forEach((d, idx) => {
    let type: 'opportunity' | 'saturation' | 'efficiency' | 'risk' = 'efficiency';
    let status: 'success' | 'warning' | 'info' = 'info';
    let categoryTitle = 'Recomendação Estratégica';

    if (d.decision === 'INCREASE' || d.category === 'OPPORTUNITY') {
      type = 'opportunity';
      status = 'success';
      categoryTitle = 'Oportunidade de Escala';
    } else if (d.decision === 'DECREASE' || d.category === 'RISK') {
      type = 'saturation';
      status = 'warning';
      categoryTitle = 'Eficiência sob Pressão / Saturação';
    } else if (d.decision === 'REALLOCATE') {
      type = 'opportunity';
      status = 'info';
      categoryTitle = 'Oportunidade de Realocação de Portfólio';
    } else if (d.decision === 'TEST' || d.decision === 'INVESTIGATE') {
      type = 'risk';
      status = 'info';
      categoryTitle = 'Validação Estatística & Incerteza';
    }

    const title = d.decision === 'INCREASE'
      ? `${d.entity}: Potencial de Expansão com Alto Retorno Marginal`
      : d.decision === 'DECREASE'
      ? `${d.entity}: Saturação Detectada na Margem`
      : d.decision === 'REALLOCATE'
      ? `Realocação Estratégica: ${d.entity}`
      : d.decision === 'TEST'
      ? `${d.entity}: Oportunidade para Teste Controlado`
      : d.decision === 'INVESTIGATE'
      ? `${d.entity}: Evidência Estatística com Incerteza`
      : `${d.entity}: Alocação Equilibrada em Regime Ótimo`;

    const summary = `${d.explanation.whatIsHappening} ${d.explanation.whyItMatters}`;
    const detail = `${d.explanation.whatIsHappening}\n\n${d.explanation.whyItMatters}\n\nRecomendação: ${d.explanation.whatToDo}`;
    const finding = `${d.explanation.whatIsHappening} ${d.explanation.whyItMatters}`;
    const actionText = d.explanation.whatToDo;
    const actionableStep = d.explanation.whatToDo;

    const metric = d.metrics.marginalRoi
      ? `mROI: ${d.metrics.marginalRoi.toFixed(2)}x (Saturação: ${d.metrics.saturation.toFixed(0) || 0}%)`
      : d.metrics.roi
      ? `ROI: ${d.metrics.roi.toFixed(2)}x`
      : 'Econometria Causal';

    const impact = d.recommendation.suggestedDeltaSpend
      ? `${d.recommendation.suggestedDeltaSpend > 0 ? '+' : ''}R$ ${d.recommendation.suggestedDeltaSpend.toLocaleString('pt-BR')} projetado`
      : d.decision === 'INCREASE'
      ? 'Aumento de faturamento incremental'
      : d.decision === 'DECREASE'
      ? 'Economia de verba saturada'
      : undefined;

    cards.push({
      id: `decision-insight-${idx + 1}`,
      type,
      category: categoryTitle,
      title,
      summary,
      detail,
      finding,
      impact,
      actionText,
      actionableStep,
      channel: d.entity.includes('➔') ? undefined : d.entity,
      metric,
      confidence: d.confidence === 'Alta' ? 'high' : d.confidence === 'Média' ? 'medium' : 'low',
      confidenceLabel: d.confidence,
      status,
      score: d.score,
      priority: d.priority,
      decision: d.decision,
      reasonCodes: d.reasonCodes,
      evidence: {
        metric: 'Retorno Marginal & Saturação',
        value: `${d.metrics.marginalRoi ? `${d.metrics.marginalRoi.toFixed(2)}x mROI` : `ROI ${d.metrics.roi.toFixed(2)}x`}`,
        channel: d.entity,
        explanation: `Regra acionada: ${d.auditTrail.ruleTriggered}. Motivos: ${d.reasonCodes.join(', ')}.`
      }
    });
  });

  return cards;
}
