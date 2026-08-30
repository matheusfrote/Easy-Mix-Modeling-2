import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  FileCheck,
  Info,
  HelpCircle
} from 'lucide-react';
import { UploadResponse } from '../services/apiClient';
import { StepGuidanceBanner, InfoTooltip } from './ContextualGuide';
import { CsvFileInput } from './CsvFileInput';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';

interface DataUploadViewProps {
  onUploadSuccess: (response: UploadResponse) => void;
  onLoadSynthetic: () => void;
  currentDataset: UploadResponse | null;
  onNavigateToMapping: () => void;
  onOpenFullTour?: () => void;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  onUploadSuccess,
  onLoadSynthetic,
  currentDataset,
  onNavigateToMapping,
  onOpenFullTour
}) => {
  return (
    <div id="data-upload-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Ingestão e Envio de Séries Temporais de Marketing para Modelagem Econométrica Bayesiana Google Meridian
      </h1>

      {/* Contextual Step Guidance Banner */}
      <StepGuidanceBanner
        id="data-upload"
        stepNumber="1"
        title="Etapa 1: Envio dos Seus Dados"
        subtitle="Importe sua planilha de marketing contendo investimentos em mídia e resultados de vendas ao longo do tempo."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '📅', text: 'Histórico Semanal: Datas regulares organizadas por semana (ex: 2024-01-07, 2024-01-14).' },
          { icon: '💰', text: 'Investimentos em Mídia: Valores investidos em cada canal (Google Ads, Meta, TV, etc.).' },
          { icon: '🎯', text: 'Resultados de Negócio: Faturamento total, pedidos ou conversões obtidas.' }
        ]}
        proTip="Dica rápida: Se quiser testar o sistema imediatamente sem enviar seus dados agora, use o botão 'Explorar com Dados de Demonstração'."
      />

      {/* Main Upload Options Container */}
      <div className="space-y-6">
        {/* Upload Zone Card with CsvFileInput */}
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
              CSV ou Planilha Excel
            </span>
          </div>

          {/* Dedicated File Input Component */}
          <CsvFileInput
            onUploadSuccess={onUploadSuccess}
            currentDataset={currentDataset}
          />
        </div>

        {/* Quick Demo Loader Card */}
        <div className="p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Não tem uma planilha pronta agora? Use dados de demonstração
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Carregue um dataset calibrado de 104 semanas com Google Search, Meta Ads, YouTube, TikTok, TV, Promoções e Feriados.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-load-synthetic-action"
            onClick={onLoadSynthetic}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shrink-0 shadow-xs flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explorar com Dados de Demonstração</span>
          </button>
        </div>
      </div>

      {/* Dataset Structure & Preview if loaded */}
      {currentDataset && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <FileCheck className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Seus dados estão prontos para a próxima etapa: {currentDataset.filename}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Identificamos automaticamente a estrutura de colunas e períodos da planilha.
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

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Histórico Identificado</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                {currentDataset.rowCount} semanas
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {currentDataset.rowCount >= 52 ? '✓ Volume ideal' : '⚠️ Volume mínimo'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Colunas Encontradas</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                {currentDataset.columnCount} variáveis
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Mídia, vendas e datas
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Saúde dos Dados</span>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                {currentDataset.readiness.score}/100
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {currentDataset.readiness.isModelReady ? '✓ Pronto para modelar' : 'Requer ajustes'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Origem do Arquivo</span>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                {currentDataset.isSynthetic ? 'Demonstração (Demo)' : currentDataset.filename}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Carregado na memória
              </span>
            </div>
          </div>

          {/* Table Preview */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Prévia das primeiras linhas do arquivo:</span>
              <span className="text-[11px] font-normal text-slate-400">Visualizando 5 de {currentDataset.rowCount} linhas</span>
            </h4>
            <ScrollableTableWrapper minWidth="600px" hintText="Arraste para ver todas as colunas do dataset" className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-72 overflow-y-auto">
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
