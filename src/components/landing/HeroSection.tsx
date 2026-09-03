import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  PieChart,
  Sliders,
  BarChart3,
  Layers,
  Database,
  Lock,
  Play
} from 'lucide-react';

interface HeroSectionProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onExploreDemo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenRegister,
  onExploreDemo
}) => {
  const [activeTab, setActiveTab] = useState<'roi' | 'saturation' | 'optimizer'>('roi');
  const [metaSpendMultiplier, setMetaSpendMultiplier] = useState(20);

  return (
    <section className="relative overflow-hidden pt-10 pb-20 lg:pt-16 lg:pb-32 bg-radial from-blue-50/50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/15 to-purple-600/15 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-blue-500/10 dark:bg-blue-600/10 blur-2xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Motor Econométrico Bayesiano baseado no Google Meridian</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]"
          >
            Descubra o impacto real da sua mídia{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              sem depender de pixels ou cookies.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mx-auto font-normal"
          >
            A plataforma de <strong className="font-semibold text-slate-900 dark:text-white">Marketing Mix Modeling (MMM)</strong> baseada no Google Meridian que simplifica a econometria, mensura a incrementalidade real dos canais e otimiza o seu ROI em minutos.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <button
              type="button"
              id="hero-cta-register"
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold text-base shadow-xl shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-3 group"
            >
              <span>Testar Gratuitamente</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              id="hero-cta-demo"
              onClick={onExploreDemo}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-base border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200 flex items-center justify-center gap-2.5"
            >
              <Play className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-current" />
              <span>Explorar Demonstração Interativa</span>
            </button>
          </motion.div>

          {/* Trust Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Séries Temporais Cookieless</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Modelagem Bayesiana MCMC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Sem necessidade de código</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Insights Estratégicos com Gemini AI</span>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Interactive Product Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-12 sm:mt-16 rounded-2xl p-2 sm:p-4 bg-gradient-to-b from-slate-200/80 to-slate-100/40 dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-blue-500/10"
        >
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
            {/* Mockup Browser/App Header */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-slate-400 ml-2">app.easymixmodeling.com/workspace</span>
              </div>

              {/* Interactive preview tabs */}
              <div className="flex items-center bg-slate-200/60 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('roi')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'roi'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Contribuição & ROI
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('saturation')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'saturation'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Curva de Hill (Saturação)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('optimizer')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'optimizer'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Otimizador de Verba
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Modelo Ativo: Meridian MCMC
                </span>
              </div>
            </div>

            {/* Mockup Body Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Top KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Receita Total Modelada</div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                    R$ 4.852.400
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> R² = 0.94 (Ajuste excelente)
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">ROI Médio Geral</div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    3.42x
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Retorno sobre R$ 1.2M investidos
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Vendas de Linha de Base (Orgânica)</div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                    42.8%
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Sem dependência de mídia paga
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200/60 dark:border-indigo-800/60">
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Oportunidade de Otimização</div>
                  <div className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    +R$ 384.500
                  </div>
                  <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 font-medium mt-1">
                    Redistribuindo a verba atual
                  </div>
                </div>
              </div>

              {/* Dynamic Tab Visualizer */}
              {activeTab === 'roi' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Channel Breakdown */}
                  <div className="lg:col-span-2 space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Decomposição Causal por Canal de Mídia</span>
                      <span className="text-slate-400">ROI Incremental vs Saturação</span>
                    </div>

                    {/* Channels bars */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-800 dark:text-slate-200 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            Google Ads (Search & Performance Max)
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">ROI: 4.18x (mROI: 2.85x)</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: '82%' }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>Investimento: R$ 450k | Adstock Half-Life: 1.8 sem</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem para crescer: Alta</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-800 dark:text-slate-200 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                            Meta Ads (Instagram & Facebook)
                          </span>
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">ROI: 3.65x (mROI: 1.42x)</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-purple-600 rounded-full" style={{ width: '68%' }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>Investimento: R$ 420k | Adstock Half-Life: 2.4 sem</span>
                          <span className="text-amber-500 font-medium">Início de retornos decrescentes</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-800 dark:text-slate-200 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            YouTube Ads & Vídeo
                          </span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">ROI: 2.80x (mROI: 2.10x)</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '52%' }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>Investimento: R$ 210k | Alto efeito de Brand Lift</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Sub-investido</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-800 dark:text-slate-200 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            TikTok Ads & Creator Media
                          </span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">ROI: 2.30x (mROI: 1.95x)</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '38%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gemini Advisor Card Preview */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-2">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Diagnóstico da IA Gemini</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        "O canal <strong className="text-slate-900 dark:text-white">Google Ads</strong> apresenta a maior eficiência marginal (+2.85). Recomenda-se realocar 15% da verba saturada do Meta Ads para Search e YouTube para maximizar R$ 180k adicionais em vendas."
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Confiança Bayesiana: 92%</span>
                      <button
                        type="button"
                        onClick={onExploreDemo}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Abrir Otimizador <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'saturation' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Curva de Saturação de Hill (Hill Curve)</span>
                      <p className="text-slate-500 text-[11px]">Ponto de inflexão onde cada real adicional gera menos retorno incremental</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold">
                      K = R$ 380k | S = 1.45
                    </span>
                  </div>

                  {/* Visual SVG curve representing Hill Saturation */}
                  <div className="h-40 w-full relative pt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120">
                      {/* Grid lines */}
                      <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                      <line x1="0" y1="60" x2="500" y2="60" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />
                      <line x1="0" y1="0" x2="500" y2="0" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />

                      {/* Theoretical saturation curve */}
                      <path
                        d="M 0 120 C 150 115, 220 30, 500 15"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                      />

                      {/* Current spend point */}
                      <circle cx="270" cy="35" r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                      <text x="280" y="32" className="text-[10px] fill-slate-700 dark:fill-slate-200 font-bold">
                        Ponto Atual (R$ 420k)
                      </text>

                      {/* Optimal spend point */}
                      <circle cx="340" cy="24" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <text x="350" y="22" className="text-[10px] fill-emerald-600 dark:fill-emerald-400 font-bold">
                        Ponto Ótimo Meridian
                      </text>
                    </svg>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-800 pt-2">
                    <span>Investimento Semanal (R$ 0k a R$ 800k)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Ganho estimado ao atingir o platô: +14%</span>
                  </div>
                </div>
              )}

              {activeTab === 'optimizer' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Simulador de Cenários What-If</div>
                      <div className="text-[11px] text-slate-500">Ajuste os investimentos e veja o impacto na receita projetada</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Receita Projetada: +R$ 142.800
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Variação de Verba Meta Ads:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">+{metaSpendMultiplier}%</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={metaSpendMultiplier}
                        onChange={e => setMetaSpendMultiplier(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                      <span>Projeção com Intervalo de Confiança 90%:</span>
                      <strong className="font-mono font-bold">R$ 4.995.200 (± R$ 42.000)</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mockup Footer CTA */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span>Pronto para importar seus dados via CSV, Planilhas ou Conectores de Ads</span>
              </div>
              <button
                type="button"
                onClick={onExploreDemo}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 group"
              >
                <span>Experimentar no Workspace Interativo</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
