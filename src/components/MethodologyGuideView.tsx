import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  TrendingUp,
  Clock,
  PieChart,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  Sliders,
  Target,
  Library,
  Search,
  Layers,
  Megaphone,
  Tv,
  Users,
  Search as SearchIcon,
  Mail,
  ShoppingBag,
  Newspaper,
  Compass,
  ArrowRight,
  Filter,
  X,
  ChevronDown
} from 'lucide-react';
import { CHANNEL_LIBRARY, ChannelCategory, ModelingClassification, ChannelDefinition } from '../data/channelLibrary';

interface MethodologyGuideViewProps {
  onNavigateToMapping?: () => void;
}

export const MethodologyGuideView: React.FC<MethodologyGuideViewProps> = ({ onNavigateToMapping }) => {
  // Channel search and selector state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory | 'All'>('All');
  const [selectedClassification, setSelectedClassification] = useState<ModelingClassification | 'All'>('All');
  const [selectedChannel, setSelectedChannel] = useState<ChannelDefinition>(CHANNEL_LIBRARY[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Dynamic filter for autocomplete options
  const matchingChannels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return CHANNEL_LIBRARY.filter(item => {
      const matchSearch =
        query === '' ||
        item.channel.toLowerCase().includes(query) ||
        item.businessDescription.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.aliases.some(a => a.toLowerCase().includes(query));

      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchClass = selectedClassification === 'All' || item.modelingType === selectedClassification;

      return matchSearch && matchCategory && matchClass;
    });
  }, [searchQuery, selectedCategory, selectedClassification]);

  const handleSelectChannel = (channel: ChannelDefinition) => {
    setSelectedChannel(channel);
    setSearchQuery(channel.channel);
    setIsDropdownOpen(false);
  };

  const getClassificationBadge = (type: ModelingClassification) => {
    switch (type) {
      case 'direct':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            🟢 Modelável Diretamente
          </span>
        );
      case 'caution':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            🟡 Modelável com Cautela
          </span>
        );
      case 'control':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            🔵 Variável de Controle
          </span>
        );
    }
  };

  return (
    <div id="methodology-guide-view" className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Guia Metodológico e Biblioteca de 70+ Canais de Mídia para Marketing Mix Modeling (Google Meridian)
      </h1>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: FUNDAMENTOS TEÓRICOS & METODOLOGIA MMM                           */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-indigo-500/30 backdrop-blur-xs rounded-xl border border-indigo-400/20 text-indigo-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Metodologia &amp; Fundamentos
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Como o Easy Mix Modeling calcula seus resultados
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Marketing Mix Modeling (MMM) profissional traduzido em linguagem de negócios. O modelo analisa como seus investimentos, canais e fatores externos se relacionam com suas vendas ao longo do tempo.
          </p>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pillar 1 */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Efeito Acumulado no Tempo (Adstock)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Algumas campanhas continuam influenciando o resultado depois que o anúncio é veiculado. O modelo mede quanto do impacto acontece na semana atual e quanto repercute nas semanas seguintes.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Retorno Decrescente (Saturação de Hill)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Investir mais em um canal nem sempre gera o mesmo retorno. O modelo identifica a curva de eficiência de cada mídia e aponta quando o próximo real começará a render menos.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Fatores Externos e Contexto
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              O modelo isola variáveis como sazonalidade natural, alterações de preço, feriados bancários, Black Friday, inflação e concorrência para não atribuir mérito indevido à mídia.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Transparência com Incerteza Bayesiana
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Nenhum modelo de marketing é uma bola de cristal 100% exata. Nós sempre apresentamos os resultados como faixas prováveis (intervalos de credibilidade) para decisões seguras.
            </p>
          </div>
        </div>

        {/* Translation Dictionary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Dicionário de Negócios: Como traduzimos a econometria
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Complexidade estatística por trás dos panos, clareza direta para quem toma decisões de negócio.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {[
              {
                technical: 'Adstock Geométrico / Weibull Decay',
                business: 'Efeito acumulado ao longo das semanas',
                explanation: 'Quanto tempo o impacto do anúncio continua reverberando nas vendas após a veiculação.'
              },
              {
                technical: 'Saturação de Hill / Diminishing Returns',
                business: 'Retorno decrescente / Espaço para crescimento',
                explanation: 'Indica se aumentar o orçamento trará ganhos proporcionais ou se o público já está saturado.'
              },
              {
                technical: 'Marginal ROI (mROI)',
                business: 'Retorno do Próximo Real Investido',
                explanation: 'Quanto 1 real adicional investido agora trará de receita incremental no canal.'
              },
              {
                technical: 'Posterior Distribution & Credible Intervals (CI)',
                business: 'Intervalo provável do resultado',
                explanation: 'A faixa estatística onde o resultado real mais provavelmente se encontra (ex: 2,1x entre 1,7x e 2,6x).'
              },
              {
                technical: 'Baseline / Demanda Base',
                business: 'Vendas orgânicas sem investimento em mídia',
                explanation: 'Volume de receita que a empresa teria faturado mesmo com zero investimento em publicidade.'
              },
              {
                technical: 'Multicolinearidade & VIF',
                business: 'Sobreposição de canais simultâneos',
                explanation: 'Quando dois canais sobem juntos (ex: Google + Meta no mesmo mês), o que exige calibração de priors.'
              }
            ].map((item, idx) => (
              <div key={idx} className="py-3 grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-4">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 line-through">
                    {item.technical}
                  </span>
                  <span className="block font-bold text-slate-900 dark:text-white mt-0.5">
                    👉 {item.business}
                  </span>
                </div>
                <div className="md:col-span-8 text-slate-600 dark:text-slate-400">
                  {item.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Core Questions */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            As 4 Perguntas Fundamentais que o Easy Mix Modeling Responde
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                1. Quanto meu marketing está gerando?
              </span>
              <p className="text-slate-500 dark:text-slate-400">
                Isola a receita incremental estrita do marketing da demanda orgânica base.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                2. Quais canais realmente estão contribuindo?
              </span>
              <p className="text-slate-500 dark:text-slate-400">
                Ranking de ROAS incremental por canal e decomposição percentual de cada mídia.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                3. Onde estou desperdiçando dinheiro?
              </span>
              <p className="text-slate-500 dark:text-slate-400">
                Curvas de saturação que acusam canais com retorno marginal decrescente.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                4. Onde devo investir meu próximo real?
              </span>
              <p className="text-slate-500 dark:text-slate-400">
                Simulador com equalização de retorno marginal e projeção de ganho em R$.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SEÇÃO 2: BIBLIOTECA DE 70+ CANAIS & PARÂMETROS ECONOMÉTRICOS (FINAL)      */}
      {/* ========================================================================= */}
      <section className="space-y-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800">
        {/* Library Banner Header */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-7 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-indigo-500/30 rounded-lg text-indigo-300">
              <Library className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Catálogo Econométrico Meridian
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Biblioteca de Parâmetros &amp; Priors de 70+ Canais
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Consulte como cada canal de marketing deve ser modelado no Google Meridian: classificação econométrica, métrica principal, decaimento de adstock estimado, saturação de Hill e nomes recomendados de colunas.
          </p>
        </div>

        {/* Interactive Channel Selector with Live Autocomplete */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Selecione ou Digite o Nome do Canal
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comece a digitar abaixo para buscar entre 70+ canais de mídia, influenciadores, orgânico e controles.
              </p>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700">
              {matchingChannels.length} de {CHANNEL_LIBRARY.length} canais encontrados
            </span>
          </div>

          {/* Search Input & Dropdown Container */}
          <div ref={searchContainerRef} className="relative">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Digite para buscar: Google Search, Meta Ads, TikTok, TV, Influenciadores, Preço, Sazonalidade..."
                className="w-full pl-11 pr-20 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-inner"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsDropdownOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Floating Autocomplete Dropdown List */}
            {isDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {matchingChannels.length > 0 ? (
                  matchingChannels.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectChannel(item)}
                      className={`w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between gap-3 transition ${
                        selectedChannel.id === item.id ? 'bg-indigo-50/80 dark:bg-indigo-950/60' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {item.channel}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.businessDescription}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                          Decaimento: {item.typicalAdstockDecay || 'Médio'}
                        </span>
                        {item.modelingType === 'direct' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Modelável Diretamente" />
                        )}
                        {item.modelingType === 'caution' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" title="Modelável com Cautela" />
                        )}
                        {item.modelingType === 'control' && (
                          <span className="w-2 h-2 rounded-full bg-blue-500" title="Variável de Controle" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    Nenhum canal encontrado para "<span className="font-semibold text-slate-700 dark:text-slate-300">{searchQuery}</span>". Tente outro termo ou limpe os filtros.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Filter Category Pills */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Filtrar por Categoria:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsDropdownOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Popular Channels */}
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Canais Populares:</span>
            {[
              'Google Search Ads',
              'Meta Ads (Facebook & Instagram)',
              'YouTube Ads',
              'TikTok Ads',
              'TV Aberta',
              'Influenciadores & Creators',
              'Email Marketing & Automação',
              'Sazonalidade & Eventos do Varejo'
            ].map((name) => {
              const item = CHANNEL_LIBRARY.find(c => c.channel === name);
              if (!item) return null;
              return (
                <button
                  key={name}
                  onClick={() => handleSelectChannel(item)}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Selected Channel Dossier Card */}
        {selectedChannel && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedChannel.channel}
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                    {selectedChannel.category}
                  </span>
                  {getClassificationBadge(selectedChannel.modelingType)}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
                  {selectedChannel.businessDescription}
                </p>
              </div>

              {onNavigateToMapping && (
                <button
                  onClick={onNavigateToMapping}
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>Mapear este Canal na sua Planilha</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grid with Econometric Priors & Modeling Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Métrica Principal no Modelo
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {selectedChannel.primary_metric === 'spend' ? '💰 Investimento Financeiro (Spend)' : selectedChannel.primary_metric}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Fonte típica: {selectedChannel.source}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Decaimento de Adstock Estimado
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedChannel.typicalAdstockDecay || 'Médio (2-3 semanas)'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {selectedChannel.adstock ? 'Efeito acumulado ativo' : 'Sem efeito acumulado'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Curva de Saturação de Hill
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedChannel.saturation ? 'Sim (Retornos Decrescentes)' : 'Não calibrado'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {selectedChannel.saturation ? 'Calcula ROI Marginal por nível de verba' : 'Relação predominantemente linear'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Granularidade &amp; Janela
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {selectedChannel.recommended_granularity === 'weekly' ? 'Semanal (Recomendado)' : selectedChannel.recommended_granularity}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Mínimo: {selectedChannel.minimum_data_recommended}
                </p>
              </div>
            </div>

            {/* CSV Column Aliases & Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  Aliases Comuns no CSV (Reconhecimento Automático)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nossa IA reconhece automaticamente estes nomes de cabeçalho na sua planilha:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedChannel.aliases.map((alias, idx) => (
                    <code
                      key={idx}
                      className="px-2 py-0.5 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono"
                    >
                      {alias}
                    </code>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Métricas Secundárias de Apoio
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Variáveis úteis para diagnóstico de saturação e custo por unidade:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedChannel.secondary_metrics.map((metric, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[11px] font-medium uppercase"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

