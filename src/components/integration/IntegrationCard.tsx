import React from 'react';
import {
  ExternalLink,
  Link,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Sparkles
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
  const getBadgeStyle = (status: string, isLive?: boolean) => {
    if (isConnected) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (isLive) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (status === 'csv_template') {
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  };

  const getSourceIconBg = (id: string) => {
    if (id.includes('google') || id.includes('ga4') || id.includes('bigquery')) {
      return 'bg-blue-600 text-white';
    }
    if (id.includes('meta') || id.includes('facebook')) {
      return 'bg-indigo-600 text-white';
    }
    if (id.includes('tiktok')) {
      return 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900';
    }
    if (id.includes('hubspot')) {
      return 'bg-orange-600 text-white';
    }
    if (id.includes('shopify') || id.includes('rd-station')) {
      return 'bg-emerald-600 text-white';
    }
    if (id.includes('vtex') || id.includes('adobe')) {
      return 'bg-rose-600 text-white';
    }
    if (id.includes('linkedin')) {
      return 'bg-sky-700 text-white';
    }
    return 'bg-slate-700 text-white';
  };

  const getSourceInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div
      id={`integration-card-${source.id}`}
      className={`group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200 shadow-xs hover:shadow-md ${
        isConnected
          ? 'border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-500/20'
          : source.supportsLiveConnect
          ? 'border-blue-300 dark:border-blue-700/70 hover:border-blue-400'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
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
              {getSourceInitials(source.name)}
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
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 flex items-center gap-1 ${getBadgeStyle(
              source.status,
              source.supportsLiveConnect
            )}`}
          >
            {isConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Conectado</span>
              </>
            ) : (source.supportsLiveConnect || source.status === 'csv_template') ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Importação Automática</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Em breve</span>
              </>
            )}
          </span>
        </div>

        {/* Tagline & Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          {source.tagline}
        </p>

        {/* Available Data Points */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500" /> API Extract (Automático)
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
          <span className="text-[10px]">OAuth 2.0 (Read-only)</span>
        </div>

        <div className="flex items-center gap-2">
          {source.status === 'csv_template' && onUploadCsvForSource && (
            <button
              type="button"
              onClick={() => onUploadCsvForSource(source)}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1"
              title="Carregar arquivo CSV se preferir"
            >
              <FileSpreadsheet className="w-3 h-3 text-slate-500" />
              <span>CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onConnect(source)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5 ${
              isConnected
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                : (source.supportsLiveConnect || source.status === 'csv_template')
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Gerenciar</span>
              </>
            ) : (source.supportsLiveConnect || source.status === 'csv_template') ? (
              <>
                <Link className="w-3.5 h-3.5 text-blue-200" />
                <span>Conectar API 1-Clique</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Ver Requisitos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
