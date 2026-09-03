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

  constructor() {
    this.serviceUrl = process.env.MERIDIAN_SERVICE_URL || 'http://127.0.0.1:8008';
  }

  async checkHealth(): Promise<{ status: string; meridianModuleLoaded: boolean; [key: string]: any }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return {
          status: 'healthy',
          meridianModuleLoaded: data.meridian_installed ?? true,
          details: data
        };
      }
    } catch {
      // Python microservice not responding
    }

    return {
      status: 'unavailable',
      meridianModuleLoaded: false,
      message: 'Microserviço Google Meridian não está em execução na porta configurada.'
    };
  }

  async fitModel(payload: MeridianServiceRequestPayload): Promise<MeridianServiceResponse> {
    // Attempt to invoke the official Python Meridian microservice
    try {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.MERIDIAN_TIMEOUT_MS) || 120000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${this.serviceUrl}/api/v1/meridian/fit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.results && Array.isArray(data.results.channels)) {
          return {
            status: 'success',
            modelId: data.modelId || data.model_id,
            engine: 'google-meridian',
            engineVersion: data.version || 'official',
            results: data.results,
            diagnostics: data.diagnostics,
            warnings: data.warnings || []
          };
        }
      }

      const errBody = await response.json().catch(() => ({}));
      return {
        status: 'service_unavailable',
        errors: [{
          code: errBody.code || 'MERIDIAN_UNAVAILABLE',
          message: errBody.message || errBody.detail || 'O serviço Google Meridian não está disponível ou retornou erro.'
        }]
      };
    } catch (err: any) {
      // When Python Meridian microservice is not reachable, do NOT generate synthetic or mock metrics.
      // Return structured 503 SERVICE UNAVAILABLE error per rule: "Nenhum resultado estatístico artificial."
      return {
        status: 'service_unavailable',
        errors: [{
          code: 'MERIDIAN_UNAVAILABLE',
          message: 'O microserviço oficial do Google Meridian está indisponível ou desconectado. Por diretriz de integridade estatística (Zero Fake Data), a plataforma não simula convergência MCMC, intervalos de credibilidade ou métricas fictícias.'
        }]
      };
    }
  }

  async getDiagnostics(): Promise<any> {
    try {
      const health = await this.checkHealth();
      if (health.status === 'healthy') {
        return { status: 'connected', serviceUrl: this.serviceUrl, ...health };
      }
    } catch {}

    return {
      status: 'disconnected',
      serviceUrl: this.serviceUrl,
      code: 'MERIDIAN_OFFLINE',
      message: 'Serviço Python Meridian offline. Inicie o container mmm-service para diagnósticos reais.'
    };
  }

  async optimizeBudget(payload: {
    targetTotalBudget: number;
    constraints?: any;
    modelId?: string;
    activeModel?: any;
  }): Promise<any | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${this.serviceUrl}/api/v1/meridian/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.reallocations || data.optimizedKpi)) {
          return {
            ...data,
            engine: 'google-meridian'
          };
        }
      }
    } catch {
      // Python microservice not answering optimize endpoint
    }
    return null;
  }

  async simulateScenario(payload: {
    channelSpends: Record<string, number>;
    modelId?: string;
    activeModel?: any;
  }): Promise<any | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${this.serviceUrl}/api/v1/meridian/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.expectedKpi || data.channelSpends)) {
          return {
            ...data,
            engine: 'google-meridian'
          };
        }
      }
    } catch {
      // Python microservice not answering simulate endpoint
    }
    return null;
  }
}

export const mmmServiceClient = new MMMServiceClient();
