import { afterEach, describe, expect, it, vi } from 'vitest';
import { MMMServiceClient, MeridianServiceRequestPayload } from './mmmService';

const payload: MeridianServiceRequestPayload = {
  rows: [{ week: '2024-01-01', revenue: 100, tv_impressions: 1000, tv_spend: 10 }],
  config: {
    dateColumn: 'week',
    kpiColumn: 'revenue',
    targetKpiType: 'revenue',
    mediaChannels: [{
      channelName: 'TV',
      spendColumn: 'tv_spend',
      impressionsColumn: 'tv_impressions'
    }]
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('MMMServiceClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves the verified Python success contract', async () => {
    const pythonResponse = {
      status: 'success',
      modelId: 'model-123',
      engine: 'google-meridian',
      engineVersion: '1.8.0',
      results: {
        totalSpend: 10,
        totalKpi: 100,
        blendedRoi: 1.4,
        kpiType: 'revenue',
        channels: [{
          channelName: 'TV', spend: 10, spendShare: 100,
          incrementalKpi: 14, contribution: 50, contributionShare: 50,
          roi: 1.4, marginalRoi: 1.1,
          incrementalOutcomeInterval: { ci025: 10, ci050: 14, ci975: 18 },
          contributionInterval: { ci025: 30, ci050: 50, ci975: 70 },
          roiInterval: { ci025: 1, ci050: 1.4, ci975: 1.8 },
          marginalRoiInterval: { ci025: 0.8, ci050: 1.1, ci975: 1.4 },
          saturationLevel: 0.55,
          saturationInterval: { ci025: 0.4, ci050: null, ci975: 0.7 },
          currentMediaUnits: 1000,
          adstockDecay: 0.4,
          adstockDecayInterval: { ci025: 0.2, ci050: null, ci975: 0.6 },
          adstockHalfLifeWeeks: null
        }],
        diagnostics: {
          rSquared: 0.8, mape: 10, wmape: 9, gelmanRubinRhat: 1.03,
          isConverged: true
        },
        responseCurves: { TV: { channelName: 'TV', currentSpend: 10, points: [] } }
      },
      warnings: []
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(pythonResponse)));

    const result = await new MMMServiceClient('http://meridian.test').fitModel(payload);

    expect(result).toEqual({
      status: 'success',
      httpStatus: 200,
      modelId: 'model-123',
      engine: 'google-meridian',
      engineVersion: '1.8.0',
      results: pythonResponse.results,
      warnings: []
    });
  });

  it('rejects a nominal success with an incomplete analyzer contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      status: 'success',
      modelId: 'model-123',
      engine: 'google-meridian',
      engineVersion: '1.8.0',
      results: { channels: [] }
    })));

    const result = await new MMMServiceClient('http://meridian.test').fitModel(payload);

    expect(result.status).toBe('error');
    expect(result.httpStatus).toBe(502);
    expect(result.errors?.[0].code).toBe('INVALID_RESPONSE');
  });

  it('rejects hardcoded-looking missing values instead of accepting a weak success contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      status: 'success', modelId: 'model-123', engine: 'google-meridian', engineVersion: '1.8.0',
      results: {
        totalSpend: 10, totalKpi: 100, blendedRoi: 0, kpiType: 'revenue',
        channels: [{ channelName: 'TV', roi: 0, marginalRoi: 0 }],
        diagnostics: { rSquared: 0, mape: 0, wmape: 0, gelmanRubinRhat: 1, isConverged: true },
        responseCurves: {}
      }
    })));

    const result = await new MMMServiceClient('http://meridian.test').fitModel(payload);
    expect(result).toMatchObject({ status: 'error', httpStatus: 502 });
  });

  it('preserves Python validation status, code, message, and stage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      detail: {
        code: 'INVALID_MERIDIAN_INPUT',
        message: 'Exposure column is required; spend is not exposure',
        stage: 'input_data'
      }
    }, 422)));

    const result = await new MMMServiceClient('http://meridian.test').fitModel(payload);

    expect(result.status).toBe('validation_error');
    expect(result.httpStatus).toBe(422);
    expect(result.errors?.[0]).toEqual({
      code: 'INVALID_MERIDIAN_INPUT',
      message: 'Exposure column is required; spend is not exposure',
      stage: 'input_data'
    });
  });

  it('does not convert a posterior failure into success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      detail: {
        code: 'MCMC_EXECUTION_FAILED',
        message: 'controlled posterior failure',
        stage: 'posterior'
      }
    }, 500)));

    const result = await new MMMServiceClient('http://meridian.test').fitModel(payload);

    expect(result.status).toBe('model_error');
    expect(result.httpStatus).toBe(500);
    expect(result.errors?.[0].code).toBe('MCMC_EXECUTION_FAILED');
  });

  it('reports Meridian unavailable from the health payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      status: 'unavailable',
      meridian_available: false,
      version: null,
      import_error: 'controlled import error'
    })));

    const result = await new MMMServiceClient('http://meridian.test').checkHealth();

    expect(result.status).toBe('unavailable');
    expect(result.meridianModuleLoaded).toBe(false);
  });

  it('uses modelId for optimizer and scenario without frontend model reconstruction', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        status: 'success', modelId: 'model-123', engine: 'google-meridian', engineVersion: '1.8.0',
        results: {
          modelId: 'model-123', currentTotalBudget: 100, targetTotalBudget: 110,
          expectedCurrentKpi: 115, expectedOptimizedKpi: 120, incrementalKpi: 5,
          liftPercentage: 4.35, blendedCurrentRoi: 1.15, blendedProjectedRoi: 1.2,
          reallocations: [{
            channelName: 'TV', currentSpend: 100, recommendedSpend: 110,
            deltaSpend: 10, deltaPercentage: 10, currentRoi: 1.15,
            optimizedRoi: 1.2, marginalRoi: 1.1
          }]
        }, warnings: []
      }))
      .mockResolvedValueOnce(jsonResponse({
        status: 'success', modelId: 'model-123', engine: 'google-meridian', engineVersion: '1.8.0',
        results: {
          id: 'scenario-1', modelId: 'model-123', totalSpend: 100,
          expectedKpi: 115, expectedKpiLower: 100, expectedKpiUpper: 130,
          incrementalKpi: 5, blendedRoi: 1.1, channelSpends: { TV: 100 }
        }, warnings: []
      }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new MMMServiceClient('http://meridian.test');
    const optimizer = await client.optimizeBudget({
      modelId: 'model-123', targetTotalBudget: 100, decisionEngineVersion: '1.1.0'
    });
    const simulation = await client.simulateScenario({
      modelId: 'model-123', channelSpends: { TV: 100 }, decisionEngineVersion: '1.1.0'
    });

    expect(optimizer).toMatchObject({ status: 'success', httpStatus: 200, modelId: 'model-123' });
    expect(simulation).toMatchObject({ status: 'success', httpStatus: 200, modelId: 'model-123' });
    const optimizerBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(optimizerBody).toEqual({ modelId: 'model-123', targetTotalBudget: 100, decisionEngineVersion: '1.1.0' });
    expect(optimizerBody).not.toHaveProperty('activeModel');
  });
});
