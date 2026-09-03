import { inferColumnMappings } from '../services/dataMapper';
import { calculateDataReadinessScore } from '../services/dataReadiness';
import { validateDataset, sanitizeDataset, DataRow } from '../services/dataValidator';
import {
  generateAutomatedInsights,
  generateBudgetExplanation,
  generateFullReport
} from './geminiHandler';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults } from '../types/mmm';
import { mmmServiceClient } from './services/mmmService';
import { computeRateLimiter, uploadRateLimiter } from './security/rateLimiter';
import { sessionManager, WorkspaceState } from './security/sessionManager';
import {
  sanitizeFilename,
  sanitizeRowsForSpreadsheet,
  validateAndClampMcmcConfig,
  sanitizeAiPromptInput
} from './security/inputSanitizer';
import { auditLogger } from './security/auditLogger';

/**
 * Formats Bayesian diagnostics ensuring that any non-computed or pending metrics
 * strictly return 'N/A' rather than arbitrary heuristics or magic numbers.
 */
function formatDiagnosticsWithFallbacks(diag: any) {
  if (!diag) return null;
  return {
    rSquared: typeof diag.rSquared === 'number' ? diag.rSquared : 'N/A',
    bayesianR2: typeof diag.bayesianR2 === 'number' ? diag.bayesianR2 : 'N/A',
    mape: typeof diag.mape === 'number' ? diag.mape : 'N/A',
    rmse: typeof diag.rmse === 'number' ? diag.rmse : 'N/A',
    gelmanRubinRhat: typeof diag.gelmanRubinRhat === 'number' ? diag.gelmanRubinRhat : 'N/A',
    effectiveSampleSize: typeof diag.effectiveSampleSize === 'number' ? diag.effectiveSampleSize : 'N/A',
    bulkEss: typeof diag.bulkEss === 'number' ? diag.bulkEss : 'N/A',
    tailEss: typeof diag.tailEss === 'number' ? diag.tailEss : 'N/A',
    looCv: typeof diag.looCv === 'number' ? diag.looCv : 'N/A',
    waic: typeof diag.waic === 'number' ? diag.waic : 'N/A',
    divergencesCount: typeof diag.divergencesCount === 'number' ? diag.divergencesCount : 'N/A',
    isConverged: Boolean(diag.isConverged),
    warnings: Array.isArray(diag.warnings) ? diag.warnings : [],
    baselineContribution: typeof diag.baselineContribution === 'number' ? diag.baselineContribution : 0,
    baselineShare: typeof diag.baselineShare === 'number' ? diag.baselineShare : 0,
    controlsContribution: typeof diag.controlsContribution === 'number' ? diag.controlsContribution : 0,
    controlsShare: typeof diag.controlsShare === 'number' ? diag.controlsShare : 0,
    mediaContribution: typeof diag.mediaContribution === 'number' ? diag.mediaContribution : 0,
    mediaShare: typeof diag.mediaShare === 'number' ? diag.mediaShare : 0,
    totalObservedKpi: typeof diag.totalObservedKpi === 'number' ? diag.totalObservedKpi : 0,
    totalPredictedKpi: typeof diag.totalPredictedKpi === 'number' ? diag.totalPredictedKpi : 0,
    posteriorMetrics: diag.posteriorMetrics || {
      adstockDecay: {},
      halfSaturation: {},
      slope: {},
      mediaCoefficients: {},
      looCv: 'N/A',
      waic: 'N/A'
    },
    timeSeriesFit: diag.timeSeriesFit || []
  };
}

/**
 * Extracts session token from HTTP Authorization header or cookie
 */
function extractSessionId(headers?: Record<string, any>): string {
  // Use anonymous session id mechanism, isolated per browser/client
  let sid = headers && (headers['x-session-id'] || headers['X-Session-Id']);
  if (!sid) {
    sid = 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }
  return sid;
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
      const sanitizedRows = rows.map((r: any) => {
        const clean: DataRow = {};
        for (const c of rawCols) {
          const val = r[c];
          clean[c] = typeof val === 'string' && ['=', '+', '-', '@', '\t', '\r'].includes(val.trim()[0])
            ? `'${val.trim()}`
            : val;
        }
        return clean;
      });

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

      if (!targetRows || targetRows.length === 0) {
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

      if (!targetRows || !targetMappings) {
        return { status: 400, headers: responseHeaders, data: { error: 'Nenhum dado ou mapeamento carregado para saneamento.' } };
      }

      const sanitizeResult = sanitizeDataset(targetRows, targetMappings);
      if (workspace.dataset) {
        workspace.dataset.rows = sanitizeResult.cleanedRows;
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
      if (mappings && workspace.dataset) {
        workspace.dataset.mappings = mappings;
        workspace.lastUpdated = Date.now();
      }
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

      if (!targetRows || targetRows.length === 0) {
        return { status: 400, headers: responseHeaders, data: { error: 'Nenhum dado disponível para execução do modelo.' } };
      }
      if (!modelConfig || !modelConfig.mediaChannels || modelConfig.mediaChannels.length === 0) {
        return { status: 400, headers: responseHeaders, data: { error: 'Configuração do Meridian inválida: selecione ao menos 1 canal de mídia.' } };
      }

      // Enforce server-side parameter bounds to prevent MCMC Resource Exhaustion
      const { clampedConfig } = validateAndClampMcmcConfig(modelConfig);
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
      if (pyServiceResponse.status === 'success' && pyServiceResponse.results && Array.isArray(pyServiceResponse.results.channels)) {
        results = {
          ...pyServiceResponse.results,
          diagnostics: formatDiagnosticsWithFallbacks(pyServiceResponse.results.diagnostics)
        };
      } else {
        const errorMsg = pyServiceResponse.errors && pyServiceResponse.errors.length > 0
          ? pyServiceResponse.errors[0].message
          : 'O serviço de modelagem econométrica não pôde concluir o ajuste.';

        auditLogger.log('MODEL_RUN_FAILED', {
          sessionId: sessionId,
          ip: clientIp,
          details: { error: errorMsg }
        });

        return {
          status: 503,
          headers: responseHeaders,
          data: {
            code: 'MERIDIAN_UNAVAILABLE',
            message: 'O serviço de modelagem falhou ao processar a cadeia MCMC.',
            details: errorMsg,
            retryable: true
          }
        };
      }

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
          diagnostics: formatDiagnosticsWithFallbacks(workspace.activeModel.diagnostics),
          posteriorMetrics: workspace.activeModel.diagnostics?.posteriorMetrics || {
            looCv: 'N/A',
            waic: 'N/A',
            divergencesCount: 'N/A'
          },
          serviceDiagnostics: pyDiagnostics || { status: 'native_engine', meridianVersion: 'google-meridian' }
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
          diagnostics: formatDiagnosticsWithFallbacks(workspace.activeModel.diagnostics)
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
      const { targetTotalBudget, constraints } = body || {};
      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { error: 'Execute o modelo Meridian antes de otimizar o orçamento.' } };
      }

      const budget = Number(targetTotalBudget) || workspace.activeModel.totalSpend;

      // Try official Meridian microservice optimizer
      const pyOptResult = await mmmServiceClient.optimizeBudget({
        targetTotalBudget: budget,
        constraints,
        modelId: workspace.activeModel.modelId,
        activeModel: workspace.activeModel
      });

      if (pyOptResult.status !== 'success') {
        return {
          status: pyOptResult.status === 'service_unavailable' ? 503 : 500,
          headers: responseHeaders,
          data: pyOptResult
        };
      }

      auditLogger.log('BUDGET_OPTIMIZED', {
        sessionId: sessionId,
        ip: clientIp,
        details: { targetTotalBudget: budget, engine: pyOptResult.engine }
      });

      return {
        status: 200,
        headers: responseHeaders,
        data: pyOptResult.results
      };
    }

    // 9. Simulate Scenario
    if (path === '/api/simulate' && method === 'POST') {
      const { channelSpends } = body || {};
      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { error: 'Execute o modelo Meridian antes de simular cenários.' } };
      }

      // Try official Meridian microservice simulation
      const pySim = await mmmServiceClient.simulateScenario({
        channelSpends: channelSpends || {},
        modelId: workspace.activeModel.modelId,
        activeModel: workspace.activeModel
      });

      if (pySim.status !== 'success') {
        return {
          status: pySim.status === 'service_unavailable' ? 503 : 500,
          headers: responseHeaders,
          data: pySim
        };
      }

      auditLogger.log('SCENARIO_SIMULATED', {
        sessionId: sessionId,
        ip: clientIp,
        details: { engine: pySim.engine }
      });

      return {
        status: 200,
        headers: responseHeaders,
        data: pySim.results
      };
    }

    // 10. Generate Automated Insights via Gemini (Compute Rate Limited)
    if (path === '/api/generate-insights' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, headers: responseHeaders, data: { error: 'Muitas requisições de geração de insights. Aguarde um instante.' } };
      }

      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { error: 'Modelo Meridian não disponível.' } };
      }
      const insights = await generateAutomatedInsights(workspace.activeModel);
      return {
        status: 200,
        headers: responseHeaders,
        data: { insights }
      };
    }

    // 11. Generate Budget Explanation via Gemini (Prompt Injection Sanitized)
    if (path === '/api/budget-explanation' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, headers: responseHeaders, data: { error: 'Muitas requisições de explicação orçamentária. Aguarde um instante.' } };
      }

      const { optResult, extraQuery } = body || {};
      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { error: 'Modelo Meridian não disponível.' } };
      }
      if (!optResult) {
        return { status: 400, headers: responseHeaders, data: { error: 'Nenhum resultado de otimização fornecido.' } };
      }

      // Mitigate Prompt Injection: sanitize and clamp extraQuery
      const safeQuery = sanitizeAiPromptInput(extraQuery, 500);

      const explanation = await generateBudgetExplanation(workspace.activeModel, optResult, safeQuery);
      return {
        status: 200,
        headers: responseHeaders,
        data: { explanation }
      };
    }

    // 12. Full Report
    if (path === '/api/report' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, headers: responseHeaders, data: { error: 'Muitas requisições de relatório. Aguarde um instante.' } };
      }

      if (!workspace.activeModel) {
        return { status: 400, headers: responseHeaders, data: { error: 'Modelo Meridian não disponível.' } };
      }

      const pyOptResult = await mmmServiceClient.optimizeBudget({
        targetTotalBudget: workspace.activeModel.totalSpend * 1.15,
        modelId: workspace.activeModel.modelId,
        activeModel: workspace.activeModel
      });

      if (pyOptResult.status !== 'success') {
        return {
          status: pyOptResult.status === 'service_unavailable' ? 503 : 500,
          headers: responseHeaders,
          data: pyOptResult
        };
      }

      const report = await generateFullReport(workspace.activeModel, pyOptResult.results);

      auditLogger.log('REPORT_GENERATED', {
        sessionId: sessionId,
        ip: clientIp
      });

      return { status: 200, headers: responseHeaders, data: report };
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
