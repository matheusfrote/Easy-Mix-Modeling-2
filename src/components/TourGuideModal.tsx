import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Database,
  Sliders,
  CheckCircle2,
  Radio,
  TrendingUp,
  Calculator,
  Compass,
  ArrowRight,
  Lightbulb,
  Check
} from 'lucide-react';
import { NavView } from './Sidebar';

export interface TourStep {
  id: string;
  view: NavView;
  title: string;
  subtitle: string;
  badge: string;
  icon: any;
  description: string;
  keyPoints: { icon: string; text: string }[];
  proTip?: string;
  actionText?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-upload',
    view: 'data',
    title: '1. Ingestão e Upload de Dados',
    subtitle: 'Base Histórica de Marketing e Vendas',
    badge: 'Passo 1 de 6',
    icon: Database,
    description:
      'Tudo começa com seus dados históricos. O modelo Marketing Mix Modeling (MMM) requer séries temporais com granularidade semanal cobrindo idealmente 24 meses (104 semanas).',
    keyPoints: [
      { icon: '📅', text: 'Granularidade semanal recomendada para capturar ciclos completos de compra (24 meses).' },
      { icon: '💰', text: 'Colunas de investimento (spend) por canal de mídia (Google, Meta, TV, etc.).' },
      { icon: '🎯', text: 'Métrica de KPI alvo de negócio (Receita em R$, Conversões ou Vendas).' },
      { icon: '✨', text: 'Você pode testar imediatamente clicando em "Carregar Dataset Demo (24 meses / 104 sem.)".' }
    ],
    proTip: 'Dica: Você pode fazer upload de arquivos .CSV ou .XLSX arrastando diretamente para a área demarcada.',
    actionText: 'Ver Tela de Upload'
  },
  {
    id: 'step-mapping',
    view: 'mapping',
    title: '2. Mapeamento Inteligente de Variáveis',
    subtitle: 'Classificação Semântica de Colunas',
    badge: 'Passo 2 de 6',
    icon: Sliders,
    description:
      'O sistema identifica automaticamente os tipos das colunas da sua planilha. Aqui você confirma a atribuição correta para cada variável antes de rodar a modelagem.',
    keyPoints: [
      { icon: '📆', text: 'Data (Date/Time): Série temporal de referência ordenada.' },
      { icon: '🏆', text: 'KPI de Negócio: Receita ou Vendas totais a serem decompostas.' },
      { icon: '📢', text: 'Canais de Mídia (Media Spend): Investimentos em campanhas pagas.' },
      { icon: '🛡️', text: 'Variáveis de Controle: Feriados, promoções e indicadores macroeconômicos para isolar sazonalidade.' }
    ],
    proTip: 'Dica: Mapear variáveis de controle orgânicas evita que o modelo atribua equivocadamente sazonalidades e datas comerciais à mídia paga.',
    actionText: 'Ver Mapeamento de Colunas'
  },
  {
    id: 'step-readiness',
    view: 'readiness',
    title: '3. Data Readiness & Higienização (Auto-Fix)',
    subtitle: 'Auditoria Estatística Pré-Modelagem',
    badge: 'Passo 3 de 6',
    icon: CheckCircle2,
    description:
      'Antes de treinar o modelo bayesiano, a base passa por rigorosos testes econométricos para evitar vieses e garantir confiabilidade estatística com um score de 0 a 100.',
    keyPoints: [
      { icon: '🔍', text: 'Validação de lacunas temporais (gaps), valores nulos ou negativos.' },
      { icon: '📊', text: 'Teste de variabilidade de investimento (Coeficiente de Variação CV ≥ 5%).' },
      { icon: '⚡', text: 'Detecção de multicolinearidade (correlação excessiva entre canais).' },
      { icon: '🪄', text: 'Botão "Auto-Fix & Higienizar": Corrige automaticamente anomalias detectadas.' }
    ],
    proTip: 'Score mínimo recomendado: 75/100 para prosseguir com segurança econométrica.',
    actionText: 'Ver Data Readiness'
  },
  {
    id: 'step-model',
    view: 'model',
    title: '4. Como os Investimentos Geram Resultados',
    subtitle: 'Entenda o impacto de cada canal de mídia nas suas vendas',
    badge: 'Passo 4 de 6',
    icon: Radio,
    description:
      'O modelo analisa seus dados históricos para entender quanto cada canal de mídia contribuiu para seus resultados. Ele considera que uma campanha pode continuar gerando vendas mesmo após a veiculação e que o retorno pode diminuir conforme o investimento aumenta.',
    keyPoints: [
      { icon: '📊', text: 'Impacto de cada canal: Descubra quanto cada mídia contribuiu para as suas vendas totais.' },
      { icon: '🌱', text: 'Resultado natural x Mídia: Separe o que aconteceria naturalmente do resultado adicional da publicidade.' },
      { icon: '📈', text: 'Qualidade das previsões: Verifica se o modelo reproduz bem o histórico e se os cálculos são confiáveis.' },
      { icon: '🎯', text: 'Margem de segurança: Apresenta uma faixa confiável de valores para mostrar a certeza das estimativas.' }
    ],
    proTip: 'Dica: Acesse a aba "Ajuste do Modelo" para acompanhar a qualidade das previsões e personalizar os parâmetros de análise.',
    actionText: 'Ver Ajuste do Modelo'
  },
  {
    id: 'step-channels',
    view: 'channels',
    title: '5. Performance por Canal & Retorno Marginal (mROI)',
    subtitle: 'Curvas de Saturação de Hill & Adstock',
    badge: 'Passo 5 de 6',
    icon: TrendingUp,
    description:
      'Compreenda a fundo onde o investimento satura e onde ainda há margem de crescimento exponencial com as curvas de resposta de Hill.',
    keyPoints: [
      { icon: '💡', text: 'ROI Médio: Retorno histórico consolidado sobre todo o capital investido.' },
      { icon: '🚀', text: 'ROI Marginal (mROI): Receita esperada pelo próximo R$ 1,00 incremental.' },
      { icon: '⏳', text: 'Meia-vida do Adstock: Duração do efeito residual dos anúncios na mente do consumidor.' },
      { icon: '🛑', text: 'Zona de Saturação: Ponto exato onde retornos decrescentes passam a gerar desperdício.' }
    ],
    proTip: 'Regra de ouro: Nunca baseie a alocação futura apenas no ROI médio; utilize sempre o Retorno Marginal (mROI)!',
    actionText: 'Ver Curvas dos Canais'
  },
  {
    id: 'step-budget',
    view: 'budget',
    title: '6. Otimizador de Orçamento & Simulador What-If',
    subtitle: 'Princípio da Equimarginalidade e Cenários',
    badge: 'Passo 6 de 6',
    icon: Calculator,
    description:
      'O otimizador calcula matematicamente a redistribuição perfeita de verba entre canais para maximizar o faturamento total sem gastar um único centavo a mais.',
    keyPoints: [
      { icon: '⚖️', text: 'Equimarginalidade: Equaliza o retorno marginal de todos os canais ativos.' },
      { icon: '💸', text: 'Recomendações claras: Quanto aumentar (+) e quanto reduzir (-) por canal.' },
      { icon: '🎛️', text: 'Simulador What-If: Ajuste sliders livres e veja o impacto projetado em tempo real.' },
      { icon: '🤖', text: 'Consultor Gemini AI: Faça perguntas como "Onde colocar R$ 10.000 extras?".' }
    ],
    proTip: 'Dica final: Acesse a aba "Relatório Executivo" para gerar o resumo consolidado e exportar em PDF para a diretoria.',
    actionText: 'Ver Otimizador de Orçamento'
  }
];

interface TourGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: NavView) => void;
  currentView: NavView;
}

export const TourGuideModal: React.FC<TourGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateView
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const Icon = currentStep.icon;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('meridian_tour_dismissed', 'true');
      } catch (e) {
        // ignore
      }
    }
    onClose();
  };

  const handleGoToView = () => {
    onNavigateView(currentStep.view);
  };

  return (
    <div
      id="modal-tour-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="tour-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col relative animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with gradient & progress */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white p-6 relative">
          {/* Close button */}
          <button
            id="btn-close-tour"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition"
            title="Fechar Tour (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/20">
                  {currentStep.badge}
                </span>
                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Guia Interativo Easy Mix Modeling
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{currentStep.title}</h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 font-medium">{currentStep.subtitle}</p>

          {/* Step Progress Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                id={`btn-tour-step-${idx}`}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 flex-1 ${
                  idx === currentStepIndex
                    ? 'bg-blue-400 w-8 shadow-sm shadow-blue-400/50'
                    : idx < currentStepIndex
                    ? 'bg-emerald-400'
                    : 'bg-white/20 hover:bg-white/40'
                }`}
                title={`Ir para etapa ${idx + 1}: ${step.title}`}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-slate-700">
          <p className="text-sm leading-relaxed text-slate-600 font-normal">
            {currentStep.description}
          </p>

          {/* Key Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {currentStep.keyPoints.map((point, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700"
              >
                <span className="text-base shrink-0 select-none">{point.icon}</span>
                <span className="leading-snug">{point.text}</span>
              </div>
            ))}
          </div>

          {/* Pro Tip Box */}
          {currentStep.proTip && (
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/90 text-blue-900 text-xs flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{currentStep.proTip}</span>
            </div>
          )}

          {/* Quick jump to the view button */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Quer explorar esta etapa agora?
            </span>
            <button
              id="btn-tour-goto-view"
              onClick={handleGoToView}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition flex items-center gap-1.5"
            >
              <span>{currentStep.actionText || 'Ver Tela'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              id="chk-dont-show-tour"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            Não abrir automaticamente
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              id="btn-tour-prev"
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                isFirstStep
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-200/80 bg-white border border-slate-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <button
              id="btn-tour-next"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Concluir Tour
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
