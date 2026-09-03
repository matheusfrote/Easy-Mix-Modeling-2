import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkLoadError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkLoadError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    const message = error?.message || '';
    const isChunkLoadError =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Loading chunk') ||
      message.includes('dynamically imported') ||
      message.includes('error loading dynamically imported module');

    return {
      hasError: true,
      error,
      isChunkLoadError
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Auto-reload once if this is a dynamic import failure and we haven't reloaded yet
    const message = error?.message || '';
    const isChunkError =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Loading chunk') ||
      message.includes('dynamically imported');

    if (isChunkError) {
      const reloadKey = 'easy_mix_chunk_reload_attempted';
      const hasAttempted = sessionStorage.getItem(reloadKey);
      if (!hasAttempted) {
        sessionStorage.setItem(reloadKey, 'true');
        console.warn('Auto-recovering from chunk loading failure by reloading page...');
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem('easy_mix_chunk_reload_attempted');
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, isChunkLoadError: false });
    window.location.hash = '#/data';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {this.state.isChunkLoadError
                  ? 'Atualização de Versão Detectada'
                  : 'Ops! Algo deu errado'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {this.state.isChunkLoadError
                  ? 'Uma nova versão ou módulo do aplicativo foi carregado. Recarregue a página para continuar navegando sem interrupções.'
                  : 'Ocorreu uma falha inesperada ao renderizar esta seção da plataforma.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Voltar ao Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
