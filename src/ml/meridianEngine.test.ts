import { describe, it, expect } from 'vitest';
import {
  calculateSteadyStateFactor,
  calculateHalfLifeWeeks,
  geometricAdstock,
  weibullAdstockPdf,
  weibullAdstockCdf,
  hillFunction,
  hillDerivative,
  steadyStateHillResponse,
  steadyStateMarginalRoi,
  fitMeridianModel,
  optimizeBudget,
  simulateScenario
} from './meridianEngine';
import { MeridianModelConfig } from '../types/mmm';
import { DataRow } from '../services/dataValidator';
import { generateSyntheticDataset } from './syntheticData';

describe('Google Meridian Engine - Mathematical Core', () => {
  describe('1. Steady-State & Half-Life Factors', () => {
    it('calculates steady-state carryover multiplier correctly as 1 / (1 - alpha)', () => {
      // With no carryover (alpha = 0), multiplier is exactly 1
      expect(calculateSteadyStateFactor(0)).toBe(1.0);

      // Standard adstock decay rates
      expect(calculateSteadyStateFactor(0.5)).toBeCloseTo(2.0, 5); // 1 / (1 - 0.5) = 2.0
      expect(calculateSteadyStateFactor(0.75)).toBeCloseTo(4.0, 5); // 1 / (1 - 0.75) = 4.0
      expect(calculateSteadyStateFactor(0.8)).toBeCloseTo(5.0, 5);  // 1 / (1 - 0.8) = 5.0
      expect(calculateSteadyStateFactor(0.9)).toBeCloseTo(10.0, 5); // 1 / (1 - 0.9) = 10.0

      // Edge cases
      expect(calculateSteadyStateFactor(-0.2)).toBe(1.0);
      expect(calculateSteadyStateFactor(1.0)).toBe(100); // capped safely
    });

    it('calculates adstock half-life in weeks as -ln(2) / ln(alpha)', () => {
      // If retention is 0.5, half-life is exactly 1.0 week (0.5^1 = 0.5)
      expect(calculateHalfLifeWeeks(0.5)).toBeCloseTo(1.0, 5);

      // If retention is 0.25, half-life is 0.5 weeks (0.25^0.5 = 0.5)
      expect(calculateHalfLifeWeeks(0.25)).toBeCloseTo(0.5, 5);

      // If retention is sqrt(0.5) approx 0.70710678, half-life is 2.0 weeks
      expect(calculateHalfLifeWeeks(Math.SQRT1_2)).toBeCloseTo(2.0, 5);

      // High retention (TV / Branding with alpha = 0.85) -> half-life approx 4.26 weeks
      const expectedTvHalfLife = -Math.log(2) / Math.log(0.85);
      expect(calculateHalfLifeWeeks(0.85)).toBeCloseTo(expectedTvHalfLife, 4);

      // Invalid / boundary alpha values
      expect(calculateHalfLifeWeeks(0)).toBe(0);
      expect(calculateHalfLifeWeeks(-0.5)).toBe(0);
      expect(calculateHalfLifeWeeks(1.0)).toBe(0);
    });
  });

  describe('2. Geometric Adstock Transformation', () => {
    it('applies geometric decay recursive formula a_t = x_t + alpha * a_{t-1}', () => {
      const impulse = [100, 0, 0, 0, 0];
      const alpha = 0.5;
      const adstocked = geometricAdstock(impulse, alpha, false);

      expect(adstocked[0]).toBeCloseTo(100, 5);
      expect(adstocked[1]).toBeCloseTo(50, 5);
      expect(adstocked[2]).toBeCloseTo(25, 5);
      expect(adstocked[3]).toBeCloseTo(12.5, 5);
      expect(adstocked[4]).toBeCloseTo(6.25, 5);
    });

    it('converges to theoretical steady-state under constant spend', () => {
      const constantSpend = Array(50).fill(100);
      const alpha = 0.6;
      const expectedSteadyState = 100 / (1 - alpha); // 100 / 0.4 = 250

      const adstocked = geometricAdstock(constantSpend, alpha, false);
      const finalValue = adstocked[adstocked.length - 1];

      // After 50 periods with alpha=0.6, should converge to 250 within 0.001
      expect(finalValue).toBeCloseTo(expectedSteadyState, 2);
    });

    it('normalized geometric adstock preserves steady-state magnitude at unit scale', () => {
      const constantSpend = Array(40).fill(500);
      const alpha = 0.7;

      const normalizedAdstocked = geometricAdstock(constantSpend, alpha, true);
      const finalValue = normalizedAdstocked[normalizedAdstocked.length - 1];

      // Normalized by (1 - alpha), so long-run output equals input spend 500
      expect(finalValue).toBeCloseTo(500, 2);
    });

    it('returns original series when alpha is 0', () => {
      const spend = [100, 250, 0, 400, 150];
      const adstocked = geometricAdstock(spend, 0, false);

      expect(adstocked).toEqual(spend);
    });
  });

  describe('3. Weibull Adstock Transformation (PDF & CDF)', () => {
    it('weibullAdstockPdf normalizes weights and correctly shapes carryover delay', () => {
      const impulse = [1000, 0, 0, 0, 0, 0, 0, 0];
      // Shape k = 2.0 (Rayleigh-like with delayed peak), scale lambda = 3.0
      const adstocked = weibullAdstockPdf(impulse, 2.0, 3.0, 7);

      // Output length matches input
      expect(adstocked.length).toBe(impulse.length);

      // Energy conservation: sum of carryover over full lag window should equal total impulse
      const totalEnergy = adstocked.reduce((a, b) => a + b, 0);
      expect(totalEnergy).toBeCloseTo(1000, 0);

      // Delayed peak: with k=2, lambda=3, response at lag 1 or 2 is greater than or equal to lag 0
      expect(adstocked[1]).toBeGreaterThan(adstocked[0]);
    });

    it('weibullAdstockCdf produces strictly monotonic decay from impulse', () => {
      const impulse = [500, 0, 0, 0, 0, 0];
      // Shape k = 1.0 (Exponential decay), scale lambda = 2.0
      const adstocked = weibullAdstockCdf(impulse, 1.0, 2.0, 5);

      // Must be monotonically decreasing
      for (let i = 1; i < adstocked.length; i++) {
        expect(adstocked[i]).toBeLessThanOrEqual(adstocked[i - 1]);
      }

      // Energy conservation
      const totalEnergy = adstocked.reduce((a, b) => a + b, 0);
      expect(totalEnergy).toBeCloseTo(500, 0);
    });
  });

  describe('4. Hill Saturation Function', () => {
    const halfSat = 10000;
    const slope = 1.2;

    it('Hill function strictly satisfies S(0) = 0 and S(K) = 0.5', () => {
      // Zero spend gives zero response
      expect(hillFunction(0, halfSat, slope)).toBe(0);
      expect(hillFunction(-500, halfSat, slope)).toBe(0);

      // Spend equal to halfSaturation K gives exactly 0.5 (50% saturation)
      expect(hillFunction(halfSat, halfSat, slope)).toBeCloseTo(0.5, 6);
      expect(hillFunction(halfSat, halfSat, 0.8)).toBeCloseTo(0.5, 6);
      expect(hillFunction(halfSat, halfSat, 2.5)).toBeCloseTo(0.5, 6);
    });

    it('asymptotically approaches 1.0 as spend approaches infinity', () => {
      const veryHighSpend = halfSat * 10000;
      expect(hillFunction(veryHighSpend, halfSat, slope)).toBeGreaterThan(0.9999);
      expect(hillFunction(veryHighSpend, halfSat, slope)).toBeLessThanOrEqual(1.0);
    });

    it('is strictly monotonically increasing with respect to spend', () => {
      const spends = [100, 1000, 5000, 10000, 25000, 50000, 100000];
      for (let i = 1; i < spends.length; i++) {
        const prev = hillFunction(spends[i - 1], halfSat, slope);
        const curr = hillFunction(spends[i], halfSat, slope);
        expect(curr).toBeGreaterThan(prev);
      }
    });

    it('behaves differently under concave (slope <= 1) vs S-curve (slope > 1) regimes', () => {
      const halfSpend = halfSat * 0.5;

      // Concave regime (slope = 1.0): S(0.5K) = 0.5 / (0.5 + 1.0) = 1/3 = 0.33333
      expect(hillFunction(halfSpend, halfSat, 1.0)).toBeCloseTo(1 / 3, 5);

      // S-curve regime (slope = 2.0): S(0.5K) = 0.25 / (0.25 + 1.0) = 1/5 = 0.20000
      expect(hillFunction(halfSpend, halfSat, 2.0)).toBeCloseTo(0.2, 5);
    });
  });

  describe('5. Hill Marginal Derivative (dY/dx)', () => {
    const halfSat = 20000;
    const slope = 1.4;
    const beta = 50000;

    it('exact analytical derivative matches at halfSaturation point: (beta * S) / (4 * K)', () => {
      const analyticalAtK = hillDerivative(halfSat, halfSat, slope, beta);
      const expectedAtK = (beta * slope) / (4 * halfSat);

      expect(analyticalAtK).toBeCloseTo(expectedAtK, 5);
    });

    it('analytical derivative matches finite difference numerical approximation', () => {
      const testSpends = [5000, 15000, 20000, 40000, 80000];
      const eps = 0.1; // Small delta step

      for (const spend of testSpends) {
        const analytical = hillDerivative(spend, halfSat, slope, beta);

        // Central difference approximation: (f(x + eps) - f(x - eps)) / (2 * eps)
        const yPlus = beta * hillFunction(spend + eps, halfSat, slope);
        const yMinus = beta * hillFunction(spend - eps, halfSat, slope);
        const numerical = (yPlus - yMinus) / (2 * eps);

        expect(analytical).toBeCloseTo(numerical, 2);
      }
    });

    it('returns 0 for non-positive spend or halfSaturation', () => {
      expect(hillDerivative(0, halfSat, slope, beta)).toBe(0);
      expect(hillDerivative(-100, halfSat, slope, beta)).toBe(0);
      expect(hillDerivative(1000, 0, slope, beta)).toBe(0);
    });
  });

  describe('6. Steady-State Hill Response & Marginal ROI', () => {
    const halfSat = 30000;
    const slope = 1.1;
    const alpha = 0.6; // Carryover steady factor = 1 / (1 - 0.6) = 2.5
    const beta = 80000;
    const weeklySpend = 12000; // Effective steady spend = 12000 * 2.5 = 30000 (= halfSat!)

    it('calculates steady-state response incorporating effective carryover spend', () => {
      const response = steadyStateHillResponse(weeklySpend, halfSat, slope, alpha, beta);

      // Since effective spend equals halfSat, saturation is exactly 0.5, response is beta * 0.5
      expect(response).toBeCloseTo(beta * 0.5, 4);
    });

    it('steadyStateMarginalRoi scales by steady-state factor (1 / (1 - alpha)) via chain rule', () => {
      const steadyMroi = steadyStateMarginalRoi(weeklySpend, halfSat, slope, alpha, beta);

      // Numerical check: change weekly spend by delta, compute change in steady-state response
      const deltaWeekly = 1.0;
      const r1 = steadyStateHillResponse(weeklySpend, halfSat, slope, alpha, beta);
      const r2 = steadyStateHillResponse(weeklySpend + deltaWeekly, halfSat, slope, alpha, beta);
      const numericalMroi = (r2 - r1) / deltaWeekly;

      expect(steadyMroi).toBeCloseTo(numericalMroi, 2);
    });
  });

  describe('7. End-to-End Meridian Engine Fitting & Consistency', () => {
    // Generate realistic 104-week synthetic MMM dataset
    const synthetic = generateSyntheticDataset(42);
    const mockData = synthetic.rows as unknown as DataRow[];
    const T = mockData.length;

    const config: MeridianModelConfig = {
      kpiColumn: 'revenue',
      dateColumn: 'date',
      mediaChannels: [
        { channelName: 'Google Ads', spendColumn: 'google_ads_spend', channelType: 'search' },
        { channelName: 'Meta Ads', spendColumn: 'meta_ads_spend', channelType: 'social' },
        { channelName: 'YouTube Ads', spendColumn: 'youtube_spend', channelType: 'video' },
        { channelName: 'TikTok Ads', spendColumn: 'tiktok_spend', channelType: 'social' },
        { channelName: 'TV Commercial', spendColumn: 'tv_spend', channelType: 'tv' }
      ],
      controlColumns: ['holiday', 'promotion', 'economic_index'],
      seasonalityFourierTerms: 2,
      mcmcChains: 4,
      mcmcDraws: 1000,
      mcmcWarmup: 500,
      targetKpiType: 'revenue',
      priors: {
        'Google Ads': {
          roiPriorMean: 3.2,
          roiPriorStd: 0.6,
          adstockAlphaMean: 0.20,
          adstockAlphaStd: 0.08,
          halfSaturationMean: 12000,
          slopeMean: 1.2
        },
        'Meta Ads': {
          roiPriorMean: 2.8,
          roiPriorStd: 0.5,
          adstockAlphaMean: 0.35,
          adstockAlphaStd: 0.10,
          halfSaturationMean: 18000,
          slopeMean: 1.1
        },
        'YouTube Ads': {
          roiPriorMean: 1.9,
          roiPriorStd: 0.4,
          adstockAlphaMean: 0.60,
          adstockAlphaStd: 0.12,
          halfSaturationMean: 15000,
          slopeMean: 1.3
        },
        'TikTok Ads': {
          roiPriorMean: 2.4,
          roiPriorStd: 0.5,
          adstockAlphaMean: 0.25,
          adstockAlphaStd: 0.08,
          halfSaturationMean: 8000,
          slopeMean: 1.1
        },
        'TV Commercial': {
          roiPriorMean: 1.5,
          roiPriorStd: 0.3,
          adstockAlphaMean: 0.75,
          adstockAlphaStd: 0.15,
          halfSaturationMean: 40000,
          slopeMean: 1.4
        }
      }
    };

    it('fits model and satisfies exact time-series decomposition: predicted = baseline + controls + media', () => {
      const results = fitMeridianModel(mockData, config, true);

      expect(results.status).toBe('completed');
      expect(results.channels.length).toBe(5);
      expect(results.diagnostics.timeSeriesFit.length).toBe(T);

      // Verify mathematical decomposition at every time step
      for (const pt of results.diagnostics.timeSeriesFit) {
        const componentSum = pt.baseline + pt.controls + pt.media;
        expect(pt.predicted).toBe(componentSum);
      }

      // Verify aggregate summary contributions match total predicted
      const { baselineContribution, controlsContribution, mediaContribution, totalPredictedKpi } = results.diagnostics;
      expect(totalPredictedKpi).toBe(baselineContribution + controlsContribution + mediaContribution);

      // Verify statistical bounds
      expect(results.diagnostics.rSquared).toBeGreaterThan(0.7);
      expect(results.diagnostics.rSquared).toBeLessThanOrEqual(1.0);
      expect(results.diagnostics.mape).toBeGreaterThanOrEqual(0);
      expect(results.diagnostics.mape).toBeLessThan(20);
      expect(results.diagnostics.gelmanRubinRhat).toBeLessThan(1.05); // converged MCMC
      expect(results.diagnostics.isConverged).toBe(true);
    });

    it('generates well-formed response curves and calibrated credible intervals', () => {
      const results = fitMeridianModel(mockData, config, true);

      for (const ch of results.channels) {
        const curve = results.responseCurves[ch.channelName];
        expect(curve).toBeDefined();
        expect(curve.points.length).toBe(101);

        // Monotonicity of response curve
        for (let i = 1; i < curve.points.length; i++) {
          expect(curve.points[i].incrementalKpi).toBeGreaterThanOrEqual(curve.points[i - 1].incrementalKpi);
          expect(curve.points[i].spend).toBeGreaterThan(curve.points[i - 1].spend);
        }

        // Credible intervals are well-ordered: ci025 <= ci050 <= ci975
        expect(ch.roiInterval.ci025).toBeLessThanOrEqual(ch.roiInterval.ci050);
        expect(ch.roiInterval.ci050).toBeLessThanOrEqual(ch.roiInterval.ci975);
        expect(ch.marginalRoiInterval.ci025).toBeLessThanOrEqual(ch.marginalRoiInterval.ci050);
        expect(ch.marginalRoiInterval.ci050).toBeLessThanOrEqual(ch.marginalRoiInterval.ci975);
      }
    });

    it('optimizes budget and adheres to constraints while increasing total revenue', () => {
      const results = fitMeridianModel(mockData, config, true);
      const currentBudget = results.totalSpend;

      const opt = optimizeBudget(results, currentBudget);

      expect(opt.targetTotalBudget).toBe(currentBudget);
      expect(opt.reallocations.length).toBe(5);

      // Total recommended spend should match target budget
      const sumRecommended = opt.reallocations.reduce((sum, r) => sum + r.recommendedSpend, 0);
      expect(Math.abs(sumRecommended - currentBudget)).toBeLessThanOrEqual(5); // integer rounding tolerance

      // Optimization should find equal or greater expected KPI for the same total budget
      expect(opt.expectedOptimizedKpi).toBeGreaterThanOrEqual(opt.expectedCurrentKpi - 1);
    });

    it('simulates custom what-if scenario accurately', () => {
      const results = fitMeridianModel(mockData, config, true);

      // Zero spend scenario -> incremental media KPI is 0
      const zeroSpends: Record<string, number> = {};
      for (const ch of results.channels) {
        zeroSpends[ch.channelName] = 0;
      }
      const zeroSpend = simulateScenario(results, zeroSpends);

      expect(zeroSpend.totalSpend).toBe(0);
      expect(zeroSpend.incrementalKpi).toBe(0);
      const baselineAndControls = results.diagnostics.baselineContribution + results.diagnostics.controlsContribution;
      expect(zeroSpend.expectedKpi).toBe(baselineAndControls);

      // Double spend scenario
      const doubleSpends: Record<string, number> = {};
      for (const ch of results.channels) {
        doubleSpends[ch.channelName] = ch.spend * 2;
      }
      const doubleSpend = simulateScenario(results, doubleSpends);

      expect(doubleSpend.totalSpend).toBe(results.totalSpend * 2);
      expect(doubleSpend.incrementalKpi).toBeGreaterThan(results.diagnostics.mediaContribution);
    });

    it('enforces min/max spend bounds in constrained budget optimization', () => {
      const results = fitMeridianModel(mockData, config, true);
      const targetBudget = results.totalSpend * 1.2; // +20% total budget

      const customConstraints = {
        'Google Ads': { minSpend: 150000, maxSpend: 300000 },
        'Meta Ads': { minSpend: 100000, maxSpend: 250000 }
      };

      const opt = optimizeBudget(results, targetBudget, customConstraints);

      const googleRec = opt.reallocations.find(r => r.channelName === 'Google Ads')!;
      const metaRec = opt.reallocations.find(r => r.channelName === 'Meta Ads')!;

      expect(googleRec.recommendedSpend).toBeGreaterThanOrEqual(customConstraints['Google Ads'].minSpend);
      expect(googleRec.recommendedSpend).toBeLessThanOrEqual(customConstraints['Google Ads'].maxSpend);
      expect(metaRec.recommendedSpend).toBeGreaterThanOrEqual(customConstraints['Meta Ads'].minSpend);
      expect(metaRec.recommendedSpend).toBeLessThanOrEqual(customConstraints['Meta Ads'].maxSpend);
    });

    it('computes symmetric channel correlation matrix with diagonal values of 1.0', () => {
      const results = fitMeridianModel(mockData, config, true);
      const { channels, matrix } = results.correlationMatrix;

      expect(channels.length).toBe(5);
      expect(matrix.length).toBe(5);

      for (let i = 0; i < 5; i++) {
        expect(matrix[i][i]).toBe(1.0); // diagonal is self-correlation
        for (let j = 0; j < 5; j++) {
          expect(matrix[i][j]).toBe(matrix[j][i]); // symmetry
          expect(matrix[i][j]).toBeGreaterThanOrEqual(-1.0);
          expect(matrix[i][j]).toBeLessThanOrEqual(1.0);
        }
      }
    });
  });
});
