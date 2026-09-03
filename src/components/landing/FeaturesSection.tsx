import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Database,
  Cpu,
  Sliders,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Zap,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

interface FeaturesSectionProps {
  onOpenRegister: () => void;
  onExploreDemo: () => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  onOpenRegister,
  onExploreDemo
}) => {
  const [activePillar, setActivePillar] = useState<number>(0);

  const pillars = [
    {
      id: 'datahub',
      title: 'Data Hub Inteligente & Model Readiness Score',
      badge: 'Ingestão e Qualidade',
      icon: Database,
      color: 'from-blue-600 to-cyan-600',
      description:
        'Elimine semanas de trabalho manual preparando dados. Importe seus relatórios e receba uma auditoria estatística instantânea da saúde das suas séries temporais.',
      features: [
        'Upload descomplicado de planilhas CSV e XLSX com detecção inteligente de granularidade semanal.',
        'Mapeamento automatizado de canais de mídia, impressões, variáveis de controle (feriados, promoções) e KPI alvo.',
        'Diagnóstico de Prontidão (Data Readiness Score de 0 a 100) com auditoria de colinearidade VIF, lacunas e outliers.',
        'Limpeza e higienização automática em 1 clique para garantir convergência de modelos bayesianos.'
      ],
      interactiveSnippet: {
        title: 'Check-up de Prontidão de Dados',
        score: 'Análise Contínua',
        badge: 'Auditoria Estatística',
        items: [
          { name: 'Multicolinearidade (VIF)', status: 'Calculado dinamicamente', ok: true },
          { name: 'Granularidade Temporal', status: 'Mapeamento automático', ok: true },
          { name: 'Integridade de Células', status: 'Verificação de N/A', ok: true }
        ]
      }
    },
    {
      id: 'meridian',
      title: 'Motor Econométrico Google Meridian MCMC',
      badge: 'Ciência Bayesiana',
      icon: Cpu,
      color: 'from-indigo-600 to-purple-600',
      description:
        'Aproveite a metodologia de ponta desenvolvida pelo time de ciência de dados do Google para estimar com precisão o retorno marginal de cada investimento.',
      features: [
        'Amostragem MCMC com algoritmo NUTS (No-U-Turn Sampler) para estimativas probabilísticas robustas.',
        'Modelagem de Adstock geométrico com meia-vida (half-life) personalizada para cada canal de mídia.',
        'Curvas de Hill para estimar saturação e retornos decrescentes com parâmetros K (meia-saturação) e S (inclinação).',
        'Biblioteca calibrada com priors de mais de 70 formatos de mídia (Search, Social, Display, TV, Retail Media, OOH).'
      ],
      interactiveSnippet: {
        title: 'Parâmetros Meridian',
        score: 'Distribuição Posterior',
        badge: 'MCMC / NUTS',
        items: [
          { name: 'Adstock Decay (α)', status: 'Estimado por cadeia Markoviana', ok: true },
          { name: 'Curva de Hill (K, S)', status: 'Otimização paramétrica', ok: true },
          { name: 'Convergência (R-hat)', status: 'Monitoramento contínuo', ok: true }
        ]
      }
    },
    {
      id: 'optimizer',
      title: 'Otimizador de Orçamento & Simulador What-If',
      badge: 'Ação & ROI Máximo',
      icon: Sliders,
      color: 'from-emerald-600 to-teal-600',
      description:
        'Transforme conclusões matemáticas em ações de negócio. Rebalanceie seu budget de mídia para extrair a máxima receita incremental sem gastar um centavo a mais.',
      features: [
        'Otimização baseada no Teorema da Equimarginalidade, equilibrando o ROI marginal de todos os canais.',
        'Simulador prospectivo interativo ("E se aumentarmos 20% no Google Ads e reduzirmos 10% no Meta Ads?").',
        'Intervalos de confiança bayesianos de 80% e 95% para embasar apresentações com a diretoria.',
        'Comparador de cenários de alocação recomendada versus alocação histórica real.'
      ],
      interactiveSnippet: {
        title: 'Otimização por Equimarginalidade',
        score: 'Curva de Resposta',
        badge: 'ROI Marginal Otimizado',
        items: [
          { name: 'Canais Sub-investidos', status: 'Sugestão de Aumento', ok: true },
          { name: 'Canais Saturados', status: 'Prevenção de Desperdício', ok: true },
          { name: 'Receita Incremental', status: 'Projeção Matemática', ok: true }
        ]
      }
    },
    {
      id: 'ai-insights',
      title: 'Consultoria Estratégica com Gemini AI',
      badge: 'Inteligência Artificial',
      icon: Sparkles,
      color: 'from-purple-600 to-pink-600',
      description:
        'Não perca tempo tentando decifrar tabelas estatísticas densas. Receba diagnósticos estratégicos prontos para apresentação e planos de ação em linguagem de negócios.',
      features: [
        'Sumários executivos automáticos focados em impacto no bottom-line e eficiência de aquisição.',
        'Identificação de canais sub-investidos com alto potencial de escala e canais em zona de retornos decrescentes.',
        'Geração de relatórios executivos em PDF com narrativa estratégica personalizada para CMOs e CFOs.',
        'Recomendações táticas de experimentos de incrementalidade (Geo-experiments / Lift tests) para validação.'
      ],
      interactiveSnippet: {
        title: 'Sumário Executivo Gerado',
        score: 'Gemini Integrado',
        badge: 'LLM com Contexto Matemático',
        items: [
          { name: 'Identificação de Gargalos', status: 'Análise de Saturação', ok: true },
          { name: 'Oportunidades de Escala', status: 'Baseado no mROI', ok: true },
          { name: 'Planos de Ação', status: 'Linguagem de Negócios', ok: true }
        ]
      }
    }
  ];

  return (
    <section id="recursos" className="py-24 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            Capacidades de Ponta a Ponta
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            A infraestrutura completa de MMM para o seu time de marketing
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Desde a limpeza de dados e calibração estatística até a redistribuição estratégica do orçamento de mídia.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            const isActive = activePillar === idx;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePillar(idx)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400 dark:text-blue-600' : 'text-slate-500'}`} />
                <span>{p.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Active Pillar Card Display */}
        {(() => {
          const current = pillars[activePillar];
          const CurrentIcon = current.icon;
          return (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 lg:p-12 shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left info column */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100/70 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    <CurrentIcon className="w-3.5 h-3.5" />
                    <span>{current.badge}</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {current.title}
                  </h3>

                  <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {current.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    {current.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onOpenRegister}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
                    >
                      <span>Começar a Usar</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onExploreDemo}
                      className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 font-semibold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all"
                    >
                      Ver na Demonstração
                    </button>
                  </div>
                </div>

                {/* Right Interactive Preview Card */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs uppercase font-bold text-slate-400">Módulo Ativo</span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {current.interactiveSnippet.title}
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
                        {current.interactiveSnippet.badge}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Métrica Principal</span>
                      <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                        {current.interactiveSnippet.score}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {current.interactiveSnippet.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{it.name}</span>
                          <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">{it.status}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 text-center">
                      <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        Processamento em tempo real sem envio de dados a terceiros
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </div>
    </section>
  );
};
