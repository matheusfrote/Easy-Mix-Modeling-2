import { describe, it, expect } from 'vitest';
import {
  evaluateChannelDecisionTree,
  identifyReallocationOpportunities,
  calculateDistribution,
  calculatePortfolioBenchmarks,
  extractChannelFeatures,
  generateDecisionInsights,
  answerStrategicQuestion
} from './decisionEngine';
import { ChannelFeatures, PortfolioBenchmarks } from './decisionEngine/types';
import { MeridianModelResults, ChannelMetrics } from '../types/mmm';

describe('Decision Engine - Core Scenarios & Decision Trees', () => {
  const mockBenchmarks: PortfolioBenchmarks = {
    marginalRoi: { min: 0.5, p25: 1.0, median: 2.0, p75: 3.2, p90: 4.0, max: 4.5, mean: 2.1, std: 1.1 },
    roi: { min: 1.0, p25: 2.0, median: 3.5, p75: 4.5, p90: 5.5, max: 6.0, mean: 3.6, std: 1.2 },
    saturation: { min: 15, p25: 30, median: 50, p75: 70, p90: 85, max: 90, mean: 52, std: 20 },
    contribution: { min: 5, p25: 10, median: 20, p75: 35, p90: 45, max: 50, mean: 22, std: 12 },
    spend: { min: 10000, p25: 30000, median: 60000, p75: 120000, p90: 180000, max: 200000, mean: 75000, std: 40000 },
    totalSpend: 300000,
    totalKpi: 1200000,
    blendedRoi: 3.5,
    mediaShare: 40,
    baselineShare: 45,
    controlsShare: 15,
    channelCount: 4
  };

  const createMockChannel = (overrides: Partial<ChannelFeatures> = {}): ChannelFeatures => ({
    channelName: 'Test_Channel',
    spend: 50000,
    spendShare: 25,
    kpi: 200000,
    kpiShare: 25,
    roi: 4.0,
    roiInterval: { ci025: 3.2, ci050: 4.0, ci975: 4.8 },
    marginalRoi: 3.5,
    marginalRoiInterval: { ci025: 2.8, ci050: 3.5, ci975: 4.2 },
    saturationLevel: 25,
    adstockDecay: 0.3,
    adstockHalfLifeWeeks: 1.2,
    halfSaturationSpend: 60000,
    confidence: 'Alta',
    confidenceScore: 0.85,
    roiCiWidth: 0.4,
    mroiCiWidth: 0.4,
    trendPct: 0.02,
    isUnderinvested: false,
    isOverinvested: false,
    mroiScore: 85,
    roiScore: 80,
    saturationScore: 75,
    contributionScore: 60,
    efficiencyScore: 83,
    opportunityScore: 85,
    riskScore: 20,
    trendScore: 55,
    ...overrides
  });

  // ==========================================
  // CENÁRIO 1: mROI alto + saturação baixa + confiança alta -> INCREASE
  // ==========================================
  it('Cenário 1: deve decidir INCREASE para mROI alto + saturação baixa + confiança alta', () => {
    const channel = createMockChannel({
      marginalRoi: 3.8, // > p75 (3.2)
      saturationLevel: 25, // < low threshold (40)
      confidence: 'Alta',
      mroiCiWidth: 0.35
    });

    const result = evaluateChannelDecisionTree(channel, mockBenchmarks);
    expect(result.decision).toBe('INCREASE');
    expect(result.reasonCodes).toContain('HIGH_MARGINAL_ROI');
    expect(result.reasonCodes).toContain('LOW_SATURATION');
    expect(result.reasonCodes).toContain('HIGH_CONFIDENCE');
  });

  // ==========================================
  // CENÁRIO 2: mROI baixo + saturação alta + confiança alta -> DECREASE
  // ==========================================
  it('Cenário 2: deve decidir DECREASE para mROI baixo + saturação alta + confiança alta', () => {
    const channel = createMockChannel({
      channelName: 'Saturated_Channel',
      marginalRoi: 0.7, // < 1.0 e < p25
      saturationLevel: 85, // > 80% (alta/crítica)
      confidence: 'Alta',
      mroiCiWidth: 0.3
    });

    const result = evaluateChannelDecisionTree(channel, mockBenchmarks);
    expect(result.decision).toBe('DECREASE');
    expect(result.reasonCodes).toContain('LOW_MARGINAL_ROI');
    expect(result.reasonCodes).toContain('HIGH_SATURATION');
  });

  // ==========================================
  // CENÁRIO 3: mROI alto + saturação alta -> conflito resolvido com MAINTAIN ou TEST
  // ==========================================
  it('Cenário 3: deve decidir MAINTAIN para mROI alto com saturação alta (conflito resolvido sem aumentar)', () => {
    const channel = createMockChannel({
      channelName: 'HighMroi_HighSat',
      marginalRoi: 3.6, // alto
      saturationLevel: 75, // alto (>= 60%)
      confidence: 'Alta'
    });

    const result = evaluateChannelDecisionTree(channel, mockBenchmarks);
    expect(['MAINTAIN', 'TEST']).toContain(result.decision);
    expect(result.decision).not.toBe('INCREASE'); // Não deve recomendar aumento em saturação alta!
    expect(result.reasonCodes).toContain('HIGH_SATURATION');
  });

  // ==========================================
  // CENÁRIO 4: mROI baixo + saturação baixa -> TEST ou INVESTIGATE
  // ==========================================
  it('Cenário 4: deve decidir TEST ou INVESTIGATE para mROI baixo com saturação baixa', () => {
    const channel = createMockChannel({
      channelName: 'LowMroi_LowSat',
      marginalRoi: 0.8, // baixo
      saturationLevel: 20, // baixa
      trendPct: -0.02,
      confidence: 'Média'
    });

    const result = evaluateChannelDecisionTree(channel, mockBenchmarks);
    expect(['TEST', 'INVESTIGATE']).toContain(result.decision);
  });

  // ==========================================
  // CENÁRIO 5: Alta Incerteza -> INVESTIGATE
  // ==========================================
  it('Cenário 5: deve decidir INVESTIGATE quando houver alta incerteza no intervalo de credibilidade', () => {
    const channel = createMockChannel({
      channelName: 'Uncertain_Channel',
      marginalRoi: 3.5,
      saturationLevel: 25,
      confidence: 'Baixa',
      mroiCiWidth: 2.0 // > 1.6 threshold de alta incerteza
    });

    const result = evaluateChannelDecisionTree(channel, mockBenchmarks);
    // Com alta incerteza e baixa confiança, não pode aumentar cegamente
    expect(['INVESTIGATE', 'TEST']).toContain(result.decision);
    expect(result.reasonCodes).toContain('HIGH_UNCERTAINTY');
  });

  // ==========================================
  // CENÁRIO 6: Dados Insuficientes / MCMC não convergido -> INVESTIGATE
  // ==========================================
  it('Cenário 6: deve decidir INVESTIGATE quando os dados forem insuficientes ou modelo não convergiu', () => {
    const channel = createMockChannel({
      spend: 200 // < 500 threshold
    });

    const result = evaluateChannelDecisionTree(channel, mockBenchmarks);
    expect(result.decision).toBe('INVESTIGATE');
    expect(result.reasonCodes).toContain('INSUFFICIENT_DATA');
  });

  // ==========================================
  // CENÁRIO 7: Realocação entre Canal A (mROI alto) e Canal B (mROI baixo)
  // ==========================================
  it('Cenário 7: deve identificar par de realocação Canal A (alvo) vs Canal B (origem)', () => {
    const channelA = createMockChannel({
      channelName: 'Google_Search',
      marginalRoi: 4.2,
      saturationLevel: 25
    });

    const channelB = createMockChannel({
      channelName: 'Traditional_TV',
      marginalRoi: 0.8,
      saturationLevel: 82
    });

    const pairs = identifyReallocationOpportunities([channelA, channelB], mockBenchmarks);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0].sourceChannel).toBe('Traditional_TV');
    expect(pairs[0].targetChannel).toBe('Google_Search');
    expect(pairs[0].efficiencySpread).toBeGreaterThan(2.0);
  });

  // ==========================================
  // CONSULTOR DETERMINÍSTICO DE Q&A
  // ==========================================
  it('Consultor Q&A: deve responder deterministicamente sobre R$ 10.000 adicionais sem alucinação', () => {
    const mockResults: MeridianModelResults = {
      modelId: 'test-model-1',
      createdAt: '2026-08-30',
      status: 'completed',
      totalSpend: 300000,
      totalKpi: 1200000,
      blendedRoi: 3.5,
      blendedRoas: 3.5,
      mostEfficientChannel: 'Google Search',
      saturatedChannel: 'Traditional TV',
      bestOpportunityChannel: 'Google Search',
      correlationMatrix: {
        channels: ['Google Search', 'Traditional TV'],
        matrix: [[1, 0.2], [0.2, 1]]
      },
      channels: [
        {
          channelName: 'Google Search',
          spend: 100000,
          spendShare: 33.3,
          incrementalKpi: 450000,
          kpiShare: 37.5,
          roi: 4.5,
          roiInterval: { ci025: 3.8, ci050: 4.5, ci975: 5.2 },
          marginalRoi: 3.8,
          marginalRoiInterval: { ci025: 3.0, ci050: 3.8, ci975: 4.6 },
          saturationLevel: 30,
          slope: 1.5,
          saturationStatus: 'Ótimo',
          adstockDecay: 0.2,
          adstockHalfLifeWeeks: 1.0,
          halfSaturationSpend: 150000,
          confidence: 'Alta'
        },
        {
          channelName: 'Traditional TV',
          spend: 120000,
          spendShare: 40.0,
          incrementalKpi: 240000,
          kpiShare: 20.0,
          roi: 2.0,
          roiInterval: { ci025: 1.5, ci050: 2.0, ci975: 2.5 },
          marginalRoi: 0.7,
          marginalRoiInterval: { ci025: 0.4, ci050: 0.7, ci975: 1.0 },
          saturationLevel: 85,
          slope: 0.8,
          saturationStatus: 'Saturado',
          adstockDecay: 0.5,
          adstockHalfLifeWeeks: 2.5,
          halfSaturationSpend: 80000,
          confidence: 'Alta'
        }
      ],
      responseCurves: {},
      diagnostics: {
        rSquared: 0.88,
        mape: 6.2,
        rmse: 15000,
        bayesianR2: 0.86,
        gelmanRubinRhat: 1.01,
        effectiveSampleSize: 3200,
        isConverged: true,
        baselineContribution: 500000,
        mediaContribution: 690000,
        controlsContribution: 10000,
        totalObservedKpi: 1200000,
        totalPredictedKpi: 1200000,
        baselineShare: 45,
        mediaShare: 40,
        controlsShare: 15,
        warnings: [],
        timeSeriesFit: []
      }
    };

    const answerExtra = answerStrategicQuestion('Se eu tenho mais R$ 10.000 para investir, onde devo colocar e por quê?', mockResults);
    expect(answerExtra).toContain('Google Search');
    expect(answerExtra).toContain('3.80x');

    const answerCut = answerStrategicQuestion('Qual canal devo cortar primeiro?', mockResults);
    expect(answerCut).toContain('Traditional TV');
    expect(answerCut).toContain('85%');
  });
});
