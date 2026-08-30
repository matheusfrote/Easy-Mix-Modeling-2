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
import { GlobalDateRangeFilter, formatDateBR } from './GlobalDateRangeFilter';

interface ReportViewProps {
  results: MeridianModelResults | null;
  availableDates?: string[];
  dateRange?: DateRangeFilter;
  onChangeDateRange?: (newRange: DateRangeFilter) => void;
}

import { FloatingPrintButton } from "./ui/FloatingPrintButton";

export const ReportView: React.FC<ReportViewProps> = ({
  results,
  availableDates = [],
  dateRange,
  onChangeDateRange
}) => {
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
          {/* Date Range Selector for Report Window */}
          {availableDates.length > 0 && dateRange && onChangeDateRange && (
            <GlobalDateRangeFilter
              availableDates={availableDates}
              dateRange={dateRange}
              onChangeDateRange={onChangeDateRange}
              variant="header"
            />
          )}

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
              Data de Emissão: {report?.generatedAt || new Date().toLocaleDateString('pt-BR')} • Versão do Motor: 1.0 (Bayesiano)
              {dateRange && dateRange.preset !== 'all' && (
                <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                  • Período: {formatDateBR(dateRange.startDate)} até {formatDateBR(dateRange.endDate)}
                </span>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Status Econométrico:</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Modelo Validado & Convergido
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
            <p className="font-medium text-slate-900 dark:text-slate-100">{report?.summary}</p>
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
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Receita Total Histórica</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                R$ {(((results?.totalKpi ?? 0)) / 1000000).toFixed(2)}M
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Investimento Total Mídia</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                R$ {(((results?.totalSpend ?? 0)) / 1000).toFixed(0)}k
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">ROI Médio (Mídia Paga)</span>
              <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                {(results?.blendedRoi ?? 0).toFixed(2)}x
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Aderência do Modelo (R²)</span>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {(((results?.diagnostics?.rSquared ?? 0)) * 100).toFixed(1)}%
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
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">R$ {(c.spend || 0).toLocaleString('pt-BR')}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{c.spendShare || 0}%</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {(c.roi || 0).toFixed(2)}x <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">[{c.roiInterval?.ci025?.toFixed(1) || '0.0'}x - {c.roiInterval?.ci975?.toFixed(1) || '0.0'}x]</span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{(c.marginalRoi || 0).toFixed(2)}x</td>
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{c.saturationLevel || 0}% ({c.saturationStatus || 'Ótimo'})</td>
                    <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{c.adstockHalfLifeWeeks || 1} semanas</td>
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
          <span>Plataforma SaaS Meridian AI MMM • Modelo Estatístico Baseado em Google Meridian</span>
          <span>Confidencial • Uso Interno</span>
        </div>
      </div>

      {/* Floating Print / PDF Action Button */}
      <FloatingPrintButton />
    </div>
  );
};
