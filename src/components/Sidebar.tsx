import React from 'react';
import {
  LayoutDashboard,
  Database,
  Sliders,
  Radio,
  TrendingUp,
  Calculator,
  Compass,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Library,
  BookOpen,
  X
} from 'lucide-react';
import { DataReadinessScore } from '../types/mmm';

export type NavView =
  | 'dashboard'
  | 'data'
  | 'mapping'
  | 'readiness'
  | 'model'
  | 'channels'
  | 'budget'
  | 'simulator'
  | 'insights'
  | 'library'
  | 'methodology'
  | 'report'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  readinessScore: DataReadinessScore | null;
  isModelTrained: boolean;
  isSyntheticData: boolean;
  onOpenTour?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: NavView;
  label: string;
  stepNumber?: string;
  icon: any;
  badge?: string;
  scoreBadge?: string;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  readinessScore,
  isModelTrained,
  isSyntheticData,
  onOpenTour,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Visão Geral Executiva',
      icon: LayoutDashboard,
      badge: isModelTrained ? 'Ativo' : undefined
    },
    {
      id: 'data',
      label: '1. Envio dos Dados',
      icon: Database
    },
    {
      id: 'mapping',
      label: '2. Mapeamento de Colunas',
      icon: Sliders
    },
    {
      id: 'readiness',
      label: '3. Check-up dos Dados',
      icon: readinessScore?.isModelReady ? CheckCircle2 : AlertTriangle,
      scoreBadge: readinessScore ? `${readinessScore.score}/100` : undefined
    },
    {
      id: 'model',
      label: '4. Ajuste do Modelo',
      icon: Radio,
      badge: isModelTrained ? 'Calculado' : 'Pendente'
    },
    {
      id: 'channels',
      label: '5. Desempenho & Saturação',
      icon: TrendingUp
    },
    {
      id: 'budget',
      label: '6. Otimizador de Orçamento',
      icon: Calculator,
      highlight: true
    },
    {
      id: 'simulator',
      label: '7. Simulador ("E se...")',
      icon: Compass
    },
    {
      id: 'insights',
      label: '8. Recomendações com IA',
      icon: Sparkles
    },
    {
      id: 'methodology',
      label: 'Guia & Metodologia',
      icon: BookOpen
    },
    {
      id: 'report',
      label: 'Relatório Executivo',
      icon: FileText
    }
  ];

  const handleItemClick = (id: NavView) => {
    onSelectView(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="main-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-100 flex flex-col h-[100dvh] border-r border-slate-800 shrink-0 transform transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5 truncate">
                Easy Mix Modeling
                <span className="text-[10px] uppercase font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30">
                  MMM
                </span>
              </span>
              <p className="text-[11px] text-slate-400 truncate">Google Meridian Powered</p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition -mr-1"
              aria-label="Fechar menu de navegação"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Synthetic Data Alert / Status */}
        {isSyntheticData && (
          <div className="mx-3 sm:mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
            <span className="truncate">Dados Demonstrativos (Demo)</span>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 px-2.5 sm:px-3 py-3 sm:py-4 space-y-1 overflow-y-auto min-h-0">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 pb-1">
            Jornada de Análise
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => handleItemClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : item.highlight
                    ? 'text-emerald-300 hover:text-white hover:bg-slate-800/80'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.scoreBadge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
                      readinessScore && readinessScore.score >= 75
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.scoreBadge}
                  </span>
                )}

                {item.badge && !item.scoreBadge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ml-1 ${
                      item.badge === 'Ativo' || item.badge === 'Calculado'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / Engine Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/40 text-xs flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] text-slate-300 font-medium block">Google Meridian</span>
            <span className="text-[10px] text-emerald-400">Bayesian Engine Ready</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
        </div>
      </aside>
    </>
  );
};
