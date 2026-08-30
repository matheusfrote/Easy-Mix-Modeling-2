import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  Zap,
  Building,
  ArrowRight,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

interface PricingSectionProps {
  onSelectPlan: (plan: 'starter' | 'pro' | 'enterprise') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const plans = [
    {
      id: 'starter' as const,
      name: 'Starter (Freemium)',
      badge: 'Para Testar e Começar',
      priceMonthly: 'R$ 0',
      priceAnnual: 'R$ 0',
      period: 'gratuito para sempre',
      description: 'Ideal para analistas e pequenas equipes que desejam validar seus primeiros dados de mídia via CSV/XLSX.',
      highlight: false,
      cta: 'Começar Gratuitamente',
      features: [
        'Upload manual de planilhas CSV e XLSX',
        'Até 5 canais de mídia mapeados',
        'Model Readiness Score e auditoria básica',
        'Ajuste bayesiano padrão Google Meridian',
        'Gráficos de contribuição e curvas de saturação',
        'Exportação de gráficos em PNG/JPEG',
        'Suporte comunitário e guias em vídeo'
      ]
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      badge: 'Mais Escolhido por Marcas & Agências',
      priceMonthly: 'R$ 790',
      priceAnnual: 'R$ 632',
      period: 'por mês (faturado anualmente)',
      description: 'Para empresas e agências que precisam de conectores automáticos, simulação de cenários e insights estratégicos com IA.',
      highlight: true,
      cta: 'Iniciar Teste Pro Gratuito (14 dias)',
      features: [
        'Tudo do plano Starter, e mais:',
        'Conectores automáticos (Google Ads, Meta Ads, GA4, Shopify, VTEX)',
        'Canais de mídia e variáveis de controle ilimitados',
        'Otimizador de Orçamento por Equimarginalidade',
        'Simulador What-If de cenários prospectivos',
        'Diagnósticos e planos de ação com Gemini AI ilimitados',
        'Relatórios executivos em PDF com narrativa automática',
        'Suporte prioritário via WhatsApp e e-mail'
      ]
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      badge: 'Para Grandes Operações & Hold',
      priceMonthly: 'Sob Consulta',
      priceAnnual: 'Sob Consulta',
      period: 'contrato customizado',
      description: 'Para corporações com múltiplos países, marcas ou necessidades avançadas de integração com BigQuery.',
      highlight: false,
      cta: 'Falar com Especialista',
      features: [
        'Tudo do plano Pro, e mais:',
        'Conexão nativa com BigQuery, PostgreSQL e Snowflake',
        'Modelagem com granularidade regional (Geo-experiments)',
        'Priors bayesianos customizados com calibração econométrica',
        'Multi-marcas, multi-workspaces e controle de permissões (RBAC)',
        'Sessões de mentoria econométrica com especialistas em Meridian',
        'SLA de 99.9% e contrato corporativo de confidencialidade'
      ]
    }
  ];

  return (
    <section id="planos" className="py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            Investimento Transparente
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Planos desenhados para a escala do seu negócio
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Comece gratuitamente com seus próprios dados e evolua para automações completas e suporte econométrico.
          </p>

          {/* Billing Cycle Switch */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span
              className={`text-xs sm:text-sm font-semibold ${
                billingCycle === 'monthly'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Mensal
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="w-14 h-8 bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors relative"
              aria-label="Alternar faturamento mensal ou anual"
            >
              <div
                className={`w-6 h-6 rounded-full bg-blue-600 shadow-md transition-transform transform ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs sm:text-sm font-semibold ${
                  billingCycle === 'annual'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Anual
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                Economize 20%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map(p => {
            const isHighlighted = p.highlight;
            const displayPrice = billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;

            return (
              <div
                key={p.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 ${
                  isHighlighted
                    ? 'bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 shadow-2xl shadow-blue-500/15 lg:-translate-y-2'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm'
                }`}
              >
                {isHighlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold tracking-wider uppercase shadow-md">
                    Mais Popular
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {p.badge}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Price info */}
                  <div className="py-4 border-y border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                        {displayPrice}
                      </span>
                      {p.id !== 'enterprise' && p.id !== 'starter' && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">/mês</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {p.period}
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 py-6">
                    <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      O que está incluso:
                    </div>
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-700 dark:text-slate-300 leading-normal">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => onSelectPlan(p.id)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 group ${
                      isHighlighted
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span>{p.cta}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & FAQ banner */}
        <div className="mt-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sem necessidade de cartão de crédito no cadastro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Cancele a qualquer momento com 1 clique</span>
          </div>
        </div>
      </div>
    </section>
  );
};
