import React, { useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Link,
  Calendar,
  Layers,
  Sparkles,
  Download,
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
  Info,
  ExternalLink,
  Table
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { IntegrationSource, ConnectedSourceInstance } from '../../data/integrationSources';
import { apiClient, UploadResponse } from '../../services/apiClient';
import { DataRow } from '../../services/dataValidator';

interface ConnectSourceModalProps {
  source: IntegrationSource;
  isOpen: boolean;
  onClose: () => void;
  onConnectedSuccess: (sourceInstance: ConnectedSourceInstance, uploadRes?: UploadResponse) => void;
  onDisconnect?: (sourceId: string) => void;
  existingInstance?: ConnectedSourceInstance | null;
}

export const ConnectSourceModal: React.FC<ConnectSourceModalProps> = ({
  source,
  isOpen,
  onClose,
  onConnectedSuccess,
  onDisconnect,
  existingInstance
}) => {
  if (!isOpen) return null;

  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connect Google Sheet via shared link
  const handleConnectGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setErrorMessage('Por favor, informe a URL da planilha do Google Sheets.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Acessando planilha do Google Sheets...');

    try {
      let fetchUrl = googleSheetUrl.trim();
      
      // Auto-convert standard Google Sheets edit URL into direct CSV export URL
      if (fetchUrl.includes('docs.google.com/spreadsheets/d/')) {
        const matches = fetchUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          const docId = matches[1];
          const gidMatch = fetchUrl.match(/[#&]gid=([0-9]+)/);
          const gid = gidMatch ? gidMatch[1] : '0';
          fetchUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
        }
      }

      setStatusMessage('Baixando dados tabulares da planilha...');
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(
          'Não foi possível acessar a planilha. Verifique se o compartilhamento está configurado como "Qualquer pessoa com o link pode ler" ou publique a planilha na web.'
        );
      }

      const csvText = await res.text();
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('A planilha retornou conteúdo vazio.');
      }

      setStatusMessage('Validando colunas de séries temporais...');
      Papa.parse<DataRow>(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        complete: async results => {
          try {
            if (!results.data || results.data.length === 0) {
              throw new Error('Nenhuma linha de dados válida encontrada na planilha.');
            }

            const cleanRows = results.data.filter(row => {
              const vals = Object.values(row);
              return vals.some(v => v !== null && v !== undefined && v !== '');
            });

            if (cleanRows.length === 0) {
              throw new Error('A planilha contém apenas linhas em branco.');
            }

            const sheetName = 'Google Sheets (' + (googleSheetUrl.split('/d/')[1]?.substring(0, 8) || 'Planilha') + ')';
            const uploadRes = await apiClient.uploadDataset(cleanRows, sheetName);

            const channelsCount = uploadRes.summary?.media_spend_columns?.length || 1;
            const instance: ConnectedSourceInstance = {
              id: existingInstance?.id || `conn-gsheet-${Date.now()}`,
              sourceId: source.id,
              name: sheetName,
              category: source.category,
              connectedAt: existingInstance?.connectedAt || new Date().toISOString(),
              lastSyncedAt: 'Agora mesmo',
              status: 'active',
              historicalWeeks: cleanRows.length,
              channelsCount,
              totalSpendFound: uploadRes.summary?.total_spend || 0,
              kpiFound: uploadRes.summary?.kpi_column,
              frequency: 'daily',
              historicalPeriod: cleanRows.length >= 104 ? '24m' : '12m'
            };

            onConnectedSuccess(instance, uploadRes);
            onClose();
          } catch (err: any) {
            setErrorMessage(err.message || 'Erro ao processar dados da planilha.');
          } finally {
            setIsProcessing(false);
            setStatusMessage(null);
          }
        },
        error: err => {
          setErrorMessage(`Erro ao decodificar CSV da planilha: ${err.message}`);
          setIsProcessing(false);
          setStatusMessage(null);
        }
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao sincronizar com Google Sheets.');
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  // Upload local Excel or CSV file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const isCsv = extension === 'csv';
    const isXlsx = extension === 'xlsx' || extension === 'xls';

    if (!isCsv && !isXlsx) {
      setErrorMessage('Por favor selecione um arquivo de planilha .xlsx, .xls ou .csv.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Lendo arquivo de planilha...');

    try {
      if (isXlsx) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        if (!rawJson || rawJson.length === 0) {
          throw new Error('A planilha selecionada está vazia na primeira aba.');
        }

        const sanitizedRows: DataRow[] = rawJson.map(row => {
          const cleanObj: DataRow = {};
          for (const key of Object.keys(row)) {
            const lowerKey = key.trim().toLowerCase();
            if (lowerKey === '__proto__' || lowerKey === 'constructor' || lowerKey === 'prototype') {
              continue;
            }
            cleanObj[key] = row[key];
          }
          return cleanObj;
        });

        const uploadRes = await apiClient.uploadDataset(sanitizedRows, file.name);
        const instance: ConnectedSourceInstance = {
          id: existingInstance?.id || `conn-excel-${Date.now()}`,
          sourceId: source.id,
          name: file.name,
          category: source.category,
          connectedAt: new Date().toISOString(),
          lastSyncedAt: 'Agora mesmo',
          status: 'active',
          historicalWeeks: sanitizedRows.length,
          channelsCount: uploadRes.summary?.media_spend_columns?.length || 1,
          totalSpendFound: uploadRes.summary?.total_spend || 0,
          kpiFound: uploadRes.summary?.kpi_column,
          frequency: 'manual',
          historicalPeriod: sanitizedRows.length >= 104 ? '24m' : '12m'
        };

        onConnectedSuccess(instance, uploadRes);
        onClose();
      } else {
        const text = await file.text();
        Papa.parse<DataRow>(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: 'greedy',
          complete: async results => {
            try {
              const cleanRows = results.data.filter(row => {
                const vals = Object.values(row);
                return vals.some(v => v !== null && v !== undefined && v !== '');
              });

              if (cleanRows.length === 0) {
                throw new Error('O arquivo CSV contém apenas linhas em branco.');
              }

              const uploadRes = await apiClient.uploadDataset(cleanRows, file.name);
              const instance: ConnectedSourceInstance = {
                id: existingInstance?.id || `conn-csv-${Date.now()}`,
                sourceId: source.id,
                name: file.name,
                category: source.category,
                connectedAt: new Date().toISOString(),
                lastSyncedAt: 'Agora mesmo',
                status: 'active',
                historicalWeeks: cleanRows.length,
                channelsCount: uploadRes.summary?.media_spend_columns?.length || 1,
                totalSpendFound: uploadRes.summary?.total_spend || 0,
                kpiFound: uploadRes.summary?.kpi_column,
                frequency: 'manual',
                historicalPeriod: cleanRows.length >= 104 ? '24m' : '12m'
              };

              onConnectedSuccess(instance, uploadRes);
              onClose();
            } catch (err: any) {
              setErrorMessage(err.message || 'Erro ao processar CSV.');
            } finally {
              setIsProcessing(false);
              setStatusMessage(null);
            }
          },
          error: err => {
            setErrorMessage(`Erro ao decodificar CSV: ${err.message}`);
            setIsProcessing(false);
            setStatusMessage(null);
          }
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar arquivo de planilha.');
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'date',
      'google_search_spend',
      'meta_ads_spend',
      'youtube_spend',
      'tiktok_spend',
      'tv_spend',
      'promo_discount',
      'holiday_flag',
      'sales_revenue'
    ];

    const sampleRows = [
      ['2023-01-01', '12500.00', '18200.00', '8500.00', '4200.00', '25000.00', '0.05', '1', '245000.00'],
      ['2023-01-08', '11800.00', '17500.00', '8100.00', '4000.00', '25000.00', '0.00', '0', '231000.00'],
      ['2023-01-15', '13200.00', '19000.00', '8900.00', '4500.00', '25000.00', '0.00', '0', '252000.00'],
      ['2023-01-22', '14000.00', '19800.00', '9200.00', '4800.00', '25000.00', '0.10', '0', '268000.00'],
      ['2023-01-29', '12900.00', '18400.00', '8700.00', '4300.00', '25000.00', '0.00', '0', '241000.00']
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [templateHeaders.join(','), ...sampleRows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${source.id}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load demo dataset directly from template
  const handleLoadDemoDataset = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Carregando dados estruturados do template...');
    try {
      const uploadRes = await apiClient.loadSampleDataset();
      const instance: ConnectedSourceInstance = {
        id: existingInstance?.id || `conn-template-${Date.now()}`,
        sourceId: source.id,
        name: `${source.name} (Demonstração)`,
        category: source.category,
        connectedAt: new Date().toISOString(),
        lastSyncedAt: 'Agora mesmo',
        status: 'active',
        historicalWeeks: uploadRes.rowsCount,
        channelsCount: uploadRes.summary?.media_spend_columns?.length || 5,
        totalSpendFound: uploadRes.summary?.total_spend || 0,
        kpiFound: uploadRes.summary?.kpi_column,
        frequency: 'manual',
        historicalPeriod: '24m'
      };

      onConnectedSuccess(instance, uploadRes);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar dados do template.');
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  const isGoogleSheets = source.id === 'google-sheets';
  const isTemplate = source.category === 'templates';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id={`modal-connect-${source.id}`}
        className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{source.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {source.connectionType}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conexão exclusiva via planilha para alimentação do modelo estatístico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Atenção ao processar planilha</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Status Progress */}
          {statusMessage && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-xl flex items-center gap-2.5 animate-pulse">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-medium">{statusMessage}</p>
            </div>
          )}

          {/* Description Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {source.description}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mr-1 self-center">
                Colunas esperadas:
              </span>
              {source.sampleColumns.map((col, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Google Sheets Specific Interface */}
          {isGoogleSheets && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-emerald-600" />
                  URL da Planilha no Google Sheets
                </label>
                <input
                  type="url"
                  value={googleSheetUrl}
                  onChange={e => setGoogleSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  disabled={isProcessing}
                />
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Como compartilhar sua planilha:</span>
                </div>
                <ol className="text-[11px] text-emerald-800 dark:text-emerald-300 list-decimal list-inside space-y-0.5 leading-relaxed pl-1">
                  <li>No Google Sheets, clique no botão azul <strong>Compartilhar</strong> (canto superior direito).</li>
                  <li>Em <em>Acesso geral</em>, altere de <em>Restrito</em> para <strong>Qualquer pessoa com o link</strong> (Leitor).</li>
                  <li>Copie o link e cole no campo acima. Os dados serão lidos e mapeados diretamente!</li>
                </ol>
              </div>
            </div>
          )}

          {/* File Upload (Excel or CSV) Interface */}
          {!isGoogleSheets && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-center cursor-pointer transition group space-y-2"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Clique para selecionar seu arquivo de planilha
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Formatos suportados: Excel (.xlsx, .xls) ou CSV (.csv) com histórico semanal
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Templates Options */}
          {isTemplate && (
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Ações Rápidas com o Modelo
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadDemoDataset}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Usar Dados do Modelo Agora</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Processamento seguro de planilhas</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancelar
            </button>

            {isGoogleSheets ? (
              <button
                type="button"
                onClick={handleConnectGoogleSheet}
                disabled={isProcessing || !googleSheetUrl.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Link className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Conectando...' : 'Conectar Planilha'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Processando...' : 'Carregar Arquivo'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
