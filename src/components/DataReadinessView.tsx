import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Info,
  Sliders,
  Sparkles,
  Calendar,
  Layers,
  Activity,
  BarChart3,
  RefreshCw,
  Clock,
  Filter,
  Check,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AlertSeverity, DataReadinessScore, ValidationAlert, ValidationCategory } from '../types/mmm';
import { StatisticalValidationReport } from '../services/dataValidator';
import { StepGuidanceBanner, InfoTooltip } from './ContextualGuide';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';

interface DataReadinessViewProps {
  readiness: DataReadinessScore | null;
  validation: StatisticalValidationReport | null;
  onNavigateToModel: () => void;
  onNavigateToMapping: () => void;
  onSanitizeData?: () => Promise<void>;
  onRevalidateData?: () => Promise<void>;
  onOpenFullTour?: () => void;
}

export const DataReadinessView: React.FC<DataReadinessViewProps> = ({
  readiness,
  validation,
  onNavigateToModel,
  onNavigateToMapping,
  onSanitizeData,
  onRevalidateData,
  onOpenFullTour
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'timeline' | 'channels' | 'checks' | 'correlations'>('alerts');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ValidationCategory>('ALL');
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [sanitizedMessage, setSanitizedMessage] = useState<string | null>(null);
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

  if (!readiness || !validation) {
    return (
      <div id="data-readiness-empty" className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs max-w-xl mx-auto my-12">
        <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Nenhum dado avaliado</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Faça o upload de uma planilha para executar a validação automática e calcular a pontuação de prontidão para Marketing Mix Modeling.
        </p>
      </div>
    );
  }

  const toggleAlertExpand = (id: string) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSanitizeClick = async () => {
    if (!onSanitizeData) return;
    setIsSanitizing(true);
    try {
      await onSanitizeData();
      setSanitizedMessage('Saneamento automático concluído! Linhas duplicadas, valores nulos e negativos foram ajustados.');
      setTimeout(() => setSanitizedMessage(null), 6000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSanitizing(false);
    }
  };

  const handleRevalidateClick = async () => {
    if (!onRevalidateData) return;
    setIsRevalidating(true);
    try {
      await onRevalidateData();
    } finally {
      setIsRevalidating(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Excelente':
        return 'text-emerald-700 bg-emerald-50 border-emerald-300';
      case 'Bom':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'Limitado':
        return 'text-amber-700 bg-amber-50 border-amber-300';
      default:
        return 'text-red-700 bg-red-50 border-red-300';
    }
  };

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRÍTICO':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'ALTO':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case 'MÉDIO':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'BAIXO':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
    }
  };

  const getCategoryLabel = (cat: ValidationCategory) => {
    switch (cat) {
      case 'missing_data':
        return 'Dados Faltantes';
      case 'negative_values':
        return 'Valores Negativos';
      case 'duplicates':
        return 'Duplicidade';
      case 'time_series':
        return 'Série Temporal';
      case 'channel_anomalies':
        return 'Anomalias de Mídia';
      case 'correlation':
        return 'Multicolinearidade';
      case 'statistics':
        return 'Estatística Geral';
      default:
        return cat;
    }
  };

  const filteredAlerts = validation.alerts.filter(alert => {
    const matchesSeverity = severityFilter === 'ALL' || alert.severity === severityFilter;
    const matchesCategory = categoryFilter === 'ALL' || alert.category === categoryFilter;
    return matchesSeverity && matchesCategory;
  });

  const criticalAlertsCount = validation.integritySummary?.criticalAlerts ?? validation.alerts.filter(a => a.severity === 'CRÍTICO').length;
  const highAlertsCount = validation.integritySummary?.highAlerts ?? validation.alerts.filter(a => a.severity === 'ALTO').length;
  const mediumAlertsCount = validation.integritySummary?.mediumAlerts ?? validation.alerts.filter(a => a.severity === 'MÉDIO').length;
  const lowAlertsCount = validation.integritySummary?.lowAlerts ?? validation.alerts.filter(a => a.severity === 'BAIXO').length;

  const isBlocked = validation.isModelBlocked;
  const healthScore = validation.integritySummary?.overallHealthScore ?? readiness.score;
  const temporal = validation.temporalDiagnosis;

  return (
    <div id="data-readiness-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Diagnóstico de Prontidão de Dados (Data Readiness Score), Auditoria Estatística e Higienização para Marketing Mix Modeling
      </h1>

      {/* Contextual Step Guidance Banner */}
      <StepGuidanceBanner
        id="data-readiness"
        stepNumber="3"
        title="Etapa 3: Data Readiness Score & Validação Estatística"
        subtitle="Auditoria econométrica de consistência temporal, variabilidade de investimento e ausência de ruídos."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '🛡️', text: 'Score de Prontidão: Indicador de 0 a 100 da saúde da base para rodar o Meridian.' },
          { icon: '🪄', text: 'Auto-Fix: Corrige automaticamente lacunas, valores negativos e nulos em 1 clique.' },
          { icon: '📊', text: 'Variabilidade: O modelo exige variação de verba (CV ≥ 5%) para estimar a curva de Hill.' }
        ]}
        proTip="Bases com score ≥ 75/100 possuem alto grau de confiabilidade para decomposição bayesiana sem risco de overfitting."
      />

      {/* Top Notification / Auto-Fix Feedback */}
      {sanitizedMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{sanitizedMessage}</span>
          </div>
          <button
            onClick={() => setSanitizedMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Model Blocking / Ready Status Hero Card */}
      <div
        id="validation-status-hero"
        className={`p-6 rounded-2xl border transition shadow-xs ${
          isBlocked
            ? 'bg-red-50/70 border-red-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Score & Verdict */}
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md shrink-0">
              <div className="text-center">
                <span className="text-3xl font-extrabold tracking-tight block leading-none">{healthScore}</span>
                <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Saúde</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTierColor(readiness.tier)}`}>
                  Nível: {readiness.tier}
                </span>

                {isBlocked ? (
                  <span className="bg-red-600 text-white text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                    <XCircle className="w-3.5 h-3.5" /> Modelagem Bloqueada (Crítico)
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Liberado para Modelagem Meridian
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Módulo de Validação Automática de Dados de Marketing
              </h2>

              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {isBlocked
                  ? `Ação crítica necessária: ${validation.blockingReason || 'Verifique as colunas de data, KPI e canais de mídia para desbloquear o modelo.'}`
                  : 'Os dados atendem aos requisitos operacionais do Google Meridian. Alertas não-críticos (valores negativos ou lacunas temporais) foram identificados e podem ser tratados via auto-saneamento sem bloquear o treino.'}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            {onSanitizeData && (
              <button
                id="btn-auto-sanitize"
                onClick={handleSanitizeClick}
                disabled={isSanitizing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 transition shadow-xs disabled:opacity-50"
                title="Aplica remoção de duplicatas, truncamento de negativos e interpolação de nulos"
              >
                <Sparkles className={`w-4 h-4 ${isSanitizing ? 'animate-spin' : ''}`} />
                {isSanitizing ? 'Sanitizando...' : 'Auto-Fix (Saneamento)'}
              </button>
            )}

            <button
              id="btn-revalidate"
              onClick={handleRevalidateClick}
              disabled={isRevalidating}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition border border-slate-300"
              title="Reexecuta todas as regras estatísticas de validação"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRevalidating ? 'animate-spin' : ''}`} />
              Revalidar
            </button>

            <button
              id="btn-advance-model"
              onClick={onNavigateToModel}
              disabled={isBlocked}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm ${
                !isBlocked
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Avançar para o Modelo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            onClick={() => setSeverityFilter(severityFilter === 'CRÍTICO' ? 'ALL' : 'CRÍTICO')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              severityFilter === 'CRÍTICO'
                ? 'bg-red-100 border-red-400 ring-2 ring-red-400'
                : 'bg-red-50/60 border-red-200 hover:bg-red-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-800 uppercase tracking-wide">Críticos</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl font-extrabold text-red-900 mt-1">{criticalAlertsCount}</div>
            <span className="text-[10px] text-red-600">Bloqueantes</span>
          </div>

          <div
            onClick={() => setSeverityFilter(severityFilter === 'ALTO' ? 'ALL' : 'ALTO')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              severityFilter === 'ALTO'
                ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-400'
                : 'bg-orange-50/60 border-orange-200 hover:bg-orange-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wide">Altos</span>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-xl font-extrabold text-orange-900 mt-1">{highAlertsCount}</div>
            <span className="text-[10px] text-orange-600">Requer Atenção</span>
          </div>

          <div
            onClick={() => setSeverityFilter(severityFilter === 'MÉDIO' ? 'ALL' : 'MÉDIO')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              severityFilter === 'MÉDIO'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400'
                : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Médios</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-900 mt-1">{mediumAlertsCount}</div>
            <span className="text-[10px] text-amber-600">Informativos</span>
          </div>

          <div
            onClick={() => setSeverityFilter(severityFilter === 'BAIXO' ? 'ALL' : 'BAIXO')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              severityFilter === 'BAIXO'
                ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400'
                : 'bg-blue-50/60 border-blue-200 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Baixos</span>
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-extrabold text-blue-900 mt-1">{lowAlertsCount}</div>
            <span className="text-[10px] text-blue-600">Boas Práticas</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Checagens</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {validation.integritySummary?.passedChecks ?? 0}/{validation.integritySummary?.totalChecks ?? 8}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">Aprovadas</span>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto pb-1 gap-2">
        <div className="flex items-center gap-1.5">
          <button
            id="tab-alerts"
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Alertas & Diagnóstico ({validation.alerts.length})
          </button>

          <button
            id="tab-timeline"
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'timeline'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Consistência Temporal & Gaps
            {temporal && (temporal.gapCount > 0 || temporal.duplicateDateCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            )}
          </button>

          <button
            id="tab-channels"
            onClick={() => setActiveTab('channels')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'channels'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Anomalias & Variabilidade de Canais ({validation.channelAnomalies.length})
          </button>

          <button
            id="tab-checks"
            onClick={() => setActiveTab('checks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'checks'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Critérios Econométricos
          </button>

          <button
            id="tab-correlations"
            onClick={() => setActiveTab('correlations')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'correlations'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Multicolinearidade
          </button>
        </div>

        <button
          onClick={onNavigateToMapping}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 flex items-center gap-1.5 shrink-0"
        >
          <Sliders className="w-3.5 h-3.5" /> Ajustar Mapeamento
        </button>
      </div>

      {/* TAB 1: ALERTS & DIAGNOSTICS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filtrar Criticidade:
              </span>
              {(['ALL', 'CRÍTICO', 'ALTO', 'MÉDIO', 'BAIXO'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    severityFilter === sev
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev === 'ALL' ? 'Todas as Criticidades' : sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Categoria:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as any)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todas as Categorias</option>
                <option value="missing_data">Dados Faltantes</option>
                <option value="negative_values">Valores Negativos</option>
                <option value="duplicates">Duplicidade de Registros</option>
                <option value="time_series">Série Temporal & Frequência</option>
                <option value="channel_anomalies">Anomalias de Canais & Variância</option>
                <option value="correlation">Multicolinearidade</option>
                <option value="statistics">Estatística Geral</option>
              </select>
            </div>
          </div>

          {/* Alerts List */}
          {filteredAlerts.length === 0 ? (
            <div className="p-8 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">
                Nenhum problema encontrado para os filtros selecionados
              </h4>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                A base de dados passou nas checagens automáticas com sucesso.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => {
                const isExpanded = !!expandedAlerts[alert.id];
                return (
                  <div
                    key={alert.id}
                    className={`bg-white rounded-xl border p-4 space-y-3 transition shadow-xs ${
                      alert.severity === 'CRÍTICO'
                        ? 'border-red-300 bg-red-50/20'
                        : alert.severity === 'ALTO'
                        ? 'border-orange-200 bg-orange-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className={`text-[10px] uppercase px-2.5 py-1 rounded-md border shrink-0 ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity}
                        </span>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{alert.title}</h4>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {getCategoryLabel(alert.category)}
                            </span>
                            {alert.autoFixAvailable && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-600" /> Auto-Fix Disponível
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAlertExpand(alert.id)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Econometric Impact Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <Activity className="w-3.5 h-3.5 text-amber-700" />
                          <span>Impacto Econométrico no Meridian:</span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {alert.econometricImpact}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/80 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900">
                          <Info className="w-3.5 h-3.5 text-blue-700" />
                          <span>Recomendação Prática:</span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {alert.recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Extended Details */}
                    {isExpanded && alert.affectedColumns && alert.affectedColumns.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          <strong>Colunas afetadas:</strong> {alert.affectedColumns.join(', ')}
                        </span>
                        {alert.affectedRowsCount !== undefined && (
                          <span>
                            <strong>Linhas afetadas:</strong> {alert.affectedRowsCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEMPORAL CONSISTENCY & CADENCE */}
      {activeTab === 'timeline' && temporal && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Período Histórico
              </span>
              <div className="text-sm font-bold text-slate-900 truncate">
                {temporal.startDate || 'N/A'} até {temporal.endDate || 'N/A'}
              </div>
              <span className="text-[11px] text-slate-500 block font-medium">
                {temporal.totalObservations} observações registradas
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Frequência Detectada
              </span>
              <div className="text-base font-bold text-slate-900 capitalize">
                {temporal.detectedFrequency === 'weekly'
                  ? 'Semanal (7 dias)'
                  : temporal.detectedFrequency === 'daily'
                  ? 'Diária (1 dia)'
                  : temporal.detectedFrequency === 'monthly'
                  ? 'Mensal (30 dias)'
                  : 'Irregular / Mista'}
              </div>
              <span className="text-[11px] text-slate-500 block">
                Passo médio: {temporal.averageStepDays} dias/registro
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> Datas Duplicadas
              </span>
              <div className="text-lg font-bold text-slate-900">
                {temporal.duplicateDateCount} {temporal.duplicateDateCount === 1 ? 'data' : 'datas'}
              </div>
              <span className="text-[11px] text-slate-500 block">
                {temporal.duplicateDateCount > 0
                  ? 'Exige agregação somatória'
                  : 'Nenhuma data duplicada'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-600" /> Lacunas na Série (Gaps)
              </span>
              <div className="text-lg font-bold text-slate-900">
                {temporal.gapCount} {temporal.gapCount === 1 ? 'salto' : 'saltos'}
              </div>
              <span className="text-[11px] text-slate-500 block">
                {temporal.gapCount > 0 ? 'Gaps > 14 dias encontrados' : 'Série temporal contínua'}
              </span>
            </div>
          </div>

          {/* Temporal Anomaly Details */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Detalhamento de Inconsistências Temporais
            </h3>

            {temporal.duplicateDateCount > 0 && (
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-900">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span>Datas com Múltiplos Registros Detectadas:</span>
                </div>
                <p className="text-xs text-slate-700">
                  Amostras de datas repetidas:{' '}
                  <span className="font-mono font-semibold">{temporal.duplicateDateSamples.join(', ')}</span>.
                </p>
                <p className="text-[11px] text-slate-600">
                  💡 <strong>Como o Meridian trata:</strong> Modelos MMM exigem 1 linha por semana/dia. Utilize o botão{' '}
                  <span className="font-semibold text-amber-800">Auto-Fix</span> para consolidar esses registros somando os investimentos e o KPI automaticamente.
                </p>
              </div>
            )}

            {temporal.gaps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Saltos Temporais Identificados (Buracos na série):</h4>
                <ScrollableTableWrapper minWidth="550px" hintText="Arraste para ver os saltos temporais">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">De</th>
                        <th className="p-2.5">Para</th>
                        <th className="p-2.5">Dias de Intervalo</th>
                        <th className="p-2.5">Impacto no Adstock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {temporal.gaps.map((g, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-mono text-slate-800">{g.from}</td>
                          <td className="p-2.5 font-mono text-slate-800">{g.to}</td>
                          <td className="p-2.5 font-bold text-orange-700">{g.missingDays} dias</td>
                          <td className="p-2.5 text-slate-600 text-[11px]">
                            O decaimento geométrico assume passos constantes; intervalos maiores distorcem a meia-vida residual.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTableWrapper>
              </div>
            )}

            {temporal.duplicateDateCount === 0 && temporal.gapCount === 0 && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Série temporal íntegra: dados sequenciais, sem duplicações e com frequência semanal perfeitamente uniforme.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHANNELS & SPEND VARIANCE */}
      {activeTab === 'channels' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Inspetor de Variabilidade de Investimento & Anomalias por Canal
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              O Google Meridian necessita de variabilidade de investimento ($CV \ge 5\%$) para estimar os parâmetros de saturação da curva de Hill ($K$ e $S$).
            </p>
          </div>

          <ScrollableTableWrapper minWidth="780px" hintText="Arraste para ver todas as colunas do canal">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Canal de Mídia</th>
                  <th className="p-3">Investimento Médio</th>
                  <th className="p-3">Desvio Padrão ($\sigma$)</th>
                  <th className="p-3">Coef. Variação ($CV$)</th>
                  <th className="p-3">Zeros (%)</th>
                  <th className="p-3">Negativos</th>
                  <th className="p-3">Outliers</th>
                  <th className="p-3">Diagnóstico Econométrico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {validation.channelAnomalies.map(ch => (
                  <tr key={ch.columnName} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>{ch.channelName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block ml-4">{ch.columnName}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-800">
                      R$ {Math.round(ch.mean).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      ± R$ {Math.round(ch.std).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            ch.isConstantSpend
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : ch.coefficientOfVariation < 0.15
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                      {(ch.coefficientOfVariation !== undefined && ch.coefficientOfVariation !== null ? (ch.coefficientOfVariation * 100).toFixed(1) : '0.0')}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono">
                      <span className={ch.zeroPercentage > 50 ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                        {ch.zeroPercentage}% ({ch.zeroCount}w)
                      </span>
                    </td>
                    <td className="p-3">
                      {ch.negativeCount > 0 ? (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          {ch.negativeCount} neg
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-semibold">0</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {ch.outlierCount > 0 ? (
                        <span className="text-amber-700 font-bold">{ch.outlierCount}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="p-3">
                      {ch.isConstantSpend ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                          Investimento Constante (Baixa Variância)
                        </span>
                      ) : ch.mean === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                          Sem Investimento
                        </span>
                      ) : ch.zeroPercentage > 60 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                          Esparso / Pulsos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Excelente Variabilidade
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableWrapper>
        </div>
      )}

      {/* TAB 4: ECONOMETRIC CRITERIA CHECKLIST */}
      {activeTab === 'checks' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Matriz de Critérios Econométricos do Modelo Bayesiano
            </h3>
            <p className="text-xs text-slate-500">
              Verificações determinísticas para garantir robustez e convergência do algoritmo MCMC
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {readiness.items.map(item => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition ${
                  item.status === 'pass'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : item.status === 'warning'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-red-50/40 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {item.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    {item.status === 'fail' && <XCircle className="w-4 h-4 text-red-600" />}
                    <span className="font-bold text-xs text-slate-900">{item.label}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                    {item.score}/{item.weight} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed ml-6">{item.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MULTICOLLINEARITY & CORRELATION */}
      {activeTab === 'correlations' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Matriz de Correlação Linear de Pearson entre Canais
            </h3>
            <p className="text-xs text-slate-500">
              Correlações muito elevadas ($r &gt; 0.85$) indicam sincronia de gastos (multicolinearidade), o que pode inflar os intervalos de incerteza posterior.
            </p>
          </div>

          {validation.correlationMatrix.channels.length > 1 ? (
            <ScrollableTableWrapper minWidth="650px" hintText="Arraste para ver a matriz completa">
              <table className="w-full text-center text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-left">Canal</th>
                    {validation.correlationMatrix.channels.map(ch => (
                      <th key={ch} className="p-3 font-mono text-[11px]">
                        {ch.replace(/_spend$/i, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {validation.correlationMatrix.channels.map((rowCh, rIdx) => (
                    <tr key={rowCh}>
                      <td className="p-3 text-left font-bold text-slate-900 font-sans">
                        {rowCh.replace(/_spend$/i, '')}
                      </td>
                      {validation.correlationMatrix.matrix[rIdx]?.map((val, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        const isHigh = !isDiag && Math.abs(val) > 0.85;
                        const isMedium = !isDiag && Math.abs(val) > 0.65;

                        return (
                          <td
                            key={cIdx}
                            className={`p-3 font-semibold ${
                              isDiag
                                ? 'bg-slate-100 text-slate-400'
                                : isHigh
                                ? 'bg-orange-100 text-orange-900 font-bold'
                                : isMedium
                                ? 'bg-amber-50 text-amber-900'
                                : 'text-slate-700'
                            }`}
                          >
                            {val !== undefined && val !== null ? val.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          ) : (
            <div className="p-4 bg-slate-50 text-slate-600 text-xs rounded-lg border border-slate-200">
              Mapeie ao menos 2 canais de mídia para visualizar a matriz de correlação cruzada.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
