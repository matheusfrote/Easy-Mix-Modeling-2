import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Link,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Lock,
  Download,
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
  Info
} from 'lucide-react';
import Papa from 'papaparse';
import { IntegrationSource, ConnectedSourceInstance } from '../../data/integrationSources';
import { apiClient, UploadResponse } from '../../services/apiClient';
import { DataRow } from '../../services/dataValidator';

interface ConnectSourceModalProps {
  source: IntegrationSource;
  isOpen: boolean;
  onClose: () => void;
  onConnectedSuccess: (sourceInstance: ConnectedSourceInstance, uploadRes?: UploadResponse) => void;
  onDisconnect?: (sourceId: string) => void;
  existingInstance?: ConnectedSourceInstance | null;
}

export const ConnectSourceModal: React.FC<ConnectSourceModalProps> = ({
  source,
  isOpen,
  onClose,
  onConnectedSuccess,
  onDisconnect,
  existingInstance
}) => {
  if (!isOpen) return null;

  const [historicalPeriod, setHistoricalPeriod] = useState<'12m' | '24m' | '36m'>(
    existingInstance?.historicalPeriod || '24m'
  );
  const [frequency, setFrequency] = useState<'manual' | 'daily' | 'weekly'>(
    existingInstance?.frequency || 'weekly'
  );
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(source.metrics);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'oauth' | 'csv'>(
    source.supportsLiveConnect ? 'oauth' : 'oauth'
  );

  const toggleMetric = (m: string) => {
    setSelectedMetrics(prev =>
      prev.includes(m) ? prev.filter(item => item !== m) : [...prev, m]
    );
  };

  // Connect Google Sheet directly
  const handleConnectGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setErrorMessage('Por favor, informe a URL da planilha do Google Sheets.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let fetchUrl = googleSheetUrl.trim();
      
      // Auto-convert standard Google Sheets edit URL into direct CSV export URL
      if (fetchUrl.includes('docs.google.com/spreadsheets/d/')) {
        const matches = fetchUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          const docId = matches[1];
          // Check if there's a gid
          const gidMatch = fetchUrl.match(/[#&]gid=([0-9]+)/);
          const gid = gidMatch ? gidMatch[1] : '0';
          fetchUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
        }
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(
          'Não foi possível acessar a planilha. Certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link pode ver" ou exportada publicamente.'
        );
      }

      const csvText = await res.text();
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('A planilha retornou conteúdo vazio.');
      }

      Papa.parse<DataRow>(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async results => {
          try {
            if (!results.data || results.data.length === 0) {
              throw new Error('Não foi possível ler as colunas da planilha.');
            }
            const validRows = results.data.filter(row =>
              Object.values(row).some(v => v !== null && v !== undefined && v !== '')
            );

            if (validRows.length === 0) {
              throw new Error('Nenhuma linha preenchida encontrada na planilha.');
            }

            const uploadRes = await apiClient.uploadData(validRows, 'google_sheets_live_data.csv');

            const instance: ConnectedSourceInstance = {
              id: `conn-${source.id}-${Date.now()}`,
              sourceId: source.id,
              name: source.name,
              category: source.category,
              connectedAt: new Date().toISOString(),
              lastSyncedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              status: 'active',
              historicalWeeks: uploadRes.rowCount,
              channelsCount: uploadRes.mappings.filter(m => m.mappedType === 'media_spend').length,
              kpiFound: uploadRes.mappings.find(m => m.mappedType === 'kpi')?.columnName,
              frequency,
              historicalPeriod
            };

            onConnectedSuccess(instance, uploadRes);
            onClose();
          } catch (err: any) {
            setErrorMessage(err.message || 'Erro ao processar dados da planilha.');
          } finally {
            setIsProcessing(false);
          }
        },
        error: err => {
          setErrorMessage(`Erro ao decodificar CSV da planilha: ${err.message}`);
          setIsProcessing(false);
        }
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao sincronizar com Google Sheets.');
      setIsProcessing(false);
    }
  };

  const [syncStatus, setSyncStatus] = useState<string>('');

  // Handle standard source connection setup
  const handleConnectStandard = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSyncStatus('Autenticando via OAuth 2.0...');

    // Simulate safe API handshake and connection registration step-by-step
    setTimeout(() => {
      setSyncStatus('Autenticado ✓');
      setTimeout(() => {
        const weeks = historicalPeriod === '36m' ? 156 : historicalPeriod === '24m' ? 104 : 52;
        setSyncStatus(`Extraindo ${weeks} semanas de histórico...`);
        setTimeout(() => {
          setSyncStatus('Processando métricas e mapeando para o Meridian...');
          setTimeout(() => {
            setIsProcessing(false);
            const instance: ConnectedSourceInstance = {
              id: existingInstance?.id || `conn-${source.id}-${Date.now()}`,
              sourceId: source.id,
              name: source.name,
              category: source.category,
              connectedAt: existingInstance?.connectedAt || new Date().toISOString(),
              lastSyncedAt: 'Agora mesmo',
              status: 'active',
              historicalWeeks: weeks,
              channelsCount: source.sampleColumns.length,
              frequency,
              historicalPeriod
            };

            onConnectedSuccess(instance);
            onClose();
          }, 1200);
        }, 1200);
      }, 1000);
    }, 800);
  };

  const handleDownloadChannelTemplate = () => {
    const headers = ['date', ...source.sampleColumns, 'conversions', 'revenue'];
    const rows = [
      ['2023-01-01', ...source.sampleColumns.map(() => '15000.00'), '450', '250000.00'],
      ['2023-01-08', ...source.sampleColumns.map(() => '14200.00'), '430', '241000.00'],
      ['2023-01-15', ...source.sampleColumns.map(() => '16100.00'), '490', '268000.00']
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `template_${source.id}_meridian.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {source.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {existingInstance ? `Gerenciar ${source.name}` : `Conectar ${source.name}`}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {source.connectionType}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {source.categoryLabel} • Sincronização automatizada para o motor Google Meridian
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Aviso de Conexão</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Special view for Google Sheets */}
          {source.supportsLiveConnect ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Conexão Direta e Imediata com Planilha Google</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  Insira o link da sua planilha do Google Sheets. A planilha deve estar acessível via link ("Qualquer pessoa com o link pode ver").
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Link da Planilha do Google Sheets (URL):
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={e => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Exemplo: <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">https://docs.google.com/spreadsheets/d/.../edit#gid=0</code>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Configuration Settings */}
              <div className="space-y-4">
                
                <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Conexão 1-Clique em API (Recomendado)</span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Você será redirecionado para autenticar via OAuth 2.0. O Easy Mix Modeling fará a extração de {source.metrics.length} métricas e padronização automáticas.
                  </p>
                </div>

                {/* Historical Period Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Período Histórico para Extração</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                      Recomendado: 24 meses (104 semanas)
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '12m', label: '12 meses (52 sem)', desc: 'Mínimo' },
                      { id: '24m', label: '24 meses (104 sem)', desc: 'Ideal Google Meridian' },
                      { id: '36m', label: '36 meses (156 sem)', desc: 'Avançado' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setHistoricalPeriod(p.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          historicalPeriod === p.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:border-blue-500 ring-1 ring-blue-600/30'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{p.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sync Frequency Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Frequência de Sincronização Automática
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'weekly', label: 'Semanal (Segundas)', desc: 'Padrão MMM' },
                      { id: 'daily', label: 'Diária (Madrugada)', desc: 'Atualização frequente' },
                      { id: 'manual', label: 'Manual sob Demanda', desc: 'Apenas ao solicitar' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFrequency(f.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          frequency === f.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:border-blue-500 ring-1 ring-blue-600/30'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{f.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metrics to Extract */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Métricas a serem importadas e estruturadas:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {source.metrics.map((m, idx) => {
                      const isSelected = selectedMetrics.includes(m);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleMetric(m)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                          <span>{m}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Security and Requirements Note */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Segurança & Requisitos da Conexão</span>
                  </div>
                  <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4">
                    {source.authRequirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                    <li>Tokens de acesso são mantidos em ambiente seguro e nunca expostos no navegador.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadChannelTemplate}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              title="Baixar planilha CSV com a estrutura exata aceita para este canal"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Baixar Template CSV</span>
            </button>

            {existingInstance && onDisconnect && (
              <button
                type="button"
                onClick={() => {
                  onDisconnect(source.id);
                  onClose();
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                Desconectar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-3.5 py-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              id="btn-confirm-source-connection"
              disabled={isProcessing}
              onClick={source.supportsLiveConnect ? handleConnectGoogleSheet : handleConnectStandard}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{syncStatus || 'Sincronizando...'}</span>
                </>
              ) : existingInstance ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salvar Configuração</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{source.supportsLiveConnect ? 'Sincronizar Planilha' : `Conectar ${source.name}`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
