import { ChannelFeatures, DecisionPriority, DecisionAction, AuditTrail } from './types';
import { PRIORITY_THRESHOLDS } from './config';

export interface ScoringResult {
  score: number;
  priority: DecisionPriority;
  scoreBreakdown: AuditTrail['scoreBreakdown'];
}

/**
 * Calculates priority level based strictly on the decision and statistical boundaries.
 * No arbitrary numeric scores are generated to avoid "fake" heuristics.
 */
export function calculateRecommendationScore(
  features: ChannelFeatures,
  decision: DecisionAction
): ScoringResult {

  // Priority mapping strictly based on decision type and statistical confidence boundaries
  let priority: DecisionPriority = 'LOW';
  
  if (decision === 'BLOCKED') {
    priority = 'HIGH'; // Critical failure, needs immediate attention
  } else if (decision === 'INCREASE' && features.confidence === 'Alta') {
    priority = 'HIGH'; // High confidence opportunity
  } else if (decision === 'DECREASE' && features.saturationLevel > 80) {
    priority = 'HIGH'; // High risk of wasted spend
  } else if (decision === 'DECREASE' || decision === 'INCREASE' || decision === 'TEST') {
    priority = 'MEDIUM'; // Actionable but not as critical or less confident
  } else if (decision === 'INVESTIGATE') {
    priority = 'MEDIUM'; // Requires manual review
  } else {
    priority = 'LOW'; // Maintain or No Conclusion
  }

  // To maintain interface compatibility without using fake numeric scores, 
  // we return 0 for the score, meaning the UI shouldn't rely on a 0-100 arbitrary number.
  return {
    score: 0,
    priority,
    scoreBreakdown: {
      marginalRoiComponent: 0,
      opportunityComponent: 0,
      contributionComponent: 0,
      roiComponent: 0,
      confidenceComponent: 0,
      trendComponent: 0,
      totalScore: 0
    }
  };
}
