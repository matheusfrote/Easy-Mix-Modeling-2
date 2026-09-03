import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  Link,
  Table,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Download,
  Info
} from 'lucide-react';
import localforage from 'localforage';
import { ConnectedSourceInstance } from '../../data/integrationSources';

export interface SpreadsheetIntegrationStatusProps {
  className?: string;
}

export const SpreadsheetIntegrationStatus: React.FC<SpreadsheetIntegrationStatusProps> = ({
  className = ''
}) => {
  const [connectedSources, setConnectedSources] = useState<ConnectedSourceInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const saved = await localforage.getItem<ConnectedSourceInstance[]>('easy_mix_connected_sources');
        if (saved && Array.isArray(saved)) {
          setConnectedSources(saved);
        }
      } catch (err) {
        console.error('Erro ao carregar fontes conectadas:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSources();
  }, []);

  return (
    <section
      id="spreadsheet-integrations"
      className={`bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}
    >
      <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Conexões de Planilhas & Dados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A ingestão de dados do sistema funciona exclusivamente através de planilhas estruturadas (Google Sheets, Excel e CSV).
          </p>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          Modo Exclusivo Planilha
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Info Banner */}
        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Segurança e Simplicidade Operacional</span>
          </div>
          <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
            Para garantir controle total e privacidade, a plataforma não realiza requisições diretas a APIs externas. Suas séries temporais de investimento, impressões e conversões são gerenciadas de forma transparente via <strong>Google Sheets</strong> colaborativo ou arquivos <strong>Excel / CSV</strong>.
          </p>
        </div>

        {/* Formatos Suportados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Link className="w-4 h-4 text-emerald-600" />
              <span>Google Sheets</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Leitura e sincronização em tempo real via link público ou compartilhado de visualização.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Microsoft Excel</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Arquivos .xlsx e .xls com processamento e sanitização segura em memória no navegador.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Table className="w-4 h-4 text-blue-600" />
              <span>Arquivos CSV</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Formato delimitado por vírgula ou ponto-e-vírgula com codificação UTF-8 padrão.
            </p>
          </div>
        </div>

        {/* Planilhas Conectadas Atualmente */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Planilhas Ativas no Workspace ({connectedSources.length})
          </h4>

          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
              Carregando status das planilhas...
            </div>
          ) : connectedSources.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Nenhuma planilha salva no momento.
              </p>
              <p className="text-[11px] text-slate-400">
                Acesse a aba <strong>Data Hub</strong> para conectar sua primeira planilha.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {connectedSources.map((source, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{source.name}</p>
                      <p className="text-[10px] text-slate-400">{source.historicalWeeks} semanas registradas</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    Ativa
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
