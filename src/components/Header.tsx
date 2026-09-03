import React, { useState, useRef, useEffect } from 'react';
import { Play, Sparkles, Sun, Moon, HelpCircle, Menu, Settings, LogOut, Globe } from 'lucide-react';
import { NavView } from './Sidebar';
import { DateRangeFilter } from '../types/mmm';
import { UploadResponse } from '../services/apiClient';

interface HeaderProps {
  currentView: NavView;
  onQuickOptimize: () => void;
  onRunModel: () => void;
  onOpenTour?: () => void;
  onToggleMobileMenu?: () => void;
  isModelRunning: boolean;
  isModelTrained: boolean;
  filename?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  availableDates?: string[];
  dateRange?: DateRangeFilter;
  onChangeDateRange?: (newRange: DateRangeFilter) => void;
  currentDataset?: UploadResponse | null;
  onNavigateToReadiness?: () => void;
  onResetDateRange?: () => void;
  onNavigateToSettings?: () => void;
}

const VIEW_TITLES: Record<Exclude<NavView, 'landing'> | string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Resumo do seu Marketing & Retornos',
    subtitle: 'Descubra quais canais mais contribuíram para suas vendas e onde estão as maiores oportunidades.'
  },
  data: {
    title: '1. Envio dos Seus Dados',
    subtitle: 'Importe sua planilha de marketing com histórico de investimentos e vendas.'
  },
  mapping: {
    title: '2. O que Cada Coluna Significa',
    subtitle: 'Organize suas colunas entre investimentos em mídia, resultados e fatores externos.'
  },
  readiness: {
    title: '3. Check-up da Saúde dos Dados',
    subtitle: 'Verifique a qualidade, consistência temporal e confiabilidade antes de rodar o modelo.'
  },
  model: {
    title: '4. Como os Investimentos Geram Resultados',
    subtitle: 'Calcule a contribuição de cada canal de mídia com estimativas seguras do Google Meridian.'
  },
  channels: {
    title: '5. Desempenho por Canal & Ponto de Saturação',
    subtitle: 'Entenda o efeito residual das campanhas e o ponto onde investir mais começa a trazer menos retorno.'
  },
  budget: {
    title: '6. Otimizador de Orçamento',
    subtitle: 'Descubra como redistribuir sua verba de mídia para gerar o máximo de retorno financeiro.'
  },
  simulator: {
    title: '7. Simulador de Cenários ("E se...")',
    subtitle: 'Simule variações de investimento por canal e projete o impacto estimado nas vendas.'
  },
  insights: {
    title: '8. Recomendações Estratégicas com IA',
    subtitle: 'Recomendações acionáveis geradas por IA com justificativas baseadas nos dados do modelo.'
  },
  library: {
    title: 'Biblioteca de Canais & Variáveis de Marketing',
    subtitle: 'Mais de 70 canais de mídia online, offline, criadores, canais próprios e fatores econômicos.'
  },
  methodology: {
    title: 'Como o Easy Mix Modeling Calcula seus Resultados',
    subtitle: 'Fundamentos de Marketing Mix Modeling, efeitos de longo prazo e guia metodológico.'
  },
  report: {
    title: 'Relatório Executivo para Diretoria',
    subtitle: 'Visão consolidada para apresentação e tomada de decisão com evidências transparentes.'
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Gerencie suas preferências.'
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onQuickOptimize,
  onRunModel,
  onOpenTour,
  onToggleMobileMenu,
  isModelRunning,
  isModelTrained,
  filename,
  theme,
  onToggleTheme,
  availableDates = [],
  dateRange,
  onChangeDateRange,
  currentDataset,
  onNavigateToReadiness,
  onResetDateRange,
  onNavigateToSettings
}) => {
  const currentInfo = VIEW_TITLES[currentView] || { title: 'Marketing Mix Modeling', subtitle: '' };
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 sm:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 md:px-6 flex items-center justify-between shrink-0 transition-colors z-10 gap-2 min-w-0">
      {/* Left: Mobile Menu Trigger & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger Menu on Mobile / Tablet */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition -ml-1 shrink-0"
            aria-label="Abrir menu de navegação"
            aria-expanded="false"
            aria-controls="main-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Title & Subtitle */}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
            <span className="truncate">{currentInfo.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden xl:block mt-0.5 truncate">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          aria-label="Alternar tema claro/escuro"
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Guia Interativo */}
        {onOpenTour && (
          <button
            onClick={onOpenTour}
            className="hidden sm:inline-flex px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold items-center gap-1.5 transition shrink-0"
            title="Guia Passo a Passo"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="hidden md:inline">Guia Passo a Passo</span>
          </button>
        )}

        {/* Executar Modelo */}
        <button
          id="btn-header-run-model"
          onClick={onRunModel}
          disabled={isModelRunning}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0 ${
            isModelRunning
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
          }`}
          title={isModelRunning ? 'Calculando Modelo...' : 'Calcular Modelo'}
        >
          <Play className={`w-3.5 h-3.5 shrink-0 ${isModelRunning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isModelRunning ? 'Calculando...' : 'Calcular Modelo'}</span>
        </button>

        {/* Otimizar Orçamento Rápido */}
        {isModelTrained && (
          <button
            id="btn-header-quick-optimize"
            onClick={onQuickOptimize}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0"
            title="Otimizar Orçamento"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Otimizar</span>
          </button>
        )}

        {/* User Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Menu"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              V
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline max-w-[100px] truncate">
              Visitante
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 origin-top-right animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Sessão Anônima
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300">
                    Visitante
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Dados salvos apenas no seu navegador.
                </p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onNavigateToSettings) onNavigateToSettings();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Configurações</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
