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
    maxLag?: number;
    knots?: number;
    randomSeed?: number;
  };
}

export interface MeridianServiceError {
  code: string;
  message: string;
  field?: string;
  stage?: string;
}

export interface MeridianServiceResponse<T = any> {
  status: 'success' | 'error' | 'processing' | 'validation_error' | 'model_error' | 'service_unavailable' | 'not_implemented';
  httpStatus?: number;
  modelId?: string;
  engine?: string;
  engineVersion?: string;
  results?: T;
  warnings?: string[];
  errors?: MeridianServiceError[];
}

function statusForHttpCode(status: number): MeridianServiceResponse['status'] {
  if (status === 422) return 'validation_error';
  if (status === 501) return 'not_implemented';
  if (status === 503) return 'service_unavailable';
  if (status >= 500) return 'model_error';
  return 'error';
}

function parseServiceError(data: any, response: Response): MeridianServiceError {
  const detail = data?.detail;
  return {
    code: detail?.code || data?.code || 'MERIDIAN_ERROR',
    message: detail?.message || data?.message || response.statusText || `HTTP ${response.status}`,
    stage: detail?.stage || data?.stage
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableFinite(value: unknown): boolean {
  return value === null || isFiniteNumber(value);
}

function hasNullableFiniteProperty(value: any, property: string): boolean {
  return value !== null
    && typeof value === 'object'
    && Object.hasOwn(value, property)
    && isNullableFinite(value[property]);
}

function isValidInterval(value: any): boolean {
  return ['ci025', 'ci050', 'ci975'].every(property => hasNullableFiniteProperty(value, property));
}

function isValidChannel(value: any): boolean {
  return value !== null
    && typeof value === 'object'
    && typeof value.channelName === 'string'
    && value.channelName.trim().length > 0
    && ['spend', 'spendShare', 'incrementalKpi', 'contribution', 'contributionShare', 'roi', 'marginalRoi', 'saturationLevel', 'currentMediaUnits', 'adstockDecay', 'adstockHalfLifeWeeks']
      .every(property => hasNullableFiniteProperty(value, property))
    && isValidInterval(value.roiInterval)
    && isValidInterval(value.marginalRoiInterval)
    && isValidInterval(value.incrementalOutcomeInterval)
    && isValidInterval(value.contributionInterval)
    && isValidInterval(value.saturationInterval)
    && isValidInterval(value.adstockDecayInterval);
}

function isValidCurve(value: any): boolean {
  return value !== null
    && typeof value === 'object'
    && typeof value.channelName === 'string'
    && hasNullableFiniteProperty(value, 'currentSpend')
    && Array.isArray(value.points)
    && value.points.every((point: any) =>
      isFiniteNumber(point?.spendMultiplier)
      && ['spend', 'incrementalKpi', 'incrementalKpiLower', 'incrementalKpiUpper', 'roi', 'marginalRoi']
        .every(property => hasNullableFiniteProperty(point, property))
    );
}

function isValidFitResponse(data: any): boolean {
  const result = data?.results;
  if (!(data?.status === 'success'
    && typeof data.modelId === 'string'
    && data.engine === 'google-meridian'
    && typeof data.engineVersion === 'string'
    && result !== null
    && typeof result === 'object'
    && isFiniteNumber(result.totalSpend)
    && isFiniteNumber(result.totalKpi)
    && hasNullableFiniteProperty(result, 'blendedRoi')
    && ['revenue', 'non_revenue'].includes(result.kpiType)
    && Array.isArray(result.channels)
    && result.channels.length > 0
    && result.channels.every(isValidChannel)
    && result.diagnostics !== null
    && typeof result.diagnostics === 'object'
    && ['rSquared', 'mape', 'wmape', 'gelmanRubinRhat'].every(property =>
      hasNullableFiniteProperty(result.diagnostics, property)
    )
    && (result.diagnostics.isConverged === null || typeof result.diagnostics.isConverged === 'boolean')
    && result.responseCurves !== null
    && typeof result.responseCurves === 'object')) return false;

  const responseCurves = Object.values(result.responseCurves);
  const channelNames = new Set(result.channels.map((channel: any) => channel.channelName));
  return responseCurves.length === result.channels.length
    && responseCurves.every(isValidCurve)
    && responseCurves.every((curve: any) => channelNames.has(curve.channelName));
}

function isValidDerivedResponse(data: any, operation: 'optimizer' | 'scenario'): boolean {
  if (
    data?.status !== 'success'
    || typeof data.modelId !== 'string'
    || data.engine !== 'google-meridian'
    || typeof data.engineVersion !== 'string'
    || !data.results
    || data.results.modelId !== data.modelId
  ) return false;
  const result = data.results;
  if (operation === 'optimizer') {
    return isFiniteNumber(result.targetTotalBudget)
      && hasNullableFiniteProperty(result, 'currentTotalBudget')
      && ['expectedCurrentKpi', 'expectedOptimizedKpi', 'incrementalKpi', 'liftPercentage', 'blendedCurrentRoi', 'blendedProjectedRoi']
        .every(property => hasNullableFiniteProperty(result, property))
      && Array.isArray(result.reallocations)
      && result.reallocations.length > 0
      && result.reallocations.every((item: any) =>
        typeof item?.channelName === 'string'
        && ['currentSpend', 'recommendedSpend', 'deltaSpend', 'deltaPercentage', 'currentRoi', 'optimizedRoi', 'marginalRoi']
          .every(property => hasNullableFiniteProperty(item, property))
      );
  }
  return typeof result.id === 'string'
    && result.channelSpends !== null
    && typeof result.channelSpends === 'object'
    && Object.values(result.channelSpends).every(isFiniteNumber)
    && isFiniteNumber(result.totalSpend)
    && ['expectedKpi', 'expectedKpiLower', 'expectedKpiUpper', 'incrementalKpi', 'blendedRoi']
      .every(property => hasNullableFiniteProperty(result, property));
}

export class MMMServiceClient {
  private readonly serviceUrl: string;

  constructor(serviceUrl = process.env.MERIDIAN_SERVICE_URL || 'http://127.0.0.1:8008') {
    this.serviceUrl = serviceUrl;
  }

  async checkHealth(): Promise<{ status: string; meridianModuleLoaded: boolean; [key: string]: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      if (response.ok) {
        const data = await response.json();
        return {
          status: data?.status === 'healthy' && data?.meridian_available === true ? 'healthy' : 'unavailable',
          meridianModuleLoaded: data?.meridian_available === true,
          details: data
        };
      }
    } catch {
      // The health result below reports the real unavailable state.
    } finally {
      clearTimeout(timeoutId);
    }

    return {
      status: 'unavailable',
      meridianModuleLoaded: false,
      message: 'Microserviço Google Meridian não está em execução na porta configurada.'
    };
  }

  async fitModel(payload: MeridianServiceRequestPayload): Promise<MeridianServiceResponse> {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.MERIDIAN_TIMEOUT_MS) || 900000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.serviceUrl}/api/v1/meridian/fit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          status: statusForHttpCode(response.status),
          httpStatus: response.status,
          errors: [parseServiceError(data, response)]
        };
      }

      if (!isValidFitResponse(data)) {
        return {
          status: 'error',
          httpStatus: 502,
          errors: [{
            code: 'INVALID_RESPONSE',
            message: 'O serviço Meridian retornou um contrato de sucesso incompleto.'
          }]
        };
      }

      return {
        status: 'success',
        httpStatus: 200,
        modelId: data.modelId,
        engine: data.engine,
        engineVersion: data.engineVersion,
        results: data.results,
        warnings: Array.isArray(data.warnings) ? data.warnings : []
      };
    } catch (error: any) {
      return {
        status: 'service_unavailable',
        httpStatus: 503,
        errors: [{
          code: error?.name === 'AbortError' ? 'MERIDIAN_TIMEOUT' : 'MERIDIAN_UNAVAILABLE',
          message: `O microserviço Google Meridian está indisponível: ${error?.message || String(error)}`
        }]
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getDiagnostics(): Promise<any> {
    const health = await this.checkHealth();
    return {
      status: health.status === 'healthy' ? 'connected' : 'disconnected',
      serviceUrl: this.serviceUrl,
      ...health
    };
  }

  private async postDerived(
    path: '/api/v1/meridian/optimize' | '/api/v1/meridian/simulate',
    payload: Record<string, unknown>,
    operation: 'optimizer' | 'scenario'
  ): Promise<MeridianServiceResponse> {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.MERIDIAN_DERIVED_TIMEOUT_MS) || 300000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.serviceUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          status: statusForHttpCode(response.status),
          httpStatus: response.status,
          errors: [parseServiceError(data, response)]
        };
      }
      if (!isValidDerivedResponse(data, operation)) {
        return {
          status: 'error',
          httpStatus: 502,
          errors: [{ code: 'INVALID_RESPONSE', message: `Contrato Meridian inválido para ${operation}.` }]
        };
      }
      return {
        status: 'success',
        httpStatus: 200,
        modelId: data.modelId,
        engine: data.engine,
        engineVersion: data.engineVersion,
        results: data.results,
        warnings: Array.isArray(data.warnings) ? data.warnings : []
      };
    } catch (error: any) {
      return {
        status: 'service_unavailable',
        httpStatus: 503,
        errors: [{
          code: error?.name === 'AbortError' ? 'MERIDIAN_TIMEOUT' : 'MERIDIAN_UNAVAILABLE',
          message: `O microserviço Google Meridian está indisponível: ${error?.message || String(error)}`
        }]
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async optimizeBudget(payload: {
    targetTotalBudget: number;
    constraints?: any;
    modelId: string;
    decisionEngineVersion: string;
  }): Promise<MeridianServiceResponse> {
    return this.postDerived('/api/v1/meridian/optimize', payload, 'optimizer');
  }

  async simulateScenario(payload: {
    channelSpends: Record<string, number>;
    modelId: string;
    decisionEngineVersion: string;
  }): Promise<MeridianServiceResponse> {
    return this.postDerived('/api/v1/meridian/simulate', payload, 'scenario');
  }
}

export const mmmServiceClient = new MMMServiceClient();
