import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Link,
  Layers,
  Database,
  Sparkles,
  ArrowRight,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  RefreshCw,
  Plus,
  Sliders,
  TrendingUp
} from 'lucide-react';
import localforage from 'localforage';
import { UploadResponse, apiClient } from '../services/apiClient';
import { StepGuidanceBanner, InfoTooltip } from './ContextualGuide';
import { CsvFileInput } from './CsvFileInput';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';
import { Connectors } from './integration/Connectors';
import { DataQualityReadinessWidget } from './integration/DataQualityReadinessWidget';
import { SmartMappingPreview } from './integration/SmartMappingPreview';
import {
  IntegrationSource,
  ConnectedSourceInstance,
  INTEGRATION_SOURCES
} from '../data/integrationSources';

interface DataUploadViewProps {
  onUploadSuccess: (response: UploadResponse) => void;
  currentDataset: UploadResponse | null;
  onNavigateToMapping: () => void;
  onNavigateToReadiness?: () => void;
  onOpenFullTour?: () => void;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  onUploadSuccess,
  currentDataset,
  onNavigateToMapping,
  onNavigateToReadiness,
  onOpenFullTour
}) => {
  const [ingestionMode, setIngestionMode] = useState<'api' | 'manual'>('api');
  const [selectedSourceForModal, setSelectedSourceForModal] = useState<IntegrationSource | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectedSources, setConnectedSources] = useState<ConnectedSourceInstance[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Initialize and persist connected sources in localforage
  useEffect(() => {
    const loadSavedSources = async () => {
      try {
        const saved = await localforage.getItem<ConnectedSourceInstance[]>('easy_mix_connected_sources');
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setConnectedSources(saved);
        } else if (currentDataset?.isSynthetic) {
          // Pre-populate default active sources when synthetic data is active
          const defaultSyntheticSources: ConnectedSourceInstance[] = [
            {
              id: 'conn-google-ads',
              sourceId: 'google-ads',
              name: 'Google Ads (Search & PMax)',
              category: 'advertising',
              connectedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
              lastSyncedAt: 'há 15 min',
              status: 'active',
              historicalWeeks: 104,
              channelsCount: 2,
              frequency: 'weekly',
              historicalPeriod: '24m'
            },
            {
              id: 'conn-meta-ads',
              sourceId: 'meta-ads',
              name: 'Meta Ads (Facebook & Instagram)',
              category: 'advertising',
              connectedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
              lastSyncedAt: 'há 20 min',
              status: 'active',
              historicalWeeks: 104,
              channelsCount: 1,
              frequency: 'weekly',
              historicalPeriod: '24m'
            },
            {
              id: 'conn-ga4',
              sourceId: 'ga4',
              name: 'Google Analytics 4 (Receita & Vendas)',
              category: 'analytics',
              connectedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
              lastSyncedAt: 'há 10 min',
              status: 'active',
              historicalWeeks: 104,
              channelsCount: 1,
              frequency: 'daily',
              historicalPeriod: '24m'
            }
          ];
          setConnectedSources(defaultSyntheticSources);
          localforage.setItem('easy_mix_connected_sources', defaultSyntheticSources).catch(console.error);
        }
      } catch (err) {
        console.error('Error loading connected sources:', err);
      }
    };

    loadSavedSources();
  }, [currentDataset?.isSynthetic]);

  const saveSources = (updated: ConnectedSourceInstance[]) => {
    setConnectedSources(updated);
    localforage.setItem('easy_mix_connected_sources', updated).catch(console.error);
  };

  const handleOpenConnectModal = (source: IntegrationSource) => {
    setSelectedSourceForModal(source);
    setIsConnectModalOpen(true);
  };

  const handleConnectedSuccess = (instance: ConnectedSourceInstance, uploadRes?: UploadResponse) => {
    const existingIndex = connectedSources.findIndex(s => s.sourceId === instance.sourceId);
    let updated: ConnectedSourceInstance[];
    if (existingIndex >= 0) {
      updated = [...connectedSources];
      updated[existingIndex] = instance;
    } else {
      updated = [instance, ...connectedSources];
    }
    saveSources(updated);

    if (uploadRes) {
      onUploadSuccess(uploadRes);
    }
  };

  const handleDisconnectSource = (sourceId: string) => {
    const updated = connectedSources.filter(s => s.sourceId !== sourceId && s.id !== sourceId);
    saveSources(updated);
  };

  const handleSyncAll = () => {
    setIsSyncingAll(true);
    setTimeout(() => {
      setIsSyncingAll(false);
      const updated = connectedSources.map(s => ({
        ...s,
        lastSyncedAt: 'Agora mesmo'
      }));
      saveSources(updated);
    }, 1000);
  };

  const handleUploadCsvForSource = (source: IntegrationSource) => {
    setIngestionMode('manual');
    // Scroll smoothly to the upload zone
    setTimeout(() => {
      const el = document.getElementById('csv-file-uploader-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const existingInstanceForSelected = selectedSourceForModal
    ? connectedSources.find(s => s.sourceId === selectedSourceForModal.id) || null
    : null;

  return (
    <div id="data-upload-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Data Hub: Ingestão de Séries Temporais, Upload de Planilhas e Conexão de Fontes de Dados de Marketing
      </h1>

      {/* Contextual Step Guidance Banner */}
      <StepGuidanceBanner
        id="data-hub-guidance"
        stepNumber="1"
        title="Etapa 1: Data Hub & Envio de Dados"
        subtitle="Importe suas séries temporais de marketing via arquivos CSV/Excel ou conecte automaticamente suas contas de mídia e vendas."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '📁', text: 'Arquivos CSV & XLSX: Envio de planilhas com detecção automática de datas e investimentos.' },
          { icon: '🔗', text: 'Conectores de Fontes: Integração com Google Ads, Meta, GA4, HubSpot, Shopify e Google Sheets.' },
          { icon: '🎯', text: 'Model Readiness Score: Diagnóstico estatístico em tempo real para verificar se os dados estão prontos para o Meridian.' }
        ]}
        proTip="Dica rápida: Se quiser testar o sistema imediatamente sem conectar suas contas agora, use o botão 'Explorar com Dados de Demonstração'."
      />

      {/* Dual Mode Ingestion Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* API Mode Button */}
        <button
          onClick={() => setIngestionMode('api')}
          className={`relative flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
            ingestionMode === 'api'
              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {ingestionMode === 'api' && (
            <div className="absolute top-4 right-4 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
            ingestionMode === 'api' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            <Link className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className={`text-base font-bold ${ingestionMode === 'api' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'}`}>
              Conexão Direta via API
            </h3>
            <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Recomendado
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${ingestionMode === 'api' ? 'text-blue-800/80 dark:text-blue-200/70' : 'text-slate-500 dark:text-slate-400'}`}>
            Autentique Google Ads, Meta, GA4 e outros. O sistema extrai e padroniza 100% automático. Zero configuração.
          </p>
        </button>

        {/* Manual Mode Button */}
        <button
          onClick={() => setIngestionMode('manual')}
          className={`relative flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
            ingestionMode === 'manual'
              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {ingestionMode === 'manual' && (
            <div className="absolute top-4 right-4 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
            ingestionMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className={`text-base font-bold mb-1.5 ${ingestionMode === 'manual' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'}`}>
            Upload Manual de Planilha
          </h3>
          <p className={`text-xs leading-relaxed ${ingestionMode === 'manual' ? 'text-blue-800/80 dark:text-blue-200/70' : 'text-slate-500 dark:text-slate-400'}`}>
            Faça upload do seu próprio arquivo CSV ou XLSX se preferir tratar os dados internamente antes da modelagem.
          </p>
        </button>
      </div>
      
      {/* API Ingestion Mode Content */}
      {ingestionMode === 'api' && (
        <div className="space-y-6 animate-fade-in">
                    <Connectors 
            connectedSources={connectedSources}
            onConnectedSuccess={handleConnectedSuccess}
            onDisconnect={handleDisconnectSource}
          />
        </div>
      )}

      {/* Manual Upload Mode Content */}
      {ingestionMode === 'manual' && (
        <div className="space-y-6 animate-fade-in" id="csv-file-uploader-container">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                  Selecione ou Arraste seu Arquivo CSV / Excel
                  <InfoTooltip
                    title="Formato Recomendado"
                    content="Para o modelo separar com precisão as vendas naturais (orgânicas) do impacto real de cada canal de anúncio, recomendamos um histórico de 52 a 104 semanas (1 a 2 anos)."
                  />
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Envie dados reais da sua empresa para processar adstock, saturação e retorno por canal com o Google Meridian.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full self-start sm:self-auto border border-blue-200 dark:border-blue-800">
                CSV ou Planilha Excel (.xlsx, .xls)
              </span>
            </div>

            <CsvFileInput
              onUploadSuccess={onUploadSuccess}
              currentDataset={currentDataset}
            />
          </div>
        </div>
      )}

      {/* Real-time Model Readiness & Data Quality Feedback if dataset is active */}
      {currentDataset && (
        <div className="space-y-6 pt-2">
          {/* Instant Data Quality & Readiness Score Card */}
          <DataQualityReadinessWidget
            readiness={currentDataset.readiness}
            validation={currentDataset.validation}
            mappings={currentDataset.mappings}
            rowCount={currentDataset.rowCount}
            filename={currentDataset.filename}
            onNavigateToMapping={onNavigateToMapping}
            onNavigateToReadiness={onNavigateToReadiness || onNavigateToMapping}
          />

          {/* Smart Mapping Overview */}
          <SmartMappingPreview
            mappings={currentDataset.mappings}
            onNavigateToFullMapping={onNavigateToMapping}
          />

          {/* Dataset Table Preview */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span>Prévia das primeiras linhas da base ativa:</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Visualizando 5 de {currentDataset.rowCount} observações semanais
                </p>
              </div>

              <button
                onClick={onNavigateToMapping}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs self-start sm:self-center"
              >
                <span>Avançar para Mapeamento</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <ScrollableTableWrapper
              minWidth="600px"
              hintText="Arraste para ver todas as colunas do dataset"
              className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-72 overflow-y-auto"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {currentDataset.columns.map(col => (
                      <th key={col} className="p-2.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentDataset.previewRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      {currentDataset.columns.map(col => (
                        <td key={col} className="p-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {typeof row[col] === 'number'
                            ? Number(row[col]).toLocaleString('pt-BR')
                            : String(row[col] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          </div>
        </div>
      )}

      </div>
  );
};
