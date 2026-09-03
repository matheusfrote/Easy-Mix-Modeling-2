import { inferColumnMappings } from '../services/dataMapper';
import { registry } from './connectors/ConnectorRegistry';
import { calculateDataReadinessScore } from '../services/dataReadiness';
import { validateDataset, sanitizeDataset, DataRow } from '../services/dataValidator';
import { optimizeBudgetMathematical, simulateScenarioMathematical } from '../services/budgetOptimizer';
import {
  generateAutomatedInsights,
  generateBudgetExplanation,
  generateFullReport
} from './geminiHandler';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults } from '../types/mmm';
import { mmmServiceClient } from './services/mmmService';
import { authRateLimiter, computeRateLimiter, uploadRateLimiter } from './security/rateLimiter';
import { sessionManager, UserSession, WorkspaceState } from './security/sessionManager';
import {
  sanitizeFilename,
  sanitizeRowsForSpreadsheet,
  validateAndClampMcmcConfig,
  sanitizeAiPromptInput
} from './security/inputSanitizer';
import { auditLogger } from './security/auditLogger';
import { verifyGoogleIdToken } from './security/googleAuth';

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
 * Extracts session token from HTTP Authorization header
 */
function extractBearerToken(headers?: Record<string, any>): string | null {
  if (!headers) return null;
  const auth = headers['authorization'] || headers['Authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function handleApiRequest(
  path: string,
  method: string,
  body: any,
  headers?: Record<string, any>,
  clientIp = '127.0.0.1'
): Promise<{ status: number; data: any }> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    // 0. Extract Session & Isolated Tenant Workspace
    const token = extractBearerToken(headers);
    const session: UserSession | null = sessionManager.getSession(token || undefined);
    const workspace: WorkspaceState = sessionManager.getWorkspace(session);

    // 1. Health Check (Rule 39: Does not leak python version, internal paths, or env secrets)
    if (path === '/api/health' && method === 'GET') {
      return {
        status: 200,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString()
        }
      };
    }

    // 2. Authentication: Google OAuth 2.0 (Strict Cryptographic Verification)
    if (path === '/api/auth/google' && method === 'POST') {
      const authLimit = authRateLimiter.check(clientIp);
      if (!authLimit.allowed) {
        return {
          status: 429,
          data: {
            code: 'AUTH_RATE_LIMIT',
            error: 'Muitas tentativas de login. Aguarde 15 minutos.'
          }
        };
      }

      const { credential } = body || {};
      if (!credential || typeof credential !== 'string') {
        return { status: 401, data: { code: 'INVALID_CREDENTIAL', error: 'Token de autenticação não fornecido.' } };
      }

      let profile;
      try {
        profile = await verifyGoogleIdToken(credential);
      } catch (err: any) {
        auditLogger.log('AUTH_LOGIN_FAILURE', {
          ip: clientIp,
          path,
          method,
          details: { error: err.message }
        });
        return {
          status: 401,
          data: {
            code: 'AUTH_FAILED',
            error: 'Falha na validação do token Google.'
          }
        };
      }

      // Create cryptographically secure session
      const newSession = sessionManager.createSession({
        userId: `usr_${profile.googleId}`,
        email: profile.email,
        name: profile.name,
        company: profile.company || 'Empresa',
        avatar: profile.picture,
        role: 'ANALYST',
        plan: 'pro'
      });

      authRateLimiter.reset(clientIp);

      return {
        status: 200,
        data: {
          success: true,
          token: newSession.token,
          user: {
            id: newSession.userId,
            name: newSession.name,
            email: newSession.email,
            company: newSession.company,
            role: newSession.role,
            plan: newSession.plan,
            avatar: newSession.avatar,
            provider: 'google',
            createdAt: new Date(newSession.createdAt).toISOString()
          }
        }
      };
    }

    // 2.1 Authentication: Current Session Info (/api/auth/me)
    if (path === '/api/auth/me' && method === 'GET') {
      if (!session) {
        return {
          status: 200,
          data: { authenticated: false, user: null }
        };
      }

      return {
        status: 200,
        data: {
          authenticated: true,
          user: {
            id: session.userId,
            name: session.name,
            email: session.email,
            company: session.company,
            role: session.role,
            plan: session.plan,
            avatar: session.avatar,
            provider: 'google',
            createdAt: new Date(session.createdAt).toISOString()
          }
        }
      };
    }

    // 2.2 Authentication: Logout (/api/auth/logout)
    if (path === '/api/auth/logout' && method === 'POST') {
      if (token) {
        sessionManager.revokeSession(token);
      }
      return {
        status: 200,
        data: { success: true, message: 'Sessão encerrada com sucesso.' }
      };
    }

    // 3. Upload Dataset (Granular Size Limits + Path Traversal & Formula Injection Neutralization)
    if (path === '/api/upload' && method === 'POST') {
      const uploadCheck = uploadRateLimiter.check(clientIp);
      if (!uploadCheck.allowed) {
        return {
          status: 429,
          data: { code: 'RATE_LIMIT', error: 'Limite de uploads atingido. Aguarde antes de enviar novo arquivo.' }
        };
      }

      const { rows, filename } = body || {};
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return { status: 400, data: { error: 'Arquivo inválido ou sem registros legíveis.' } };
      }

      // Hard row count limit (10,000 rows max to prevent DoS)
      if (rows.length > 10000) {
        return {
          status: 400,
          data: { error: 'O arquivo excede o limite máximo permitido de 10.000 linhas por dataset.' }
        };
      }

      // Sanitize columns and rows
      const rawCols = Object.keys(rows[0] || {}).map(c => String(c).trim()).filter(Boolean);
      if (rawCols.length > 60) {
        return {
          status: 400,
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
        sessionId: session?.sessionId,
        userId: session?.userId,
        ip: clientIp,
        details: { rowCount: sanitizedRows.length, colCount: rawCols.length, filename: safeFilename }
      });

      return {
        status: 200,
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
        return { status: 400, data: { error: 'Nenhum dado carregado para validação.' } };
      }

      const val = validateDataset(targetRows, targetMappings);
      const readiness = calculateDataReadinessScore(targetRows, targetMappings, val);

      return {
        status: 200,
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
        return { status: 400, data: { error: 'Nenhum dado ou mapeamento carregado para saneamento.' } };
      }

      const sanitizeResult = sanitizeDataset(targetRows, targetMappings);
      if (workspace.dataset) {
        workspace.dataset.rows = sanitizeResult.cleanedRows;
        workspace.lastUpdated = Date.now();
      }

      const val = validateDataset(sanitizeResult.cleanedRows, targetMappings);
      const readiness = calculateDataReadinessScore(sanitizeResult.cleanedRows, targetMappings, val);

      auditLogger.log('DATASET_SANITIZE', {
        sessionId: session?.sessionId,
        userId: session?.userId,
        ip: clientIp,
        details: { fixedIssuesCount: sanitizeResult.fixedIssues.length }
      });

      return {
        status: 200,
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
          data: { code: 'RATE_LIMIT', error: 'Muitas execuções simultâneas de modelagem. Aguarde um minuto.' }
        };
      }

      const { config, rows } = body || {};
      const targetRows = rows || workspace.dataset?.rows;
      const modelConfig: MeridianModelConfig = config || workspace.modelConfig;

      if (!targetRows || targetRows.length === 0) {
        return { status: 400, data: { error: 'Nenhum dado disponível para execução do modelo.' } };
      }
      if (!modelConfig || !modelConfig.mediaChannels || modelConfig.mediaChannels.length === 0) {
        return { status: 400, data: { error: 'Configuração do Meridian inválida: selecione ao menos 1 canal de mídia.' } };
      }

      // Enforce server-side parameter bounds to prevent MCMC Resource Exhaustion
      const { clampedConfig } = validateAndClampMcmcConfig(modelConfig);
      workspace.modelConfig = clampedConfig;

      auditLogger.log('MODEL_RUN_STARTED', {
        sessionId: session?.sessionId,
        userId: session?.userId,
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
          sessionId: session?.sessionId,
          userId: session?.userId,
          ip: clientIp,
          details: { error: errorMsg }
        });

        return {
          status: 503,
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
        sessionId: session?.sessionId,
        userId: session?.userId,
        ip: clientIp,
        details: { modelId: results.modelId }
      });

      return {
        status: 200,
        data: results
      };
    }

    // 6.1 Get Model Diagnostics
    if (path === '/api/model/diagnostics' && method === 'GET') {
      if (!workspace.activeModel) {
        return {
          status: 404,
          data: { error: 'Nenhum modelo Meridian em execução para exibição de diagnósticos.' }
        };
      }

      const pyDiagnostics = await mmmServiceClient.getDiagnostics();

      return {
        status: 200,
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
          data: { status: 'idle', message: 'Nenhum modelo Meridian em execução.' }
        };
      }
      return {
        status: 200,
        data: {
          ...workspace.activeModel,
          diagnostics: formatDiagnosticsWithFallbacks(workspace.activeModel.diagnostics)
        }
      };
    }

    // 7. Channel Performance
    if (path === '/api/channel-performance' && method === 'GET') {
      if (!workspace.activeModel) {
        return { status: 404, data: { error: 'Modelo não executado ainda.' } };
      }
      return {
        status: 200,
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
        return { status: 400, data: { error: 'Execute o modelo Meridian antes de otimizar o orçamento.' } };
      }

      const budget = Number(targetTotalBudget) || workspace.activeModel.totalSpend;
      const optResult = optimizeBudgetMathematical(workspace.activeModel, budget, constraints);

      auditLogger.log('BUDGET_OPTIMIZED', {
        sessionId: session?.sessionId,
        userId: session?.userId,
        ip: clientIp,
        details: { targetTotalBudget: budget }
      });

      return {
        status: 200,
        data: optResult
      };
    }

    // 9. Simulate Scenario
    if (path === '/api/simulate' && method === 'POST') {
      const { channelSpends } = body || {};
      if (!workspace.activeModel) {
        return { status: 400, data: { error: 'Execute o modelo Meridian antes de simular cenários.' } };
      }

      const sim = simulateScenarioMathematical(workspace.activeModel, channelSpends || {});

      auditLogger.log('SCENARIO_SIMULATED', {
        sessionId: session?.sessionId,
        userId: session?.userId,
        ip: clientIp
      });

      return {
        status: 200,
        data: sim
      };
    }

    // 10. Generate Automated Insights via Gemini (Compute Rate Limited)
    if (path === '/api/generate-insights' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, data: { error: 'Muitas requisições de geração de insights. Aguarde um instante.' } };
      }

      if (!workspace.activeModel) {
        return { status: 400, data: { error: 'Modelo Meridian não disponível.' } };
      }
      const insights = await generateAutomatedInsights(workspace.activeModel);
      return {
        status: 200,
        data: { insights }
      };
    }

    // 11. Generate Budget Explanation via Gemini (Prompt Injection Sanitized)
    if (path === '/api/budget-explanation' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, data: { error: 'Muitas requisições de explicação orçamentária. Aguarde um instante.' } };
      }

      const { optResult, extraQuery } = body || {};
      if (!workspace.activeModel) {
        return { status: 400, data: { error: 'Modelo Meridian não disponível.' } };
      }
      if (!optResult) {
        return { status: 400, data: { error: 'Nenhum resultado de otimização fornecido.' } };
      }

      // Mitigate Prompt Injection: sanitize and clamp extraQuery
      const safeQuery = sanitizeAiPromptInput(extraQuery, 500);

      const explanation = await generateBudgetExplanation(workspace.activeModel, optResult, safeQuery);
      return {
        status: 200,
        data: { explanation }
      };
    }

    // 12. Full Report
    if (path === '/api/report' && method === 'POST') {
      const computeCheck = computeRateLimiter.check(clientIp);
      if (!computeCheck.allowed) {
        return { status: 429, data: { error: 'Muitas requisições de relatório. Aguarde um instante.' } };
      }

      if (!workspace.activeModel) {
        return { status: 400, data: { error: 'Modelo Meridian não disponível.' } };
      }

      const opt = optimizeBudgetMathematical(workspace.activeModel, workspace.activeModel.totalSpend * 1.15);
      const report = await generateFullReport(workspace.activeModel, opt);

      auditLogger.log('REPORT_GENERATED', {
        sessionId: session?.sessionId,
        userId: session?.userId,
        ip: clientIp
      });

      return { status: 200, data: { report } };
    }

    // 13. Connectors API - List
    if (path === '/api/connectors/list' && method === 'GET') {
      return {
        status: 200,
        data: { connectors: registry.listAvailable() }
      };
    }

    // 13.1 Connectors API - Auth (Credentials strictly kept server-side)
    if (path === '/api/connectors/auth' && method === 'POST') {
      try {
        const { connectorId, credentials } = body || {};
        if (!connectorId || typeof connectorId !== 'string') {
          return { status: 400, data: { error: 'connectorId obrigatório' } };
        }
        const connector = registry.get(connectorId);
        const result = await connector.authenticate(credentials);
        return {
          status: 200,
          data: { success: result }
        };
      } catch (err: any) {
        return {
          status: 400,
          data: { error: err.message }
        };
      }
    }

    // 13.2 Connectors API - Sync
    if (path === '/api/connectors/sync' && method === 'POST') {
      try {
        const { connectorId, config } = body || {};
        const connector = registry.get(connectorId);
        const result = await connector.sync(config);

        if (result.success) {
          if (!workspace.dataset) {
            workspace.dataset = {
              rows: [],
              columns: [],
              mappings: [],
              filename: 'connector_sync.csv'
            };
          }

          // Sanitize incoming rows to prevent Formula Injection
          const cleanSyncedRows = sanitizeRowsForSpreadsheet(result.rows as any);
          cleanSyncedRows.forEach(r => workspace.dataset!.rows.push(r as any));

          if (workspace.dataset.rows.length > 0) {
            workspace.dataset.columns = Array.from(new Set(workspace.dataset.rows.flatMap(Object.keys)));
            workspace.dataset.mappings = inferColumnMappings(workspace.dataset.columns, workspace.dataset.rows);
            const val = validateDataset(workspace.dataset.rows, workspace.dataset.mappings);
            const readiness = calculateDataReadinessScore(workspace.dataset.rows, workspace.dataset.mappings, val);
            result.dataset = {
              rows: workspace.dataset.rows,
              columns: workspace.dataset.columns,
              mappings: workspace.dataset.mappings,
              validation: val,
              readiness
            };
          }
        }

        return {
          status: result.success ? 200 : 400,
          data: result
        };
      } catch (err: any) {
        return {
          status: 500,
          data: { error: err.message }
        };
      }
    }

    return {
      status: 404,
      data: { code: 'NOT_FOUND', error: `Rota desconhecida: ${method} ${path}` }
    };
  } catch (err: any) {
    auditLogger.log('AUTH_LOGIN_FAILURE', {
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
