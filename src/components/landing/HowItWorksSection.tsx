import React from 'react';
import { motion } from 'motion/react';
import {
  UploadCloud,
  CheckCheck,
  Cpu,
  SlidersHorizontal,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface HowItWorksSectionProps {
  onOpenRegister: () => void;
  onExploreDemo: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  onOpenRegister,
  onExploreDemo
}) => {
  const steps = [
    {
      number: '01',
      title: 'Ingestão de Séries Temporais',
      subtitle: 'Sem instalar tags ou códigos no site',
      description:
        'Faça upload de planilhas de investimentos e vendas (CSV/XLSX) ou conecte diretamente seus canais de mídia. Trabalhamos exclusivamente com dados agregados.',
      icon: UploadCloud,
      badge: 'Passo 1'
    },
    {
      number: '02',
      title: 'Diagnóstico de Prontidão',
      subtitle: 'Model Readiness Score de 0 a 100',
      description:
        'Nossos algoritmos auditam automaticamente integridade, lacunas de datas, outliers e multicolinearidade (VIF) para certificar a qualidade estatística antes do treino.',
      icon: CheckCheck,
      badge: 'Passo 2'
    },
    {
      number: '03',
      title: 'Ajuste do Modelo Google Meridian',
      subtitle: 'Econometria Bayesiana descomplicada',
      description:
        'O motor MCMC calcula o Adstock (efeito residual no tempo) e a Curva de Saturação de Hill de cada canal de marketing em poucos cliques, sem necessidade de código.',
      icon: Cpu,
      badge: 'Passo 3'
    },
    {
      number: '04',
      title: 'Otimização e Decisão de Verba',
      subtitle: 'Equimarginalidade e ROI Máximo',
      description:
        'Identifique canais com retornos decrescentes e utilize o simulador prospectivo para redistribuir investimentos e maximizar seu faturamento final.',
      icon: SlidersHorizontal,
      badge: 'Passo 4'
    }
  ];

  return (
    <section id="como-funciona" className="py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
            Fluxo Simplificado
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Como o Easy Mix Modeling funciona na prática?
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Substitua meses de desenvolvimento de scripts econométricos por uma interface visual ágil e cientificamente robusta.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-3xl font-black text-slate-200 dark:text-slate-700">
                      {s.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {s.title}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">
                    {s.subtitle}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {s.badge}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Callout banner */}
        <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xl sm:text-2xl font-bold">Pronto para rodar seu primeiro modelo econométrico?</h4>
            <p className="text-blue-100 text-xs sm:text-sm">
              Você pode testar agora mesmo usando nossos dados sintéticos de varejo omnichannel.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onExploreDemo}
              className="px-5 py-3 rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Abrir Demonstração</span>
            </button>
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-5 py-3 rounded-xl bg-blue-900/40 hover:bg-blue-900/60 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2"
            >
              <span>Criar Conta</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
