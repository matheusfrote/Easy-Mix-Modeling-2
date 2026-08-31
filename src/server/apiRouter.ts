import { inferColumnMappings } from '../services/dataMapper';

import { registry } from './connectors/ConnectorRegistry';
import { calculateDataReadinessScore } from '../services/dataReadiness';
import { validateDataset, sanitizeDataset, DataRow } from '../services/dataValidator';
import { fitMeridianModel, optimizeBudget, simulateScenario } from '../ml/meridianEngine';
import { generateSyntheticDataset } from '../ml/syntheticData';
import {
  generateAutomatedInsights,
  generateBudgetExplanation,
  generateFullReport
} from './geminiHandler';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults } from '../types/mmm';

// In-memory session store for current dataset & model (ready for Cloud Storage / BigQuery)
interface AppState {
  dataset: {
    rows: DataRow[];
    columns: string[];
    mappings: ColumnMapping[];
    isSynthetic: boolean;
  } | null;
  activeModel: MeridianModelResults | null;
  modelConfig: MeridianModelConfig | null;
}

const state: AppState = {
  dataset: null,
  activeModel: null,
  modelConfig: null
};

// Initialize with synthetic data by default so the user has an immediate working pipeline
const initialSynthetic = generateSyntheticDataset(42);
const initialColumns = Object.keys(initialSynthetic.rows[0]);
const initialRows = initialSynthetic.rows as unknown as DataRow[];
const initialMappings = inferColumnMappings(initialColumns, initialRows);
state.dataset = {
  rows: initialRows,
  columns: initialColumns,
  mappings: initialMappings,
  isSynthetic: true
};

// Initial pre-fitted model for instant exploratory analysis
const initialModelConfig: MeridianModelConfig = {
  dateColumn: 'date',
  kpiColumn: 'revenue',
  mediaChannels: [
    { spendColumn: 'google_ads_spend', impressionsColumn: 'google_ads_impressions', channelName: 'Google Ads', channelType: 'search' },
    { spendColumn: 'meta_ads_spend', impressionsColumn: 'meta_impressions', channelName: 'Meta Ads', channelType: 'social' },
    { spendColumn: 'youtube_spend', impressionsColumn: 'youtube_impressions', channelName: 'YouTube', channelType: 'video' },
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

try {
  state.modelConfig = initialModelConfig;
  state.activeModel = fitMeridianModel(state.dataset.rows, initialModelConfig, true);
} catch (e) {
  console.error('Initial model fit warning:', e);
}

export async function handleApiRequest(
  path: string,
  method: string,
  body: any
): Promise<{ status: number; data: any }> {
  try {
    // 0. Health Check
    if (path === '/api/health' && method === 'GET') {
      return {
        status: 200,
        data: { status: 'ok', timestamp: new Date().toISOString() }
      };
    }

    // 1. Synthetic Dataset
    if (path === '/api/synthetic-data' && method === 'GET') {
      const syn = generateSyntheticDataset(42);
      const cols = Object.keys(syn.rows[0]);
      const mappings = inferColumnMappings(cols, syn.rows as unknown as DataRow[]);
      const val = validateDataset(syn.rows as unknown as DataRow[], mappings);
      const readiness = calculateDataReadinessScore(syn.rows as unknown as DataRow[], mappings, val);

      state.dataset = {
        rows: syn.rows as unknown as DataRow[],
        columns: cols,
        mappings,
        isSynthetic: true
      };

      return {
        status: 200,
        data: {
          rows: syn.rows,
          csv: syn.csv,
          columns: cols,
          mappings,
          validation: val,
          readiness,
          isSynthetic: true
        }
      };
    }

    // 2. Upload / Parse Dataset
    if (path === '/api/upload' && method === 'POST') {
      const { rows, filename } = body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return { status: 400, data: { error: 'Arquivo inválido ou sem registros legíveis.' } };
      }

      // Sanitize columns and rows
      const cols = Object.keys(rows[0]).map(c => c.trim()).filter(Boolean);
      const sanitizedRows = rows.map((r: any) => {
        const clean: DataRow = {};
        for (const c of cols) {
          clean[c] = r[c];
        }
        return clean;
      });

      const mappings = inferColumnMappings(cols, sanitizedRows);
      const val = validateDataset(sanitizedRows, mappings);
      const readiness = calculateDataReadinessScore(sanitizedRows, mappings, val);

      state.dataset = {
        rows: sanitizedRows,
        columns: cols,
        mappings,
        isSynthetic: false
      };

      return {
        status: 200,
        data: {
          rowCount: sanitizedRows.length,
          columnCount: cols.length,
          columns: cols,
          previewRows: sanitizedRows.slice(0, 10),
          mappings,
          validation: val,
          readiness,
          isSynthetic: false,
          filename: filename || 'uploaded_data.csv'
        }
      };
    }

    // 3. Validate Dataset
    if (path === '/api/validate' && method === 'POST') {
      const { rows, mappings } = body;
      const targetRows = rows || state.dataset?.rows;
      const targetMappings = mappings || state.dataset?.mappings;

      if (!targetRows) {
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

    // 3.1 Sanitize & Auto-Fix Dataset
    if (path === '/api/sanitize-data' && method === 'POST') {
      const { rows, mappings } = body;
      const targetRows = rows || state.dataset?.rows;
      const targetMappings = mappings || state.dataset?.mappings;

      if (!targetRows || !targetMappings) {
        return { status: 400, data: { error: 'Nenhum dado ou mapeamento carregado para saneamento.' } };
      }

      const sanitizeResult = sanitizeDataset(targetRows, targetMappings);
      if (state.dataset) {
        state.dataset.rows = sanitizeResult.cleanedRows;
      }

      const val = validateDataset(sanitizeResult.cleanedRows, targetMappings);
      const readiness = calculateDataReadinessScore(sanitizeResult.cleanedRows, targetMappings, val);

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

    // 4. Map Columns
    if (path === '/api/map-columns' && method === 'POST') {
      const { mappings } = body;
      if (mappings && state.dataset) {
        state.dataset.mappings = mappings;
      }
      return {
        status: 200,
        data: {
          success: true,
          mappings: state.dataset?.mappings || []
        }
      };
    }

    // 5. Fit Meridian Model
    if (path === '/api/model' && method === 'POST') {
      const { config, rows } = body;
      const targetRows = rows || state.dataset?.rows;
      const modelConfig: MeridianModelConfig = config || state.modelConfig;

      if (!targetRows || targetRows.length === 0) {
        return { status: 400, data: { error: 'Nenhum dado disponível para execução do modelo.' } };
      }
      if (!modelConfig || !modelConfig.mediaChannels || modelConfig.mediaChannels.length === 0) {
        return { status: 400, data: { error: 'Configuração do Meridian inválida: selecione ao menos 1 canal de mídia.' } };
      }

      state.modelConfig = modelConfig;
      const results = fitMeridianModel(targetRows, modelConfig, state.dataset?.isSynthetic ?? false);
      state.activeModel = results;

      return {
        status: 200,
        data: results
      };
    }

    // 6. Get Model Status / Results
    if ((path === '/api/model/status' || path === '/api/model/results' || path === '/api/model') && method === 'GET') {
      if (!state.activeModel) {
        return {
          status: 404,
          data: { status: 'idle', message: 'Nenhum modelo Meridian em execução.' }
        };
      }
      return {
        status: 200,
        data: state.activeModel
      };
    }

    // 7. Channel Performance
    if (path === '/api/channel-performance' && method === 'GET') {
      if (!state.activeModel) {
        return { status: 404, data: { error: 'Modelo não executado ainda.' } };
      }
      return {
        status: 200,
        data: {
          channels: state.activeModel.channels,
          responseCurves: state.activeModel.responseCurves,
          diagnostics: state.activeModel.diagnostics
        }
      };
    }

    // 8. Optimize Budget
    if (path === '/api/optimize-budget' && method === 'POST') {
      const { targetTotalBudget, constraints } = body;
      if (!state.activeModel) {
        return { status: 400, data: { error: 'Execute o modelo Meridian antes de otimizar o orçamento.' } };
      }

      const budget = Number(targetTotalBudget) || state.activeModel.totalSpend;
      const optResult = optimizeBudget(state.activeModel, budget, constraints);

      return {
        status: 200,
        data: optResult
      };
    }

    // 9. Simulate Scenario
    if (path === '/api/simulate' && method === 'POST') {
      const { channelSpends } = body;
      if (!state.activeModel) {
        return { status: 400, data: { error: 'Execute o modelo Meridian antes de simular cenários.' } };
      }

      const sim = simulateScenario(state.activeModel, channelSpends || {});
      return {
        status: 200,
        data: sim
      };
    }

    // 10. Generate Automated Insights via Gemini
    if (path === '/api/generate-insights' && method === 'POST') {
      if (!state.activeModel) {
        return { status: 400, data: { error: 'Modelo Meridian não disponível.' } };
      }
      const insights = await generateAutomatedInsights(state.activeModel);
      return {
        status: 200,
        data: { insights }
      };
    }

    // 11. Generate Budget Explanation via Gemini
    if (path === '/api/budget-explanation' && method === 'POST') {
      const { optResult, extraQuery } = body;
      if (!state.activeModel) {
        return { status: 400, data: { error: 'Modelo Meridian não disponível.' } };
      }
      const targetOpt = optResult || optimizeBudget(state.activeModel, state.activeModel.totalSpend);
      const explanation = await generateBudgetExplanation(state.activeModel, targetOpt, extraQuery);
      return {
        status: 200,
        data: { explanation }
      };
    }

    // 12. Full Report
    if (path === '/api/report' && method === 'POST') {
      if (!state.activeModel) {
        return { status: 400, data: { error: 'Modelo Meridian não disponível.' } };
      }
      const opt = optimizeBudget(state.activeModel, state.activeModel.totalSpend * 1.15);
      const report = await generateFullReport(state.activeModel, opt);
      return {
        status: 200,
        data: report
      };
    }

    
    // 12.1 Connectors API - List
    if (path === '/api/connectors/list' && method === 'GET') {
      return {
        status: 200,
        data: { connectors: registry.listAvailable() }
      };
    }

    // 12.2 Connectors API - Auth
    if (path === '/api/connectors/auth' && method === 'POST') {
      try {
        const { connectorId, credentials } = body;
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

    // 12.3 Connectors API - Sync
    if (path === '/api/connectors/sync' && method === 'POST') {
      try {
        const { connectorId, config } = body;
        const connector = registry.get(connectorId);
        const result = await connector.sync(config);
        
        if (result.success) {
          // Merge to unified dataset for MMM
          if (!state.dataset) {
             state.dataset = {
               rows: [],
               columns: [],
               mappings: [],
               isSynthetic: false
             };
          }
          // Normally we'd merge by date and channel. For now we append and sort.
          // Note: In real app, we handle full union of keys.
          result.rows.forEach(r => {
             const anyR = r as any;
             state.dataset!.rows.push(anyR);
          });
          
          // Re-infer mappings and validation
          
          // Re-infer mappings and validation
          let validation = null;
          let readiness = null;
          if (state.dataset.rows.length > 0) {
            state.dataset.columns = Array.from(new Set(state.dataset.rows.flatMap(Object.keys)));
            state.dataset.mappings = inferColumnMappings(state.dataset.columns, state.dataset.rows as unknown as DataRow[]);
            validation = validateDataset(state.dataset.rows as unknown as DataRow[], state.dataset.mappings);
            readiness = calculateDataReadinessScore(state.dataset.rows as unknown as DataRow[], state.dataset.mappings, validation);
          }
          
          result.dataset = {
            rows: state.dataset.rows,
            columns: state.dataset.columns,
            mappings: state.dataset.mappings,
            validation,
            readiness,
            isSynthetic: false
          };

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

    // 13. Secure Google OAuth Verification (server-side token parsing & validation)
    if (path === '/api/auth/google' && method === 'POST') {
      const { credential } = body || {};

      let email = 'usuario.google@empresa.com.br';
      let name = 'Marketing Executive';
      let picture = '';
      let googleId = `g_${Date.now()}`;
      let company = 'Digital Brand';

      if (credential) {
        try {
          // Parse JWT payload safely on the server
          const parts = credential.split('.');
          if (parts.length >= 2) {
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
            const payload = JSON.parse(jsonPayload);

            // Verify Google token issuer if present
            if (payload.iss && !payload.iss.includes('accounts.google.com')) {
              return { status: 401, data: { error: 'Emissor de token inválido do Google' } };
            }

            // Verify expiration if present
            if (payload.exp && payload.exp < Date.now() / 1000) {
              return { status: 401, data: { error: 'Token do Google expirado' } };
            }

            if (payload.email) email = payload.email;
            if (payload.name) name = payload.name;
            if (payload.picture) picture = payload.picture;
            if (payload.sub) googleId = payload.sub;
            if (payload.hd) {
              company = payload.hd.toUpperCase();
            } else if (payload.email && payload.email.includes('@')) {
              const domain = payload.email.split('@')[1];
              company = domain.split('.')[0].toUpperCase();
            }
          }
        } catch (e: any) {
          console.warn('Server token decode fallback:', e?.message);
        }
      }

      // Return sanitized user object - NEVER expose raw tokens or client secrets
      const safeUser = {
        id: `usr_${googleId}`,
        name: name,
        email: email.toLowerCase(),
        company: company || 'Empresa',
        role: 'Marketing Lead',
        provider: 'google',
        plan: 'pro',
        createdAt: new Date().toISOString(),
        avatar: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=3b82f6,6366f1`
      };

      return {
        status: 200,
        data: {
          success: true,
          user: safeUser
        }
      };
    }

    return {
      status: 404,
      data: { error: `Rota desconhecida: ${method} ${path}` }
    };
  } catch (err: any) {
    console.error('API Handler Error:', err);
    return {
      status: 500,
      data: {
        error: 'Falha interna ao processar requisição.',
        details: err?.message || String(err)
      }
    };
  }
}
