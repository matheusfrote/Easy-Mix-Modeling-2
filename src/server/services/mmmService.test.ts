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
        channels: [{ channelName: 'TV', roi: 1.4, marginalRoi: 1.1 }],
        diagnostics: { rSquared: 0.8, mape: 10, wmape: 9, gelmanRubinRhat: 1.03 },
        responseCurves: { TV: { channelName: 'TV', points: [] } }
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

  it('returns 501 for intentionally unimplemented adjacent features', async () => {
    const client = new MMMServiceClient('http://meridian.test');
    const optimizer = await client.optimizeBudget({ targetTotalBudget: 100 });
    const simulation = await client.simulateScenario({ channelSpends: { TV: 100 } });

    expect(optimizer).toMatchObject({ status: 'not_implemented', httpStatus: 501 });
    expect(simulation).toMatchObject({ status: 'not_implemented', httpStatus: 501 });
  });
});
