import { ChannelFeatures, DecisionPriority, DecisionAction, AuditTrail } from './types';
import { RECOMMENDATION_WEIGHTS, PRIORITY_THRESHOLDS } from './config';

export interface ScoringResult {
  score: number;
  priority: DecisionPriority;
  scoreBreakdown: AuditTrail['scoreBreakdown'];
}

/**
 * Calculates a multi-criteria decision score (0 - 100) and priority level
 */
export function calculateRecommendationScore(
  features: ChannelFeatures,
  decision: DecisionAction
): ScoringResult {
  // Component 1: Marginal ROI (0 - 100)
  const mroiComp = features.mroiScore * RECOMMENDATION_WEIGHTS.marginalROI;

  // Component 2: Opportunity / Saturation Headroom (0 - 100)
  const oppComp = features.opportunityScore * RECOMMENDATION_WEIGHTS.opportunity;

  // Component 3: Contribution / Share Scale (0 - 100)
  const contComp = features.contributionScore * RECOMMENDATION_WEIGHTS.contribution;

  // Component 4: Historical Average ROI (0 - 100)
  const roiComp = features.roiScore * RECOMMENDATION_WEIGHTS.roi;

  // Component 5: Statistical Confidence (0 - 100)
  const confComp = (features.confidenceScore * 100) * RECOMMENDATION_WEIGHTS.confidence;

  // Component 6: Trend Trajectory (0 - 100)
  const trendComp = features.trendScore * RECOMMENDATION_WEIGHTS.trend;

  let rawScore = mroiComp + oppComp + contComp + roiComp + confComp + trendComp;

  // Decision-specific calibration:
  // If decision is DECREASE because of severe saturation, score reflects urgency of reallocation
  if (decision === 'DECREASE') {
    const urgency = Math.min(100, features.saturationLevel * 0.6 + (Math.max(0, 100 - features.mroiScore) * 0.4));
    rawScore = Math.max(rawScore, urgency);
  } else if (decision === 'INVESTIGATE') {
    // Investigative decisions stay in moderate score band
    rawScore = Math.min(65, Math.max(30, rawScore * 0.7));
  }

  const finalScore = Math.round(Math.min(100, Math.max(0, rawScore)));

  // Priority mapping considering both score and confidence
  let priority: DecisionPriority = 'LOW';
  if (finalScore >= PRIORITY_THRESHOLDS.high && features.confidenceScore >= 0.60) {
    priority = 'HIGH';
  } else if (finalScore >= PRIORITY_THRESHOLDS.medium || (decision === 'DECREASE' && features.saturationLevel > 80)) {
    priority = 'MEDIUM';
  } else {
    priority = 'LOW';
  }

  return {
    score: finalScore,
    priority,
    scoreBreakdown: {
      marginalRoiComponent: Number(mroiComp.toFixed(1)),
      opportunityComponent: Number(oppComp.toFixed(1)),
      contributionComponent: Number(contComp.toFixed(1)),
      roiComponent: Number(roiComp.toFixed(1)),
      confidenceComponent: Number(confComp.toFixed(1)),
      trendComponent: Number(trendComp.toFixed(1)),
      totalScore: finalScore
    }
  };
}
