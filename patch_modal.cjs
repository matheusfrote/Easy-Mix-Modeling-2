const fs = require('fs');
const path = 'src/components/integration/ConnectSourceModal.tsx';
let code = fs.readFileSync(path, 'utf8');

const newConnectStandard = `
  // Handle standard source connection setup via API backend
  const handleConnectStandard = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSyncStatus('Autenticando via OAuth 2.0...');

    try {
      // Validate Connector ID match (we mapped google-ads and meta-ads backend side)
      let backendConnectorId = source.id;
      if (backendConnectorId !== 'google-ads' && backendConnectorId !== 'meta-ads') {
         // Mock execution for un-implemented connectors keeping the UX pattern alive
         setTimeout(() => {
           setSyncStatus('Autenticado ✓ (Modo Simulação)');
           setTimeout(() => {
             const weeks = historicalPeriod === '36m' ? 156 : historicalPeriod === '24m' ? 104 : 52;
             setSyncStatus(\`Extraindo \${weeks} semanas de histórico...\`);
             setTimeout(() => {
               setSyncStatus('Processando métricas e mapeando para o Meridian...');
               setTimeout(() => {
                 setIsProcessing(false);
                 const instance: ConnectedSourceInstance = {
                   id: existingInstance?.id || \`conn-\${source.id}-\${Date.now()}\`,
                   sourceId: source.id,
                   name: source.name,
                   category: source.category,
                   connectedAt: existingInstance?.connectedAt || new Date().toISOString(),
                   lastSyncedAt: 'Agora mesmo',
                   status: 'active',
                   historicalWeeks: weeks,
                   channelsCount: source.sampleColumns.length,
                   frequency,
                   historicalPeriod
                 };
                 onConnectedSuccess(instance);
                 onClose();
               }, 1200);
             }, 1200);
           }, 1000);
         }, 800);
         return;
      }

      // Step 1: Authenticate
      const authResponse = await fetch('/api/connectors/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: backendConnectorId, credentials: {} })
      });
      
      const authData = await authResponse.json();
      if (!authResponse.ok) {
        throw new Error(authData.error || 'Falha na autenticação OAuth.');
      }
      
      setSyncStatus('Autenticado ✓');
      
      const weeks = historicalPeriod === '36m' ? 156 : historicalPeriod === '24m' ? 104 : 52;
      setSyncStatus(\`Extraindo \${weeks} semanas via API Oficial...\`);

      // Calculate Dates
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));
      const startDateStr = startDate.toISOString().split('T')[0];

      // Step 2: Sync and Extract
      const syncResponse = await fetch('/api/connectors/sync', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            connectorId: backendConnectorId,
            config: {
               startDate: startDateStr,
               endDate: endDate,
               metrics: selectedMetrics,
               dimensions: []
            }
         })
      });

      const syncData = await syncResponse.json();
      if (!syncResponse.ok) {
         throw new Error(syncData.error || 'Falha na sincronização.');
      }

      setSyncStatus('Processando métricas e mapeando para o Meridian...');
      
      setTimeout(() => {
        setIsProcessing(false);
        const instance: ConnectedSourceInstance = {
           id: existingInstance?.id || \`conn-\${source.id}-\${Date.now()}\`,
           sourceId: source.id,
           name: source.name,
           category: source.category,
           connectedAt: existingInstance?.connectedAt || new Date().toISOString(),
           lastSyncedAt: 'Agora mesmo',
           status: 'active',
           historicalWeeks: weeks,
           channelsCount: source.sampleColumns.length,
           frequency,
           historicalPeriod
        };
        // The data is now in the global backend state. 
        // We notify the UI.
        onConnectedSuccess(instance);
        onClose();
      }, 800);

    } catch (err: any) {
       setErrorMessage(err.message || 'Falha ao conectar via API.');
       setIsProcessing(false);
    }
  };
`;

code = code.replace(/\/\/ Handle standard source connection setup[\s\S]*?const handleDownloadChannelTemplate/m, newConnectStandard + '\n\n  const handleDownloadChannelTemplate');
fs.writeFileSync(path, code);
