export interface UnifiedMMMRow {
  date: string; // YYYY-MM-DD
  channel: string;
  campaign?: string;
  spend: number;
  impressions?: number;
  clicks?: number;
  reach?: number;
  conversions?: number;
  revenue?: number;
  [key: string]: string | number | undefined;
}

export interface SyncConfig {
  sourceId: string;
  accountId: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions: string[];
}

export interface ConnectorResponse {
  success: boolean;
  rows: UnifiedMMMRow[];
  metadata: {
    recordCount: number;
    warnings: string[];
    rateLimitStatus?: {
      remaining: number;
      resetAt: string;
    };
  };
  error?: string;
  dataset?: any;
}

export interface IConnector {
  id: string;
  name: string;
  authenticate(credentials: any): Promise<boolean>;
  extract(config: SyncConfig): Promise<any[]>;
  normalize(rawRows: any[]): UnifiedMMMRow[];
  validate(rows: UnifiedMMMRow[]): boolean;
  sync(config: SyncConfig): Promise<ConnectorResponse>;
}
