/**
 * Centralized configuration for the Decision Engine.
 * All thresholds, scoring weights, and categorical boundaries are centralized here.
 */

export const DECISION_THRESHOLDS = {
  // Saturation percentage bands
  saturation: {
    low: 40,        // < 40% -> low saturation (ample scaling headroom)
    moderate: 60,   // 40% - 60% -> moderate saturation
    high: 80,       // 60% - 80% -> elevated saturation (approaching plateau)
    critical: 85    // > 85% -> severe saturation
  },

  // Statistical confidence and credible interval width limits
  confidence: {
    high: 0.75,     // confidence score >= 0.75 -> High
    low: 0.45       // confidence score < 0.45 -> Low
  },

  // Uncertainty limit: ratio between (CI97.5 - CI2.5) and central estimate
  uncertainty: {
    highCiWidthRatio: 1.6, // wide credible interval relative to magnitude
    criticalCiWidthRatio: 2.2
  },

  // Trend slope threshold (% variation over recent cycles)
  trend: {
    positive: 0.05, // > +5%
    negative: -0.05 // < -5%
  },

  // Data sufficiency criteria
  dataSufficiency: {
    minWeeks: 12,
    minSpend: 500,
    maxRhat: 1.10,
    minEss: 200
  },

  // Portfolio concentration risk
  concentration: {
    highSpendShare: 45, // if 1 channel has > 45% of total media spend
    highMediaShare: 55  // if 1 channel generates > 55% of all media sales
  }
};

/**
 * Weights for the multi-criteria Recommendation Score (0 - 100).
 * Sum = 1.0 (100%)
 */
export const RECOMMENDATION_WEIGHTS = {
  marginalROI: 0.30,  // 30% Marginal ROI (mROI)
  opportunity: 0.20,  // 20% Headroom / Distance from saturation
  contribution: 0.15, // 15% Share of contribution & revenue scale
  roi: 0.15,          // 15% Historical average ROI
  confidence: 0.10,   // 10% Bayesian statistical confidence
  trend: 0.10         // 10% Recent performance trajectory
};

/**
 * Thresholds to map recommendation score to priority tiers
 */
export const PRIORITY_THRESHOLDS = {
  critical: 88,
  high: 72,
  medium: 50
};
