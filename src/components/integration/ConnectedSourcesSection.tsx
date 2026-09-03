import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Trash2,
  Plus,
  Layers,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Link
} from 'lucide-react';
import { ConnectedSourceInstance, IntegrationSource, INTEGRATION_SOURCES } from '../../data/integrationSources';

interface ConnectedSourcesSectionProps {
  sources: ConnectedSourceInstance[];
  onManageSource: (source: IntegrationSource) => void;
  onDisconnectSource: (sourceId: string) => void;
  onSyncAll: () => void;
  isSyncing?: boolean;
  onAddNewSource: () => void;
}

export const ConnectedSourcesSection: React.FC<ConnectedSourcesSectionProps> = ({
  sources,
  onManageSource,
  onDisconnectSource,
  onSyncAll,
  isSyncing = false,
  onAddNewSource
}) => {
  if (sources.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Nenhuma planilha conectada ainda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Conecte uma planilha do Google Sheets via link ou envie arquivos Excel (.xlsx) e CSV para iniciar o treinamento do modelo.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNewSource}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Explorar Opções de Planilha</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Minhas Planilhas Conectadas ({sources.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Planilhas ativas fornecendo séries temporais de investimento e conversão para o MMM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSyncAll}
            disabled={isSyncing}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{isSyncing ? 'Atualizando...' : 'Atualizar Dados'}</span>
          </button>

          <button
            type="button"
            onClick={onAddNewSource}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Planilha</span>
          </button>
        </div>
      </div>

      {/* List of Connected Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map(source => {
          const rawSource = INTEGRATION_SOURCES.find(s => s.id === source.sourceId) || {
            name: source.name,
            connectionType: 'Planilha',
            categoryLabel: 'Planilha',
            id: source.sourceId
          };

          const isGoogleSheets = source.sourceId === 'google-sheets' || source.name.toLowerCase().includes('google');

          return (
            <div
              key={source.id}
              className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between gap-3 relative group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {source.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isGoogleSheets ? 'Google Sheets (Nuvem)' : 'Arquivo de Planilha'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Conectada
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDisconnectSource(source.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Desconectar planilha"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                <div className="text-[10px]">
                  <span className="text-slate-400 block">Semanas</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{source.historicalWeeks}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-slate-400 block">Canais</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{source.channelsCount}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-slate-400 block">Última leitura</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{source.lastSyncedAt}</span>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => onManageSource(rawSource as any)}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                >
                  <span>Gerenciar Planilha</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
