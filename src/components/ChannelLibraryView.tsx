import React, { useState, useMemo } from 'react';
import {
  Library,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Tv,
  Megaphone,
  Users,
  Search as SearchIcon,
  Mail,
  ShoppingBag,
  Newspaper,
  Compass
} from 'lucide-react';
import { CHANNEL_LIBRARY, ChannelCategory, ModelingClassification, ChannelDefinition } from '../data/channelLibrary';

interface ChannelLibraryViewProps {
  onSelectChannelForModel?: (channelName: string) => void;
}

export const ChannelLibraryView: React.FC<ChannelLibraryViewProps> = ({
  onSelectChannelForModel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory | 'All'>('All');
  const [selectedClassification, setSelectedClassification] = useState<ModelingClassification | 'All'>('All');
  const [selectedChannelDetail, setSelectedChannelDetail] = useState<ChannelDefinition | null>(CHANNEL_LIBRARY[0]);

  const categories: { id: ChannelCategory | 'All'; label: string; icon: any; count: number }[] = [
    { id: 'All', label: 'Todos os Canais', icon: Layers, count: CHANNEL_LIBRARY.length },
    { id: 'Paid Media', label: 'Mídia Paga (Paid)', icon: Megaphone, count: CHANNEL_LIBRARY.filter(c => c.category === 'Paid Media').length },
    { id: 'Offline Media', label: 'Mídia Offline', icon: Tv, count: CHANNEL_LIBRARY.filter(c => c.category === 'Offline Media').length },
    { id: 'Creator / Influence', label: 'Creators & Influência', icon: Users, count: CHANNEL_LIBRARY.filter(c => c.category === 'Creator / Influence').length },
    { id: 'Organic', label: 'Orgânico & SEO', icon: SearchIcon, count: CHANNEL_LIBRARY.filter(c => c.category === 'Organic').length },
    { id: 'CRM / Owned', label: 'CRM & Canais Próprios', icon: Mail, count: CHANNEL_LIBRARY.filter(c => c.category === 'CRM / Owned').length },
    { id: 'Comercial', label: 'Comercial & Varejo', icon: ShoppingBag, count: CHANNEL_LIBRARY.filter(c => c.category === 'Comercial').length },
    { id: 'PR / Earned Media', label: 'PR & Imprensa', icon: Newspaper, count: CHANNEL_LIBRARY.filter(c => c.category === 'PR / Earned Media').length },
    { id: 'Controles', label: 'Variáveis de Controle', icon: Compass, count: CHANNEL_LIBRARY.filter(c => c.category === 'Controles').length }
  ];

  const filteredChannels = useMemo(() => {
    return CHANNEL_LIBRARY.filter(item => {
      const matchSearch =
        searchTerm === '' ||
        item.channel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.businessDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchClass = selectedClassification === 'All' || item.modelingType === selectedClassification;

      return matchSearch && matchCat && matchClass;
    });
  }, [searchTerm, selectedCategory, selectedClassification]);

  const getClassificationBadge = (type: ModelingClassification) => {
    switch (type) {
      case 'direct':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            🟢 Modelável Diretamente
          </span>
        );
      case 'caution':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            🟡 Modelável com Cautela
          </span>
        );
      case 'control':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            🔵 Variável de Controle
          </span>
        );
    }
  };

  return (
    <div id="channel-library-view" className="space-y-6 animate-fade-in">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Biblioteca de Benchmarks, Priors Estatísticos e 70+ Canais de Mídia para Marketing Mix Modeling (Google Meridian)
      </h1>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Library className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Biblioteca de Canais & Variáveis de Marketing
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Catálogo completo com mais de 70 canais de mídia online, offline, criadores, canais próprios e fatores econômicos de controle prontos para o modelo.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{CHANNEL_LIBRARY.length} canais</span>
          <span>•</span>
          <span>8 categorias</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar canal por nome, descrição ou alias (ex: Google, Meta, TV, Sazonalidade)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Classification Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 overflow-x-auto">
            <button
              onClick={() => setSelectedClassification('All')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                selectedClassification === 'All'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todos ({CHANNEL_LIBRARY.length})
            </button>
            <button
              onClick={() => setSelectedClassification('direct')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 ${
                selectedClassification === 'direct'
                  ? 'bg-emerald-500 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              🟢 Diretos
            </button>
            <button
              onClick={() => setSelectedClassification('caution')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 ${
                selectedClassification === 'caution'
                  ? 'bg-amber-500 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              🟡 Cautela
            </button>
            <button
              onClick={() => setSelectedClassification('control')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 ${
                selectedClassification === 'control'
                  ? 'bg-blue-500 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              🔵 Controles
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Channel Cards & Selected Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Channel Cards List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Mostrando {filteredChannels.length} canais encontrados</span>
            <span>Clique em um canal para ver a ficha técnica</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredChannels.map(item => {
              const isSelected = selectedChannelDetail?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedChannelDetail(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {item.channel}
                      </h3>
                      {getClassificationBadge(item.modelingType)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                      {item.businessDescription}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Fonte: <strong className="text-slate-600 dark:text-slate-300">{item.source}</strong></span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                      Ver detalhes <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredChannels.length === 0 && (
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nenhum canal encontrado para a busca "{searchTerm}"
              </p>
              <p className="text-xs text-slate-500">Tente buscar por outras palavras-chave ou limpe os filtros.</p>
            </div>
          )}
        </div>

        {/* Right Side: Channel Detailed Specification Card */}
        <div className="lg:col-span-5">
          {selectedChannelDetail ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs sticky top-20 space-y-5">
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {selectedChannelDetail.category}
                  </span>
                  {getClassificationBadge(selectedChannelDetail.modelingType)}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedChannelDetail.channel}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {selectedChannelDetail.businessDescription}
                </p>
              </div>

              {/* JSON Structure Configuration Box (matching user spec) */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Configuração Interna do Motor MMM
                </span>
                <div className="bg-slate-900 text-emerald-400 font-mono text-[11px] p-3 rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>{JSON.stringify(
                    {
                      channel: selectedChannelDetail.channel,
                      category: selectedChannelDetail.category,
                      primary_metric: selectedChannelDetail.primary_metric,
                      secondary_metrics: selectedChannelDetail.secondary_metrics,
                      source: selectedChannelDetail.source,
                      adstock: selectedChannelDetail.adstock,
                      saturation: selectedChannelDetail.saturation,
                      lag: selectedChannelDetail.lag,
                      recommended_granularity: selectedChannelDetail.recommended_granularity,
                      minimum_data_recommended: selectedChannelDetail.minimum_data_recommended
                    },
                    null,
                    2
                  )}</pre>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Efeito Acumulado (Adstock)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedChannelDetail.typicalAdstockDecay || 'Ativo'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Curva de Saturação</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedChannelDetail.saturation ? 'Hill Estimada' : 'Não aplicável'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Granularidade Sugerida</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {selectedChannelDetail.recommended_granularity} (Semanal)
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Histórico Recomendado</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedChannelDetail.minimum_data_recommended}
                  </span>
                </div>
              </div>

              {/* Auto-matching aliases */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Termos & Colunas Reconhecidas Automaticamente
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedChannelDetail.aliases.map(alias => (
                    <span
                      key={alias}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px] rounded border border-slate-200 dark:border-slate-700"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
