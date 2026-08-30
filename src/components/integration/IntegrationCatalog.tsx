import React, { useState, useMemo } from 'react';
import { Search, Filter, Layers, Database, Sparkles, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import {
  INTEGRATION_CATEGORIES,
  INTEGRATION_SOURCES,
  IntegrationCategory,
  IntegrationSource,
  ConnectedSourceInstance
} from '../../data/integrationSources';
import { IntegrationCard } from './IntegrationCard';

interface IntegrationCatalogProps {
  onConnectSource: (source: IntegrationSource) => void;
  onUploadCsvForSource?: (source: IntegrationSource) => void;
  connectedSources?: ConnectedSourceInstance[];
}

export const IntegrationCatalog: React.FC<IntegrationCatalogProps> = ({
  onConnectSource,
  onUploadCsvForSource,
  connectedSources = []
}) => {
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate category counts
  const categoriesWithCounts = useMemo(() => {
    return INTEGRATION_CATEGORIES.map(cat => {
      if (cat.id === 'all') {
        return { ...cat, count: INTEGRATION_SOURCES.length };
      }
      const count = INTEGRATION_SOURCES.filter(s => s.category === cat.id).length;
      return { ...cat, count };
    });
  }, []);

  // Filter sources
  const filteredSources = useMemo(() => {
    return INTEGRATION_SOURCES.filter(source => {
      const matchesCategory = selectedCategory === 'all' || source.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      const matchesSearch =
        source.name.toLowerCase().includes(query) ||
        source.tagline.toLowerCase().includes(query) ||
        source.description.toLowerCase().includes(query) ||
        source.categoryLabel.toLowerCase().includes(query) ||
        source.availableData.some(d => d.toLowerCase().includes(query)) ||
        source.sampleColumns.some(c => c.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const connectedIds = useMemo(() => {
    return new Set(connectedSources.map(s => s.sourceId));
  }, [connectedSources]);

  return (
    <div className="space-y-5" id="integration-catalog-container">
      {/* Search & Category Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Catálogo de Fontes de Dados & Mídia</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Conecte plataformas de anúncios, analytics, CRMs, e-commerces e bancos para alimentar o MMM.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              id="integration-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar fonte (ex: Google, Meta, VTEX)..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categoriesWithCounts.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                id={`cat-filter-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Grid */}
      {filteredSources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map(source => (
            <IntegrationCard
              key={source.id}
              source={source}
              isConnected={connectedIds.has(source.id)}
              onConnect={onConnectSource}
              onUploadCsvForSource={onUploadCsvForSource}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhuma fonte encontrada para "{searchQuery}"
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tente outro termo ou limpe os filtros para ver todas as plataformas de mídia e dados disponíveis.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpar Filtros e Buscar Todas as Fontes
          </button>
        </div>
      )}
    </div>
  );
};
