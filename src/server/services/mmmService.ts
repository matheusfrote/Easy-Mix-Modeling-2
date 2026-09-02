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
  private serviceUrl: string;
  private timeoutMs: number;

  constructor(serviceUrl = process.env.MERIDIAN_SERVICE_URL || 'http://127.0.0.1:5000', timeoutMs = 60000) {
    this.serviceUrl = serviceUrl;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Health check of the Meridian microservice
   */
  async checkHealth(): Promise<{ status: string; meridianModuleLoaded: boolean; [key: string]: any }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.serviceUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);
      if (res.ok) {
        return await res.json();
      }
      return { status: 'unhealthy', meridianModuleLoaded: false };
    } catch {
      return { status: 'service_unavailable', meridianModuleLoaded: false };
    }
  }

  /**
   * Dispatches model fitting to the Meridian microservice with strict timeout and structured error parsing
   */
  async fitModel(payload: MeridianServiceRequestPayload): Promise<MeridianServiceResponse> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.serviceUrl}/api/model/fit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) {
        return {
          status: 'model_error',
          engine: 'google-meridian',
          errors: [
            {
              code: 'HTTP_' + res.status,
              message: data.error || data.message || 'Erro na execução do modelo no microserviço Meridian.'
            }
          ]
        };
      }

      return {
        status: 'success',
        modelId: data.modelId,
        engine: 'google-meridian',
        engineVersion: data.engineVersion || '0.1.0',
        results: data,
        diagnostics: data.diagnostics,
        warnings: data.diagnostics?.warnings || []
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          status: 'service_unavailable',
          engine: 'google-meridian',
          errors: [{ code: 'TIMEOUT', message: 'Tempo limite excedido durante a amostragem MCMC no Google Meridian.' }]
        };
      }
      return {
        status: 'service_unavailable',
        engine: 'google-meridian',
        errors: [{ code: 'CONNECTION_FAILED', message: `Não foi possível conectar ao mmm-service (${this.serviceUrl}).` }]
      };
    }
  }

  /**
   * Retrieves diagnostics from active model run
   */
  async getDiagnostics(): Promise<any> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.serviceUrl}/api/model/diagnostics`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const mmmServiceClient = new MMMServiceClient();
