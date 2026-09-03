export interface MeridianServiceRequestPayload {
  rows: Record<string, any>[];
  config: {
    dateColumn: string;
    kpiColumn: string;
    targetKpiType?: string;
    mediaChannels: {
      spendColumn: string;
      impressionsColumn?: string;
      channelName: string;
      channelType?: string;
    }[];
    controlColumns?: string[];
    mcmcChains?: number;
    mcmcDraws?: number;
    mcmcWarmup?: number;
    priors?: Record<string, any>;
  };
}

export interface MeridianServiceError {
  code: string;
  message: string;
  field?: string;
}

export interface MeridianServiceResponse<T = any> {
  status: 'success' | 'error' | 'processing' | 'validation_error' | 'model_error' | 'service_unavailable';
  modelId?: string;
  engine?: string;
  engineVersion?: string;
  results?: T;
  posterior?: any[];
  diagnostics?: any;
  warnings?: string[];
  errors?: MeridianServiceError[];
}

export class MMMServiceClient {
  async checkHealth(): Promise<{ status: string; meridianModuleLoaded: boolean; [key: string]: any }> {
    return { status: 'healthy', meridianModuleLoaded: true };
  }

  async fitModel(payload: MeridianServiceRequestPayload): Promise<MeridianServiceResponse> {
    console.log('[AI Studio] Mocking MMM Model fitting...');
    
    // Simulate some work
    await new Promise(r => setTimeout(r, 1000));
    
    const { rows, config } = payload;
    let totalSpend = 0;
    let totalKpi = 0;
    
    const channelTotals: Record<string, number> = {};
    config.mediaChannels.forEach(c => channelTotals[c.channelName] = 0);
    
    rows.forEach(r => {
      totalKpi += Number(r[config.kpiColumn]) || 0;
      config.mediaChannels.forEach(c => {
        const s = Number(r[c.spendColumn]) || 0;
        channelTotals[c.channelName] += s;
        totalSpend += s;
      });
    });

    const channels = config.mediaChannels.map((c, i) => {
      const spend = channelTotals[c.channelName];
      const spendShare = spend / Math.max(1, totalSpend);
      // Mock metrics
      const kpiShare = spendShare * (1 + (Math.random() * 0.4 - 0.2));
      const incrementalKpi = totalKpi * kpiShare;
      const roi = spend > 0 ? incrementalKpi / spend : 0;
      return {
        channelName: c.channelName,
        spend,
        spendShare,
        incrementalKpi,
        kpiShare,
        roi,
        roiInterval: { ci025: roi * 0.8, ci050: roi, ci975: roi * 1.2 },
        marginalRoi: roi * 0.8,
        marginalRoiInterval: { ci025: roi * 0.64, ci050: roi * 0.8, ci975: roi * 0.96 },
        saturationLevel: Math.random() * 80 + 20,
        adstockDecay: 0.3 + Math.random() * 0.4,
        adstockHalfLifeWeeks: 1 + Math.random() * 4,
        halfSaturationSpend: spend * (0.5 + Math.random() * 0.5),
        slope: 1.0 + Math.random(),
        confidence: 'Média',
        saturationStatus: 'Ótimo'
      };
    });

    const responseCurves: Record<string, any> = {};
    channels.forEach(c => {
      responseCurves[c.channelName] = {
        channelName: c.channelName,
        currentSpend: c.spend,
        points: Array.from({length: 15}).map((_, i) => ({
          spend: c.spend * (i/10),
          spendMultiplier: i/10,
          incrementalKpi: c.incrementalKpi * (i/10),
          incrementalKpiLower: c.incrementalKpi * (i/10) * 0.8,
          incrementalKpiUpper: c.incrementalKpi * (i/10) * 1.2,
          marginalRoi: c.marginalRoi,
          roi: c.roi
        }))
      };
    });

    const diagnostics = {
      rSquared: 0.85,
      mape: 12.5,
      rmse: 1000,
      bayesianR2: 0.82,
      gelmanRubinRhat: 1.01,
      effectiveSampleSize: 800,
      isConverged: true,
      warnings: [],
      baselineContribution: totalKpi * 0.4,
      baselineShare: 0.4,
      controlsContribution: totalKpi * 0.1,
      controlsShare: 0.1,
      mediaContribution: totalKpi * 0.5,
      mediaShare: 0.5,
      totalObservedKpi: totalKpi,
      totalPredictedKpi: totalKpi * 0.98,
      timeSeriesFit: rows.map(r => ({
        date: r[config.dateColumn],
        actual: Number(r[config.kpiColumn]) || 0,
        predicted: (Number(r[config.kpiColumn]) || 0) * 0.98,
        predictedLower: (Number(r[config.kpiColumn]) || 0) * 0.8,
        predictedUpper: (Number(r[config.kpiColumn]) || 0) * 1.2,
        baseline: (Number(r[config.kpiColumn]) || 0) * 0.4,
        controls: (Number(r[config.kpiColumn]) || 0) * 0.1,
        media: (Number(r[config.kpiColumn]) || 0) * 0.48
      }))
    };

    const results = {
      modelId: 'mock-' + Date.now(),
      createdAt: new Date().toISOString(),
      status: 'completed',
      totalSpend,
      totalKpi,
      blendedRoi: totalSpend > 0 ? (totalKpi * 0.5) / totalSpend : 0,
      blendedRoas: totalSpend > 0 ? (totalKpi * 0.5) / totalSpend : 0,
      channels,
      responseCurves,
      diagnostics,
      correlationMatrix: { channels: config.mediaChannels.map(c => c.channelName), matrix: [] },
      mostEfficientChannel: channels[0]?.channelName || '',
      saturatedChannel: channels[channels.length - 1]?.channelName || '',
      bestOpportunityChannel: channels[0]?.channelName || ''
    };

    return {
      status: 'success',
      modelId: results.modelId,
      engine: 'google-meridian-mock',
      engineVersion: '0.1.0-mock',
      results: results,
      diagnostics: diagnostics,
      warnings: []
    };
  }

  async getDiagnostics(): Promise<any> {
    return { status: 'native_engine', meridianVersion: 'google-meridian-mock' };
  }
}

export const mmmServiceClient = new MMMServiceClient();
