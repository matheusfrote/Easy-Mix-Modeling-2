export type ChannelType = 'search' | 'social' | 'video' | 'display' | 'tv' | 'digital' | 'other';

export type ColumnType = 'date' | 'kpi' | 'media_spend' | 'media_impressions' | 'media_clicks' | 'control' | 'ignore';

export interface ColumnMapping {
  columnName: string;
  mappedType: ColumnType;
  channelName?: string;
  channelCategory?: string;
  modelingClassification?: 'direct' | 'caution' | 'control';
  detectedMetricFamily?: string;
  description?: string;
  sampleValues?: (string | number)[];
}

export interface DatasetSummary {
  rowCount: number;
  columnCount: number;
  startDate: string;
  endDate: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  channels: string[];
  totalSpend: number;
  totalKpi: number;
}

export type AlertSeverity = 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';

export type ValidationCategory =
  | 'missing_data'
  | 'negative_values'
  | 'duplicates'
  | 'time_series'
  | 'channel_anomalies'
  | 'correlation'
  | 'statistics';

export interface ValidationAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: ValidationCategory;
  affectedColumns?: string[];
  affectedRowsCount?: number;
  econometricImpact: string; // Explica o impacto matemático no MMM
  recommendation: string;
  autoFixAvailable?: boolean;
}

export interface ValidationCheckResult {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  severity?: AlertSeverity;
  findingCount: number;
  affectedColumns: string[];
  details: string;
}

export interface TemporalDiagnosis {
  isChronological: boolean;
  duplicateDateCount: number;
  duplicateDateSamples: string[];
  exactDuplicateRowCount: number;
  detectedFrequency: 'weekly' | 'daily' | 'monthly' | 'irregular';
  averageStepDays: number;
  irregularStepCount: number;
  gapCount: number;
  gaps: { from: string; to: string; missingDays: number }[];
  totalObservations: number;
  startDate: string;
  endDate: string;
}

export interface ChannelAnomalyDetail {
  columnName: string;
  channelName: string;
  mean: number;
  std: number;
  coefficientOfVariation: number; // CV = std / mean (se < 0.05 => investimento constante)
  isConstantSpend: boolean;
  zeroCount: number;
  zeroPercentage: number;
  negativeCount: number;
  negativePercentage: number;
  nullCount: number;
  outlierCount: number;
  min: number;
  max: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface DataIntegritySummary {
  totalChecks: number;
  passedChecks: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  overallHealthScore: number; // 0 - 100
  isModelBlocked: boolean; // Só bloqueia em casos críticos reais (sem data, sem KPI, 0 canais, < 15 observações)
  blockingReason?: string;
  duplicateRowCount: number;
  duplicateDateCount: number;
  totalMissingCells: number;
  totalNegativeCells: number;
  constantSpendChannelsCount: number;
}

export interface ReadinessItem {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  weight: number;
  score: number;
  details: string;
}

export interface DataReadinessScore {
  score: number; // 0 - 100
  tier: 'Excelente' | 'Bom' | 'Limitado' | 'Insuficiente';
  items: ReadinessItem[];
  summary: string;
  isModelReady: boolean;
}

export interface MeridianPriorConfig {
  channelName?: string;
  roiPriorMean?: number;
  roiPriorStd?: number;
  adstockAlphaMean?: number; // 0.1 - 0.9
  adstockAlphaStd?: number;
  halfSaturationMean?: number;
  slopeMean?: number;
  mean?: number;
  std?: number;
}

export interface MeridianModelConfig {
  dateColumn: string;
  kpiColumn: string;
  mediaChannels: {
    spendColumn: string;
    impressionsColumn?: string;
    channelName: string;
    channelType: ChannelType;
  }[];
  controlColumns: string[];
  seasonalityFourierTerms: number; // e.g. 2
  mcmcChains: number;
  mcmcDraws: number;
  mcmcWarmup: number;
  targetKpiType: 'revenue' | 'conversions' | 'sales';
  priors: Record<string, MeridianPriorConfig>;
}

export interface CredibleInterval {
  ci025: number; // 2.5% quantile
  ci050: number; // Median (50%)
  ci975: number; // 97.5% quantile
}

export interface ChannelMetrics {
  channelName: string;
  spend: number;
  spendShare: number;
  incrementalKpi: number;
  kpiShare: number;
  roi: number;
  roiInterval: CredibleInterval;
  roas?: number;
  marginalRoi: number; // current mROI
  marginalRoiInterval: CredibleInterval;
  saturationLevel: number; // 0 - 100%
  adstockDecay: number; // estimated alpha (0-1)
  adstockHalfLifeWeeks: number;
  halfSaturationSpend: number; // spend where curve hits 50% max incremental
  slope: number;
  confidence: 'Alta' | 'Média' | 'Baixa';
  saturationStatus: 'Subinvestido' | 'Ótimo' | 'Próximo à Saturação' | 'Saturado';
}

export interface ResponseCurvePoint {
  spend: number;
  spendMultiplier: number; // 0.0 to 3.0x
  incrementalKpi: number;
  incrementalKpiLower: number;
  incrementalKpiUpper: number;
  marginalRoi: number;
  roi: number;
}

export interface ChannelResponseCurve {
  channelName: string;
  currentSpend: number;
  points: ResponseCurvePoint[];
}

export interface PosteriorDistribution {
  mean: number;
  std: number;
  median?: number;
  ci025: number;
  ci975: number;
  rHat?: number;
  essBulk?: number;
  essTail?: number;
}

export interface PosteriorMetrics {
  adstockDecay: Record<string, PosteriorDistribution | number>; // alpha parameter posterior per media channel
  halfSaturation: Record<string, PosteriorDistribution | number>; // gamma parameter posterior
  slope: Record<string, PosteriorDistribution | number>; // slope parameter posterior
  mediaCoefficients: Record<string, PosteriorDistribution | number>; // beta_m media contribution coefficients
  controlCoefficients?: Record<string, PosteriorDistribution | number>; // gamma_c control variable coefficients
  baselineIntercept?: PosteriorDistribution | number;
  errorVariance?: PosteriorDistribution | number;
  looCv?: number | 'N/A'; // PSIS-LOO Leave-One-Out Cross-Validation
  waic?: number | 'N/A'; // Widely Applicable Information Criterion
  priorsVsPosteriors?: Record<string, { priorMean: number; priorStd: number; posteriorMean: number; posteriorStd: number }>;
}

export interface MeridianDiagnostics {
  rSquared: number;
  mape: number; // Mean Absolute Percentage Error (%)
  rmse: number;
  bayesianR2: number | 'N/A';
  gelmanRubinRhat: number | 'N/A'; // Max Gelman-Rubin R-hat across parameters (< 1.05 is good)
  effectiveSampleSize: number | 'N/A'; // Min Effective Sample Size (> 400 is good)
  bulkEss?: number | 'N/A';
  tailEss?: number | 'N/A';
  looCv?: number | 'N/A';
  waic?: number | 'N/A';
  divergencesCount?: number | 'N/A';
  isConverged: boolean;
  warnings: string[];
  baselineContribution: number;
  baselineShare: number;
  controlsContribution: number;
  controlsShare: number;
  mediaContribution: number;
  mediaShare: number;
  totalObservedKpi: number;
  totalPredictedKpi: number;
  posteriorMetrics?: PosteriorMetrics;
  timeSeriesFit: {
    date: string;
    actual: number;
    predicted: number;
    predictedLower: number;
    predictedUpper: number;
    baseline: number;
    controls: number;
    media: number;
    spend?: number;
    channelSpends?: Record<string, number>;
  }[];
}

export type ModelDiagnostics = MeridianDiagnostics;

export interface MeridianModelResults {
  modelId: string;
  createdAt: string;
  status: 'completed' | 'failed' | 'running';
  errorMessage?: string;
  totalSpend: number;
  totalKpi: number;
  blendedRoi: number;
  blendedRoas: number;
  channels: ChannelMetrics[];
  responseCurves: Record<string, ChannelResponseCurve>;
  diagnostics: ModelDiagnostics;
  correlationMatrix: {
    channels: string[];
    matrix: number[][];
  };
  mostEfficientChannel: string;
  saturatedChannel: string;
  bestOpportunityChannel: string;
  actualVsPredicted?: {
    date: string;
    actual: number;
    predicted: number;
    upperCi: number;
    lowerCi: number;
  }[];
}

export interface BudgetReallocation {
  channelName: string;
  currentSpend: number;
  currentSpendShare: number;
  recommendedSpend: number;
  recommendedSpendShare: number;
  deltaSpend: number;
  percentageChange: number;
  deltaPercentage?: number;
  currentKpi: number;
  projectedKpi: number;
  deltaKpi: number;
  currentRoi: number;
  projectedRoi: number;
  marginalRoi: number;
  recommendationReason: string;
  safeThresholdPercentage?: number;
  minSafeSpend?: number;
  maxSafeSpend?: number;
  thresholdRiskLevel?: 'safe' | 'moderate' | 'high';
  exceedsThreshold?: boolean;
  uncertaintyMultiplier?: number;
}

export interface BudgetOptimizationResult {
  currentTotalBudget: number;
  targetTotalBudget: number;
  expectedCurrentKpi: number;
  expectedOptimizedKpi: number;
  totalIncrementalKpi: number;
  overallLiftPercentage: number;
  blendedCurrentRoi: number;
  blendedProjectedRoi: number;
  reallocations: BudgetReallocation[];
  marginalEqualizationGraph: {
    channelName: string;
    currentMroi: number;
    optimizedMroi: number;
  }[];
  explanation?: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  channelSpends: Record<string, number>;
  totalSpend: number;
  expectedKpi: number;
  expectedKpiLower: number;
  expectedKpiUpper: number;
  incrementalKpi: number;
  blendedRoi: number;
  marginalRoi: number;
  efficiencyRating: 'Alta' | 'Média' | 'Retorno Decrescente';
  liftOverBaseline?: number;
  liftPercentage?: string | number;
  projectedTotalKpi?: number;
  projectedRoi?: number;
}

export interface AIInsightItem {
  id: string;
  type: 'opportunity' | 'saturation' | 'efficiency' | 'risk';
  title: string;
  summary: string;
  detail: string;
  channel?: string;
  metric?: string;
  actionableStep: string;
  description?: string;
  impact?: string;
}

export interface ExecutiveReportData {
  title: string;
  companyName: string;
  generatedAt: string;
  summary: string;
  dataReadinessSummary: string;
  historicalSpendSummary: string;
  channelPerformanceSummary: string;
  budgetRecommendationSummary: string;
  scenariosSummary: string;
  risksAndLimitations: string[];
  methodologyNotes: string[];
}

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
  preset: 'all' | '3m' | '6m' | '12m' | 'year1' | 'year2' | 'custom';
}
