import { IConnector, SyncConfig, ConnectorResponse, UnifiedMMMRow } from '../../types/etl';

export abstract class BaseConnector implements IConnector {
  abstract id: string;
  abstract name: string;

  // Each platform implements its own authentication (OAuth token validation, API key check)
  abstract authenticate(credentials: any): Promise<boolean>;

  // Each platform implements its own extraction logic handling pagination and rate limits
  abstract extract(config: SyncConfig): Promise<any[]>;

  // Each platform implements mapping from its raw API schema to the UnifiedMMMRow
  abstract normalize(rawRows: any[]): UnifiedMMMRow[];

  // General validation for MMM data (e.g., negative spend, missing dates)
  validate(rows: UnifiedMMMRow[]): boolean {
    for (const row of rows) {
      if (!row.date || !row.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Invalid or missing date format: ${row.date}`);
      }
      if (typeof row.spend !== 'number' || row.spend < 0 || isNaN(row.spend)) {
        throw new Error(`Invalid spend value for date ${row.date}`);
      }
      if (!row.channel) {
        throw new Error(`Missing channel identifier for date ${row.date}`);
      }
    }
    return true;
  }

  // Orchestrator method for the ETL pipeline
  async sync(config: SyncConfig): Promise<ConnectorResponse> {
    const warnings: string[] = [];
    try {
      // 1. Extract
      const rawData = await this.extract(config);
      
      // 2. Normalize
      const normalizedData = this.normalize(rawData);
      
      // 3. Validate
      this.validate(normalizedData);
      
      return {
        success: true,
        rows: normalizedData,
        metadata: {
          recordCount: normalizedData.length,
          warnings
        }
      };
    } catch (error: any) {
      return {
        success: false,
        rows: [],
        metadata: { recordCount: 0, warnings },
        error: error.message || 'Unknown error during sync'
      };
    }
  }
}
