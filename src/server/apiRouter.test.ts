import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeridianModelConfig } from '../types/mmm';
import { attachExposureColumns, handleApiRequest } from './apiRouter';
import { sessionManager } from './security/sessionManager';
import { mmmServiceClient } from './services/mmmService';
import { aiNarrativeService } from './services/aiNarrativeService';

const baseConfig: MeridianModelConfig = {
  dateColumn: 'week',
  kpiColumn: 'revenue',
  targetKpiType: 'revenue',
  mediaChannels: [{
    channelName: 'TV',
    channelType: 'tv',
    spendColumn: 'tv_spend'
  }],
  controlColumns: [],
  seasonalityFourierTerms: 2,
  mcmcChains: 2,
  mcmcDraws: 100,
  mcmcWarmup: 50,
  priors: {}
};

describe('attachExposureColumns', () => {
  it('maps a channel exposure separately from its spend column', () => {
    const result = attachExposureColumns(baseConfig, [
      { columnName: 'tv_spend', mappedType: 'media_spend', channelName: 'TV' },
      { columnName: 'tv_clicks', mappedType: 'media_clicks', channelName: 'TV' },
      { columnName: 'tv_impressions', mappedType: 'media_impressions', channelName: 'TV' }
    ]);

    expect(result.mediaChannels[0].impressionsColumn).toBe('tv_impressions');
    expect(result.mediaChannels[0].impressionsColumn).not.toBe('tv_spend');
  });

  it('leaves exposure absent when no valid mapping exists so Python returns 422', () => {
    const result = attachExposureColumns(baseConfig, [
      { columnName: 'tv_spend', mappedType: 'media_spend', channelName: 'TV' }
    ]);

    expect(result.mediaChannels[0].impressionsColumn).toBeUndefined();
  });
});

describe('model-dependent features', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['/api/optimize-budget', '/api/simulate'])(
    'requires a fitted model for %s',
    async path => {
      const response = await handleApiRequest(path, 'POST', {});

      expect(response.status).toBe(400);
      expect(response.data.code).toBe('MODEL_REQUIRED');
    }
  );

  it('requires a fitted model for the executive report', async () => {
    const response = await handleApiRequest('/api/report', 'POST', {});
    expect(response.status).toBe(400);
    expect(response.data.code).toBe('MODEL_REQUIRED');
  });

  it('builds the standard report deterministically with zero Gemini calls', async () => {
    const sessionId = 'report-integration';
    sessionManager.getWorkspaceBySessionId(sessionId).activeModel = {
      modelId: 'real-report-model', createdAt: '2026-01-01T00:00:00.000Z', totalSpend: 100,
      totalKpi: 300, blendedRoi: 1.2, mostEfficientChannel: 'Search',
      bestOpportunityChannel: 'Search', saturatedChannel: 'Search',
      diagnostics: { rSquared: 0.9, mape: 8, warnings: [], isConverged: true },
      channels: [{
        channelName: 'Search', spend: 100, spendShare: 1, incrementalKpi: 80,
        kpiShare: 0.4, roi: 1.8, marginalRoi: 1.6,
        marginalRoiInterval: { ci025: 1.3, ci050: 1.6, ci975: 1.9 }
      }],
      responseCurves: { Search: { points: [
        { spend: 0, incrementalOutcome: 0 }, { spend: 100, incrementalOutcome: 80 },
        { spend: 200, incrementalOutcome: 150 }
      ] } }
    } as any;
    vi.spyOn(mmmServiceClient, 'optimizeBudget').mockResolvedValue({
      status: 'success', modelId: 'real-report-model', results: {
        currentTotalBudget: 100, targetTotalBudget: 100, expectedCurrentKpi: 300,
        expectedOptimizedKpi: 315, totalIncrementalKpi: 15, overallLiftPercentage: 5,
        reallocations: [{ channelName: 'Search', currentSpend: 100, recommendedSpend: 110, deltaSpend: 10, deltaKpi: 15 }]
      }
    });
    const before = aiNarrativeService.getMetrics();
    const response = await handleApiRequest('/api/report', 'POST', {}, { 'x-session-id': sessionId });
    const after = aiNarrativeService.getMetrics();

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ modelId: 'real-report-model', source: 'deterministic', aiStatus: 'not_requested' });
    expect(response.data.dataLineage.every((entry: any) => entry.modelId === 'real-report-model')).toBe(true);
    expect(after.requestCount).toBe(before.requestCount);
    expect(after.totalTokens).toBe(before.totalTokens);
  });

  it('runs optimizer results through the deterministic decision engine using the session modelId', async () => {
    const sessionId = 'optimizer-integration';
    sessionManager.getWorkspaceBySessionId(sessionId).activeModel = {
      modelId: 'real-model-id', totalSpend: 100, totalKpi: 300, blendedRoi: 1.2,
      channels: [{
        channelName: 'Search', spend: 100, spendShare: 1, incrementalKpi: 80,
        contributionShare: 0.4, roi: 1.8, marginalRoi: 1.6, saturationLevel: 0.5,
        marginalRoiInterval: { ci025: 1.3, ci050: 1.6, ci975: 1.9 }
      }],
      responseCurves: { Search: { channelName: 'Search', currentSpend: 100, points: [
        { spend: 0, incrementalOutcome: 0 },
        { spend: 100, incrementalOutcome: 80 },
        { spend: 200, incrementalOutcome: 150 }
      ] } }
    } as any;
    const optimize = vi.spyOn(mmmServiceClient, 'optimizeBudget').mockResolvedValue({
      status: 'success', modelId: 'real-model-id', results: {
        modelId: 'real-model-id', reallocations: [{
          channelName: 'Search', currentSpend: 100, recommendedSpend: 125,
          deltaSpend: 25, deltaKpi: 15
        }]
      }
    });

    const response = await handleApiRequest(
      '/api/optimize-budget', 'POST', { targetTotalBudget: 125, modelId: 'frontend-model-must-be-ignored' },
      { 'x-session-id': sessionId }
    );

    expect(response.status).toBe(200);
    expect(response.data.insights[0]).toMatchObject({
      modelId: 'real-model-id', ruleId: 'BUDGET_INCREASE_001', action: 'INCREASE_BUDGET'
    });
    expect(optimize).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'real-model-id' }));
  });

  it('runs a posterior scenario result through the deterministic decision engine', async () => {
    const sessionId = 'scenario-integration';
    sessionManager.getWorkspaceBySessionId(sessionId).activeModel = {
      modelId: 'real-model-id', totalSpend: 100, totalKpi: 300, blendedRoi: 1.2,
      channels: [], responseCurves: {}
    } as any;
    vi.spyOn(mmmServiceClient, 'simulateScenario').mockResolvedValue({
      status: 'success', modelId: 'real-model-id', results: {
        modelId: 'real-model-id', channelSpends: { Search: 110 }, expectedKpi: 330,
        expectedKpiLower: 310, expectedKpiUpper: 350, incrementalKpi: 30, blendedRoi: 1.4
      }
    });

    const response = await handleApiRequest(
      '/api/simulate', 'POST', { channelSpends: { Search: 110 } }, { 'x-session-id': sessionId }
    );

    expect(response.status).toBe(200);
    expect(response.data.insights[0]).toMatchObject({
      modelId: 'real-model-id', ruleId: 'SCENARIO_POSITIVE_001', action: 'SCENARIO_POSITIVE'
    });
  });

  it('runs the normal core surfaces without any Gemini call or token usage', async () => {
    const sessionId = 'zero-ai-core-flow';
    const requestHeaders = { 'x-session-id': sessionId };
    const rows = [
      { week: '2025-01-06', revenue: 100, tv_spend: 10, tv_impressions: 1000 },
      { week: '2025-01-13', revenue: 110, tv_spend: 12, tv_impressions: 1200 },
      { week: '2025-01-20', revenue: 120, tv_spend: 14, tv_impressions: 1400 }
    ];
    expect((await handleApiRequest('/api/upload', 'POST', { rows, filename: 'controlled.csv' }, requestHeaders)).status).toBe(200);
    expect((await handleApiRequest('/api/validate', 'POST', {}, requestHeaders)).status).toBe(200);

    sessionManager.getWorkspaceBySessionId(sessionId).activeModel = {
      modelId: 'real-core-model', createdAt: '2026-01-01T00:00:00.000Z', totalSpend: 100,
      totalKpi: 300, blendedRoi: 1.2, mostEfficientChannel: 'TV',
      bestOpportunityChannel: 'TV', saturatedChannel: 'TV',
      diagnostics: { rSquared: 0.9, mape: 8, warnings: [], isConverged: true },
      channels: [{
        channelName: 'TV', spend: 100, spendShare: 1, incrementalKpi: 80,
        kpiShare: 0.4, roi: 1.8, marginalRoi: 1.6,
        marginalRoiInterval: { ci025: 1.3, ci050: 1.6, ci975: 1.9 }
      }],
      responseCurves: { TV: { points: [
        { spend: 0, incrementalOutcome: 0 }, { spend: 100, incrementalOutcome: 80 },
        { spend: 200, incrementalOutcome: 150 }
      ] } }
    } as any;
    vi.spyOn(mmmServiceClient, 'optimizeBudget').mockResolvedValue({
      status: 'success', modelId: 'real-core-model', results: {
        currentTotalBudget: 100, targetTotalBudget: 100, expectedCurrentKpi: 300,
        expectedOptimizedKpi: 315, totalIncrementalKpi: 15, overallLiftPercentage: 5,
        reallocations: [{ channelName: 'TV', currentSpend: 100, recommendedSpend: 110, deltaSpend: 10, deltaKpi: 15 }]
      }
    });
    vi.spyOn(mmmServiceClient, 'simulateScenario').mockResolvedValue({
      status: 'success', modelId: 'real-core-model', results: {
        channelSpends: { TV: 100 }, expectedKpi: 310, expectedKpiLower: 290,
        expectedKpiUpper: 330, incrementalKpi: 10, blendedRoi: 1.3
      }
    });
    const before = aiNarrativeService.getMetrics();
    const responses = await Promise.all([
      handleApiRequest('/api/model/results', 'GET', {}, requestHeaders),
      handleApiRequest('/api/optimize-budget', 'POST', { targetTotalBudget: 100 }, requestHeaders),
      handleApiRequest('/api/simulate', 'POST', { channelSpends: { TV: 100 } }, requestHeaders),
      handleApiRequest('/api/generate-insights', 'POST', {}, requestHeaders),
      handleApiRequest('/api/report', 'POST', {}, requestHeaders)
    ]);
    const after = aiNarrativeService.getMetrics();

    expect(responses.every(response => response.status === 200)).toBe(true);
    expect(after.requestCount).toBe(before.requestCount);
    expect(after.totalTokens).toBe(before.totalTokens);
  });

  it('invalidates the fitted model when the dataset or mapping changes', async () => {
    const sessionId = 'scientific-state-invalidation';
    const headers = { 'x-session-id': sessionId };
    const rows = Array.from({ length: 16 }, (_, index) => ({
      week: new Date(Date.UTC(2025, 0, 6 + index * 7)).toISOString().slice(0, 10),
      revenue: 100 + index,
      tv_spend: 10 + index,
      tv_impressions: 1000 + index * 50
    }));
    const firstUpload = await handleApiRequest('/api/upload', 'POST', { rows, filename: 'first.csv' }, headers, '10.0.0.41');
    expect(firstUpload.status).toBe(200);
    sessionManager.getWorkspaceBySessionId(sessionId).activeModel = { modelId: 'stale-model' } as any;

    const secondUpload = await handleApiRequest('/api/upload', 'POST', { rows, filename: 'second.csv' }, headers, '10.0.0.42');
    expect(secondUpload.status).toBe(200);
    expect(sessionManager.getWorkspaceBySessionId(sessionId).activeModel).toBeNull();

    sessionManager.getWorkspaceBySessionId(sessionId).activeModel = { modelId: 'stale-after-mapping' } as any;
    const mappingResponse = await handleApiRequest(
      '/api/map-columns', 'POST', { mappings: secondUpload.data.mappings }, headers
    );
    expect(mappingResponse.status).toBe(200);
    expect(sessionManager.getWorkspaceBySessionId(sessionId).activeModel).toBeNull();
  });

  it('keeps datasets and fitted models isolated between anonymous sessions', async () => {
    const sessionA = 'anon_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const sessionB = 'anon_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const headersA = { 'x-session-id': sessionA };
    const headersB = { 'x-session-id': sessionB };
    const rows = Array.from({ length: 16 }, (_, index) => ({
      week: new Date(Date.UTC(2025, 0, 6 + index * 7)).toISOString().slice(0, 10),
      revenue: 100 + index,
      tv_spend: 10 + index,
      tv_impressions: 1000 + index * 25
    }));

    const uploaded = await handleApiRequest(
      '/api/upload', 'POST', { rows, filename: 'session-a.csv' }, headersA, '10.0.0.45'
    );
    expect(uploaded.status).toBe(200);
    sessionManager.getWorkspaceBySessionId(sessionA).activeModel = {
      modelId: 'session-a-model', totalSpend: 100, totalKpi: 300,
      channels: [], diagnostics: {}, responseCurves: {}
    } as any;

    expect(sessionManager.getWorkspaceBySessionId(sessionA).dataset?.filename).toBe('session-a.csv');
    expect(sessionManager.getWorkspaceBySessionId(sessionB).dataset).toBeNull();
    expect(sessionManager.getWorkspaceBySessionId(sessionB).activeModel).toBeNull();

    const modelFromA = await handleApiRequest('/api/model/results', 'GET', {}, headersA);
    const modelFromB = await handleApiRequest('/api/model/results', 'GET', {}, headersB);
    const optimizerFromB = await handleApiRequest(
      '/api/optimize-budget', 'POST', { targetTotalBudget: 100 }, headersB
    );

    expect(modelFromA.status).toBe(200);
    expect(modelFromA.data.modelId).toBe('session-a-model');
    expect(modelFromB.status).toBe(404);
    expect(optimizerFromB.status).toBe(400);
    expect(optimizerFromB.data.code).toBe('MODEL_REQUIRED');
  });

  it('returns 422 before fitting when the active dataset is scientifically invalid', async () => {
    const sessionId = 'invalid-fit-input';
    const workspace = sessionManager.getWorkspaceBySessionId(sessionId);
    workspace.dataset = {
      filename: 'invalid.csv',
      columns: ['week', 'revenue', 'tv_spend', 'tv_impressions'],
      mappings: [
        { columnName: 'week', mappedType: 'date' },
        { columnName: 'revenue', mappedType: 'kpi' },
        { columnName: 'tv_spend', mappedType: 'media_spend', channelName: 'TV' },
        { columnName: 'tv_impressions', mappedType: 'media_impressions', channelName: 'TV' }
      ],
      rows: Array.from({ length: 16 }, (_, index) => ({
        week: index === 4 ? 'invalid-date' : new Date(Date.UTC(2025, 0, 6 + index * 7)).toISOString().slice(0, 10),
        revenue: 100 + index,
        tv_spend: 10 + index,
        tv_impressions: 1000 + index * 10
      }))
    };
    const fit = vi.spyOn(mmmServiceClient, 'fitModel');
    const response = await handleApiRequest(
      '/api/model', 'POST', { config: baseConfig }, { 'x-session-id': sessionId }, '10.0.0.43'
    );

    expect(response.status).toBe(422);
    expect(response.data).toMatchObject({ code: 'INVALID_INPUT_DATA', stage: 'input_data' });
    expect(fit).not.toHaveBeenCalled();
  });

  it('returns 501 instead of silently treating reach/frequency as national exposure', async () => {
    const sessionId = 'unsupported-rf-fit';
    const workspace = sessionManager.getWorkspaceBySessionId(sessionId);
    workspace.dataset = {
      filename: 'rf.csv',
      columns: ['week', 'revenue', 'tv_spend', 'tv_reach', 'tv_frequency'],
      mappings: [
        { columnName: 'week', mappedType: 'date' },
        { columnName: 'revenue', mappedType: 'kpi' },
        { columnName: 'tv_spend', mappedType: 'media_spend', channelName: 'TV' },
        { columnName: 'tv_reach', mappedType: 'media_reach', channelName: 'TV' },
        { columnName: 'tv_frequency', mappedType: 'media_frequency', channelName: 'TV' }
      ],
      rows: [{ week: '2025-01-06', revenue: 100, tv_spend: 10, tv_reach: 500, tv_frequency: 2 }]
    };

    const response = await handleApiRequest(
      '/api/model', 'POST', { config: baseConfig }, { 'x-session-id': sessionId }, '10.0.0.44'
    );
    expect(response.status).toBe(501);
    expect(response.data).toMatchObject({ code: 'NOT_IMPLEMENTED', stage: 'input_data' });
  });
});
