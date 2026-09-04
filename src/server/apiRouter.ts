import { inferColumnMappings } from '../services/dataMapper';
import { calculateDataReadinessScore } from '../services/dataReadiness';
import { validateDataset, sanitizeDataset, DataRow } from '../services/dataValidator';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults, BudgetOptimizationResult, ScenarioDefinition } from '../types/mmm';
import {
  buildAIContext,
  buildBudgetInsights,
  buildDataLineage,
  buildDeterministicReport,
  buildScenarioInsights,
  cachedDerivedResult,
  clearDerivedCache,
  DECISION_ENGINE_VERSION,
  derivedCacheKey,
  deriveModelLabels,
  renderInsights
} from '../services/insights';
import { mmmServiceClient } from './services/mmmService';
import { aiNarrativeService } from './services/aiNarrativeService';
import { computeRateLimiter, uploadRateLimiter } from './security/rateLimiter';
import { sessionManager, WorkspaceState } from './security/sessionManager';
import {
  sanitizeFilename,
  sanitizeRowsForSpreadsheet,
  validateAndClampMcmcConfig
} from './security/inputSanitizer';
import { auditLogger } from './security/auditLogger';

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function invalidateScientificState(workspace: WorkspaceState): void {
  const previousModelId = workspace.activeModel?.modelId;
  workspace.activeModel = null;
  workspace.modelConfig = null;
  if (previousModelId) clearDerivedCache(previousModelId);
}

/** Preserves real diagnostics and represents unavailable values as null. */
function formatDiagnostics(diag: any) {
  if (!diag || typeof diag !== 'object') return null;
  return {
    ...diag,
    r2: finiteNumberOrNull(diag.r2),
    rSquared: finiteNumberOrNull(diag.rSquared),
    mape: finiteNumberOrNull(diag.mape),
    wmape: finiteNumberOrNull(diag.wmape),
    gelmanRubinRhat: finiteNumberOrNull(diag.gelmanRubinRhat),
    rhat: finiteNumberOrNull(diag.rhat),
    isConverged: typeof diag.isConverged === 'boolean' ? diag.isConverged : null
  };
}

export function attachExposureColumns(
  config: MeridianModelConfig,
  mappings: ColumnMapping[] | undefined
): MeridianModelConfig {
  const exposures = (mappings || []).filter(mapping =>
    mapping.mappedType === 'media_impressions' || mapping.mappedType === 'media_clicks'
  );

  return {
    ...config,
    mediaChannels: config.mediaChannels.map(channel => {
      if (channel.impressionsColumn) return channel;

      const spendMapping = (mappings || []).find(mapping => mapping.columnName === channel.spendColumn);
      const channelNames = [channel.channelName, spendMapping?.channelName]
        .filter((value): value is string => Boolean(value))
        .map(value => value.trim().toLowerCase());
      const exactMatches = exposures.filter(mapping =>
        mapping.channelName && channelNames.includes(mapping.channelName.trim().toLowerCase())
      );
      const impressionMatches = exactMatches.filter(mapping => mapping.mappedType === 'media_impressions');
      const exposure = impressionMatches.length === 1
        ? impressionMatches[0]
        : exactMatches.length === 1
          ? exactMatches[0]
        : config.mediaChannels.length === 1 && exposures.length === 1
          ? exposures[0]
          : undefined;

      return exposure ? { ...channel, impressionsColumn: exposure.columnName } : channel;
    })
  };
}

/**
 * Extracts session token from HTTP Authorization header or cookie
 */
function extractSessionId(headers?: Record<string, any>): string {
  const supplied = headers && (headers['x-session-id'] || headers['X-Session-Id']);
  const value = Array.isArray(supplied) ? supplied[0] : supplied;
  if (typeof value === 'string' && (/^anon_[a-f0-9]{32}$/.test(value) || process.env.NODE_ENV === 'test')) {
    return value;
  }
  return `anon_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function handleApiRequest(
  path: string,
  method: string,
  body: any,
  headers?: Record<string, any>,
  clientIp = '127.0.0.1'
): Promise<{ status: number; data: any; headers?: Record<string, string> }> {
  const requestId = `req_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 10)}`;

  try {
    // 0. Extract Session & Isolated Tenant Workspace
    const sessionId = extractSessionId(headers);
    const workspace: WorkspaceState = sessionManager.getWorkspaceBySessionId(sessionId);
    const responseHeaders = { 'x-session-id': sessionId };

    // 1. Health Check (Rule 39: Does not leak python version, internal paths, or env secrets)
    if (path === '/api/health' && method === 'GET') {
      return {
        status: 200,
        headers: responseHeaders,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString()
        }
      };
    }

    // 3. Upload Dataset (Granular Size Limits + Path Traversal & Formula Injection Neutralization)
    if (path === '/api/upload' && method === 'POST') {
      const uploadCheck = uploadRateLimiter.check(clientIp);
      if (!uploadCheck.allowed) {
        return {
          status: 429,
          headers: responseHeaders,
          data: { code: 'RATE_LIMIT', error: 'Limite de uploads atingido. Aguarde antes de enviar novo arquivo.' }
        };
      }

      const { rows, filename } = body || {};
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return { status: 400, headers: responseHeaders, data: { error: 'Arquivo inválido ou sem registros legíveis.' } };
      }

      // Hard row count limit (10,000 rows max to prevent DoS)
      if (rows.length > 10000) {
        return {
          status: 400,
          headers: responseHeaders,
          data: { error: 'O arquivo excede o limite máximo permitido de 10.000 linhas por dataset.' }
        };
      }

      // Sanitize columns and rows
      const rawCols = Object.keys(rows[0] || {}).map(c => String(c).trim()).filter(Boolean);
      if (rawCols.length > 60) {
        return {
          status: 400,
          headers: responseHeaders,
          data: { error: 'O arquivo excede o limite máximo permitido de 60 colunas.' }
        };
      }

      // Neutralize CSV / Spreadsheet Formula Injection (CWE-1236)
      const sanitizedRows = sanitizeRowsForSpreadsheet(rows).map(row =>
        Object.fromEntries(rawCols.map(column => [column, row[column]]))
      );

      const safeFilename = sanitizeFilename(filename);
      const mappings = inferColumnMappings(rawCols, sanitizedRows);
      const val = validateDataset(sanitizedRows, mappings);
      const readiness = calculateDataReadinessScore(sanitizedRows, mappings, val);

      // Store in tenant-isolated workspace state
      workspace.dataset = {
        rows: sanitizedRows,
        columns: rawCols,
        mappings,
        filename: safeFilename
      };
      invalidateScientificState(workspace);
      workspace.lastUpdated = Date.now();

      auditLogger.log('DATASET_UPLOAD', {
        sessionId: sessionId,
        ip: clientIp,
        details: { rowCount: sanitizedRows.length, colCount: rawCols.length, filename: safeFilename }
      });

      return {
        status: 200,
        headers: responseHeaders,
        data: {
          rowCount: sanitizedRows.length,
          columnCount: rawCols.length,
          columns: rawCols,
          previewRows: sanitizedRows.slice(0, 10),
          mappings,
          validation: val,
          readiness,
          filename: safeFilename
        }
      };
    }

    // 4. Validate Dataset
    if (path === '/api/validate' && method === 'POST') {
      const { rows, mappings } = body || {};
      const targetRows = rows || workspace.dataset?.rows;
      const targetMappings = mappings || workspace.dataset?.mappings;

      if (!Array.isArray(targetRows) || targetRows.length === 0 || !Array.isArray(targetMappings)) {
        return { status: 400, headers: responseHeaders, data: { error: 'Nenhum dado carregado para validação.' } };
      }

      const val = validateDataset(targetRows, targetMappings);
      const readiness = calculateDataReadinessScore(targetRows, targetMappings, val);

      return {
        status: 200,
        headers: responseHeaders,
        data: {
          validation: val,
          readiness
        }
      };
    }

    // 4.1 Sanitize & Auto-Fix Dataset
    if (path === '/api/sanitize-data' && method === 'POST') {
      const { rows, mappings } = body || {};
      const targetRows = rows || workspace.dataset?.rows;
      const targetMappings = mappings || workspace.dataset?.mappings;

      if (!Array.isArray(targetRows) || !Array.isArray(targetMappings)) {
        return { status: 400, headers: responseHeaders, data: { error: 'Nenhum dado ou mapeamento carregado para saneamento.' } };
      }

      const sanitizeResult = sanitizeDataset(targetRows, targetMappings);
      if (workspace.dataset) {
        workspace.dataset.rows = sanitizeResult.cleanedRows;
        invalidateScientificState(workspace);
        workspace.lastUpdated = Date.now();
      }

      const val = validateDataset(sanitizeResult.cleanedRows, targetMappings);
      const readiness = calculateDataReadinessScore(sanitizeResult.cleanedRows, targetMappings, val);

      auditLogger.log('DATASET_SANITIZE', {
        sessionId: sessionId,
        ip: clientIp,
        details: { fixedIssuesCount: sanitizeResult.fixedIssues.length }
      });

      return {
        status: 200,
        headers: responseHeaders,
        data: {
          success: true,
          cleanedRows: sanitizeResult.cleanedRows,
          fixedIssues: sanitizeResult.fixedIssues,
          recordsDeduplicated: sanitizeResult.recordsDeduplicated,
          negativeValuesClipped: sanitizeResult.negativeValuesClipped,
          missingValuesImputed: sanitizeResult.missingValuesImputed,
          datesReordered: sanitizeResult.datesReordered,
          validation: val,
          readiness
        }
      };
    }

    // 5. Map Columns
    if (path === '/api/map-columns' && method === 'POST') {
      const { mappings } = body || {};
      if (!workspace.dataset) {
        return { status: 400, headers: responseHeaders, data: { error: 'Nenhum dataset carregado para mapear.' } };
      }
      const allowedTypes = new Set([
        'date', 'kpi', 'media_spend', 'media_impressions', 'media_clicks',
        'media_reach', 'media_frequency', 'geo', 'population', 'revenue_per_kpi',
        'control', 'ignore'
      ]);
      if (!Array.isArray(mappings)
        || mappings.length !== workspace.dataset.columns.length
        || new Set(mappings.map(mapping => mapping?.columnName)).size !== mappings.length
        || mappings.some(mapping =>
        !mapping
        || typeof mapping.columnName !== 'string'
        || !workspace.dataset?.columns.includes(mapping.columnName)
        || !allowedTypes.has(mapping.mappedType)
        )) {
        return { status: 422, headers: responseHeaders, data: { code: 'INVALID_MAPPING', message: 'O mapeamento de colunas é inválido ou incompleto.' } };
      }
      workspace.dataset.mappings = mappings;
      invalidateScientificState(workspace);
      workspace.lastUpdated = Date.now();
      return {
        status: 200,
        headers: responseHeaders,
        data: {
          success: true,
          mappings: workspace.dataset?.mappings || []
        }
      };
    }

    // 6. Fit Meridian Model (MCMC Bounds Clamping + Compute Rate Limiting)
    if ((path === '/api/model' || path === '/api/model/run' || path === '/api/model/fit') && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return {
          status: 429,
          headers: responseHeaders,
          data: { code: 'RATE_LIMIT', error: 'Muitas execuções simultâneas de modelagem. Aguarde um minuto.' }
        };
      }

      const { config, rows } = body || {};
      const targetRows = rows || workspace.dataset?.rows;
      const modelConfig: MeridianModelConfig = config || workspace.modelConfig;

      if (!Array.isArray(targetRows) || targetRows.length === 0) {
        return { status: 400, headers: responseHeaders, data: { error: 'Nenhum dado disponível para execução do modelo.' } };
      }
      if (!modelConfig || !modelConfig.mediaChannels || modelConfig.mediaChannels.length === 0) {
        return { status: 400, headers: responseHeaders, data: { error: 'Configuração do Meridian inválida: selecione ao menos 1 canal de mídia.' } };
      }

      const activeMappings = workspace.dataset?.mappings || [];
      const unsupported = activeMappings.filter(mapping =>
        ['geo', 'population', 'revenue_per_kpi', 'media_reach', 'media_frequency'].includes(mapping.mappedType)
      );
      if (unsupported.length > 0) {
        return {
          status: 501,
          headers: responseHeaders,
          data: {
            code: 'NOT_IMPLEMENTED',
            message: `O pipeline científico para ${[...new Set(unsupported.map(item => item.mappedType))].join(', ')} ainda não está implementado.`,
            stage: 'input_data'
          }
        };
      }

      if (activeMappings.length > 0) {
        const validation = validateDataset(targetRows, activeMappings);
        if (!validation.canRunModel || validation.isModelBlocked) {
          return {
            status: 422,
            headers: responseHeaders,
            data: {
              code: 'INVALID_INPUT_DATA',
              message: validation.blockingReason || 'O dataset não passou pela validação científica.',
              stage: 'input_data',
              validation
            }
          };
        }
      }

      const configWithExposures = attachExposureColumns(modelConfig, activeMappings);
      const missingExposure = configWithExposures.mediaChannels.find(channel => !channel.impressionsColumn);
      if (missingExposure) {
        return {
          status: 422,
          headers: responseHeaders,
          data: {
            code: 'MISSING_MEDIA_EXPOSURE',
            message: `O canal '${missingExposure.channelName}' possui spend, mas não possui exposure (impressões ou cliques).`,
            stage: 'input_data'
          }
        };
      }

      // Enforce server-side parameter bounds to prevent MCMC Resource Exhaustion
      const { clampedConfig } = validateAndClampMcmcConfig(configWithExposures);
      workspace.modelConfig = clampedConfig;

      auditLogger.log('MODEL_RUN_STARTED', {
        sessionId: sessionId,
        ip: clientIp,
        details: { channelsCount: clampedConfig.mediaChannels.length, chains: clampedConfig.mcmcChains, draws: clampedConfig.mcmcDraws }
      });

      // Delegate to the MMM microservice client
      const pyServiceResponse = await mmmServiceClient.fitModel({
        rows: targetRows,
        config: clampedConfig
      });

      let results: MeridianModelResults;
      if (
        pyServiceResponse.status === 'success'
        && pyServiceResponse.modelId
        && pyServiceResponse.engine === 'google-meridian'
        && pyServiceResponse.engineVersion
        && pyServiceResponse.results
        && Array.isArray(pyServiceResponse.results.channels)
      ) {
        results = {
          ...pyServiceResponse.results,
          modelId: pyServiceResponse.modelId,
          engine: pyServiceResponse.engine,
          engineVersion: pyServiceResponse.engineVersion,
          createdAt: new Date().toISOString(),
          status: 'completed',
          diagnostics: formatDiagnostics(pyServiceResponse.results.diagnostics),
          warnings: pyServiceResponse.warnings || []
        } as MeridianModelResults;
        Object.assign(results, deriveModelLabels(results), { dataLineage: buildDataLineage(results.modelId) });
      } else {
        const serviceError = pyServiceResponse.errors?.[0];
        const errorMsg = serviceError?.message || 'O serviço de modelagem econométrica não pôde concluir o ajuste.';
        const responseStatus = pyServiceResponse.httpStatus
          || (pyServiceResponse.status === 'validation_error' ? 422
            : pyServiceResponse.status === 'not_implemented' ? 501
              : pyServiceResponse.status === 'service_unavailable' ? 503
                : 500);

        auditLogger.log('MODEL_RUN_FAILED', {
          sessionId: sessionId,
          ip: clientIp,
          details: { error: errorMsg }
        });

        return {
          status: responseStatus,
          headers: responseHeaders,
          data: {
            code: serviceError?.code || 'MERIDIAN_ERROR',
            message: errorMsg,
            stage: serviceError?.stage,
            retryable: responseStatus === 503
          }
        };
      }

      const previousModelId = workspace.activeModel?.modelId;
      if (previousModelId && previousModelId !== results.modelId) clearDerivedCache(previousModelId);
      workspace.activeModel = results;
      workspace.lastUpdated = Date.now();

      auditLogger.log('MODEL_RUN_COMPLETED', {
        sessionId: sessionId,
        ip: clientIp,
        details: { modelId: results.modelId }
      });

      return {
        status: 200,
        headers: responseHeaders,
        data: results
      };
    }

    // 6.1 Get Model Diagnostics
    if (path === '/api/model/diagnostics' && method === 'GET') {
      if (!workspace.activeModel) {
        return {
          status: 404,
          headers: responseHeaders,
          data: { error: 'Nenhum modelo Meridian em execução para exibição de diagnósticos.' }
        };
      }

      const pyDiagnostics = await mmmServiceClient.getDiagnostics();

      return {
        status: 200,
        headers: responseHeaders,
        data: {
          diagnostics: formatDiagnostics(workspace.activeModel.diagnostics),
          posteriorMetrics: workspace.activeModel.diagnostics?.posteriorMetrics ?? null,
          serviceDiagnostics: pyDiagnostics
        }
      };
    }

    // 6.2 Get Model Status / Results
    if ((path === '/api/model/status' || path === '/api/model/results' || path === '/api/model') && method === 'GET') {
      if (!workspace.activeModel) {
        return {
          status: 404,
          headers: responseHeaders,
          data: { status: 'idle', message: 'Nenhum modelo Meridian em execução.' }
        };
      }
      return {
        status: 200,
        headers: responseHeaders,
        data: {
          ...workspace.activeModel,
          diagnostics: formatDiagnostics(workspace.activeModel.diagnostics)
        }
      };
    }

    // 7. Channel Performance
    if (path === '/api/channel-performance' && method === 'GET') {
      if (!workspace.activeModel) {
        return { status: 404, headers: responseHeaders, data: { error: 'Modelo não executado ainda.' } };
      }
      return {
        status: 200,
        headers: responseHeaders,
        data: {
          channels: workspace.activeModel.channels,
          responseCurves: workspace.activeModel.responseCurves,
          diagnostics: workspace.activeModel.diagnostics
        }
      };
    }

    // 8. Optimize Budget
    if (path === '/api/optimize-budget' && method === 'POST') {
      if (!workspace.activeModel?.modelId) {
        return { status: 400, headers: responseHeaders, data: { code: 'MODEL_REQUIRED', message: 'Modelo Meridian não disponível.' } };
      }

      const unsupported = workspace.dataset?.mappings.filter(mapping =>
        ['geo', 'population', 'revenue_per_kpi', 'media_reach', 'media_frequency'].includes(mapping.mappedType)
      ) || [];
      if (unsupported.length > 0) {
        return {
          status: 501,
          headers: responseHeaders,
          data: {
            code: 'NOT_IMPLEMENTED',
            message: `O pipeline específico para ${unsupported.map(item => item.mappedType).join(', ')} ainda não está implementado.`,
            stage: 'input_data'
          }
        };
      }
      const targetTotalBudget = Number(body?.targetTotalBudget);
      if (!Number.isFinite(targetTotalBudget) || targetTotalBudget <= 0) {
        return { status: 422, headers: responseHeaders, data: { code: 'INVALID_OPTIMIZER_INPUT', message: 'targetTotalBudget deve ser positivo.' } };
      }
      const optimizerResponse = await mmmServiceClient.optimizeBudget({
        modelId: workspace.activeModel.modelId,
        targetTotalBudget,
        constraints: body?.constraints || {},
        decisionEngineVersion: DECISION_ENGINE_VERSION
      });
      if (optimizerResponse.status !== 'success' || !optimizerResponse.results) {
        return {
          status: optimizerResponse.httpStatus || 500,
          headers: responseHeaders,
          data: optimizerResponse.errors?.[0] || { code: 'OPTIMIZATION_FAILED', message: 'O Meridian não concluiu a otimização.' }
        };
      }
      const optimization = optimizerResponse.results as BudgetOptimizationResult;
      const insightKey = derivedCacheKey(workspace.activeModel.modelId, 'optimizer', {
        targetTotalBudget,
        constraints: body?.constraints || {}
      });
      const structuredInsights = cachedDerivedResult(insightKey, () => buildBudgetInsights({
        model: workspace.activeModel as MeridianModelResults,
        optimization
      }));
      return {
        status: 200,
        headers: responseHeaders,
        data: { ...optimization, insights: structuredInsights }
      };
    }

    // 9. Simulate Scenario
    if (path === '/api/simulate' && method === 'POST') {
      if (!workspace.activeModel?.modelId) {
        return { status: 400, headers: responseHeaders, data: { code: 'MODEL_REQUIRED', message: 'Modelo Meridian não disponível.' } };
      }
      const channelSpends = body?.channelSpends;
      if (!channelSpends || typeof channelSpends !== 'object') {
        return { status: 422, headers: responseHeaders, data: { code: 'INVALID_SCENARIO_INPUT', message: 'channelSpends é obrigatório.' } };
      }
      const scenarioResponse = await mmmServiceClient.simulateScenario({
        modelId: workspace.activeModel.modelId,
        channelSpends,
        decisionEngineVersion: DECISION_ENGINE_VERSION
      });
      if (scenarioResponse.status !== 'success' || !scenarioResponse.results) {
        return {
          status: scenarioResponse.httpStatus || 500,
          headers: responseHeaders,
          data: scenarioResponse.errors?.[0] || { code: 'SIMULATION_FAILED', message: 'O Meridian não concluiu a simulação.' }
        };
      }
      const scenario = scenarioResponse.results as ScenarioDefinition;
      const insightKey = derivedCacheKey(workspace.activeModel.modelId, 'scenario', channelSpends);
      const structuredInsights = cachedDerivedResult(insightKey, () => buildScenarioInsights({
        model: workspace.activeModel as MeridianModelResults,
        scenario
      }));
      return {
        status: 200,
        headers: responseHeaders,
        data: { ...scenario, insights: structuredInsights }
      };
    }

    // 10. Generate deterministic insights. AI is never required for this route.
    if (path === '/api/generate-insights' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, headers: responseHeaders, data: { error: 'Muitas requisições de geração de insights. Aguarde um instante.' } };
      }

      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { error: 'Modelo Meridian não disponível.' } };
      }
      const optimizerResponse = await mmmServiceClient.optimizeBudget({
        modelId: workspace.activeModel.modelId,
        targetTotalBudget: workspace.activeModel.totalSpend,
        constraints: {},
        decisionEngineVersion: DECISION_ENGINE_VERSION
      });
      if (optimizerResponse.status !== 'success' || !optimizerResponse.results) {
        return {
          status: optimizerResponse.httpStatus || 500,
          headers: responseHeaders,
          data: optimizerResponse.errors?.[0] || { code: 'OPTIMIZATION_FAILED', message: 'O Meridian não concluiu a otimização.' }
        };
      }
      const insightKey = derivedCacheKey(workspace.activeModel.modelId, 'insights', { budget: workspace.activeModel.totalSpend });
      const structuredInsights = cachedDerivedResult(insightKey, () => buildBudgetInsights({
        model: workspace.activeModel as MeridianModelResults,
        optimization: optimizerResponse.results as BudgetOptimizationResult
      }));
      const insights = renderInsights(structuredInsights);
      return {
        status: 200,
        headers: responseHeaders,
        data: { insights, structuredInsights, decisionEngineVersion: DECISION_ENGINE_VERSION }
      };
    }

    // 11. Deterministic budget explanation from the active model and official optimizer.
    if (path === '/api/budget-explanation' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, headers: responseHeaders, data: { error: 'Muitas requisições de explicação orçamentária. Aguarde um instante.' } };
      }

      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { error: 'Modelo Meridian não disponível.' } };
      }
      const targetTotalBudget = Number(body?.targetTotalBudget ?? workspace.activeModel.totalSpend);
      if (!Number.isFinite(targetTotalBudget) || targetTotalBudget <= 0) {
        return { status: 422, headers: responseHeaders, data: { code: 'INVALID_OPTIMIZER_INPUT', message: 'targetTotalBudget deve ser positivo.' } };
      }
      const optimizerResponse = await mmmServiceClient.optimizeBudget({
        modelId: workspace.activeModel.modelId,
        targetTotalBudget,
        constraints: {},
        decisionEngineVersion: DECISION_ENGINE_VERSION
      });
      if (optimizerResponse.status !== 'success' || !optimizerResponse.results) {
        return { status: optimizerResponse.httpStatus || 500, headers: responseHeaders, data: optimizerResponse.errors?.[0] };
      }
      const structured = buildBudgetInsights({ model: workspace.activeModel, optimization: optimizerResponse.results as BudgetOptimizationResult });
      const question = typeof body?.extraQuery === 'string' ? body.extraQuery.slice(0, 500).toLocaleLowerCase('pt-BR') : '';
      const byChannel = structured.filter(item => item.channel && question.includes(item.channel.toLocaleLowerCase('pt-BR')));
      const byAction = structured.filter(item =>
        (/(cortar|reduzir|redu[cç][aã]o|redu[cç][oõ]es|diminuir)/.test(question) && item.action === 'REDUCE_BUDGET')
        || (/(aumentar|aumento|aumentos|investir|onde colocar|extra)/.test(question) && item.action === 'INCREASE_BUDGET')
        || (/(incerteza|evidência|evidencia)/.test(question) && item.action === 'INSUFFICIENT_EVIDENCE')
      );
      const selected = byChannel.length ? byChannel : byAction.length ? byAction : structured;
      const deterministic = renderInsights(selected).map(item => `${item.title}\n${item.summary}\n${item.actionableStep}`).join('\n\n');
      return {
        status: 200,
        headers: responseHeaders,
        data: { explanation: deterministic, modelId: workspace.activeModel.modelId, decisionEngineVersion: DECISION_ENGINE_VERSION }
      };
    }

    // 12. Standard report is always deterministic and never calls Gemini.
    if (path === '/api/report' && method === 'POST') {
      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { code: 'MODEL_REQUIRED', message: 'Modelo Meridian não disponível.' } };
      }
      const optimizerResponse = await mmmServiceClient.optimizeBudget({
        modelId: workspace.activeModel.modelId,
        targetTotalBudget: workspace.activeModel.totalSpend,
        constraints: {},
        decisionEngineVersion: DECISION_ENGINE_VERSION
      });
      if (optimizerResponse.status !== 'success' || !optimizerResponse.results) {
        return { status: optimizerResponse.httpStatus || 500, headers: responseHeaders, data: optimizerResponse.errors?.[0] };
      }
      const optimization = optimizerResponse.results as BudgetOptimizationResult;
      const insightKey = derivedCacheKey(workspace.activeModel.modelId, 'report-insights', { budget: workspace.activeModel.totalSpend });
      const structured = cachedDerivedResult(insightKey, () => buildBudgetInsights({ model: workspace.activeModel as MeridianModelResults, optimization }));
      const reportKey = derivedCacheKey(workspace.activeModel.modelId, 'standard-report', { budget: workspace.activeModel.totalSpend });
      const report = cachedDerivedResult(reportKey, () => buildDeterministicReport(workspace.activeModel as MeridianModelResults, optimization, structured));
      auditLogger.log('REPORT_GENERATED', { sessionId, ip: clientIp, details: { modelId: workspace.activeModel.modelId, source: 'deterministic' } });
      return {
        status: 200,
        headers: responseHeaders,
        data: report
      };
    }

    // 13. Premium narrative: one explicit, compact, cached and deduplicated AI request.
    if (path === '/api/report/ai' && method === 'POST') {
      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { code: 'MODEL_REQUIRED', message: 'Modelo Meridian não disponível.' } };
      }
      const optimizerResponse = await mmmServiceClient.optimizeBudget({
        modelId: workspace.activeModel.modelId,
        targetTotalBudget: workspace.activeModel.totalSpend,
        constraints: {},
        decisionEngineVersion: DECISION_ENGINE_VERSION
      });
      if (optimizerResponse.status !== 'success' || !optimizerResponse.results) {
        return { status: optimizerResponse.httpStatus || 500, headers: responseHeaders, data: optimizerResponse.errors?.[0] };
      }
      const optimization = optimizerResponse.results as BudgetOptimizationResult;
      const insightKey = derivedCacheKey(workspace.activeModel.modelId, 'report-insights', { budget: workspace.activeModel.totalSpend });
      const structured = cachedDerivedResult(insightKey, () => buildBudgetInsights({ model: workspace.activeModel as MeridianModelResults, optimization }));
      const report = buildDeterministicReport(workspace.activeModel as MeridianModelResults, optimization, structured);
      const aiResult = await aiNarrativeService.enhance({
        explicitlyRequested: body?.useAi === true,
        context: buildAIContext(workspace.activeModel as MeridianModelResults, optimization, structured),
        outputType: 'executive_report'
      });
      return {
        status: 200,
        headers: responseHeaders,
        data: {
          ...report,
          aiNarrative: aiResult.narrative,
          aiStatus: aiResult.status,
          aiCacheHit: aiResult.cacheHit
        }
      };
    }

    if (path === '/api/ai/usage' && method === 'GET') {
      return { status: 200, headers: responseHeaders, data: aiNarrativeService.getMetrics() };
    }

    return {
      status: 404,
      headers: responseHeaders,
      data: { code: 'NOT_FOUND', error: `Rota desconhecida: ${method} ${path}` }
    };
  } catch (err: any) {
    auditLogger.log('API_ERROR', {
      ip: clientIp,
      path,
      method,
      details: { requestId, error: err?.message || String(err) }
    });

    // Safe error message without leaking internal server architecture or stack traces
    return {
      status: 500,
      data: {
        code: 'INTERNAL_ERROR',
        message: 'Falha interna ao processar requisição.',
        requestId
      }
    };
  }
}
