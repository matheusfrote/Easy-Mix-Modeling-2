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
  TrendingUp
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
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Nenhuma fonte conectada automaticamente ainda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Conecte suas contas de mídia (Google Ads, Meta, TikTok), CRM ou planilhas do Google Sheets para sincronização contínua.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNewSource}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Explorar Catálogo de Integrações</span>
        </button>
      </div>
    );
  }

  const getSourceIconBg = (id: string) => {
    if (id.includes('google') || id.includes('ga4') || id.includes('bigquery')) return 'bg-blue-600 text-white';
    if (id.includes('meta') || id.includes('facebook')) return 'bg-indigo-600 text-white';
    if (id.includes('tiktok')) return 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900';
    if (id.includes('hubspot')) return 'bg-orange-600 text-white';
    if (id.includes('shopify') || id.includes('rd-station')) return 'bg-emerald-600 text-white';
    return 'bg-slate-700 text-white';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Minhas Fontes Conectadas ({sources.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fontes ativas fornecendo séries temporais de investimento e conversão para o MMM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSyncAll}
            disabled={isSyncing}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo'}</span>
          </button>

          <button
            type="button"
            onClick={onAddNewSource}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Fonte</span>
          </button>
        </div>
      </div>

      {/* Grid of Connected Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sources.map(instance => {
          const originalSource = INTEGRATION_SOURCES.find(s => s.id === instance.sourceId) || {
            id: instance.sourceId,
            name: instance.name,
            category: instance.category,
            categoryLabel: 'Conector',
            badgeColor: 'blue',
            connectionType: 'OAuth 2.0' as const,
            availableData: [],
            status: 'available' as const,
            statusLabel: 'Ativo',
            tagline: '',
            description: '',
            metrics: [],
            recommendedGranularity: 'Semanal' as const,
            authRequirements: [],
            sampleColumns: []
          };

          const isHealthy = instance.status === 'active';

          return (
            <div
              key={instance.id}
              className="p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3 hover:border-slate-300 dark:hover:border-slate-600 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs ${getSourceIconBg(
                      instance.sourceId
                    )}`}
                  >
                    {instance.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {instance.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Atualizado {instance.lastSyncedAt}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                    isHealthy
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {isHealthy ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Ativo</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Reautenticar</span>
                    </>
                  )}
                </span>
              </div>

              {/* Stats / Details */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-semibold text-slate-400">Histórico</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                    {instance.historicalWeeks} semanas
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-semibold text-slate-400">Frequência</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">
                    {instance.frequency === 'weekly' ? 'Semanal' : instance.frequency === 'daily' ? 'Diária' : 'Manual'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onManageSource(originalSource)}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Configurar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDisconnectSource(instance.id)}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition p-1"
                  title="Desconectar fonte"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
