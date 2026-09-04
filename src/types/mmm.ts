export type ChannelType = 'search' | 'social' | 'video' | 'display' | 'tv' | 'digital' | 'other';

export type ColumnType =
  | 'date'
  | 'kpi'
  | 'media_spend'
  | 'media_impressions'
  | 'media_clicks'
  | 'media_reach'
  | 'media_frequency'
  | 'geo'
  | 'population'
  | 'revenue_per_kpi'
  | 'control'
  | 'ignore';

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
  seasonalityFourierTerms?: number; // legacy field; not sent by production UI
  mcmcChains: number;
  mcmcDraws: number;
  mcmcWarmup: number;
  targetKpiType: 'revenue' | 'conversions' | 'sales';
  priors: Record<string, MeridianPriorConfig>;
}

export interface CredibleInterval {
  ci025: number | null; // 2.5% quantile
  ci050: number | null; // Median (50%)
  ci975: number | null; // 97.5% quantile
}

export interface ChannelMetrics {
  channelName: string;
  spend: number | null;
  spendShare: number | null;
  exposure?: number | null;
  incrementalOutcome?: number | null;
  incrementalKpi: number | null;
  incrementalOutcomeInterval?: CredibleInterval;
  kpiShare: number | null;
  contribution?: number | null;
  contributionShare?: number | null;
  contributionInterval?: CredibleInterval;
  roi: number | null;
  roiInterval: CredibleInterval;
  roas?: number | null;
  marginalRoi: number | null; // current mROI
  marginalRoiInterval: CredibleInterval;
  effectiveness?: number | null;
  effectivenessInterval?: CredibleInterval;
  cpm?: number | null;
  costPerIncrementalKpi?: number | null;
  saturationLevel?: number | null; // posterior Hill value at median historical media units
  saturationInterval?: CredibleInterval;
  currentMediaUnits?: number | null;
  adstockDecay?: number | null; // posterior adstock function at lag 1
  adstockDecayInterval?: CredibleInterval;
  adstockHalfLifeWeeks?: number | null;
  halfSaturationSpend?: number | null;
  slope?: number | null;
  confidence?: 'Alta' | 'Média' | 'Baixa' | null;
  saturationStatus?: 'Subinvestido' | 'Ótimo' | 'Próximo à Saturação' | 'Saturado' | null;
}

export interface ResponseCurvePoint {
  spend: number | null;
  spendMultiplier: number; // 0.0 to 3.0x
  incrementalKpi: number | null;
  incrementalKpiLower: number | null;
  incrementalKpiUpper: number | null;
  marginalRoi: number | null;
  roi: number | null;
}

export interface ChannelResponseCurve {
  channelName: string;
  currentSpend: number | null;
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
  rSquared: number | null;
  mape: number | null; // Mean Absolute Percentage Error (%)
  wmape?: number | null;
  rmse?: number | null;
  bayesianR2?: number | null;
  gelmanRubinRhat: number | null;
  rhat?: number | null;
  effectiveSampleSize?: number | null;
  bulkEss?: number | 'N/A';
  tailEss?: number | 'N/A';
  looCv?: number | 'N/A';
  waic?: number | 'N/A';
  divergencesCount?: number | 'N/A';
  isConverged: boolean | null;
  warnings?: string[];
  baselineContribution?: number | null;
  baselineShare?: number | null;
  controlsContribution?: number | null;
  controlsShare?: number | null;
  mediaContribution?: number | null;
  mediaShare?: number | null;
  totalObservedKpi?: number | null;
  totalPredictedKpi?: number | null;
  predictiveAccuracy?: unknown;
  rhatSummary?: unknown;
  posteriorMetrics?: PosteriorMetrics;
  timeSeriesFit?: {
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
  blendedRoi: number | null;
  blendedRoas?: number | null;
  kpiType?: 'revenue' | 'non_revenue';
  channels: ChannelMetrics[];
  responseCurves: Record<string, ChannelResponseCurve>;
  diagnostics: ModelDiagnostics;
  correlationMatrix?: {
    channels: string[];
    matrix: number[][];
  };
  mostEfficientChannel: string | null;
  saturatedChannel: string | null;
  bestOpportunityChannel: string | null;
  dataLineage?: DataLineageEntry[];
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
  currentSpend: number | null;
  currentSpendShare: number | null;
  recommendedSpend: number | null;
  recommendedSpendShare: number | null;
  deltaSpend: number | null;
  percentageChange: number | null;
  deltaPercentage?: number | null;
  currentKpi: number | null;
  projectedKpi: number | null;
  deltaKpi: number | null;
  currentRoi: number | null;
  projectedRoi: number | null;
  optimizedRoi?: number | null;
  marginalRoi: number | null;
  recommendationReason: string | null;
  safeThresholdPercentage?: number;
  minSafeSpend?: number;
  maxSafeSpend?: number;
  thresholdRiskLevel?: 'safe' | 'moderate' | 'high';
  exceedsThreshold?: boolean;
  uncertaintyMultiplier?: number;
}

export interface BudgetOptimizationResult {
  currentTotalBudget: number | null;
  targetTotalBudget: number;
  expectedCurrentKpi: number | null;
  expectedOptimizedKpi: number | null;
  totalIncrementalKpi: number | null;
  incrementalKpi?: number | null;
  overallLiftPercentage: number | null;
  liftPercentage?: number | null;
  blendedCurrentRoi: number | null;
  blendedProjectedRoi: number | null;
  reallocations: BudgetReallocation[];
  marginalEqualizationGraph: {
    channelName: string;
    currentMroi: number | null;
    optimizedMroi: number | null;
  }[];
  explanation?: string;
}

export interface ScenarioDefinition {
  id: string;
  modelId?: string;
  name?: string;
  description?: string;
  channelSpends: Record<string, number>;
  totalSpend: number;
  expectedKpi: number | null;
  expectedKpiLower: number | null;
  expectedKpiUpper: number | null;
  incrementalKpi: number | null;
  blendedRoi: number | null;
  marginalRoi?: number | null;
  efficiencyRating?: 'Alta' | 'Média' | 'Retorno Decrescente' | null;
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
  modelId: string;
  decisionEngineVersion: string;
  source: 'deterministic';
  title: string;
  companyName: string | null;
  generatedAt: string;
  summary: string;
  dataReadinessSummary: string | null;
  historicalSpendSummary: string;
  channelPerformanceSummary: string;
  budgetRecommendationSummary: string;
  scenariosSummary: string | null;
  risksAndLimitations: string[];
  methodologyNotes: string[];
  dataLineage: DataLineageEntry[];
  aiNarrative?: AINarrative | null;
  aiStatus?: 'not_requested' | 'generated' | 'disabled' | 'timeout' | 'failed' | 'invalid';
  aiCacheHit?: boolean;
}

export interface DataLineageEntry {
  metric: string;
  source: string;
  modelId: string;
  decisionEngineVersion: string | null;
}

export interface AINarrative {
  executiveSummary: string;
  keyFindings: string[];
  recommendedActions: string[];
  risks: string[];
}

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
  preset: 'all' | '3m' | '6m' | '12m' | 'year1' | 'year2' | 'custom';
}
