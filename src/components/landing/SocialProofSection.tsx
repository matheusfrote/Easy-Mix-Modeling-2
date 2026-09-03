import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Award,
  Zap,
  CheckCircle2,
  Users,
  Quote
} from 'lucide-react';

export const SocialProofSection: React.FC = () => {
  const stats = [
    {
      value: '+24%',
      label: 'Incremento Médio de ROI',
      detail: 'Após redistribuição orçamentária por equimarginalidade'
    },
    {
      value: '-35%',
      label: 'Redução de Desperdício',
      detail: 'Detectando saturação precoce de canais de topo de funil'
    },
    {
      value: 'Cookieless',
      label: 'Privacidade Nativa',
      detail: 'Séries temporais agregadas sem necessidade de cookies de terceiros'
    },
    {
      value: '70+',
      label: 'Benchmarks de Mídia',
      detail: 'Priors calibrados para Google, Meta, TikTok, TV e Retail'
    }
  ];

  const methodologyReferences = [
    {
      source: 'Google Meridian Framework',
      quote:
        'O Meridian traz rigor bayesiano MCMC, calibração com experimentos e modelagem de adstock com saturação para democratizar a tomada de decisão econométrica em marketing.',
      tag: 'Metodologia Aberta Google'
    },
    {
      source: 'Boas Práticas de Mensuração & Econometria',
      quote:
        'A combinação de modelos de resposta a estímulos agregados e testes de incrementalidade é o único caminho sustentável para a era pós-cookies de terceiros.',
      tag: 'Padrão da Indústria Global'
    },
    {
      source: 'Decisão Guiada por Incremento Real',
      quote:
        'Parar de pagar por conversões que aconteceriam organicamente é a alavanca de crescimento mais rápida que qualquer CMO pode acionar.',
      tag: 'Foco em Bottom-line'
    }
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {stats.map((st, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1"
            >
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                {st.value}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {st.label}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {st.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Narrative & Methodological References */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-400/30">
              <Award className="w-3.5 h-3.5" />
              <span>Rigores Científicos da Indústria</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Construído sobre os alicerces econométricos mais respeitados do mercado global
            </h3>
            <p className="text-slate-300 text-sm sm:text-base mt-2">
              Inspirado nos avanços do Google Meridian e nas melhores práticas difundidas por referências de analytics e econometria no Brasil e no mundo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {methodologyReferences.map((ref, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <Quote className="w-6 h-6 text-blue-400/50 mb-3" />
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                    "{ref.quote}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="text-xs font-bold text-white">{ref.source}</div>
                  <div className="text-[10px] text-blue-300 font-medium">{ref.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
