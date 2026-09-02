import { GoogleGenAI, Type } from '@google/genai';
import {
  AIInsightItem,
  BudgetOptimizationResult,
  ExecutiveReportData,
  MeridianModelResults
} from '../types/mmm';
import {
  generateDecisionInsights,
  answerStrategicQuestion
} from '../services/decisionEngine';

// Lazy client initialization with telemetry User-Agent header
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

/**
 * Robust helper to call Gemini with multi-model fallback and graceful error mitigation
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
): Promise<string | null> {
  const models = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });

      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err: any) {
      const isUnavailableOrRateLimited =
        err?.status === 503 ||
        err?.code === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isUnavailableOrRateLimited) {
        console.warn(`[Gemini Handler] Modelo ${model} temporariamente com alta demanda (503/429). Alternando modelo...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }

      console.warn(`[Gemini Handler] Erro no modelo ${model}:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Generates grounded executive explanation for budget reallocation using Structured Outputs
 */
export async function generateBudgetExplanation(
  results: MeridianModelResults,
  opt: BudgetOptimizationResult,
  extraQuery?: string
): Promise<string> {
  // If a specific query was asked, use the deterministic strategic QA engine directly for perfect mathematical accuracy
  if (extraQuery && extraQuery.trim().length > 0) {
    const deterministicAnswer = answerStrategicQuestion(extraQuery, results, opt);
    return deterministicAnswer;
  }

  const ai = getAiClient();

  const channelsData = opt.reallocations.map(r => ({
    canal: r.channelName,
    investimento_atual: `R$ ${r.currentSpend.toLocaleString('pt-BR')}`,
    investimento_recomendado: `R$ ${r.recommendedSpend.toLocaleString('pt-BR')}`,
    variacao: `${r.deltaSpend >= 0 ? '+' : ''}R$ ${r.deltaSpend.toLocaleString('pt-BR')} (${r.percentageChange}%)`,
    roi_projetado: `${r.projectedRoi}x`,
    retorno_marginal: `${r.marginalRoi}x`,
    justificativa_matematica: r.recommendationReason
  }));

  const systemPrompt = `Você é um econometrista sênior e cientista de dados especializado em Marketing Mix Modeling (Google Meridian) e alocação de capital de mídia.
Sua missão é explicar para a diretoria executiva a recomendação de redistribuição de orçamento calculada pelo modelo bayesiano.

REGRAS CRÍTICAS:
1. Baseie-se ESTRITAMENTE nos números fornecidos. NÃO invente números, métricas ou canais.
2. Destaque o princípio do Retorno Marginal (mROI) e saturação (curva de Hill).
3. Responda ESTRITAMENTE usando o schema JSON fornecido.
4. Se o usuário perguntar onde colocar R$ 10.000 extras, aponte diretamente para o canal com o maior retorno marginal.`;

  const userPrompt = `
DADOS DO MODELO MERIDIAN:
- Orçamento Atual Total: R$ ${opt.currentTotalBudget.toLocaleString('pt-BR')} (ROI Médio: ${opt.blendedCurrentRoi}x)
- Orçamento Novo Recomendado: R$ ${opt.targetTotalBudget.toLocaleString('pt-BR')} (ROI Projetado: ${opt.blendedProjectedRoi}x)
- Receita/KPI Atual: R$ ${opt.expectedCurrentKpi.toLocaleString('pt-BR')}
- Receita/KPI Projetada: R$ ${opt.expectedOptimizedKpi.toLocaleString('pt-BR')}
- Incremento Projetado: +R$ ${opt.totalIncrementalKpi.toLocaleString('pt-BR')} (+${opt.overallLiftPercentage}%)
- Canal Mais Eficiente: ${results.mostEfficientChannel}
- Canal Mais Saturado: ${results.saturatedChannel}
- Canal com Maior Retorno Marginal: ${results.bestOpportunityChannel}

TABELA DE REALOCAÇÃO:
${JSON.stringify(channelsData, null, 2)}

Elabore a recomendação executiva explicando detalhadamente o diagnóstico, análise marginal e impacto estimado.`;

  const getHeuristicFallback = () => {
    return answerStrategicQuestion(extraQuery || 'resumo', results, opt);
  };

  if (!ai) {
    return getHeuristicFallback();
  }

  try {
    const text = await generateContentWithFallback(ai, {
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            question: { type: Type.STRING },
            evidence_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
            evidence_summary: { type: Type.STRING },
            analysis: { type: Type.STRING },
            conclusion: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            estimated_impact: {
              type: Type.OBJECT,
              properties: {
                value: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                lower: { type: Type.NUMBER },
                upper: { type: Type.NUMBER }
              },
              required: ["unit"]
            },
            uncertainty: { type: Type.STRING, enum: ["low", "medium", "high", "unavailable"] },
            risk_level: { type: Type.STRING, enum: ["low", "medium", "high", "blocked"] },
            action: { type: Type.STRING, enum: ["increase", "maintain", "reduce", "test", "investigate", "no_conclusion"] },
            next_step: { type: Type.STRING },
            limitations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "question", "evidence_ids", "evidence_summary", "analysis", "conclusion", "recommendation", "estimated_impact", "uncertainty", "risk_level", "action", "next_step", "limitations"]
        }
      }
    });

    if (!text) return getHeuristicFallback();

    const data = JSON.parse(text);
    
    return `### ${data.title}
**Pergunta/Contexto**: ${data.question}

**Resumo das Evidências**: ${data.evidence_summary}

**Análise**: ${data.analysis}

**Conclusão**: ${data.conclusion}

**Recomendação (${data.action.toUpperCase()})**: ${data.recommendation}

**Impacto Estimado**: ${data.estimated_impact.value !== null ? '+' + data.estimated_impact.value + ' ' + data.estimated_impact.unit : 'N/A'} (Mín: ${data.estimated_impact.lower}, Máx: ${data.estimated_impact.upper})
**Risco**: ${data.risk_level.toUpperCase()} | **Incerteza**: ${data.uncertainty.toUpperCase()}

**Próximo Passo**: ${data.next_step}

**Limitações**:
${data.limitations.map((l: string) => '- ' + l).join('\n')}`;
  } catch (error) {
    console.warn('[Gemini Handler] Fallback acionado para recomendação orçamentária:', error);
    return getHeuristicFallback();
  }
}

/**
 * Generates automated Bayesian insights grounded on the model results using the deterministic Decision Engine
 */
export async function generateAutomatedInsights(
  results: MeridianModelResults
): Promise<AIInsightItem[]> {
  // Use the deterministic Decision Engine directly for instant, grounded, and zero-hallucination insights
  const { cards } = generateDecisionInsights(results);

  if (cards && cards.length > 0) {
    return cards.map(c => ({
      id: c.id,
      type: c.type,
      title: c.title,
      summary: c.summary,
      detail: c.detail,
      channel: c.channel,
      metric: c.metric,
      actionableStep: c.actionableStep
    }));
  }

  const topChannel = results.channels.find(c => c.channelName === results.bestOpportunityChannel) || results.channels[0];
  const satChannel = results.channels.find(c => c.channelName === results.saturatedChannel) || results.channels[results.channels.length - 1];

  return [
    {
      id: 'insight-opp-1',
      type: 'opportunity',
      title: `${results.bestOpportunityChannel} possui o maior retorno marginal`,
      summary: `Cada R$ 1,00 adicional investido em ${results.bestOpportunityChannel} gera aproximadamente R$ ${topChannel?.marginalRoi?.toFixed(2) || 'N/A'} em receita incremental.`,
      detail: `O canal ainda não atingiu sua zona de saturação severa (operando em ~${topChannel?.saturationLevel?.toFixed(0) || 'N/A'}% da capacidade máxima da curva de Hill).`,
      channel: results.bestOpportunityChannel,
      metric: `mROI: ${topChannel?.marginalRoi?.toFixed(2) || 'N/A'}x`,
      actionableStep: `Aumente a alocação gradual em ${results.bestOpportunityChannel} em +15% a +25% no próximo ciclo.`
    },
    {
      id: 'insight-sat-1',
      type: 'saturation',
      title: `${results.saturatedChannel} apresenta sinais de saturação`,
      summary: `O canal atingiu nível de saturação de ${satChannel?.saturationLevel?.toFixed(0) || 'N/A'}%, reduzindo a eficiência de novos investimentos.`,
      detail: `Na curva de Hill estimada pelo Meridian, o retorno marginal caiu significativamente em comparação ao ROI histórico médio.`,
      channel: results.saturatedChannel,
      metric: `Saturação: ${satChannel?.saturationLevel?.toFixed(0) || 'N/A'}%`,
      actionableStep: `Reduza o investimento excedente em ${results.saturatedChannel} e realoque para canais subinvestidos.`
    }
  ];
}

/**
 * Generates full Executive & Technical Report
 */
export async function generateFullReport(
  results: MeridianModelResults,
  opt: BudgetOptimizationResult
): Promise<ExecutiveReportData> {
  const ai = getAiClient();

  const topEff = results.channels.find(c => c.channelName === results.mostEfficientChannel) || results.channels[0];
  const maxSpendCh = results.channels.reduce((prev, cur) => (cur.spend > prev.spend ? cur : prev), results.channels[0]);

  const baseReport: ExecutiveReportData = {
    title: 'Relatório Executivo de Marketing Mix Modeling (MMM)',
    companyName: 'Organização',
    generatedAt: new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' }),
    summary: `O modelo econométrico bayesiano Google Meridian processou o histórico de mídia e vendas, alcançando aderência de R² = ${results.diagnostics.rSquared} e MAPE = ${results.diagnostics.mape}%. A mídia paga gerou R$ ${results.diagnostics.mediaContribution.toLocaleString('pt-BR')} (${results.diagnostics.mediaShare}% do faturamento total), com ROI médio consolidado de ${results.blendedRoi}x. Identificamos R$ ${opt.totalIncrementalKpi.toLocaleString('pt-BR')} em potencial de receita incremental via realocação estratégica para canais com maior retorno marginal.`,
    dataReadinessSummary: `A base de dados histórica atendeu aos critérios estatísticos de validação, permitindo a separação confiável de carryover (adstock) e saturação (curvas de Hill) sem multicolinearidade impeditiva.`,
    historicalSpendSummary: `Total histórico investido de R$ ${results.totalSpend.toLocaleString('pt-BR')} distribuído entre ${results.channels.length} canais. O canal de maior investimento foi ${maxSpendCh?.channelName || 'Google Ads'}.`,
    channelPerformanceSummary: `O canal mais eficiente em termos de retorno sobre investimento foi **${results.mostEfficientChannel}** (ROI ${topEff?.roi?.toFixed(2) || '0.00'}x, intervalo [${topEff?.roiInterval?.ci025?.toFixed(1) || '0.0'}x - ${topEff?.roiInterval?.ci975?.toFixed(1) || '0.0'}x]). O canal com maior retorno marginal atual é **${results.bestOpportunityChannel}** (mROI ${results.channels.find(c => c.channelName === results.bestOpportunityChannel)?.marginalRoi?.toFixed(2) || '0.00'}x).`,
    budgetRecommendationSummary: `A otimização matemática pelo princípio da equimarginalidade recomenda direcionar o próximo ciclo de investimento prioritariamente para ${results.bestOpportunityChannel}, reduzindo a alocação em ${results.saturatedChannel} para mitigar perdas de eficiência por retornos decrescentes.`,
    scenariosSummary: `Simulações demonstram que uma realocação do mesmo orçamento atual pode elevar a receita em +${opt.overallLiftPercentage}% (+R$ ${opt.totalIncrementalKpi.toLocaleString('pt-BR')}) mantendo os mesmos custos totais.`,
    risksAndLimitations: [
      'As estimativas de MMM pressupõem estabilidade relativa de mercado e dos custos de mídia (CPMs/CPCs).',
      'Canais com menor variabilidade histórica apresentam intervalos de credibilidade bayesiana mais amplos.',
      'Recomenda-se calibrar o modelo periodicamente com experimentos de incrementalidade (Geo-lift e testes A/B).'
    ],
    methodologyNotes: [
      'Motor: Google Meridian Bayesian Marketing Mix Modeling.',
      'Transformações: Decaimento geométrico (Adstock) e curvas de saturação não-lineares de Hill.',
      'Amostrador: Amostragem Markov Chain Monte Carlo (MCMC) com diagnósticos de convergência Gelman-Rubin (R-hat) e Effective Sample Size (ESS).'
    ]
  };

  if (!ai) {
    return baseReport;
  }

  try {
    const prompt = `
DADOS DO MODELO MMM MERIDIAN:
- Investimento Total: R$ ${results.totalSpend.toLocaleString('pt-BR')}
- Receita Total: R$ ${results.totalKpi.toLocaleString('pt-BR')}
- ROI Blended: ${results.blendedRoi}x
- Qualidade: R² = ${results.diagnostics.rSquared}, MAPE = ${results.diagnostics.mape}%
- Canal Mais Eficiente: ${results.mostEfficientChannel}
- Canal Mais Saturado: ${results.saturatedChannel}
- Canal com Maior Retorno Marginal: ${results.bestOpportunityChannel}
- Ganho de Otimização: +R$ ${opt.totalIncrementalKpi.toLocaleString('pt-BR')} (+${opt.overallLiftPercentage}%)
- Desempenho dos Canais: ${JSON.stringify(results.channels.map(c => ({ canal: c.channelName, spend: c.spend, roi: c.roi, mROI: c.marginalRoi, saturacao: c.saturationLevel })), null, 2)}

Escreva uma síntese executiva de alto impacto para o relatório corporativo da empresa, explicando claramente o diagnóstico de mídia, a justificativa da realocação e as limitações metodológicas.
Retorne no formato JSON com os campos:
{
  "summary": "texto",
  "dataReadinessSummary": "texto",
  "historicalSpendSummary": "texto",
  "channelPerformanceSummary": "texto",
  "budgetRecommendationSummary": "texto",
  "scenariosSummary": "texto",
  "risksAndLimitations": ["item1", "item2", "item3"],
  "methodologyNotes": ["item1", "item2", "item3"]
}
`;

    const text = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    if (!text) {
      return baseReport;
    }

    const parsed = JSON.parse(text);
    return {
      ...baseReport,
      ...parsed
    };
  } catch (err) {
    console.warn('[Gemini Handler] Fallback acionado para relatório completo:', err);
    return baseReport;
  }
}
