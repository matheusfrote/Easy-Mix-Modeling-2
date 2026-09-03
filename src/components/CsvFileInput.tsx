import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  RefreshCw,
  Info,
  Layers,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataRow } from '../services/dataValidator';
import { apiClient, UploadResponse } from '../services/apiClient';

interface CsvFileInputProps {
  onUploadSuccess: (response: UploadResponse) => void;
  currentDataset: UploadResponse | null;
  disabled?: boolean;
}

export const CsvFileInput: React.FC<CsvFileInputProps> = ({
  onUploadSuccess,
  currentDataset,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUploadedFileName, setLastUploadedFileName] = useState<string | null>(
    currentDataset ? currentDataset.filename : null
  );
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFile = useCallback(
    async (file: File) => {
      if (!file) return;

      const filename = file.name;
      const extension = filename.split('.').pop()?.toLowerCase();
      const isCsv = extension === 'csv';
      const isXlsx = extension === 'xlsx' || extension === 'xls';

      if (!isCsv && !isXlsx) {
        setErrorMessage('Formato não suportado. Por favor, envie um arquivo CSV (.csv) ou Excel (.xlsx, .xls).');
        return;
      }

      if (file.size === 0) {
        setErrorMessage('O arquivo selecionado está vazio (0 bytes). Verifique o conteúdo do arquivo.');
        return;
      }

      // Max file size limit to prevent client & memory exhaustion DoS (15 MB)
      const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage('O arquivo excede o limite máximo permitido de 15 MB. Por favor, utilize um arquivo menor.');
        return;
      }

      setIsProcessing(true);
      setErrorMessage(null);
      setLastUploadedFileName(filename);
      setFileSizeFormatted(formatFileSize(file.size));

      try {
        if (isXlsx) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet);

          if (!jsonData || jsonData.length === 0) {
            throw new Error('A planilha XLSX selecionada está vazia ou ilegível na primeira aba.');
          }

          const response = await apiClient.uploadData(jsonData, filename);
          onUploadSuccess(response);
        } else {
          // CSV Parsing with PapaParse
          Papa.parse<DataRow>(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: async results => {
              try {
                if (!results.data || results.data.length === 0) {
                  throw new Error('O arquivo CSV está vazio ou em formato inválido. Certifique-se de que a primeira linha contém os nomes das colunas.');
                }

                // Filter out completely blank rows
                const validRows = results.data.filter(row =>
                  Object.values(row).some(v => v !== null && v !== undefined && v !== '')
                );

                if (validRows.length === 0) {
                  throw new Error('Não foram encontradas linhas de dados preenchidas no CSV.');
                }

                const response = await apiClient.uploadData(validRows, filename);
                onUploadSuccess(response);
              } catch (err: any) {
                setErrorMessage(err.message || 'Erro ao validar a estrutura do arquivo CSV.');
              } finally {
                setIsProcessing(false);
              }
            },
            error: err => {
              setErrorMessage(`Erro ao ler arquivo CSV: ${err.message}`);
              setIsProcessing(false);
            }
          });
          return;
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao processar o arquivo. Verifique a formatação.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onUploadSuccess]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

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
    link.setAttribute('download', 'meridian_mmm_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCurrentUploaded = !!currentDataset;

  return (
    <div className="space-y-4" id="csv-file-uploader-container">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id="csv-file-input"
        type="file"
        accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
        className="hidden"
      />

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2.5 transition">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Erro ao carregar arquivo CSV/Excel</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-600 text-xs font-semibold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Drop Zone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-7 text-center transition-all cursor-pointer select-none ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-4 ring-blue-500/10'
            : isCurrentUploaded
            ? 'border-emerald-300 dark:border-emerald-700/70 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        } ${disabled || isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          {/* Icon Badge */}
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-transform ${
              isProcessing
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                : isCurrentUploaded
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 hover:scale-105'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
            ) : isCurrentUploaded ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          {/* Text Instructions */}
          <div>
            {isProcessing ? (
              <>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Lendo e estruturando colunas do arquivo...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Validando séries temporais e calculando métricas de prontidão.
                </p>
              </>
            ) : isCurrentUploaded ? (
              <>
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  <span>Arquivo Carregado com Sucesso!</span>
                </div>
                <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 mt-1">
                  {lastUploadedFileName || currentDataset?.filename} {fileSizeFormatted ? `(${fileSizeFormatted})` : ''}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Clique ou arraste outro arquivo para substituir
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Arraste e solte seu arquivo CSV ou Excel aqui
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ou <span className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2">clique para selecionar do seu computador</span>
                </p>
              </>
            )}
          </div>

          {/* Badges / Metadata */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              Extensões: .csv, .xlsx, .xls
            </span>
            <span>•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              UTF-8 / ISO-8859
            </span>
            <span>•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              Tamanho máx: 50MB
            </span>
          </div>

          {/* Action buttons inside card */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              id="btn-trigger-file-select"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isCurrentUploaded ? 'Substituir por Outro Arquivo' : 'Selecionar Arquivo do Computador'}</span>
            </button>

            <button
              type="button"
              id="btn-download-csv-template"
              onClick={handleDownloadTemplate}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg transition border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-xs"
              title="Baixe um modelo de planilha preenchido no formato aceito pelo Google Meridian"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Baixar Modelo CSV (Template)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Format Tips Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
          <div className="p-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">1. Coluna de Data</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Datas semanais regulares (ex: <code className="text-[10px] bg-slate-200/60 dark:bg-slate-700 px-1 py-0.5 rounded">YYYY-MM-DD</code>).
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
          <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">2. Mídia & Investimento</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Valores numéricos de gasto por canal (ex: Google, Meta, TV).
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
          <div className="p-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">3. Vendas / Faturamento</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Receita total semanal ou volume de pedidos do negócio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
