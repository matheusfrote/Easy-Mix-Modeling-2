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
import { DataRow, StatisticalValidationReport } from './dataValidator';

export interface AdsPlatformStatus {
  isConfigured: boolean;
  status: 'env_connected' | 'user_connected' | 'disconnected';
  source: 'environment' | 'user_session' | 'none';
  details: {
    developerTokenPresent?: boolean;
    clientIdPresent: boolean;
    clientSecretPresent: boolean;
    customerIdPresent?: boolean;
    refreshTokenPresent?: boolean;
    accessTokenPresent?: boolean;
    adAccountIdPresent?: boolean;
  };
  maskedCustomerId?: string;
  maskedAccountId?: string;
  lastConfiguredAt: string | null;
}

export interface AdsConnectionStatusResponse {
  isAuthenticated: boolean;
  googleAds: AdsPlatformStatus;
  metaAds: AdsPlatformStatus;
}

export interface UploadResponse {
  rowCount: number;
  columnCount: number;
  columns: string[];
  rows?: DataRow[];
  previewRows: DataRow[];
  mappings: ColumnMapping[];
  validation: StatisticalValidationReport;
  readiness: DataReadinessScore;
  filename: string;
}

// UI snapshot only. It is never used to synthesize a scientific response.
let localDatasetCache: {
  rows: DataRow[];
  columns: string[];
  mappings: ColumnMapping[];
  validation: StatisticalValidationReport;
  readiness: DataReadinessScore;
  filename: string;
} | null = null;

let localModelResultsCache: MeridianModelResults | null = null;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isNullableFinite(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

// Transport and contract failures must remain real failures. Scientific results
// are never reconstructed locally when the backend is unavailable.
async function safeApiCall<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    let sessionId = typeof window !== 'undefined' ? localStorage.getItem('easy_mix_session_id') : null;
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> || {})
    };

    if (sessionId && !headers['x-session-id']) {
      headers['x-session-id'] = sessionId;
    }

    const res = await fetch(url, {
      ...options,
      headers
    });
    
    // Save session id if backend provided a new one
    const returnedSessionId = res.headers.get('x-session-id');
    if (returnedSessionId && typeof window !== 'undefined') {
      localStorage.setItem('easy_mix_session_id', returnedSessionId);
    }

    if (!res.ok) {
      let errorData: any = null;
      try {
        const text = await res.text();
        errorData = JSON.parse(text);
      } catch {}

      const detail = errorData?.detail;
      throw new ApiError(
        detail?.message || errorData?.message || errorData?.error || errorData?.details || `Erro na requisição (${res.status})`,
        detail?.code || errorData?.code || 'HTTP_ERROR',
        res.status,
        detail || errorData?.details
      );
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new ApiError('A API retornou conteúdo não JSON.', 'INVALID_RESPONSE', 502);
    }
    const text = await res.text();
    if (!text || text.trim().startsWith('<') || text.trim().startsWith('<!doctype') || text.trim().startsWith('<!DOCTYPE')) {
      throw new ApiError('A API retornou uma resposta vazia ou HTML.', 'INVALID_RESPONSE', 502);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError('A API retornou JSON inválido.', 'INVALID_RESPONSE', 502);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error) {
      throw new ApiError(err.message, 'NETWORK_ERROR', 0);
    }
    throw new ApiError('Falha de rede desconhecida.', 'NETWORK_ERROR', 0);
  }
}

export const apiClient = {
  async uploadData(rows: DataRow[], filename?: string): Promise<UploadResponse> {
    const data = await safeApiCall<any>('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, filename })
    });
    if (data && data.columns) {
      localModelResultsCache = null;
      localDatasetCache = {
        rows,
        columns: data.columns,
        mappings: data.mappings,
        validation: data.validation,
        readiness: data.readiness,
        filename: data.filename || filename || 'uploaded_data.csv'
      };
      return {
        ...data,
        rows
      };
    }

    throw new ApiError('Contrato inválido no upload.', 'INVALID_RESPONSE', 502);
  },

  async saveMappings(mappings: ColumnMapping[]): Promise<{ success: boolean; mappings: ColumnMapping[] }> {
    const data = await safeApiCall<any>('/api/map-columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings })
    });
    if (data && data.success) {
      localModelResultsCache = null;
      if (localDatasetCache) {
        localDatasetCache.mappings = mappings;
      }
      return data;
    }
    throw new ApiError('O servidor não confirmou o mapeamento.', 'INVALID_RESPONSE', 502);
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

    throw new ApiError('Contrato inválido na validação.', 'INVALID_RESPONSE', 502);
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
      localModelResultsCache = null;
      if (localDatasetCache) {
        localDatasetCache.rows = data.cleanedRows;
        localDatasetCache.validation = data.validation;
        localDatasetCache.readiness = data.readiness;
      }
      return data;
    }

    throw new ApiError('Contrato inválido no saneamento.', 'INVALID_RESPONSE', 502);
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
    throw new ApiError('Contrato inválido no resultado do modelo.', 'INVALID_RESPONSE', 502);
  },

  async getModelResults(): Promise<MeridianModelResults> {
    const data = await safeApiCall<MeridianModelResults>('/api/model/results');
    if (data && data.channels && data.diagnostics) {
      localModelResultsCache = data;
      return data;
    }

    throw new ApiError('Contrato inválido no resultado do modelo.', 'INVALID_RESPONSE', 502);
  },

  async optimizeBudget(targetTotalBudget: number, constraints?: Record<string, { minSpend?: number; maxSpend?: number }>): Promise<BudgetOptimizationResult> {
    const data = await safeApiCall<BudgetOptimizationResult>('/api/optimize-budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetTotalBudget, constraints })
    });
    if (
      data
      && Array.isArray(data.reallocations)
      && Object.hasOwn(data, 'totalIncrementalKpi')
      && isNullableFinite(data.totalIncrementalKpi)
      && data.reallocations.every(item =>
        typeof item?.channelName === 'string'
        && Object.hasOwn(item, 'recommendedSpend')
        && isNullableFinite(item.recommendedSpend)
      )
    ) {
      return data;
    }

    throw new ApiError('Contrato inválido na otimização de orçamento.', 'INVALID_RESPONSE', 502);
  },

  async simulateScenario(channelSpends: Record<string, number>): Promise<ScenarioDefinition> {
    const data = await safeApiCall<ScenarioDefinition>('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelSpends })
    });
    if (
      data
      && typeof data.id === 'string'
      && Object.hasOwn(data, 'expectedKpi')
      && isNullableFinite(data.expectedKpi)
      && data.channelSpends
      && typeof data.channelSpends === 'object'
    ) {
      return data;
    }

    throw new ApiError('Contrato inválido na simulação de cenário.', 'INVALID_RESPONSE', 502);
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

    throw new Error('Falha ao comunicar com o servidor para gerar insights.');
  },

  async getBudgetExplanation(targetTotalBudget?: number, extraQuery?: string): Promise<string> {
    const data = await safeApiCall<{ explanation: string }>('/api/budget-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetTotalBudget, extraQuery })
    });
    if (data && data.explanation) {
      return data.explanation;
    }

    throw new Error('Falha ao comunicar com o servidor para gerar explicação orçamentária.');
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

    throw new Error('Falha ao comunicar com o servidor para gerar relatório.');
  },

  async enhanceReportWithAi(): Promise<ExecutiveReportData> {
    const data = await safeApiCall<ExecutiveReportData>('/api/report/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useAi: true, outputType: 'executive_report' })
    });
    if (data && data.title && data.summary && data.modelId) {
      return data;
    }

    throw new Error('Falha ao melhorar a narrativa do relatório.');
  },

  clearModelCache(): void {
    localModelResultsCache = null;
  }
};
