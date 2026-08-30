import React from 'react';
import { motion } from 'motion/react';
import {
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ProblemSolutionSectionProps {
  onOpenRegister: () => void;
}

export const ProblemSolutionSection: React.FC<ProblemSolutionSectionProps> = ({ onOpenRegister }) => {
  const comparisonItems = [
    {
      topic: 'Privacidade & Rastreamento',
      traditional: 'Depende de cookies de terceiros, pixels no navegador e identificadores no nível do usuário, sofrendo com bloqueios de adblockers e restrições do iOS 14.5+.',
      traditionalBad: true,
      meridian: '100% baseado em séries temporais agregadas (investimento, impressões e receita). Imune ao fim dos cookies e em total conformidade com a LGPD e GDPR.',
      meridianGood: true
    },
    {
      topic: 'Sobreposição de Conversões',
      traditional: 'Cada plataforma de anúncio (Meta, Google, TikTok) reivindica a mesma venda para si, inflando relatórios e criando métricas incoerentes.',
      traditionalBad: true,
      meridian: 'Decomposição causal bayesiana unificada. Elimina a dupla contagem e atribui o peso real de cada canal na geração de receita incremental.',
      meridianGood: true
    },
    {
      topic: 'Efeito de Longo Prazo (Adstock) & Saturação',
      traditional: 'Ignora que o anúncio visto hoje pode gerar conversão semanas depois. Não identifica quando um canal atingiu o teto de saturação.',
      traditionalBad: true,
      meridian: 'Modelagem de Adstock com taxa de decaimento geométrico e Curvas de Hill para diagnosticar o ponto exato de retornos decrescentes.',
      meridianGood: true
    },
    {
      topic: 'Vendas Orgânicas & Fatores Externos',
      traditional: 'Assume que quase toda venda é gerada por cliques em mídia, desconsiderando a força da marca e a sazonalidade natural do negócio.',
      traditionalBad: true,
      meridian: 'Separa com rigor estatístico a linha de base orgânica, sazonalidade (termos de Fourier), feriados e variáveis macroeconômicas.',
      meridianGood: true
    },
    {
      topic: 'Otimização de Orçamento',
      traditional: 'Otimização reativa e baseada em intuição manual, sem cálculo de elasticidade marginal.',
      traditionalBad: true,
      meridian: 'Teorema da Equimarginalidade: redistribuição matemática automatizada para extrair o máximo faturamento com a mesma verba total.',
      meridianGood: true
    }
  ];

  return (
    <section id="comparativo" className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
            O Fim da Atribuição Tradicional
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Por que as ferramentas de atribuição tradicionais não funcionam mais?
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            A degradação dos cookies, restrições de privacidade e relatórios isolados de ad networks geram uma ilusão de eficiência. Veja a comparação direta:
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 dark:bg-rose-500/10 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Atribuição Tradicional (Último Clique / Pixels)</h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Frágil, míope e suscetível a ruídos</p>
                </div>
              </div>

              <div className="space-y-6 pt-6">
                {comparisonItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                        {item.topic}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.traditional}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Resultado: Desperdício de até 35% do orçamento em canais saturados</span>
            </div>
          </div>

          {/* Easy Mix Modeling Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-blue-50/50 to-white dark:from-slate-900 dark:to-slate-900/90 border-2 border-blue-500/80 dark:border-blue-500/60 shadow-xl shadow-blue-500/10 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-bl-xl shadow-xs">
              Padrão Google Meridian
            </div>
            <div>
              <div className="flex items-center gap-3 pb-6 border-b border-blue-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Easy Mix Modeling (Econometria Moderna)</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Científico, holístico e 100% resiliente</p>
                </div>
              </div>

              <div className="space-y-6 pt-6">
                {comparisonItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-1">
                        {item.topic}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {item.meridian}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-blue-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>ROI otimizado com rigor estatístico internacional</span>
              </div>
              <button
                type="button"
                onClick={onOpenRegister}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <span>Migrar para o MMM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
