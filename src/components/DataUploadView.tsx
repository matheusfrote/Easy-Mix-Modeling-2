import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Link,
  Layers,
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
  TrendingUp,
  Table
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
  const [ingestionMode, setIngestionMode] = useState<'sheets' | 'upload'>('sheets');
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
        }
      } catch (err) {
        console.error('Error loading connected sources:', err);
      }
    };

    loadSavedSources();
  }, []);

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
    setIngestionMode('upload');
    setTimeout(() => {
      const el = document.getElementById('csv-file-uploader-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div id="data-upload-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Data Hub: Ingestão de Séries Temporais e Conexão de Dados via Planilhas (Google Sheets, Excel e CSV)
      </h1>

      {/* Contextual Step Guidance Banner */}
      <StepGuidanceBanner
        id="data-hub-guidance"
        stepNumber="1"
        title="Etapa 1: Data Hub & Conexão via Planilhas"
        subtitle="Importe suas séries temporais de marketing conectando planilhas do Google Sheets ou enviando arquivos Excel/CSV."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '📊', text: 'Google Sheets: Conecte via link de visualização da planilha com atualização em tempo real.' },
          { icon: '📁', text: 'Arquivos Excel & CSV: Envio local de planilhas com detecção automática de datas e canais de mídia.' },
          { icon: '🎯', text: 'Model Readiness Score: Diagnóstico estatístico em tempo real para verificar se as séries estão aptas ao Meridian.' }
        ]}
        proTip="Dica rápida: Se quiser testar o sistema imediatamente sem enviar sua própria planilha agora, use o botão 'Explorar com Dados de Demonstração'."
      />

      {/* Spreadsheet Ingestion Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Sheets / Cloud Mode Button */}
        <button
          onClick={() => setIngestionMode('sheets')}
          className={`relative flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
            ingestionMode === 'sheets'
              ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md shadow-emerald-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {ingestionMode === 'sheets' && (
            <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
            ingestionMode === 'sheets' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            <Link className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className={`text-base font-bold ${ingestionMode === 'sheets' ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
              Google Sheets & Catálogo de Planilhas
            </h3>
            <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              Colaborativo
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${ingestionMode === 'sheets' ? 'text-emerald-800/80 dark:text-emerald-200/70' : 'text-slate-500 dark:text-slate-400'}`}>
            Conecte sua planilha online do Google Sheets pelo link compartilhado ou use templates estruturados recomendados pelo Google Meridian.
          </p>
        </button>

        {/* Local File Upload Button */}
        <button
          onClick={() => setIngestionMode('upload')}
          className={`relative flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
            ingestionMode === 'upload'
              ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md shadow-emerald-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {ingestionMode === 'upload' && (
            <div className="absolute top-4 right-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
            ingestionMode === 'upload' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className={`text-base font-bold mb-1.5 ${ingestionMode === 'upload' ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
            Upload de Planilha Local (Excel & CSV)
          </h3>
          <p className={`text-xs leading-relaxed ${ingestionMode === 'upload' ? 'text-emerald-800/80 dark:text-emerald-200/70' : 'text-slate-500 dark:text-slate-400'}`}>
            Faça upload do seu próprio arquivo Excel (.xlsx, .xls) ou CSV (.csv) com tratamento e validação local segura no navegador.
          </p>
        </button>
      </div>
      
      {/* Sheets / Connectors Mode Content */}
      {ingestionMode === 'sheets' && (
        <div className="space-y-6 animate-fade-in">
          <Connectors 
            connectedSources={connectedSources}
            onConnectedSuccess={handleConnectedSuccess}
            onDisconnect={handleDisconnectSource}
          />
        </div>
      )}

      {/* Local Upload Mode Content */}
      {ingestionMode === 'upload' && (
        <div className="space-y-6 animate-fade-in" id="csv-file-uploader-container">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                  Selecione ou Arraste seu Arquivo de Planilha (CSV / Excel)
                  <InfoTooltip
                    title="Formato de Planilha Recomendado"
                    content="Para o modelo separar com precisão as vendas naturais (orgânicas) do impacto real de cada canal de anúncio, recomendamos um histórico de 52 a 104 semanas (1 a 2 anos)."
                  />
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Envie dados em formato tabular para processar adstock, saturação e retorno por canal com o Google Meridian.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full self-start sm:self-auto border border-emerald-200 dark:border-emerald-800">
                Planilha Excel (.xlsx, .xls) ou CSV (.csv)
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
          <DataQualityReadinessWidget
            readiness={currentDataset.readiness}
            validation={currentDataset.validation}
            mappings={currentDataset.mappings}
            onNavigateToMapping={onNavigateToMapping}
            onNavigateToReadiness={onNavigateToReadiness}
          />

          <SmartMappingPreview
            dataset={currentDataset}
            onNavigateToMapping={onNavigateToMapping}
          />
        </div>
      )}
    </div>
  );
};
