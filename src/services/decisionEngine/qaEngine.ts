import { MeridianModelResults, BudgetOptimizationResult } from '../../types/mmm';
import { extractChannelFeatures } from './featureEngine';
import { calculatePortfolioBenchmarks } from './benchmarkEngine';
import { buildChannelDecisions } from './recommendationEngine';

/**
 * Answers strategic marketing questions deterministically using model results
 */
export function answerStrategicQuestion(
  question: string,
  results: MeridianModelResults,
  optResult?: BudgetOptimizationResult
): string {
  if (!results || !results.channels || results.channels.length === 0) {
    return 'Execute o modelo econométrico Meridian para habilitar o consultor analítico.';
  }

  const q = question.toLowerCase();
  const channelsFeatures = results.channels.map(c => extractChannelFeatures(c, results));
  const benchmarks = calculatePortfolioBenchmarks(channelsFeatures, results);
  const decisions = buildChannelDecisions(channelsFeatures, benchmarks, results, optResult);

  // Best channel for extra budget (ex: "R$ 10.000", "onde investir mais", "mais verba", "onde colocar")
  if (
    q.includes('10.000') ||
    q.includes('10000') ||
    q.includes('mais') ||
    q.includes('onde colocar') ||
    q.includes('onde investir') ||
    q.includes('extra') ||
    q.includes('aumentar')
  ) {
    // Channel with highest mROI and saturation < 70%
    const viableChannels = channelsFeatures
      .filter(c => c.saturationLevel < 70)
      .sort((a, b) => b.marginalRoi - a.marginalRoi);

    const best = viableChannels[0] || channelsFeatures.sort((a, b) => b.marginalRoi - a.marginalRoi)[0];

    return `Com base na resposta marginal do modelo, o melhor destino para verba adicional é **${best.channelName}**.

- **Retorno Marginal (mROI):** ${best.marginalRoi.toFixed(2)}x (para cada R$ 1,00 extra, a estimativa é gerar ~R$ ${best.marginalRoi.toFixed(2)} em receita incremental).
- **Nível de Saturação:** ${best.saturationLevel.toFixed(0)}% (ampla margem antes de atingir retornos decrescentes).
- **Confiança Bayesiana:** ${best.confidence}.

**Recomendação Estratégica:** Realizar a alocação de forma gradual, mantendo o monitoramento semanal do mROI para confirmar a tração.`;
  }

  // Channel to cut first (ex: "cortar", "reduzir", "diminuir", "onde tirar")
  if (
    q.includes('cortar') ||
    q.includes('reduzir') ||
    q.includes('diminuir') ||
    q.includes('onde tirar') ||
    q.includes('corte')
  ) {
    // Channel with highest saturation and lowest mROI
    const cutCandidates = channelsFeatures
      .filter(c => c.saturationLevel >= 55)
      .sort((a, b) => a.marginalRoi - b.marginalRoi);

    const worst = cutCandidates[0] || channelsFeatures.sort((a, b) => a.marginalRoi - b.marginalRoi)[0];

    return `O canal com maior recomendação de corte ou redução de verba é **${worst.channelName}**.

- **Motivo Principal:** Apresenta taxa de saturação de **${worst.saturationLevel.toFixed(0)}%** e retorno marginal reduzido a **${worst.marginalRoi.toFixed(2)}x**.
- **Impacto:** Novos investimentos neste canal geram pouco incremento de vendas comparado ao custo.
- **Ação:** Avaliar a redução de investimento e migrar o excedente para canais com menor saturação.`;
  }

  // Baseline / Natural Organic Sales (ex: "orgânico", "baseline", "sem mídia", "natural")
  if (
    q.includes('organico') ||
    q.includes('orgânico') ||
    q.includes('baseline') ||
    q.includes('sem midia') ||
    q.includes('sem mídia') ||
    q.includes('natural')
  ) {
    const baselineShare = results.diagnostics?.baselineShare ?? 45;
    const mediaShare = results.diagnostics?.mediaShare ?? 40;
    const controlsShare = results.diagnostics?.controlsShare ?? 15;

    return `A decomposição econométrica causal indica que **${baselineShare.toFixed(1)}%** da sua receita ocorre organicamente (Baseline / Vendas Naturais).

- **Vendas Naturais (Baseline):** ${baselineShare.toFixed(1)}% (força de marca, clientes recorrentes, SEO e histórico).
- **Impacto Incremental de Mídia:** ${mediaShare.toFixed(1)}% (vendas que deixariam de existir sem publicidade).
- **Fatores Externos & Feriados:** ${controlsShare.toFixed(1)}% (sazonalidade e eventos).

**Conclusão:** O investimento em mídia é responsável por ${mediaShare.toFixed(1)}% da receita, com ROI global ponderado de ${(results.blendedRoi || 0).toFixed(2)}x.`;
  }

  // Saturated channels (ex: "saturado", "saturação", "teto")
  if (
    q.includes('saturad') ||
    q.includes('satura') ||
    q.includes('teto')
  ) {
    const saturatedList = channelsFeatures
      .filter(c => c.saturationLevel >= 60)
      .sort((a, b) => b.saturationLevel - a.saturationLevel);

    if (saturatedList.length === 0) {
      return `Nenhum canal atingiu níveis críticos de saturação (>60%). O mix de mídia ainda possui capacidade de absorção de investimento nos patamares atuais.`;
    }

    const items = saturatedList
      .map(c => `- **${c.channelName}:** Saturação em ${c.saturationLevel.toFixed(0)}% (mROI atual de ${c.marginalRoi.toFixed(2)}x)`)
      .join('\n');

    return `Os seguintes canais foram identificados próximos ou dentro da zona de saturação:

${items}

**Recomendação:** Evitar aumentos substanciais de verba nestes canais para prevenir desperdício financeiro por retornos decrescentes.`;
  }

  // Difference between ROI and Marginal ROI (ex: "diferença", "mroi", "retorno marginal")
  if (
    q.includes('diferenca') ||
    q.includes('diferença') ||
    q.includes('mroi') ||
    q.includes('marginal')
  ) {
    return `**Entendendo a diferença essencial:**

1. **ROI Médio (Retorno Histórico):** Mede o faturamento total gerado dividido pelo total já investido no canal até hoje. Ex: Um canal com ROI 4.0x gerou R$ 4 em vendas para cada R$ 1 gasto no passado.
2. **mROI (Retorno Marginal):** Mede quanto o **próximo R$ 1,00 adicional** irá gerar em vendas incrementais no presente/futuro.

*Por que isso importa?* Um canal pode ter um ROI médio histórico alto (ex: 4.5x), mas estar saturado, de modo que colocar mais dinheiro nele agora entregará apenas 0.80x na margem. Decisões de alocação de orçamento devem sempre priorizar o **mROI**.`;
  }

  // Default synthesis based on top decisions
  const topOpp = decisions.find(d => d.decision === 'INCREASE' || d.category === 'OPPORTUNITY');
  const topRisk = decisions.find(d => d.decision === 'DECREASE' || d.category === 'RISK');

  return `Com base na modelagem econométrica do mix de marketing:

- **Canal mais eficiente na margem:** ${results.mostEfficientChannel || topOpp?.entity || 'N/A'} (mROI ${topOpp?.metrics.marginalRoi.toFixed(2) || '0.00'}x).
- **Canal em atenção/saturação:** ${results.saturatedChannel || topRisk?.entity || 'N/A'} (Saturação ${topRisk?.metrics.saturation.toFixed(0) || '0'}%).
- **Retorno Global Ponderado (Blended ROI):** ${(results.blendedRoi || 0).toFixed(2)}x.

${topOpp ? `**Oportunidade Imediata:** ${topOpp.explanation.whatToDo}` : ''}`;
}
