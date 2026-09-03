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
  filename: string;
}

// Local cache to ensure seamless offline/resilient behavior
let localDatasetCache: {
  rows: DataRow[];
  columns: string[];
  mappings: ColumnMapping[];
  validation: StatisticalValidationReport;
  readiness: DataReadinessScore;
  filename: string;
} | null = null;

let localModelResultsCache: MeridianModelResults | null = null;

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
      filename: filename || 'uploaded_data.csv'
    };

    localDatasetCache = {
      rows,
      columns: cols,
      mappings,
      validation: val,
      readiness,
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
    throw new Error('Falha ao comunicar com o servidor Meridian. Serviço indisponível ou modelo não convergiu.');
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

    throw new Error('Nenhum modelo disponível ou falha ao carregar resultados do servidor.');
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

    throw new Error('Falha ao comunicar com o servidor para otimizar orçamento.');
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

    throw new Error('Falha ao comunicar com o servidor para simular cenário.');
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

  async getBudgetExplanation(optResult?: BudgetOptimizationResult, extraQuery?: string): Promise<string> {
    const data = await safeApiCall<{ explanation: string }>('/api/budget-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optResult, extraQuery })
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
  }
};
