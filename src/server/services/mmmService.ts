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
    try {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.MERIDIAN_TIMEOUT_MS) || 60000; // Increased to 60s for actual MCMC runs
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
        return {
          status: 'error',
          errors: [{ code: 'INVALID_RESPONSE', message: 'Serviço retornou um formato inválido' }]
        };
      } else {
        let errorData: any = null;
        try {
          const text = await response.text();
          errorData = JSON.parse(text);
        } catch {}
        
        return {
          status: 'error',
          errors: [{
            code: 'MERIDIAN_ERROR',
            message: errorData?.detail || errorData?.message || `Erro do microserviço: ${response.statusText}`
          }]
        };
      }
    } catch (err: any) {
      return {
        status: 'service_unavailable',
        errors: [{
          code: 'MERIDIAN_UNAVAILABLE',
          message: 'O microserviço Python Google Meridian está indisponível ou ocorreu timeout: ' + err.message
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
  }): Promise<MeridianServiceResponse> {
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
            status: 'success',
            engine: 'google-meridian',
            results: data
          };
        }
        return {
          status: 'error',
          errors: [{ code: 'INVALID_RESPONSE', message: 'Serviço retornou um formato inválido' }]
        };
      } else {
        let errorData: any = null;
        try {
          const text = await res.text();
          errorData = JSON.parse(text);
        } catch {}
        
        return {
          status: 'error',
          errors: [{
            code: 'MERIDIAN_ERROR',
            message: errorData?.detail || errorData?.message || `Erro do microserviço: ${res.statusText}`
          }]
        };
      }
    } catch (err: any) {
      return {
        status: 'service_unavailable',
        errors: [{
          code: 'MERIDIAN_UNAVAILABLE',
          message: 'O microserviço Python Google Meridian está indisponível ou ocorreu timeout: ' + err.message
        }]
      };
    }
  }

  async simulateScenario(payload: {
    channelSpends: Record<string, number>;
    modelId?: string;
    activeModel?: any;
  }): Promise<MeridianServiceResponse> {
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
            status: 'success',
            engine: 'google-meridian',
            results: data
          };
        }
        return {
          status: 'error',
          errors: [{ code: 'INVALID_RESPONSE', message: 'Serviço retornou um formato inválido' }]
        };
      } else {
        let errorData: any = null;
        try {
          const text = await res.text();
          errorData = JSON.parse(text);
        } catch {}
        
        return {
          status: 'error',
          errors: [{
            code: 'MERIDIAN_ERROR',
            message: errorData?.detail || errorData?.message || `Erro do microserviço: ${res.statusText}`
          }]
        };
      }
    } catch (err: any) {
      return {
        status: 'service_unavailable',
        errors: [{
          code: 'MERIDIAN_UNAVAILABLE',
          message: 'O microserviço Python Google Meridian está indisponível ou ocorreu timeout: ' + err.message
        }]
      };
    }
  }
}

export const mmmServiceClient = new MMMServiceClient();
