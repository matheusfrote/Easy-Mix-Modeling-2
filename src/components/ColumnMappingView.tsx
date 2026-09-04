import React, { useState } from 'react';
import {
  Sliders,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  MousePointer,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Library,
  Layers,
  ChevronDown
} from 'lucide-react';
import { ColumnMapping, ColumnType } from '../types/mmm';
import { StepGuidanceBanner, InfoTooltip } from './ContextualGuide';
import { CHANNEL_LIBRARY } from '../data/channelLibrary';

interface ColumnMappingViewProps {
  mappings: ColumnMapping[];
  onSaveMappings: (newMappings: ColumnMapping[]) => void;
  onNavigateToReadiness: () => void;
  onOpenFullTour?: () => void;
  onNavigateToLibrary?: () => void;
}

const TYPE_OPTIONS: { type: ColumnType; label: string; group: string; description: string; icon: any; color: string }[] = [
  {
    type: 'kpi',
    label: 'Resultado de Negócio (Receita / Vendas / Pedidos)',
    group: 'Resultado',
    description: 'A métrica que seu negócio busca gerar ou aumentar com os investimentos.',
    icon: TrendingUp,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60'
  },
  {
    type: 'media_spend',
    label: 'Investimento em Mídia (Valor em R$)',
    group: 'Investimento',
    description: 'Verba investida diretamente em cada canal de publicidade.',
    icon: DollarSign,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60'
  },
  {
    type: 'media_impressions',
    label: 'Volume de Mídia (Impressões / Exibições)',
    group: 'Investimento',
    description: 'Volume bruto de exibições ou audiência alcançada pelo anúncio.',
    icon: Eye,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60'
  },
  {
    type: 'media_clicks',
    label: 'Volume de Cliques / Engajamento',
    group: 'Investimento',
    description: 'Total de acessos ou cliques gerados pela campanha.',
    icon: MousePointer,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
  },
  {
    type: 'media_reach',
    label: 'Alcance Único de Mídia (Reach)',
    group: 'Investimento',
    description: 'Pessoas únicas alcançadas; requer frequência pareada para modelos reach/frequency.',
    icon: Eye,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60'
  },
  {
    type: 'media_frequency',
    label: 'Frequência Média de Exposição',
    group: 'Investimento',
    description: 'Frequência média pareada ao alcance do mesmo canal.',
    icon: Layers,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
  },
  {
    type: 'geo',
    label: 'Unidade Geográfica',
    group: 'Estrutura',
    description: 'Identificador de região, mercado ou unidade geográfica.',
    icon: Layers,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60'
  },
  {
    type: 'population',
    label: 'População da Região',
    group: 'Estrutura',
    description: 'População correspondente a cada unidade geográfica.',
    icon: Layers,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60'
  },
  {
    type: 'revenue_per_kpi',
    label: 'Receita por Unidade do KPI',
    group: 'Resultado',
    description: 'Conversão de KPI não monetário para receita; não é o KPI principal.',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60'
  },
  {
    type: 'control',
    label: 'Fatores Externos (Preço, Promoções, Sazonalidade)',
    group: 'Fatores Externos',
    description: 'Fatores do mercado ou da empresa que influenciam as vendas além da publicidade.',
    icon: Sparkles,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60'
  },
  {
    type: 'date',
    label: 'Data / Período da Semana',
    group: 'Estrutura',
    description: 'Identificador temporal da linha na série histórica.',
    icon: Calendar,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60'
  },
  {
    type: 'ignore',
    label: 'Ignorar Coluna (Não incluir na análise)',
    group: 'Outros',
    description: 'Colunas que não devem entrar nos cálculos.',
    icon: Sliders,
    color: 'text-slate-500 bg-slate-50 dark:bg-slate-800'
  }
];

export const ColumnMappingView: React.FC<ColumnMappingViewProps> = ({
  mappings,
  onSaveMappings,
  onNavigateToReadiness,
  onOpenFullTour,
  onNavigateToLibrary
}) => {
  const [localMappings, setLocalMappings] = useState<ColumnMapping[]>(mappings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleTypeChange = (colName: string, newType: ColumnType) => {
    const updated = localMappings.map(m => {
      if (m.columnName === colName) {
        return {
          ...m,
          mappedType: newType,
          channelName:
            ['media_spend', 'media_impressions', 'media_clicks', 'media_reach', 'media_frequency'].includes(newType)
              ? m.channelName || colName
              : undefined
        };
      }
      return m;
    });
    setLocalMappings(updated);
    setHasChanges(true);
  };

  const handleChannelSelect = (colName: string, channelId: string) => {
    const selectedChannel = CHANNEL_LIBRARY.find(c => c.id === channelId || c.channel === channelId);
    const updated = localMappings.map(m => {
      if (m.columnName === colName) {
        return {
          ...m,
          channelName: selectedChannel ? selectedChannel.channel : channelId,
          channelCategory: selectedChannel?.category,
          modelingClassification: selectedChannel?.modelingType,
          description: selectedChannel ? `Canal: ${selectedChannel.channel} (${selectedChannel.category})` : m.description
        };
      }
      return m;
    });
    setLocalMappings(updated);
    setHasChanges(true);
  };

  const handleChannelNameChange = (colName: string, newChannelName: string) => {
    const updated = localMappings.map(m => {
      if (m.columnName === colName) {
        return { ...m, channelName: newChannelName };
      }
      return m;
    });
    setLocalMappings(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSaveMappings(localMappings);
    setHasChanges(false);
  };

  const dateCount = localMappings.filter(m => m.mappedType === 'date').length;
  const kpiCount = localMappings.filter(m => m.mappedType === 'kpi').length;
  const spendCount = localMappings.filter(m => m.mappedType === 'media_spend').length;
  const controlCount = localMappings.filter(m => m.mappedType === 'control').length;

  const spendChannels = localMappings.filter(m => m.mappedType === 'media_spend');
  const exposureChannels = new Set(
    localMappings
      .filter(m => m.mappedType === 'media_impressions' || m.mappedType === 'media_clicks')
      .map(m => m.channelName?.trim().toLowerCase())
      .filter(Boolean)
  );
  const allSpendChannelsHaveExposure = spendChannels.every(mapping =>
    Boolean(mapping.channelName && exposureChannels.has(mapping.channelName.trim().toLowerCase()))
  );
  const isReady = dateCount === 1 && kpiCount === 1 && spendCount >= 1 && allSpendChannelsHaveExposure;

  const getBadge = (type?: 'direct' | 'caution' | 'control') => {
    if (type === 'direct') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          🟢 Modelável
        </span>
      );
    }
    if (type === 'caution') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          🟡 Cautela
        </span>
      );
    }
    if (type === 'control') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          🔵 Controle
        </span>
      );
    }
    return null;
  };

  return (
    <div id="column-mapping-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Mapeamento de Colunas, Variáveis de Controle Econométricas e Canais de Mídia para Marketing Mix Modeling
      </h1>

      {/* Contextual Step Guidance Banner */}
      <StepGuidanceBanner
        id="column-mapping"
        stepNumber="2"
        title="Etapa 2: Mapeamento Inteligente de Dados"
        subtitle="Organize as colunas da sua planilha nas categorias fundamentais do seu negócio com suporte à Biblioteca de Canais."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '🎯', text: 'Resultado: Escolha a coluna que representa suas Vendas, Faturamento ou Pedidos.' },
          { icon: '💰', text: 'Investimento: Identifique os canais onde você investiu verba de mídia.' },
          { icon: '🛡️', text: 'Fatores Externos: Preço, promoções e sazonalidade para isolar o efeito natural do negócio.' }
        ]}
        proTip="Dica de clareza: Você pode vincular qualquer coluna aos mais de 70 canais da nossa biblioteca pré-configurada."
      />

      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Mapeamento de Variáveis e Canais
            <InfoTooltip
              title="Como o Modelo Utiliza Isso"
              content="O Google Meridian separa seus dados entre 'Investimento em Mídia' (que tem efeito de retorno e saturação), 'Resultado' (que queremos explicar) e 'Fatores Externos' (que influenciam as vendas naturalmente)."
            />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            O Easy Mix Modeling detectou os papéis das colunas. Você pode confirmar ou personalizar abaixo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToLibrary && (
            <button
              onClick={onNavigateToLibrary}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <Library className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ver Biblioteca de Canais</span>
            </button>
          )}

          {hasChanges && (
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-xs"
            >
              Salvar Mapeamento
            </button>
          )}

          <button
            onClick={() => {
              if (hasChanges) handleSave();
              onNavigateToReadiness();
            }}
            disabled={!isReady}
            className={`font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs ${
              isReady
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Avançar para o Check-up dos Dados</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Checklist */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-100 dark:border-purple-900/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-purple-600 dark:text-purple-400">Data</span>
            <p className="text-xs font-bold text-purple-900 dark:text-purple-200">{dateCount > 0 ? '✓ Identificada' : '✗ Pendente'}</p>
          </div>
          <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Resultado Principal</span>
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{kpiCount > 0 ? '✓ Definido' : '✗ Pendente'}</p>
          </div>
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400">Canais de Mídia</span>
            <p className="text-xs font-bold text-blue-900 dark:text-blue-200">{spendCount} canais</p>
          </div>
          <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-100 dark:border-amber-900/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Fatores Externos</span>
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{controlCount} variáveis</p>
          </div>
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      {!isReady && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Para avançar, defina exatamente 1 coluna de <strong>Data</strong>, exatamente 1 coluna de <strong>Resultado</strong> e associe cada <strong>Investimento em Mídia</strong> a uma coluna de exposição do mesmo canal.
          </span>
        </div>
      )}

      {/* Mapping Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Colunas Encontradas & Classificação ({localMappings.length})
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Coluna Original → Interpretação → Canal Correspondente
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {localMappings.map(col => {
            const currentOption = TYPE_OPTIONS.find(opt => opt.type === col.mappedType) || TYPE_OPTIONS[TYPE_OPTIONS.length - 1];

            return (
              <div key={col.columnName} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                {/* Original Column Info */}
                <div className="space-y-1 lg:w-1/4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {col.columnName}
                    </span>
                    {getBadge(col.modelingClassification)}
                  </div>
                  {col.sampleValues && col.sampleValues.length > 0 && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      Amostra: {col.sampleValues.slice(0, 3).map(v => (typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v))).join(', ')}
                    </p>
                  )}
                </div>

                {/* Role Selector */}
                <div className="flex-1 max-w-sm">
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                    Como o modelo deve interpretar esta coluna:
                  </label>
                  <select
                    value={col.mappedType}
                    onChange={e => handleTypeChange(col.columnName, e.target.value as ColumnType)}
                    className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-blue-500 shadow-xs"
                  >
                    {TYPE_OPTIONS.map(opt => (
                      <option key={opt.type} value={opt.type}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Library Channel Linkage or Custom Channel */}
                {(['media_spend', 'media_impressions', 'media_clicks', 'media_reach', 'media_frequency'].includes(col.mappedType)) ? (
                  <div className="flex-1 max-w-xs space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                      Vincular a Canal da Biblioteca
                    </label>
                    <select
                      value={col.channelName || ''}
                      onChange={e => handleChannelSelect(col.columnName, e.target.value)}
                      className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-blue-500 shadow-xs"
                    >
                      <option value="">-- Personalizado / Não listado --</option>
                      {CHANNEL_LIBRARY.filter(c => c.category !== 'Controles').map(ch => (
                        <option key={ch.id} value={ch.channel}>
                          {ch.channel} ({ch.category})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={col.channelName || ''}
                      onChange={e => handleChannelNameChange(col.columnName, e.target.value)}
                      placeholder="Nome amigável no relatório"
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-slate-800 dark:text-slate-200 focus:outline-blue-500"
                    />
                  </div>
                ) : (
                  <div className="hidden lg:block flex-1 max-w-xs text-right">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      {col.description || currentOption.description}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
