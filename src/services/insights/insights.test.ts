import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildBudgetInsights,
  buildAIContext,
  buildDeterministicReport,
  buildScenarioInsights,
  cachedDerivedResult,
  clearDerivedCache,
  DECISION_ENGINE_VERSION,
  derivedCacheKey,
  getAiMode,
  renderInsights,
  resolveWithOptionalAi,
  shouldCallAi
} from '.';

const model: any = {
  modelId: 'model-real-1',
  totalSpend: 100,
  totalKpi: 300,
  blendedRoi: 1.2,
  channels: [{
    channelName: 'Search', spend: 100, spendShare: 1, incrementalKpi: 80,
    contributionShare: 0.4, roi: 1.8, marginalRoi: 1.6, saturationLevel: 0.5,
    marginalRoiInterval: { ci025: 1.3, ci050: 1.6, ci975: 1.9 }
  }],
  responseCurves: {
    Search: { points: [
      { spend: 0, incrementalOutcome: 0 },
      { spend: 100, incrementalOutcome: 80 },
      { spend: 200, incrementalOutcome: 150 }
    ] }
  }
};

const optimization: any = {
  reallocations: [{
    channelName: 'Search', currentSpend: 100, recommendedSpend: 125,
    deltaSpend: 25, deltaKpi: 15
  }]
};

describe('deterministic insight pipeline', () => {
  beforeEach(clearDerivedCache);

  it('combines optimizer, mROI, saturation, uncertainty, and response curve evidence', () => {
    const insights = buildBudgetInsights({ model, optimization });
    expect(insights[0]).toMatchObject({
      modelId: 'model-real-1',
      decisionEngineVersion: DECISION_ENGINE_VERSION,
      ruleId: 'BUDGET_INCREASE_001',
      action: 'INCREASE_BUDGET'
    });
    expect(insights[0].evidence.map(item => item.metric)).toEqual(expect.arrayContaining([
      'ROI', 'mROI', 'saturation', 'credibleIntervalWidth', 'responseCurvePosition', 'optimizerBudgetDelta'
    ]));
    expect(renderInsights(insights)[0].summary).toContain('R$');
  });

  it('returns insufficient evidence when uncertainty cannot support a decision', () => {
    const uncertain = structuredClone(model);
    uncertain.channels[0].marginalRoiInterval = { ci025: -2, ci050: 1.6, ci975: 5 };
    expect(buildBudgetInsights({ model: uncertain, optimization })[0].action).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('creates versioned scenario insights from posterior scenario outputs', () => {
    const [insight] = buildScenarioInsights({
      model,
      scenario: {
        modelId: model.modelId,
        expectedKpi: 330,
        expectedKpiLower: 310,
        expectedKpiUpper: 350,
        incrementalKpi: 30,
        blendedRoi: 1.4
      } as any
    });
    expect(insight).toMatchObject({
      ruleId: 'SCENARIO_POSITIVE_001',
      action: 'SCENARIO_POSITIVE',
      modelId: model.modelId,
      decisionEngineVersion: DECISION_ENGINE_VERSION
    });
  });

  it('reuses identical cached inputs and changes the key when configuration changes', () => {
    const calculate = vi.fn(() => ({ value: 1 }));
    const key = derivedCacheKey(model.modelId, 'optimizer', { budget: 100, constraints: {} });
    const first = cachedDerivedResult(key, calculate);
    const second = cachedDerivedResult(key, calculate);
    expect(second).toBe(first);
    expect(calculate).toHaveBeenCalledTimes(1);
    expect(derivedCacheKey(model.modelId, 'optimizer', { budget: 101, constraints: {} })).not.toBe(key);
  });

  it('defaults AI_MODE to off and produces zero Gemini calls', async () => {
    const gemini = vi.fn(async () => 'ai');
    expect(getAiMode({} as NodeJS.ProcessEnv)).toBe('off');
    expect(shouldCallAi(true, {} as NodeJS.ProcessEnv)).toBe(false);
    expect(shouldCallAi(false, { AI_MODE: 'on_demand' } as NodeJS.ProcessEnv)).toBe(false);
    expect(shouldCallAi(true, { AI_MODE: 'on_demand' } as NodeJS.ProcessEnv)).toBe(true);
    await expect(resolveWithOptionalAi(true, 'deterministic', gemini, {} as NodeJS.ProcessEnv)).resolves.toBe('deterministic');
    expect(gemini).not.toHaveBeenCalled();
  });

  it('builds a compact AI context without raw rows, time series, posterior or response curves', () => {
    const enriched = structuredClone(model);
    enriched.rows = [{ secret: 'raw' }];
    enriched.diagnostics = {};
    enriched.diagnostics.timeSeriesFit = [{ date: '2025-01-01', actual: 1 }];
    enriched.diagnostics.posteriorMetrics = { samples: [1, 2, 3] };
    const insights = buildBudgetInsights({ model: enriched, optimization });
    const context = buildAIContext(enriched, optimization, insights);
    const serialized = JSON.stringify(context);

    expect(context.modelId).toBe(model.modelId);
    expect(context.recommendations).toHaveLength(1);
    expect(serialized).not.toContain('timeSeriesFit');
    expect(serialized).not.toContain('posteriorMetrics');
    expect(serialized).not.toContain('responseCurves');
    expect(serialized).not.toContain('secret');
  });

  it('creates an idempotent deterministic report with model-scoped lineage', () => {
    const completeOptimization = {
      ...optimization,
      currentTotalBudget: 100,
      targetTotalBudget: 100,
      totalIncrementalKpi: 15,
      overallLiftPercentage: 5
    };
    const insights = buildBudgetInsights({ model, optimization: completeOptimization });
    const first = buildDeterministicReport(model, completeOptimization, insights);
    const second = buildDeterministicReport(model, completeOptimization, insights);

    expect(second).toEqual(first);
    expect(first.source).toBe('deterministic');
    expect(first.aiStatus).toBe('not_requested');
    expect(first.dataLineage.every(entry => entry.modelId === model.modelId)).toBe(true);
  });
});
