import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { ExecutiveReportData, MeridianModelResults, DateRangeFilter } from '../types/mmm';
import { apiClient } from '../services/apiClient';
import { ScrollableTableWrapper } from './ui/ScrollableTableWrapper';

interface ReportViewProps {
  results: MeridianModelResults | null;
  availableDates?: string[];
  dateRange?: DateRangeFilter;
  onChangeDateRange?: (newRange: DateRangeFilter) => void;
}

function formatKpi(value: unknown, kpiType?: MeridianModelResults['kpiType']): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('pt-BR', {
    ...(kpiType === 'non_revenue' ? {} : { style: 'currency', currency: 'BRL' }),
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

import { FloatingPrintButton } from "./ui/FloatingPrintButton";

export const ReportView: React.FC<ReportViewProps> = ({
  results
}) => {
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.warn('Direct print invoke issue:', err);
      } finally {
        setIsPrinting(false);
      }
    }, 50);
  };

  const handleEnhanceWithAi = async () => {
    setIsEnhancing(true);
    setAiMessage(null);
    try {
      const enhanced = await apiClient.enhanceReportWithAi();
      setReport(enhanced);
      if (enhanced.aiStatus !== 'generated') {
        setAiMessage(enhanced.aiStatus === 'disabled'
          ? 'IA desativada. O relatório determinístico permanece disponível.'
          : 'A narrativa por IA não foi aplicada. O relatório determinístico foi preservado.');
      }
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : 'A narrativa por IA não pôde ser aplicada.');
    } finally {
      setIsEnhancing(false);
    }
  };

  useEffect(() => {
    if (results) {
      setIsLoading(true);
      apiClient
        .getReport()
        .then(res => setReport(res))
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [results]);

  if (!results) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs max-w-xl mx-auto my-12">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Modelo não executado</h3>
        <p className="text-xs text-slate-500 mt-1">Execute o modelo para gerar o relatório executivo completo.</p>
      </div>
    );
  }

  return (
    <div id="report-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0 print:p-0 print:max-w-full">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Relatório Executivo Consolidado de Marketing Mix Modeling: Decomposição Causal de Vendas e Otimização de Mídia
      </h1>

      {/* Action Bar (Hidden when printing) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden transition-colors">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Relatório Executivo de Marketing Mix Modeling</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Documento estruturado para apresentação à diretoria e conselho</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEnhanceWithAi}
            disabled={isEnhancing || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs w-full sm:w-auto justify-center"
          >
            <Sparkles className={`w-4 h-4 ${isEnhancing ? 'animate-pulse' : ''}`} />
            {isEnhancing ? 'Melhorando narrativa...' : 'Melhorar narrativa com IA'}
          </button>

          <button
            id="btn-print-report-pdf"
            onClick={handlePrint}
            disabled={isPrinting}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-75 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs w-full sm:w-auto justify-center cursor-pointer"
            title="Imprimir ou Salvar Relatório em formato PDF"
          >
            <Printer className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`} />
            {isPrinting ? 'Preparando Impressão...' : 'Imprimir / Salvar em PDF'}
          </button>
        </div>
      </div>

      {aiMessage && (
        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 print:hidden">
          {aiMessage}
        </div>
      )}

      {/* Printable Report Document Body */}
      <div id="printable-report-content" className="bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 text-slate-900 dark:text-white print:border-none print:shadow-none print:p-6 transition-colors">
        {/* Report Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
              Relatório Estratégico de Alocação de Capital de Mídia
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              Marketing Mix Modeling (Google Meridian)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Execução do modelo: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString('pt-BR') : 'indisponível'} • Modelo: {results.modelId} • Histórico completo ajustado
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Status Econométrico:</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> {results.diagnostics?.isConverged === true ? 'Convergido' : results.diagnostics?.isConverged === false ? 'Não convergido' : 'Convergência indisponível'}
            </span>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            1. Resumo Executivo & Diretriz Principal
          </h2>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {report?.aiNarrative?.executiveSummary || report?.summary}
            </p>
          </div>
        </section>

        {/* 2. Key Metrics Snapshot */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            2. Indicadores Consolidados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">KPI Total Histórico</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {formatKpi(results.totalKpi, results.kpiType)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Investimento Total Mídia</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {Number.isFinite(results.totalSpend) ? `R$ ${(results.totalSpend / 1000).toFixed(0)}k` : 'N/D'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">ROI Médio (Mídia Paga)</span>
              <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                {Number.isFinite(results.blendedRoi) ? `${results.blendedRoi.toFixed(2)}x` : 'N/D'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Aderência do Modelo (R²)</span>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {Number.isFinite(results.diagnostics?.rSquared) ? `${(results.diagnostics.rSquared * 100).toFixed(1)}%` : 'N/D'}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Desempenho por Canal & Tabela de Ranking */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            3. Desempenho Individual dos Canais de Mídia
          </h2>
          <ScrollableTableWrapper minWidth="750px" hintText="Arraste para ver métricas detalhadas de cada canal">
            <table className="w-full text-left text-xs border-collapse border border-slate-200 dark:border-slate-800 rounded-lg">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5">Canal</th>
                  <th className="p-2.5 text-right">Investimento</th>
                  <th className="p-2.5 text-right">Fatia (%)</th>
                  <th className="p-2.5 text-right">ROI Médio (95% CI)</th>
                  <th className="p-2.5 text-right">Retorno Marginal (mROI)</th>
                  <th className="p-2.5 text-right">Saturação</th>
                  <th className="p-2.5 text-right">Carryover (Half-Life)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(results.channels || []).map(c => (
                  <tr key={c.channelName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{c.channelName}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{Number.isFinite(c.spend) ? `R$ ${c.spend.toLocaleString('pt-BR')}` : 'N/D'}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{Number.isFinite(c.spendShare) ? `${c.spendShare}%` : 'N/D'}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {Number.isFinite(c.roi) ? `${c.roi.toFixed(2)}${results.kpiType === 'non_revenue' ? ' KPI/R$' : 'x'}` : 'N/D'} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">[{Number.isFinite(c.roiInterval?.ci025) ? `${c.roiInterval.ci025.toFixed(1)}${results.kpiType === 'non_revenue' ? ' KPI/R$' : 'x'}` : 'N/D'} - {Number.isFinite(c.roiInterval?.ci975) ? `${c.roiInterval.ci975.toFixed(1)}${results.kpiType === 'non_revenue' ? ' KPI/R$' : 'x'}` : 'N/D'}]</span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{Number.isFinite(c.marginalRoi) ? `${c.marginalRoi.toFixed(2)}${results.kpiType === 'non_revenue' ? ' KPI/R$' : 'x'}` : 'N/D'}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{Number.isFinite(c.saturationLevel) ? `${(c.saturationLevel * 100).toFixed(0)}%${c.saturationStatus ? ` (${c.saturationStatus})` : ''}` : 'N/D'}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{Number.isFinite(c.adstockHalfLifeWeeks) ? `${c.adstockHalfLifeWeeks} semanas` : 'N/D'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableWrapper>
        </section>

        {/* 4. Recomendação de Orçamento */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            4. Recomendação de Realocação de Orçamento
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {report?.budgetRecommendationSummary}
          </p>
          {report?.aiNarrative?.recommendedActions?.length ? (
            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {report.aiNarrative.recommendedActions.map(action => <li key={action}>{action}</li>)}
            </ul>
          ) : null}
        </section>

        {/* 5. Riscos e Limitações Metodológicas */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400"></span>
            5. Riscos, Incerteza e Limitações Econométricas
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
            {(report?.risksAndLimitations || []).map((risk, idx) => (
              <li key={idx}>{risk}</li>
            ))}
          </ul>
        </section>

        {/* Report Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Easy Mix Modeling • Modelo estatístico baseado em Google Meridian</span>
          <span>Confidencial • Uso Interno</span>
        </div>
      </div>

      {/* Floating Print / PDF Action Button */}
      <FloatingPrintButton />
    </div>
  );
};
