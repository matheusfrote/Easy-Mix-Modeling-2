import {
  AIInsightItem,
  BudgetOptimizationResult,
  ColumnMapping,
  DataReadinessScore,
  ExecutiveReportData,
  MeridianModelConfig,
  MeridianModelResults,
  ScenarioDefinition
} from '../types/mmm';
import { DataRow, StatisticalValidationReport, validateDataset, sanitizeDataset } from './dataValidator';
import { inferColumnMappings } from './dataMapper';
import { calculateDataReadinessScore } from './dataReadiness';
import { generateSyntheticDataset } from '../ml/syntheticData';
import { fitMeridianModel, optimizeBudget, simulateScenario } from '../ml/meridianEngine';
import { generateDecisionInsights, answerStrategicQuestion } from './decisionEngine';

export interface UploadResponse {
  rowCount: number;
  columnCount: number;
  columns: string[];
  rows?: DataRow[];
  previewRows: DataRow[];
  mappings: ColumnMapping[];
  validation: StatisticalValidationReport;
  readiness: DataReadinessScore;
  isSynthetic: boolean;
  filename: string;
}

// Local cache to ensure seamless offline/resilient behavior
let localDatasetCache: {
  rows: DataRow[];
  columns: string[];
  mappings: ColumnMapping[];
  validation: StatisticalValidationReport;
  readiness: DataReadinessScore;
  isSynthetic: boolean;
  filename: string;
} | null = null;

let localModelResultsCache: MeridianModelResults | null = null;

function getFallbackInsights(results: MeridianModelResults): AIInsightItem[] {
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
      actionableStep: c.actionableStep,
      confidence: c.confidenceLabel,
      impact: c.impact
    }));
  }

  const topCh = results.channels.find(c => c.channelName === results.bestOpportunityChannel) || results.channels[0];
  const satCh = results.channels.find(c => c.channelName === results.saturatedChannel) || results.channels[results.channels.length - 1];

  return [
    {
      id: 'insight-opp-1',
      type: 'opportunity',
      title: `${results.bestOpportunityChannel} possui o maior retorno marginal`,
      summary: `Cada R$ 1,00 adicional investido em ${results.bestOpportunityChannel} gera aproximadamente R$ ${topCh?.marginalRoi?.toFixed(2) || '2.80'} em receita incremental.`,
      detail: `O canal ainda não atingiu sua zona de saturação severa (operando em ~${topCh?.saturationLevel || 40}% da capacidade máxima da curva de Hill).`,
      channel: results.bestOpportunityChannel,
      metric: `mROI: ${topCh?.marginalRoi?.toFixed(2) || '2.80'}x`,
      actionableStep: `Aumente a alocação gradual em ${results.bestOpportunityChannel} em +15% a +25% no próximo ciclo orçamentário.`
    },
    {
      id: 'insight-sat-1',
      type: 'saturation',
      title: `${results.saturatedChannel} apresenta sinais de saturação`,
      summary: `O canal atingiu nível de saturação de ${satCh?.saturationLevel || 80}%, reduzindo a eficiência marginal de novos investimentos.`,
      detail: `Na curva de Hill estimada pelo Meridian, o retorno marginal caiu significativamente em relação ao ROI histórico médio.`,
      channel: results.saturatedChannel,
      metric: `Saturação: ${satCh?.saturationLevel || 80}%`,
      actionableStep: `Reduza o investimento excedente em ${results.saturatedChannel} e realoque para canais com maior inclinação marginal.`
    }
  ];
}

function getFallbackReport(results: MeridianModelResults, opt: BudgetOptimizationResult): ExecutiveReportData {
  const topCh = results.channels.find(c => c.channelName === results.mostEfficientChannel) || results.channels[0];
  const oppCh = results.channels.find(c => c.channelName === results.bestOpportunityChannel) || results.channels[0];

  return {
    title: 'Relatório Executivo de Marketing Mix Modeling (MMM)',
    companyName: 'Organização',
    generatedAt: new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' }),
    summary: `O modelo econométrico bayesiano Google Meridian processou o histórico de mídia e vendas, alcançando aderência de R² = ${results.diagnostics.rSquared} e MAPE = ${results.diagnostics.mape}%. A mídia paga gerou R$ ${results.diagnostics.mediaContribution.toLocaleString('pt-BR')} (${results.diagnostics.mediaShare}% do faturamento total), com ROI médio consolidado de ${results.blendedRoi}x. Identificamos R$ ${opt.totalIncrementalKpi.toLocaleString('pt-BR')} em potencial de receita incremental via realocação estratégica para canais com maior retorno marginal.`,
    dataReadinessSummary: `A base de dados histórica atendeu aos critérios estatísticos de validação, permitindo a separação confiável de carryover (adstock) e saturação (curvas de Hill) sem multicolinearidade impeditiva.`,
    historicalSpendSummary: `Total histórico investido de R$ ${results.totalSpend.toLocaleString('pt-BR')} distribuído entre ${results.channels.length} canais. O canal de maior investimento foi ${results.channels[0]?.channelName || 'Google Ads'}.`,
    channelPerformanceSummary: `O canal mais eficiente em termos de retorno sobre investimento foi ${results.mostEfficientChannel} (ROI ${topCh?.roi?.toFixed(2)}x, intervalo [${topCh?.roiInterval?.ci025?.toFixed(1)}x - ${topCh?.roiInterval?.ci975?.toFixed(1)}x]). O canal com maior retorno marginal atual é ${results.bestOpportunityChannel} (mROI ${oppCh?.marginalRoi?.toFixed(2)}x).`,
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
}

// Robust helper to perform safe JSON API requests and prevent "Unexpected token < in JSON at position 0"
async function safeApiCall<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      return null;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    const text = await res.text();
    if (!text || text.trim().startsWith('<') || text.trim().startsWith('<!doctype') || text.trim().startsWith('<!DOCTYPE')) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export const apiClient = {
  async loadSyntheticData(): Promise<UploadResponse> {
    const data = await safeApiCall<any>('/api/synthetic-data');
    if (data && data.columns && Array.isArray(data.rows)) {
      const response: UploadResponse = {
        rowCount: data.rows?.length || 104,
        columnCount: data.columns?.length || 10,
        columns: data.columns || [],
        rows: data.rows,
        previewRows: (data.rows || []).slice(0, 10),
        mappings: data.mappings || [],
        validation: data.validation,
        readiness: data.readiness,
        isSynthetic: true,
        filename: 'meridian_synthetic_104weeks.csv'
      };
      localDatasetCache = {
        rows: data.rows,
        columns: data.columns,
        mappings: data.mappings,
        validation: data.validation,
        readiness: data.readiness,
        isSynthetic: true,
        filename: response.filename
      };
      return response;
    }

    const syn = generateSyntheticDataset(42);
    const cols = Object.keys(syn.rows[0]);
    const rows = syn.rows as unknown as DataRow[];
    const mappings = inferColumnMappings(cols, rows);
    const val = validateDataset(rows, mappings);
    const readiness = calculateDataReadinessScore(rows, mappings, val);

    localDatasetCache = {
      rows,
      columns: cols,
      mappings,
      validation: val,
      readiness,
      isSynthetic: true,
      filename: 'meridian_synthetic_104weeks.csv'
    };

    return {
      rowCount: rows.length,
      columnCount: cols.length,
      columns: cols,
      rows,
      previewRows: rows.slice(0, 10),
      mappings,
      validation: val,
      readiness,
      isSynthetic: true,
      filename: 'meridian_synthetic_104weeks.csv'
    };
  },

  async uploadData(rows: DataRow[], filename?: string): Promise<UploadResponse> {
    const data = await safeApiCall<any>('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, filename })
    });
    if (data && data.columns) {
      localDatasetCache = {
        rows,
        columns: data.columns,
        mappings: data.mappings,
        validation: data.validation,
        readiness: data.readiness,
        isSynthetic: false,
        filename: data.filename || filename || 'uploaded_data.csv'
      };
      return {
        ...data,
        rows
      };
    }

    const cols = Object.keys(rows[0] || {}).map(c => c.trim()).filter(Boolean);
    const mappings = inferColumnMappings(cols, rows);
    const val = validateDataset(rows, mappings);
    const readiness = calculateDataReadinessScore(rows, mappings, val);

    const result: UploadResponse = {
      rowCount: rows.length,
      columnCount: cols.length,
      columns: cols,
      rows,
      previewRows: rows.slice(0, 10),
      mappings,
      validation: val,
      readiness,
      isSynthetic: false,
      filename: filename || 'uploaded_data.csv'
    };

    localDatasetCache = {
      rows,
      columns: cols,
      mappings,
      validation: val,
      readiness,
      isSynthetic: false,
      filename: result.filename
    };

    return result;
  },

  async saveMappings(mappings: ColumnMapping[]): Promise<{ success: boolean; mappings: ColumnMapping[] }> {
    const data = await safeApiCall<any>('/api/map-columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings })
    });
    if (data && data.success) {
      if (localDatasetCache) {
        localDatasetCache.mappings = mappings;
      }
      return data;
    }
    if (localDatasetCache) {
      localDatasetCache.mappings = mappings;
    }
    return { success: true, mappings };
  },

  async validateData(rows?: DataRow[], mappings?: ColumnMapping[]): Promise<{ validation: StatisticalValidationReport; readiness: DataReadinessScore }> {
    const data = await safeApiCall<{ validation: StatisticalValidationReport; readiness: DataReadinessScore }>('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, mappings })
    });
    if (data && data.validation && data.readiness) {
      return data;
    }

    const targetRows = rows || localDatasetCache?.rows || [];
    const targetMappings = mappings || localDatasetCache?.mappings || [];
    const val = validateDataset(targetRows, targetMappings);
    const readiness = calculateDataReadinessScore(targetRows, targetMappings, val);
    return { validation: val, readiness };
  },

  async sanitizeData(rows?: DataRow[], mappings?: ColumnMapping[]): Promise<{
    success: boolean;
    cleanedRows: DataRow[];
    fixedIssues: string[];
    recordsDeduplicated: number;
    negativeValuesClipped: number;
    missingValuesImputed: number;
    datesReordered: boolean;
    validation: StatisticalValidationReport;
    readiness: DataReadinessScore;
  }> {
    const data = await safeApiCall<any>('/api/sanitize-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, mappings })
    });
    if (data && data.cleanedRows && data.validation) {
      if (localDatasetCache) {
        localDatasetCache.rows = data.cleanedRows;
        localDatasetCache.validation = data.validation;
        localDatasetCache.readiness = data.readiness;
      }
      return data;
    }

    const targetRows = rows || localDatasetCache?.rows || [];
    const targetMappings = mappings || localDatasetCache?.mappings || [];
    const sanitizeResult = sanitizeDataset(targetRows, targetMappings);
    const val = validateDataset(sanitizeResult.cleanedRows, targetMappings);
    const readiness = calculateDataReadinessScore(sanitizeResult.cleanedRows, targetMappings, val);

    if (localDatasetCache) {
      localDatasetCache.rows = sanitizeResult.cleanedRows;
      localDatasetCache.validation = val;
      localDatasetCache.readiness = readiness;
    }

    return {
      success: true,
      cleanedRows: sanitizeResult.cleanedRows,
      fixedIssues: sanitizeResult.fixedIssues,
      recordsDeduplicated: sanitizeResult.recordsDeduplicated,
      negativeValuesClipped: sanitizeResult.negativeValuesClipped,
      missingValuesImputed: sanitizeResult.missingValuesImputed,
      datesReordered: sanitizeResult.datesReordered,
      validation: val,
      readiness
    };
  },

  async runModel(config: MeridianModelConfig, rows?: DataRow[]): Promise<MeridianModelResults> {
    const data = await safeApiCall<MeridianModelResults>('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, rows })
    });
    if (data && data.channels && data.diagnostics) {
      localModelResultsCache = data;
      return data;
    }

    const targetRows = rows || localDatasetCache?.rows || [];
    const results = fitMeridianModel(targetRows, config, localDatasetCache?.isSynthetic ?? false);
    localModelResultsCache = results;
    return results;
  },

  async getModelResults(): Promise<MeridianModelResults> {
    const data = await safeApiCall<MeridianModelResults>('/api/model/results');
    if (data && data.channels && data.diagnostics) {
      localModelResultsCache = data;
      return data;
    }

    if (localModelResultsCache) {
      return localModelResultsCache;
    }

    // Generate fresh model if not available
    const syn = generateSyntheticDataset(42);
    const rows = syn.rows as unknown as DataRow[];
    const defaultModelConfig: MeridianModelConfig = {
      dateColumn: 'date',
      kpiColumn: 'revenue',
      mediaChannels: [
        { spendColumn: 'google_ads_spend', channelName: 'Google Ads', channelType: 'search' },
        { spendColumn: 'meta_ads_spend', channelName: 'Meta Ads', channelType: 'social' },
        { spendColumn: 'youtube_spend', channelName: 'YouTube', channelType: 'video' },
        { spendColumn: 'tiktok_spend', channelName: 'TikTok', channelType: 'social' },
        { spendColumn: 'tv_spend', channelName: 'TV', channelType: 'tv' }
      ],
      controlColumns: ['holiday', 'promotion', 'economic_index'],
      seasonalityFourierTerms: 2,
      mcmcChains: 4,
      mcmcDraws: 1000,
      mcmcWarmup: 500,
      targetKpiType: 'revenue',
      priors: {}
    };
    const results = fitMeridianModel(rows, defaultModelConfig, true);
    localModelResultsCache = results;
    return results;
  },

  async optimizeBudget(targetTotalBudget: number, constraints?: Record<string, { minSpend?: number; maxSpend?: number }>): Promise<BudgetOptimizationResult> {
    const data = await safeApiCall<BudgetOptimizationResult>('/api/optimize-budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetTotalBudget, constraints })
    });
    if (data && data.reallocations && typeof data.totalIncrementalKpi === 'number') {
      return data;
    }

    const model = localModelResultsCache || await this.getModelResults();
    return optimizeBudget(model, targetTotalBudget, constraints);
  },

  async simulateScenario(channelSpends: Record<string, number>): Promise<ScenarioDefinition> {
    const data = await safeApiCall<ScenarioDefinition>('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelSpends })
    });
    if (data && typeof data.expectedKpi === 'number') {
      return data;
    }

    const model = localModelResultsCache || await this.getModelResults();
    return simulateScenario(model, channelSpends);
  },

  async generateInsights(): Promise<AIInsightItem[]> {
    const data = await safeApiCall<{ insights: AIInsightItem[] }>('/api/generate-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (data && Array.isArray(data.insights) && data.insights.length > 0) {
      return data.insights;
    }

    const model = localModelResultsCache || await this.getModelResults();
    return getFallbackInsights(model);
  },

  async getBudgetExplanation(optResult?: BudgetOptimizationResult, extraQuery?: string): Promise<string> {
    const data = await safeApiCall<{ explanation: string }>('/api/budget-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optResult, extraQuery })
    });
    if (data && data.explanation) {
      return data.explanation;
    }

    const model = localModelResultsCache || await this.getModelResults();
    const opt = optResult || optimizeBudget(model, model.totalSpend);
    return answerStrategicQuestion(extraQuery || 'resumo', model, opt);
  },

  async getReport(): Promise<ExecutiveReportData> {
    const data = await safeApiCall<ExecutiveReportData>('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (data && data.title && data.summary) {
      return data;
    }

    const model = localModelResultsCache || await this.getModelResults();
    const opt = optimizeBudget(model, model.totalSpend * 1.15);
    return getFallbackReport(model, opt);
  }
};
