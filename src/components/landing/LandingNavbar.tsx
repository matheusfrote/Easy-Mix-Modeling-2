import React, { useState } from 'react';
import {
  TrendingUp,
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LandingNavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onEnterApp: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onOpenLogin,
  onOpenRegister,
  onEnterApp,
  theme,
  onToggleTheme
}) => {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                  Easy Mix <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Modeling</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  Google Meridian
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:block">
                Marketing Mix Modeling Descomplicado
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('recursos')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Recursos
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('comparativo')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Econometria vs Pixels
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('como-funciona')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Como Funciona
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('planos')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Planos & Preços
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              FAQ
            </button>
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Theme switch */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={onEnterApp}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all group"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Acessar</span> Workspace
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/25 transition-all group"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Começar Grátis</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slideout Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-2 pt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <button
              type="button"
              onClick={() => scrollToSection('recursos')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Recursos da Plataforma
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('comparativo')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Econometria vs Pixels & Cookies
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('como-funciona')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Como Funciona o Meridian
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('planos')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Planos & Preços
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Perguntas Frequentes (FAQ)
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-2.5 px-4 text-center font-medium text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Entrar na Conta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRegister();
                  }}
                  className="w-full py-2.5 px-4 text-center font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Criar Conta Gratuita
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterApp();
                }}
                className="w-full py-2.5 px-4 text-center font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Abrir Meu Workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
