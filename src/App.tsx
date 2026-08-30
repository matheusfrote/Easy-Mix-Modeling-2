/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
import { apiClient, UploadResponse } from './services/apiClient';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults, DateRangeFilter } from './types/mmm';
import { useIsMobile, getResponsiveOverflowClass } from './utils/responsive';
import { updatePageSeo, getNavViewFromHash } from './services/seoManager';
import { useAuth } from './context/AuthContext';
import localforage from 'localforage';

// Lazy load non-initial views to dramatically reduce initial bundle parse time
const LandingPage = lazy(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const DataUploadView = lazy(() => import('./components/DataUploadView').then(m => ({ default: m.DataUploadView })));
const ColumnMappingView = lazy(() => import('./components/ColumnMappingView').then(m => ({ default: m.ColumnMappingView })));
const DataReadinessView = lazy(() => import('./components/DataReadinessView').then(m => ({ default: m.DataReadinessView })));
const ModelConfigView = lazy(() => import('./components/ModelConfigView').then(m => ({ default: m.ModelConfigView })));
const ChannelPerformanceView = lazy(() => import('./components/ChannelPerformanceView').then(m => ({ default: m.ChannelPerformanceView })));
const BudgetOptimizerView = lazy(() => import('./components/BudgetOptimizerView').then(m => ({ default: m.BudgetOptimizerView })));
const WhatIfSimulatorView = lazy(() => import('./components/WhatIfSimulatorView').then(m => ({ default: m.WhatIfSimulatorView })));
const InsightsView = lazy(() => import('./components/InsightsView').then(m => ({ default: m.InsightsView })));
const ChannelLibraryView = lazy(() => import('./components/ChannelLibraryView').then(m => ({ default: m.ChannelLibraryView })));
const MethodologyGuideView = lazy(() => import('./components/MethodologyGuideView').then(m => ({ default: m.MethodologyGuideView })));
const ReportView = lazy(() => import('./components/ReportView').then(m => ({ default: m.ReportView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const TourGuideModal = lazy(() => import('./components/TourGuideModal').then(m => ({ default: m.TourGuideModal })));

const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center p-16 text-slate-400 dark:text-slate-500">
    <div className="flex items-center gap-2.5 text-xs font-semibold">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span>Preparando ambiente...</span>
    </div>
  </div>
);

const ProtectedRouter = ({ 
  children, 
  currentView, 
  onRedirectToLanding 
}: { 
  children: React.ReactNode, 
  currentView: NavView, 
  onRedirectToLanding: () => void 
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && currentView !== 'landing') {
      onRedirectToLanding();
    }
  }, [isAuthenticated, isLoading, currentView, onRedirectToLanding]);

  if (isLoading) {
    return (
      <div className="flex w-full min-h-[100dvh] h-[100dvh] bg-slate-100 dark:bg-slate-950 items-center justify-center">
        <ViewLoadingFallback />
      </div>
    );
  }

  if (!isAuthenticated && currentView !== 'landing') {
    return (
      <div className="flex w-full min-h-[100dvh] h-[100dvh] bg-slate-100 dark:bg-slate-950 items-center justify-center">
        <ViewLoadingFallback />
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentView, setCurrentView] = useState<NavView>(() => {
    const hashView = getNavViewFromHash();
    if (hashView) return hashView;
    return 'landing';
  });
  const [currentDataset, setCurrentDataset] = useState<UploadResponse | null>(null);
  const [modelResults, setModelResults] = useState<MeridianModelResults | null>(null);
  const [isModelRunning, setIsModelRunning] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    preset: 'all',
    startDate: '',
    endDate: ''
  });

  // Dynamic SEO metadata update and URL hash sync on view changes
  useEffect(() => {
    updatePageSeo(currentView);
    const expectedHash = `#/${currentView}`;
    if (window.location.hash !== expectedHash) {
      window.history.replaceState(null, '', expectedHash);
    }
  }, [currentView]);

  // Listen to browser forward/back buttons via hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const view = getNavViewFromHash();
      if (view && view !== currentView) {
        setCurrentView(view);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('easy_mix_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Extract all available timeline dates from the fitted model diagnostics
  const availableDates = useMemo(() => {
    if (modelResults?.diagnostics?.timeSeriesFit?.length) {
      return modelResults.diagnostics.timeSeriesFit.map(t => t.date);
    }
    return [];
  }, [modelResults]);

  // Sync date bounds when model results are loaded
  useEffect(() => {
    if (availableDates.length > 0) {
      setDateRange(prev => ({
        ...prev,
        startDate: prev.startDate && prev.startDate >= availableDates[0] ? prev.startDate : availableDates[0],
        endDate: prev.endDate && prev.endDate <= availableDates[availableDates.length - 1] ? prev.endDate : availableDates[availableDates.length - 1]
      }));
    }
  }, [availableDates]);

  // Sync theme with DOM and localStorage
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
      localStorage.setItem('easy_mix_theme', theme);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const loadInitialData = async () => {
    try {
      const data = await apiClient.loadSyntheticData();
      setCurrentDataset(data);
      const results = await apiClient.getModelResults();
      setModelResults(results);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  // Hydrate state from localforage on mount
  useEffect(() => {
    const hydrateState = async () => {
      try {
        const savedDataset = await localforage.getItem<UploadResponse>('easy_mix_dataset');
        const savedModelResults = await localforage.getItem<MeridianModelResults>('easy_mix_model_results');
        const savedView = await localforage.getItem<NavView>('easy_mix_current_view');
        const savedDateRange = await localforage.getItem<DateRangeFilter>('easy_mix_date_range');

        if (savedDataset) setCurrentDataset(savedDataset);
        if (savedModelResults) setModelResults(savedModelResults);
        if (savedView && !getNavViewFromHash()) setCurrentView(savedView);
        if (savedDateRange) setDateRange(savedDateRange);

        if (!savedDataset) {
          await loadInitialData();
        }
      } catch (err) {
        console.error('Failed to hydrate state from localForage', err);
        await loadInitialData();
      } finally {
        setIsHydrated(true);
      }
    };

    hydrateState();
  }, []);

  // Save states to localForage when they change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      localforage.setItem('easy_mix_current_view', currentView).catch(console.error);
    }
  }, [currentView, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      if (currentDataset) {
        localforage.setItem('easy_mix_dataset', currentDataset).catch(console.error);
      } else {
        localforage.removeItem('easy_mix_dataset').catch(console.error);
      }
    }
  }, [currentDataset, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      if (modelResults) {
        localforage.setItem('easy_mix_model_results', modelResults).catch(console.error);
      } else {
        localforage.removeItem('easy_mix_model_results').catch(console.error);
      }
    }
  }, [modelResults, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localforage.setItem('easy_mix_date_range', dateRange).catch(console.error);
    }
  }, [dateRange, isHydrated]);

  // Check if tour was already shown/dismissed, or show on first visit
  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem('meridian_tour_dismissed');
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleUploadSuccess = (response: UploadResponse) => {
    setCurrentDataset(response);
    showToast('Planilha carregada e analisada com sucesso!');
    setCurrentView('readiness');
  };

  const handleLoadSynthetic = async () => {
    try {
      showToast('Carregando dataset demonstrativo de 24 meses...');
      const data = await apiClient.loadSyntheticData();
      setCurrentDataset(data);

      const defaultModelConfig: MeridianModelConfig = {
        dateColumn: 'date',
        kpiColumn: 'revenue',
        mediaChannels: [
          { spendColumn: 'google_ads_spend', impressionsColumn: 'google_ads_impressions', channelName: 'Google Ads', channelType: 'search' },
          { spendColumn: 'meta_ads_spend', impressionsColumn: 'meta_impressions', channelName: 'Meta Ads', channelType: 'social' },
          { spendColumn: 'youtube_spend', impressionsColumn: 'youtube_impressions', channelName: 'YouTube', channelType: 'video' },
          { spendColumn: 'tiktok_spend', channelName: 'TikTok', channelType: 'social' },
          { spendColumn: 'tv_spend', channelName: 'TV', channelType: 'tv' }
        ],
        controlColumns: ['holiday', 'promotion', 'economic_index'],
        seasonalityFourierTerms: 2,
        mcmcChains: 4,
        mcmcDraws: 1000,
        mcmcWarmup: 500,
        targetKpiType: 'revenue',
        priors: {}
      };

      setIsModelRunning(true);
      const res = await apiClient.runModel(defaultModelConfig);
      setModelResults(res);
      setIsModelRunning(false);
      showToast('Dataset demonstrativo e modelo ajustados com sucesso!');
    } catch (err: any) {
      setIsModelRunning(false);
      console.error('Error loading synthetic:', err);
    }
  };

  const handleSaveMappings = async (newMappings: ColumnMapping[]) => {
    try {
      await apiClient.saveMappings(newMappings);
      if (currentDataset) {
        const valRes = await apiClient.validateData(undefined, newMappings);
        setCurrentDataset({
          ...currentDataset,
          mappings: newMappings,
          validation: valRes.validation,
          readiness: valRes.readiness
        });
      }
      showToast('Mapeamento de colunas salvo com sucesso!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSanitizeData = async () => {
    if (!currentDataset) return;
    try {
      showToast('Executando saneamento e imputação automática dos dados...');
      const result = await apiClient.sanitizeData(undefined, currentDataset.mappings);
      setCurrentDataset({
        ...currentDataset,
        previewRows: result.cleanedRows.slice(0, 10),
        rowCount: result.cleanedRows.length,
        validation: result.validation,
        readiness: result.readiness
      });
      showToast(`Saneamento concluído: ${result.fixedIssues.length} correções aplicadas!`);
    } catch (err: any) {
      showToast(`Erro no saneamento: ${err.message || 'Falha ao tratar dados'}`);
    }
  };

  const handleRevalidateData = async () => {
    if (!currentDataset) return;
    try {
      showToast('Revalidando integridade dos dados...');
      const valRes = await apiClient.validateData(undefined, currentDataset.mappings);
      setCurrentDataset({
        ...currentDataset,
        validation: valRes.validation,
        readiness: valRes.readiness
      });
      showToast('Validação atualizada com sucesso!');
    } catch (err: any) {
      showToast('Erro ao revalidar dados.');
    }
  };

  const handleRunModel = async (customConfig?: MeridianModelConfig) => {
    if (!currentDataset) return;
    setIsModelRunning(true);
    showToast('Ajustando modelo bayesiano Google Meridian via MCMC...');

    try {
      const spendCols = currentDataset.mappings.filter(m => m.mappedType === 'media_spend');
      const dateCol = currentDataset.mappings.find(m => m.mappedType === 'date')?.columnName || 'date';
      const kpiCol = currentDataset.mappings.find(m => m.mappedType === 'kpi')?.columnName || 'revenue';
      const controlCols = currentDataset.mappings.filter(m => m.mappedType === 'control').map(m => m.columnName);

      const config: MeridianModelConfig = customConfig || {
        dateColumn: dateCol,
        kpiColumn: kpiCol,
        mediaChannels: spendCols.map(m => ({
          spendColumn: m.columnName,
          channelName: m.channelName || m.columnName,
          channelType: m.columnName.includes('tv') ? 'tv' : 'digital'
        })),
        controlColumns: controlCols,
        seasonalityFourierTerms: 2,
        mcmcChains: 4,
        mcmcDraws: 1000,
        mcmcWarmup: 500,
        targetKpiType: 'revenue',
        priors: {}
      };

      const res = await apiClient.runModel(config);
      setModelResults(res);
      showToast('Modelo Google Meridian convergido com sucesso!');
      setCurrentView('dashboard');
    } catch (err: any) {
      console.error('Error fitting model:', err);
      showToast(`Erro ao rodar modelo: ${err.message || 'Verifique os dados'}`);
    } finally {
      setIsModelRunning(false);
    }
  };

  const showToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => {
      setStatusNotification(null);
    }, 4000);
  };

  const isMobile = useIsMobile(768);

  if (!isHydrated) {
    return (
      <div className="flex w-full min-h-[100dvh] h-[100dvh] bg-slate-100 dark:bg-slate-950 items-center justify-center">
        <ViewLoadingFallback />
      </div>
    );
  }

  // Render sales landing page when on landing view
  if (currentView === 'landing') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <LandingPage
          onEnterWorkspace={() => setCurrentView('dashboard')}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </Suspense>
    );
  }

  return (
    <ProtectedRouter currentView={currentView} onRedirectToLanding={() => setCurrentView('landing')}>
      <div className="flex w-full min-h-[100dvh] h-[100dvh] overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">
        {/* Toast Notification */}
        {statusNotification && (
          <div 
            role="alert" 
            aria-live="assertive"
            className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 dark:border-slate-600 animate-fade-in flex items-center gap-2 max-w-[calc(100vw-2rem)]"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" aria-hidden="true"></span>
            <span className="truncate">{statusNotification}</span>
          </div>
        )}

        {/* Main Sidebar (Desktop Static + Mobile Drawer) */}
        <Sidebar
          currentView={currentView}
          onSelectView={(view) => {
            setCurrentView(view);
            setIsMobileMenuOpen(false);
          }}
          readinessScore={currentDataset?.readiness || null}
          isModelTrained={!!modelResults}
          isSyntheticData={currentDataset?.isSynthetic ?? false}
          onOpenTour={() => setIsTourOpen(true)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 h-[100dvh] ${getResponsiveOverflowClass(isMobile)}`}>
          <Header
            currentView={currentView}
            onQuickOptimize={() => setCurrentView('budget')}
            onRunModel={() => handleRunModel()}
            onOpenTour={() => setIsTourOpen(true)}
            onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
            isModelRunning={isModelRunning}
            isModelTrained={!!modelResults}
            filename={currentDataset?.filename}
            isSyntheticData={currentDataset?.isSynthetic}
            onLoadSynthetic={handleLoadSynthetic}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            availableDates={availableDates}
            dateRange={dateRange}
            onChangeDateRange={setDateRange}
            currentDataset={currentDataset}
            onNavigateToReadiness={() => setCurrentView('readiness')}
            onResetDateRange={() =>
              setDateRange({
                preset: 'all',
                startDate: availableDates[0] || '',
                endDate: availableDates[availableDates.length - 1] || ''
              })
            }
            onNavigateToSettings={() => setCurrentView('settings')}
            onNavigateToLanding={() => setCurrentView('landing')}
          />

          {/* View Router */}
          <main className={`flex-1 pb-16 min-w-0 ${isMobile ? 'px-1' : ''}`}>
            <Suspense fallback={<ViewLoadingFallback />}>
              {currentView === 'dashboard' && (
                <DashboardView
                  results={modelResults}
                  dataset={currentDataset}
                  onNavigateToBudget={() => setCurrentView('budget')}
                  onNavigateToChannels={() => setCurrentView('channels')}
                  onNavigateToModel={() => setCurrentView('model')}
                  onNavigateToReadiness={() => setCurrentView('readiness')}
                  onResetDateRange={() =>
                    setDateRange({
                      preset: 'all',
                      startDate: availableDates[0] || '',
                      endDate: availableDates[availableDates.length - 1] || ''
                    })
                  }
                  availableDates={availableDates}
                  dateRange={dateRange}
                  onChangeDateRange={setDateRange}
                />
              )}

              {currentView === 'data' && (
                <DataUploadView
                  onUploadSuccess={handleUploadSuccess}
                  onLoadSynthetic={handleLoadSynthetic}
                  currentDataset={currentDataset}
                  onNavigateToMapping={() => setCurrentView('mapping')}
                  onNavigateToReadiness={() => setCurrentView('readiness')}
                  onOpenFullTour={() => setIsTourOpen(true)}
                />
              )}

              {currentView === 'mapping' && (
                <ColumnMappingView
                  mappings={currentDataset?.mappings || []}
                  onSaveMappings={handleSaveMappings}
                  onNavigateToReadiness={() => setCurrentView('readiness')}
                  onOpenFullTour={() => setIsTourOpen(true)}
                />
              )}

              {currentView === 'readiness' && (
                <DataReadinessView
                  readiness={currentDataset?.readiness || null}
                  validation={currentDataset?.validation || null}
                  onNavigateToModel={() => setCurrentView('model')}
                  onNavigateToMapping={() => setCurrentView('mapping')}
                  onSanitizeData={handleSanitizeData}
                  onRevalidateData={handleRevalidateData}
                  onOpenFullTour={() => setIsTourOpen(true)}
                />
              )}

              {currentView === 'model' && (
                <ModelConfigView
                  mappings={currentDataset?.mappings || []}
                  results={modelResults}
                  onRunModel={handleRunModel}
                  isModelRunning={isModelRunning}
                  onOpenFullTour={() => setIsTourOpen(true)}
                />
              )}

              {currentView === 'channels' && (
                <ChannelPerformanceView
                  results={modelResults}
                  onNavigateToOptimizer={() => setCurrentView('budget')}
                  availableDates={availableDates}
                  dateRange={dateRange}
                  onChangeDateRange={setDateRange}
                />
              )}

              {currentView === 'budget' && (
                <BudgetOptimizerView
                  results={modelResults}
                  onNavigateToSimulator={() => setCurrentView('simulator')}
                />
              )}

              {currentView === 'simulator' && (
                <WhatIfSimulatorView results={modelResults} />
              )}

              {currentView === 'insights' && (
                <InsightsView
                  results={modelResults}
                  onNavigateToOptimizer={() => setCurrentView('budget')}
                />
              )}

              {(currentView === 'methodology' || currentView === 'library') && (
                <MethodologyGuideView onNavigateToMapping={() => setCurrentView('mapping')} />
              )}

              {currentView === 'report' && (
                <ReportView
                  results={modelResults}
                  availableDates={availableDates}
                  dateRange={dateRange}
                  onChangeDateRange={setDateRange}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView />
              )}
            </Suspense>
          </main>
        </div>

        {/* Guided Tour Modal */}
        <Suspense fallback={null}>
          {isTourOpen && (
            <TourGuideModal
              isOpen={isTourOpen}
              onClose={() => setIsTourOpen(false)}
              onNavigateView={(view) => {
                setCurrentView(view);
                setIsTourOpen(false);
              }}
              currentView={currentView}
            />
          )}
        </Suspense>
      </div>
    </ProtectedRouter>
  );
}
