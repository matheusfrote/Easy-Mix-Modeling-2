import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'O que é Marketing Mix Modeling (MMM) e como ele substitui a atribuição do último clique?',
      answer:
        'O Marketing Mix Modeling (MMM) é uma técnica econométrica que analisa a relação entre investimentos em diferentes canais de marketing e as vendas totais ao longo do tempo. Diferente do último clique (que atribui 100% da conversão ao último anúncio clicado), o MMM identifica o efeito incremental real, a saturação (retornos decrescentes), o efeito residual de marca (adstock) e separa as vendas que teriam ocorrido organicamente.'
    },
    {
      question: 'Preciso instalar códigos, pixels de rastreamento ou tags no meu site?',
      answer:
        'Não! O MMM opera de forma cookieless e não depende de rastreamento no navegador do usuário. A modelagem é realizada exclusivamente com séries temporais agregadas de investimentos e vendas por período (ex: granularidade semanal), respeitando princípios de privacidade alinhados à LGPD e GDPR.'
    },
    {
      question: 'Qual é a quantidade mínima de dados históricos necessária?',
      answer:
        'Recomendamos no mínimo 52 semanas (1 ano) de dados históricos semanais para capturar ciclos completos de sazonalidade e feriados. O cenário ideal para máxima precisão estatística é de 104 semanas (2 anos), permitindo que o motor Google Meridian calibre priors robustos com alta confiança bayesiana.'
    },
    {
      question: 'Como a plataforma utiliza o framework Google Meridian?',
      answer:
        'O Easy Mix Modeling é construído diretamente sobre os princípios e arquitetura econométrica do Google Meridian — o framework bayesiano open-source mais moderno da indústria. Nossa plataforma encapsula a complexidade matemática do MCMC (No-U-Turn Sampler), Adstock geométrico e Curvas de Hill em uma interface no-code intuitiva, com diagnósticos de qualidade automáticos (Model Readiness Score).'
    },
    {
      question: 'Como funciona o Otimizador de Orçamento e o Teorema da Equimarginalidade?',
      answer:
        'O otimizador calcula a derivada da curva de saturação de cada canal (o ROI marginal — ou seja, quanto de receita R$ 1,00 adicional geraria naquele canal específico). Pelo Teorema da Equimarginalidade, o faturamento total é maximizado quando o ROI marginal é igualado em todos os canais. A plataforma encontra matematicamente esse ponto ótimo e recomenda a redistribuição exata da sua verba.'
    },
    {
      question: 'Como a Inteligência Artificial Gemini apoia a análise?',
      answer:
        'O Gemini AI atua como um consultor econométrico sênior embarcado na plataforma. Ele interpreta os parâmetros estatísticos do modelo ajustado e traduz conclusões em diagnósticos em português claro, alertas de saturação de mídia e planos de ação executivos prontos para compartilhar com a diretoria.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            Tire Suas Dúvidas
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Perguntas Frequentes sobre Econometria & MMM
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Tudo o que você precisa saber para começar a mensurar o retorno real da sua mídia.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span className="text-sm sm:text-base leading-snug">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
