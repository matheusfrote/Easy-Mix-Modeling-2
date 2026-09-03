import { MeridianModelResults, BudgetOptimizationResult, BudgetReallocation, ScenarioDefinition } from '../types/mmm';

/**
 * Mathematically evaluates the Hill curve response for a given spend.
 * Formula: Response = max_incremental * (spend^S / (spend^S + K^S))
 */
export function evaluateHillCurve(
  spend: number,
  k: number,
  s: number,
  maxIncremental: number
): number {
  if (spend <= 0) return 0;
  const num = Math.pow(spend, s);
  const den = num + Math.pow(k, s);
  return maxIncremental * (num / den);
}

/**
 * Reconstructs the max_incremental value based on current spend, current KPI, and Hill parameters.
 */
function inferMaxIncremental(currentSpend: number, currentKpi: number, k: number, s: number): number {
  if (currentSpend <= 0 || currentKpi <= 0) return 0;
  const num = Math.pow(currentSpend, s);
  const den = num + Math.pow(k, s);
  const fraction = num / den;
  return fraction > 0 ? currentKpi / fraction : 0;
}

/**
 * Numerically calculates the marginal ROI (derivative of the Hill curve) at a given spend.
 */
export function calculateMarginalRoi(
  spend: number,
  k: number,
  s: number,
  maxIncremental: number,
  delta: number = 0.01 // $0.01 step for numerical derivative
): number {
  if (spend <= 0) return 0;
  const baseResponse = evaluateHillCurve(spend, k, s, maxIncremental);
  const upResponse = evaluateHillCurve(spend + delta, k, s, maxIncremental);
  return (upResponse - baseResponse) / delta;
}

/**
 * Mathematically rigorous Budget Optimizer using a Greedy Marginal ROI approach (Equimarginality Principle).
 * Allocates budget in small increments to the channel with the highest current marginal ROI.
 */
export function optimizeBudgetMathematical(
  model: MeridianModelResults,
  targetTotalBudget: number,
  constraints?: Record<string, { minSpend?: number; maxSpend?: number }>
): BudgetOptimizationResult {
  
  // 1. Reconstruct analytical curves for all channels
  const channels = model.channels.map(c => {
    const k = c.halfSaturationSpend;
    const s = c.slope;
    const maxInc = inferMaxIncremental(c.spend, c.incrementalKpi, k, s);
    
    return {
      name: c.channelName,
      k,
      s,
      maxInc,
      currentSpend: c.spend,
      currentKpi: c.incrementalKpi,
      minSpend: constraints?.[c.channelName]?.minSpend ?? (c.spend * 0.2), // Default -80% floor
      maxSpend: constraints?.[c.channelName]?.maxSpend ?? (c.spend * 3.0), // Default +200% ceiling
      optimizedSpend: 0,
      optimizedKpi: 0
    };
  });

  // 2. Initialize with minimum constraints
  let remainingBudget = targetTotalBudget;
  for (const ch of channels) {
    ch.optimizedSpend = ch.minSpend;
    remainingBudget -= ch.minSpend;
  }

  // 3. Greedy Allocation by mROI (Equimarginal Principle)
  // Step size varies dynamically to balance performance and precision
  let stepSize = Math.max(1, targetTotalBudget / 5000); 

  while (remainingBudget >= stepSize) {
    let bestChannel = null;
    let bestMroi = -Infinity;

    for (const ch of channels) {
      if (ch.optimizedSpend + stepSize <= ch.maxSpend) {
        const mroi = calculateMarginalRoi(ch.optimizedSpend, ch.k, ch.s, ch.maxInc, stepSize);
        if (mroi > bestMroi) {
          bestMroi = mroi;
          bestChannel = ch;
        }
      }
    }

    if (!bestChannel) {
      break; // All channels hit max constraints
    }

    bestChannel.optimizedSpend += stepSize;
    remainingBudget -= stepSize;
  }

  // Calculate final KPIs and build response
  let totalOptimizedMediaKpi = 0;
  let totalCurrentMediaKpi = 0;

  const reallocations: BudgetReallocation[] = channels.map(ch => {
    ch.optimizedKpi = evaluateHillCurve(ch.optimizedSpend, ch.k, ch.s, ch.maxInc);
    totalOptimizedMediaKpi += ch.optimizedKpi;
    totalCurrentMediaKpi += ch.currentKpi;

    const deltaSpend = ch.optimizedSpend - ch.currentSpend;
    
    let rationale = 'Manter investimento atual.';
    if (deltaSpend > targetTotalBudget * 0.05) rationale = 'Aumentar investimento devido ao alto retorno marginal projetado.';
    if (deltaSpend < -targetTotalBudget * 0.05) rationale = 'Reduzir investimento para evitar zona de retornos decrescentes severos.';

    return {
      channelName: ch.name,
      currentSpend: ch.currentSpend,
      currentSpendShare: ch.currentSpend / model.totalSpend,
      recommendedSpend: ch.optimizedSpend,
      recommendedSpendShare: ch.optimizedSpend / targetTotalBudget,
      deltaSpend: deltaSpend,
      percentageChange: ch.currentSpend > 0 ? (deltaSpend / ch.currentSpend) * 100 : 0,
      currentKpi: ch.currentKpi,
      projectedKpi: ch.optimizedKpi,
      deltaKpi: ch.optimizedKpi - ch.currentKpi,
      currentRoi: ch.currentSpend > 0 ? ch.currentKpi / ch.currentSpend : 0,
      projectedRoi: ch.optimizedSpend > 0 ? ch.optimizedKpi / ch.optimizedSpend : 0,
      marginalRoi: calculateMarginalRoi(ch.optimizedSpend, ch.k, ch.s, ch.maxInc),
      recommendationReason: rationale
    };
  });

  const baseKpi = model.totalKpi - totalCurrentMediaKpi; 
  const currentOverallKpi = baseKpi + totalCurrentMediaKpi;
  const optimizedOverallKpi = baseKpi + totalOptimizedMediaKpi;

  return {
    targetTotalBudget,
    currentTotalBudget: model.totalSpend,
    expectedOptimizedKpi: optimizedOverallKpi,
    expectedCurrentKpi: currentOverallKpi,
    totalIncrementalKpi: optimizedOverallKpi - currentOverallKpi,
    overallLiftPercentage: currentOverallKpi > 0 ? ((optimizedOverallKpi - currentOverallKpi) / currentOverallKpi) * 100 : 0,
    blendedCurrentRoi: model.totalSpend > 0 ? currentOverallKpi / model.totalSpend : 0,
    blendedProjectedRoi: targetTotalBudget > 0 ? optimizedOverallKpi / targetTotalBudget : 0,
    reallocations: reallocations.sort((a, b) => b.deltaSpend - a.deltaSpend),
    marginalEqualizationGraph: reallocations.map(r => ({
      channelName: r.channelName,
      currentMroi: calculateMarginalRoi(r.currentSpend, channels.find(c => c.name === r.channelName)!.k, channels.find(c => c.name === r.channelName)!.s, channels.find(c => c.name === r.channelName)!.maxInc),
      optimizedMroi: r.marginalRoi
    }))
  };
}

/**
 * Mathematically rigorous What-If Simulator.
 * Calculates exact expected KPI and mROI based on user-provided spend distribution.
 */
export function simulateScenarioMathematical(
  model: MeridianModelResults,
  channelSpends: Record<string, number>
): ScenarioDefinition {
  
  let totalSimulatedSpend = 0;
  let totalSimulatedMediaKpi = 0;
  let totalSimulatedMediaKpiLower = 0;
  let totalSimulatedMediaKpiUpper = 0;
  let totalCurrentMediaKpi = 0;

  const simulatedChannels = model.channels.map(c => {
    const k = c.halfSaturationSpend;
    const s = c.slope;
    const maxInc = inferMaxIncremental(c.spend, c.incrementalKpi, k, s);
    
    const simSpend = channelSpends[c.channelName] ?? c.spend;
    const simKpi = evaluateHillCurve(simSpend, k, s, maxInc);

    // Propagate Bayesian Credible Intervals from posterior distributions
    let channelKpiLower = simKpi;
    let channelKpiUpper = simKpi;

    if (c.roiInterval && typeof c.roiInterval.ci025 === 'number' && typeof c.roiInterval.ci975 === 'number' && c.roi > 0) {
      const lowerRatio = Math.max(0, c.roiInterval.ci025 / c.roi);
      const upperRatio = Math.max(lowerRatio, c.roiInterval.ci975 / c.roi);
      channelKpiLower = simKpi * lowerRatio;
      channelKpiUpper = simKpi * upperRatio;
    } else if (model.responseCurves?.[c.channelName]?.points?.length) {
      // Find closest curve points
      const points = model.responseCurves[c.channelName].points;
      const closest = points.reduce((prev, curr) => 
        Math.abs(curr.spend - simSpend) < Math.abs(prev.spend - simSpend) ? curr : prev
      , points[0]);
      if (closest && closest.incrementalKpi > 0) {
        channelKpiLower = simKpi * (closest.incrementalKpiLower / closest.incrementalKpi);
        channelKpiUpper = simKpi * (closest.incrementalKpiUpper / closest.incrementalKpi);
      }
    }
    
    totalSimulatedSpend += simSpend;
    totalSimulatedMediaKpi += simKpi;
    totalSimulatedMediaKpiLower += channelKpiLower;
    totalSimulatedMediaKpiUpper += channelKpiUpper;
    totalCurrentMediaKpi += c.incrementalKpi;

    return {
      channelName: c.channelName,
      simulatedSpend: simSpend,
      simulatedKpi: simKpi,
      simulatedRoi: simSpend > 0 ? simKpi / simSpend : 0,
      simulatedMarginalRoi: calculateMarginalRoi(simSpend, k, s, maxInc),
      deltaSpend: simSpend - c.spend,
      deltaKpi: simKpi - c.incrementalKpi
    };
  });

  const baseKpi = model.totalKpi - totalCurrentMediaKpi;
  const currentOverallKpi = baseKpi + totalCurrentMediaKpi;
  const simulatedOverallKpi = baseKpi + totalSimulatedMediaKpi;
  const expectedLower = baseKpi + totalSimulatedMediaKpiLower;
  const expectedUpper = baseKpi + totalSimulatedMediaKpiUpper;

  return {
    id: `sim_${Date.now()}`,
    name: 'Simulação Analítica Baseada em Meridian',
    description: 'Projeção derivada da Função de Resposta Hill com propagação de incerteza dos intervalos de credibilidade posteriores.',
    channelSpends: simulatedChannels.reduce((acc, ch) => {
      acc[ch.channelName] = ch.simulatedSpend;
      return acc;
    }, {} as Record<string, number>),
    totalSpend: totalSimulatedSpend,
    expectedKpi: simulatedOverallKpi,
    expectedKpiLower: Math.min(simulatedOverallKpi, expectedLower),
    expectedKpiUpper: Math.max(simulatedOverallKpi, expectedUpper),
    incrementalKpi: simulatedOverallKpi - currentOverallKpi,
    blendedRoi: totalSimulatedSpend > 0 ? simulatedOverallKpi / totalSimulatedSpend : 0,
    marginalRoi: totalSimulatedSpend > 0 ? (simulatedOverallKpi - currentOverallKpi) / (totalSimulatedSpend - model.totalSpend || 1) : 0,
    efficiencyRating: simulatedOverallKpi > currentOverallKpi ? 'Alta' : 'Média'
  };
}
