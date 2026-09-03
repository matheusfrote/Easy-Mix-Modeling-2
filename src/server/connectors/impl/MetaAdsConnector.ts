import { BaseConnector } from '../BaseConnector';
import { SyncConfig, UnifiedMMMRow } from '../../../types/etl';

export class MetaAdsConnector extends BaseConnector {
  id = 'meta-ads';
  name = 'Meta Ads';

  async authenticate(credentials: any): Promise<boolean> {
    const clientId = credentials?.clientId || process.env.META_CLIENT_ID;
    const clientSecret = credentials?.clientSecret || process.env.META_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Requer configuração. Defina as credenciais da Meta nas Configurações ou no .env');
    }
    return true;
  }

  async extract(config: SyncConfig): Promise<any[]> {
    const clientId = process.env.META_CLIENT_ID;
    if (!clientId) {
      throw new Error('Requer configuração. Integração com Meta Ads não está configurada.');
    }
    // Real implementation would call Graph API
    throw new Error('Integração com Meta Ads ainda não implementada (faltam dependências externas).');
  }

  normalize(rawRows: any[]): UnifiedMMMRow[] {
    return rawRows.map(row => ({
      date: row.date_start,
      channel: 'Meta Ads',
      campaign: row.campaign_name,
      spend: parseFloat(row.spend),
      impressions: parseInt(row.impressions, 10),
      clicks: parseInt(row.clicks, 10),
      reach: parseInt(row.reach, 10)
    }));
  }
}
