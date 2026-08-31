import { IConnector } from '../../types/etl';
import { MetaAdsConnector } from './impl/MetaAdsConnector';
import { GoogleAdsConnector } from './impl/GoogleAdsConnector';

class ConnectorRegistry {
  private connectors: Map<string, IConnector> = new Map();

  constructor() {
    this.register(new MetaAdsConnector());
    this.register(new GoogleAdsConnector());
  }

  register(connector: IConnector) {
    this.connectors.set(connector.id, connector);
  }

  get(id: string): IConnector {
    const connector = this.connectors.get(id);
    if (!connector) {
      throw new Error(`Connector with ID ${id} not found.`);
    }
    return connector;
  }

  listAvailable(): string[] {
    return Array.from(this.connectors.keys());
  }
}

export const registry = new ConnectorRegistry();
