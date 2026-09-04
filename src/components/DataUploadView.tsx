import React from 'react';
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
  Plus,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { UploadResponse } from '../services/apiClient';
import { StepGuidanceBanner, InfoTooltip } from './ContextualGuide';
import { CsvFileInput } from './CsvFileInput';
import { DataQualityReadinessWidget } from './integration/DataQualityReadinessWidget';
import { SmartMappingPreview } from './integration/SmartMappingPreview';

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
  return (
    <div id="data-upload-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      <h1 className="sr-only">
        Data Hub: Ingestão de Séries Temporais (CSV)
      </h1>

      <StepGuidanceBanner
        id="data-hub-guidance"
        stepNumber="1"
        title="Etapa 1: Data Hub"
        subtitle="Importe suas séries temporais reais de marketing em Excel ou CSV."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '📁', text: 'Arquivos Excel & CSV: Envio local de planilhas com detecção automática de datas e canais de mídia.' },
          { icon: '🎯', text: 'Model Readiness Score: Diagnóstico estatístico em tempo real para verificar se as séries estão aptas ao Meridian.' }
        ]}
        proTip="Cada canal precisa de uma coluna de investimento e outra de exposição; investimento nunca é tratado como exposição."
      />

      <div className="space-y-6 animate-fade-in" id="csv-file-uploader-container">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                Selecione ou Arraste seu Arquivo de Planilha (CSV)
                <InfoTooltip
                  title="Formato de Planilha Recomendado"
                  content="Para o modelo separar com precisão as vendas naturais (orgânicas) do impacto real de cada canal de anúncio, recomendamos um histórico de 52 a 104 semanas (1 a 2 anos)."
                />
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Envie dados em formato tabular para processar adstock, saturação e retorno por canal com o Google Meridian.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                .csv
              </span>
            </div>
          </div>
          
          <CsvFileInput
            onUploadSuccess={onUploadSuccess}
            currentDataset={currentDataset}
          />
        </div>
      </div>

      {currentDataset && (
        <div className="space-y-6 pt-2">
          <DataQualityReadinessWidget
            readiness={currentDataset.readiness}
            validation={currentDataset.validation}
            mappings={currentDataset.mappings}
            rowCount={currentDataset.rowCount}
            filename={currentDataset.filename}
            onNavigateToMapping={onNavigateToMapping}
            onNavigateToReadiness={onNavigateToReadiness}
          />

          <SmartMappingPreview
            mappings={currentDataset.mappings || []}
            onNavigateToFullMapping={onNavigateToMapping}
          />
        </div>
      )}
    </div>
  );
};
