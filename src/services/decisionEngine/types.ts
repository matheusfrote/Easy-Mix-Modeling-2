import { CredibleInterval } from '../../types/mmm';

export type DecisionAction =
  | 'INCREASE'
  | 'DECREASE'
  | 'MAINTAIN'
  | 'TEST'
  | 'INVESTIGATE'
  | 'REALLOCATE'
  | 'NO_CONCLUSION'
  | 'BLOCKED';

export type DecisionPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type InsightCategory =
  | 'OPPORTUNITY'
  | 'PERFORMANCE'
  | 'WARNING'
  | 'RISK'
  | 'RECOMMENDATION'
  | 'REALLOCATION'
  | 'INVESTIGATION';

export type ReasonCode =
  // Marginal ROI
  | 'HIGH_MARGINAL_ROI'
  | 'LOW_MARGINAL_ROI'
  | 'MODERATE_MARGINAL_ROI'
  // Saturation
  | 'LOW_SATURATION'
  | 'MODERATE_SATURATION'
  | 'HIGH_SATURATION'
  | 'CRITICAL_SATURATION'
  // Contribution & Spend
  | 'HIGH_CONTRIBUTION'
  | 'LOW_CONTRIBUTION'
  | 'MODERATE_CONTRIBUTION'
  | 'HIGH_SPEND_SHARE'
  | 'LOW_SPEND_SHARE'
  // Confidence & Uncertainty
  | 'HIGH_CONFIDENCE'
  | 'MEDIUM_CONFIDENCE'
  | 'LOW_CONFIDENCE'
  | 'HIGH_UNCERTAINTY'
  | 'WIDE_CREDIBLE_INTERVAL'
  | 'INSUFFICIENT_DATA'
  | 'MCMC_CONVERGED'
  | 'MCMC_NON_CONVERGED'
  // Trend
  | 'POSITIVE_TREND'
  | 'NEGATIVE_TREND'
  | 'STABLE_TREND'
  // Efficiency
  | 'HIGH_EFFICIENCY'
  | 'DECLINING_EFFICIENCY'
  | 'LOW_EFFICIENCY'
  // Investment state
  | 'UNDERINVESTED'
  | 'OVERINVESTED'
  | 'OPTIMAL_INVESTMENT'
  // Portfolio
  | 'REALLOCATION_OPPORTUNITY'
  | 'HIGH_CONCENTRATION_RISK';

export interface MetricDistribution {
  min: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
  std: number;
}

export interface PortfolioBenchmarks {
  marginalRoi: MetricDistribution;
  roi: MetricDistribution;
  saturation: MetricDistribution;
  contribution: MetricDistribution;
  spend: MetricDistribution;
  totalSpend: number;
  totalKpi: number;
  blendedRoi: number;
  mediaShare: number;
  baselineShare: number;
  controlsShare: number;
  channelCount: number;
}

export interface ChannelFeatures {
  channelName: string;
  spend: number;
  spendShare: number;
  kpi: number;
  kpiShare: number;
  roi: number;
  roiInterval: CredibleInterval;
  marginalRoi: number;
  marginalRoiInterval: CredibleInterval;
  saturationLevel: number;
  adstockDecay: number;
  adstockHalfLifeWeeks: number;
  halfSaturationSpend: number;
  confidence: 'Alta' | 'Média' | 'Baixa';
  confidenceScore: number; // 0 - 1
  roiCiWidth: number; // (ci975 - ci025) / roi
  mroiCiWidth: number; // (ci975 - ci025) / marginalRoi
  trendPct: number; // recent slope percentage
  isUnderinvested: boolean;
  isOverinvested: boolean;
  // Normalized features (0 - 100)
  mroiScore: number;
  roiScore: number;
  saturationScore: number;
  contributionScore: number;
  efficiencyScore: number;
  opportunityScore: number;
  riskScore: number;
  trendScore: number;
}

export interface ReallocationPair {
  sourceChannel: string;
  targetChannel: string;
  sourceMarginalRoi: number;
  targetMarginalRoi: number;
  sourceSaturation: number;
  targetSaturation: number;
  efficiencySpread: number;
  suggestedDeltaSpend?: number;
  rationale: string;
}

export interface AuditTrail {
  ruleTriggered: string;
  metricsUsed: {
    roi?: number;
    marginalRoi?: number;
    saturation?: number;
    contribution?: number;
    spend?: number;
    trend?: number;
    confidence?: string;
    ciWidth?: number;
  };
  benchmarksUsed: {
    mroiP75?: number;
    mroiP25?: number;
    satP75?: number;
    satP25?: number;
    blendedRoi?: number;
  };
  scoreBreakdown: {
    marginalRoiComponent: number;
    opportunityComponent: number;
    contributionComponent: number;
    roiComponent: number;
    confidenceComponent: number;
    trendComponent: number;
    totalScore: number;
  };
  confidenceAssessment: string;
}

export interface DecisionResult {
  entity: string; // Channel name or 'Portfolio'
  category: InsightCategory;
  decision: DecisionAction;
  score: number; // 0 - 100
  priority: DecisionPriority;
  confidence: 'Alta' | 'Média' | 'Baixa';
  reasonCodes: ReasonCode[];
  metrics: {
    roi?: number;
    marginalRoi?: number;
    saturation?: number;
    contribution?: number;
    spend?: number;
    trend?: number;
  };
  recommendation: {
    action: string;
    suggestedChangePct?: number;
    suggestedDeltaSpend?: number;
    targetChannel?: string;
    sourceChannel?: string;
  };
  explanation: {
    whatIsHappening: string; // O que está acontecendo?
    whyItMatters: string;    // Por que isso importa?
    whatToDo: string;        // O que fazer?
  };
  auditTrail: AuditTrail;
}

export interface FormattedInsightCardItem {
  id: string;
  type: 'opportunity' | 'saturation' | 'efficiency' | 'risk';
  category: string;
  title: string;
  summary: string;
  detail: string;
  finding: string;
  impact?: string;
  actionText: string;
  actionableStep: string;
  channel?: string;
  metric?: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceLabel: 'Alta' | 'Média' | 'Baixa';
  status: 'success' | 'warning' | 'info';
  score: number;
  priority: DecisionPriority;
  decision: DecisionAction;
  reasonCodes: ReasonCode[];
  evidence: {
    metric: string;
    value: string;
    channel?: string;
    period?: string;
    explanation?: string;
  };
}
