import { describe, expect, it, vi } from 'vitest';
import { AIContext } from '../../services/insights';
import { AINarrativeProvider, AINarrativeService } from './aiNarrativeService';

const context: AIContext = {
  modelId: 'model-real',
  decisionEngineVersion: '1.1.0',
  modelQuality: { r2: 0.9, mape: 8, wmape: 7, rhat: 1.01, converged: true },
  budget: { current: 100, target: 100, expectedIncrementalKpi: 20, liftPercentage: 5 },
  recommendations: [{
    channel: 'Search', action: 'INCREASE_BUDGET', priority: 'HIGH', confidence: 'HIGH',
    ruleId: 'BUDGET_INCREASE_001', currentSpend: 50, recommendedSpend: 60, delta: 10,
    evidence: [{ metric: 'mROI', value: 1.8 }]
  }],
  risks: []
};

function providerResult() {
  return {
    text: JSON.stringify({
      executiveSummary: 'Priorize a oportunidade validada pelo modelo.',
      keyFindings: ['Há espaço para expansão com evidência suficiente.'],
      recommendedActions: ['Aplique a realocação indicada pelo otimizador.'],
      risks: ['Monitore a incerteza após a próxima atualização.']
    }),
    usage: { inputTokens: 100, outputTokens: 40, totalTokens: 140 }
  };
}

describe('AI narrative policy, cache and deduplication', () => {
  it('makes zero provider calls while AI_MODE is off', async () => {
    const provider: AINarrativeProvider = { generate: vi.fn(async () => providerResult()) };
    const service = new AINarrativeService(provider);
    const result = await service.enhance({ explicitlyRequested: true, context, outputType: 'executive_report', environment: {} as NodeJS.ProcessEnv });

    expect(result.status).toBe('disabled');
    expect(provider.generate).not.toHaveBeenCalled();
    expect(service.getMetrics()).toMatchObject({ requestCount: 0, totalTokens: 0 });
  });

  it('calls once on first explicit request and zero additional times for an identical request', async () => {
    const provider: AINarrativeProvider = { generate: vi.fn(async () => providerResult()) };
    const service = new AINarrativeService(provider);
    const environment = { AI_MODE: 'on_demand' } as NodeJS.ProcessEnv;

    const first = await service.enhance({ explicitlyRequested: true, context, outputType: 'executive_report', environment });
    const repeated = await service.enhance({ explicitlyRequested: true, context, outputType: 'executive_report', environment });

    expect(first).toMatchObject({ status: 'generated', cacheHit: false });
    expect(repeated).toMatchObject({ status: 'generated', cacheHit: true, usage: { totalTokens: 0 } });
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(service.getMetrics()).toMatchObject({ requestCount: 1, cacheHits: 1, totalTokens: 140 });
  });

  it('deduplicates concurrent identical requests', async () => {
    let release!: (value: ReturnType<typeof providerResult>) => void;
    const pending = new Promise<ReturnType<typeof providerResult>>(resolve => { release = resolve; });
    const provider: AINarrativeProvider = { generate: vi.fn(() => pending) };
    const service = new AINarrativeService(provider);
    const environment = { AI_MODE: 'on_demand' } as NodeJS.ProcessEnv;

    const first = service.enhance({ explicitlyRequested: true, context, outputType: 'executive_report', environment });
    const second = service.enhance({ explicitlyRequested: true, context, outputType: 'executive_report', environment });
    release(providerResult());

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.status).toBe('generated');
    expect(secondResult).toMatchObject({ status: 'generated', cacheHit: true });
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(service.getMetrics().deduplicatedRequests).toBe(1);
  });

  it('rejects AI output that attempts to introduce numeric claims', async () => {
    const provider: AINarrativeProvider = {
      generate: vi.fn(async () => ({
        ...providerResult(),
        text: JSON.stringify({
          executiveSummary: 'O retorno será de 99 por cento.',
          keyFindings: [], recommendedActions: [], risks: []
        })
      }))
    };
    const service = new AINarrativeService(provider);
    const result = await service.enhance({
      explicitlyRequested: true,
      context,
      outputType: 'executive_report',
      environment: { AI_MODE: 'on_demand' } as NodeJS.ProcessEnv
    });
    expect(result).toMatchObject({ status: 'invalid', narrative: null });
  });
});
