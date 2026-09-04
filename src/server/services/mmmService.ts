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

function isValidFitResponse(data: any): boolean {
  return data?.status === 'success'
    && typeof data.modelId === 'string'
    && data.engine === 'google-meridian'
    && typeof data.engineVersion === 'string'
    && data.results !== null
    && typeof data.results === 'object'
    && Object.hasOwn(data.results, 'totalSpend')
    && Object.hasOwn(data.results, 'totalKpi')
    && Object.hasOwn(data.results, 'blendedRoi')
    && Array.isArray(data.results.channels)
    && data.results.diagnostics !== null
    && typeof data.results.diagnostics === 'object'
    && data.results.responseCurves !== null
    && typeof data.results.responseCurves === 'object';
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

  async optimizeBudget(_payload: {
    targetTotalBudget: number;
    constraints?: any;
    modelId?: string;
    activeModel?: any;
  }): Promise<MeridianServiceResponse> {
    return {
      status: 'not_implemented',
      httpStatus: 501,
      errors: [{ code: 'NOT_IMPLEMENTED', message: 'Budget Optimizer não está implementado.' }]
    };
  }

  async simulateScenario(_payload: {
    channelSpends: Record<string, number>;
    modelId?: string;
    activeModel?: any;
  }): Promise<MeridianServiceResponse> {
    return {
      status: 'not_implemented',
      httpStatus: 501,
      errors: [{ code: 'NOT_IMPLEMENTED', message: 'What-If não está implementado.' }]
    };
  }
}

export const mmmServiceClient = new MMMServiceClient();
