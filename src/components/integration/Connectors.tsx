import React, { useState } from 'react';
import { IntegrationCatalog } from './IntegrationCatalog';
import { ConnectSourceModal } from './ConnectSourceModal';
import { ConnectedSourcesSection } from './ConnectedSourcesSection';
import { IntegrationSource, ConnectedSourceInstance } from '../../data/integrationSources';

interface ConnectorsProps {
  connectedSources: ConnectedSourceInstance[];
  onConnectedSuccess: (instance: ConnectedSourceInstance, uploadRes?: any) => void;
  onDisconnect: (id: string) => void;
}

export const Connectors: React.FC<ConnectorsProps> = ({
  connectedSources,
  onConnectedSuccess,
  onDisconnect
}) => {
  const [selectedSourceForModal, setSelectedSourceForModal] = useState<IntegrationSource | null>(null);

  const handleOpenConnectModal = (source: IntegrationSource) => {
    setSelectedSourceForModal(source);
  };

  const handleCloseModal = () => {
    setSelectedSourceForModal(null);
  };

  const existingInstanceForSelected = selectedSourceForModal 
    ? connectedSources.find(s => s.sourceId === selectedSourceForModal.id)
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      {connectedSources.length > 0 && (
        <ConnectedSourcesSection
          sources={connectedSources}
          onManageSource={(source) => handleOpenConnectModal(source)}
          onDisconnectSource={onDisconnect}
          onSyncAll={() => {}}
          isSyncing={false}
          onAddNewSource={() => {
            const catalog = document.getElementById('integration-catalog-container');
            catalog?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      <div id="integration-catalog-container">
        <IntegrationCatalog
          onConnectSource={handleOpenConnectModal}
          connectedSources={connectedSources}
        />
      </div>

      {selectedSourceForModal && (
        <ConnectSourceModal
          source={selectedSourceForModal}
          isOpen={true}
          onClose={handleCloseModal}
          onConnectedSuccess={onConnectedSuccess}
          onDisconnect={onDisconnect}
          existingInstance={existingInstanceForSelected}
        />
      )}
    </div>
  );
};
