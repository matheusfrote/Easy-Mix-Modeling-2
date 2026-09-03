import React from 'react';
import {
  Link,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Download,
  Table
} from 'lucide-react';
import { IntegrationSource } from '../../data/integrationSources';

interface IntegrationCardProps {
  source: IntegrationSource;
  isConnected?: boolean;
  onConnect: (source: IntegrationSource) => void;
  onUploadCsvForSource?: (source: IntegrationSource) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  source,
  isConnected = false,
  onConnect,
  onUploadCsvForSource
}) => {
  const getBadgeStyle = () => {
    if (isConnected) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (source.category === 'cloud') {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (source.category === 'templates') {
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  };

  const getSourceIconBg = (id: string) => {
    if (id === 'google-sheets') return 'bg-emerald-600 text-white';
    if (id === 'excel-workbook') return 'bg-teal-600 text-white';
    if (id === 'csv-spreadsheet') return 'bg-blue-600 text-white';
    if (id === 'meridian-template') return 'bg-indigo-600 text-white';
    return 'bg-purple-600 text-white';
  };

  const isGoogleSheets = source.id === 'google-sheets';

  return (
    <div
      id={`integration-card-${source.id}`}
      className={`group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200 shadow-xs hover:shadow-md ${
        isConnected
          ? 'border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-500/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
      } p-5`}
    >
      <div>
        {/* Header: Logo, Name, Category & Connection Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs tracking-wider ${getSourceIconBg(
                source.id
              )}`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                {source.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {source.categoryLabel}
                </span>
                <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {source.connectionType}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 flex items-center gap-1 ${getBadgeStyle()}`}
          >
            {isConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Conectada</span>
              </>
            ) : isGoogleSheets ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Nuvem Ativa</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Planilha Pronta</span>
              </>
            )}
          </span>
        </div>

        {/* Tagline & Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          {source.tagline}
        </p>

        {/* Available Data Points / Columns */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
            <Table className="w-3 h-3 text-emerald-600" /> Colunas & Variáveis Suportadas
          </span>
          <div className="flex flex-wrap gap-1.5">
            {source.availableData.map((item, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200/70 dark:border-slate-700/60"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer & Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px]">Validação Automática</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onConnect(source)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5 ${
              isConnected
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Atualizar</span>
              </>
            ) : isGoogleSheets ? (
              <>
                <Link className="w-3.5 h-3.5 text-emerald-200" />
                <span>Conectar Google Sheets</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Abrir / Importar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
