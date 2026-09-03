import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Award,
  ShieldAlert,
  Send,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  MessageSquareQuote
} from 'lucide-react';
import { AIInsightItem, MeridianModelResults } from '../types/mmm';
import { apiClient } from '../services/apiClient';
import { InsightCard } from './ui/InsightCard';
import { StepGuidanceBanner } from './ContextualGuide';

interface InsightsViewProps {
  results: MeridianModelResults | null;
  onNavigateToOptimizer: () => void;
  onOpenFullTour?: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  results,
  onNavigateToOptimizer,
  onOpenFullTour
}) => {
  const [insights, setInsights] = useState<AIInsightItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.generateInsights();
      setInsights(res);
    } catch (e) {
      console.error('Insights fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (results) {
      loadInsights();
    }
  }, [results]);

  const handleAsk = async (question: string) => {
    if (!question.trim()) return;
    setIsAnswering(true);
    setCustomQuestion(question);
    try {
      const answer = await apiClient.getBudgetExplanation(undefined, question);
      setCustomAnswer(answer);
    } catch (e) {
      console.error('Error answering question:', e);
    } finally {
      setIsAnswering(false);
    }
  };

  if (!results) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12">
        <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Modelo não disponível</h3>
        <p className="text-xs text-slate-500 mt-1">Execute o modelo Meridian para habilitar os insights automáticos da IA.</p>
      </div>
    );
  }

  const QUICK_QUESTIONS = [
    'Se eu tenho mais R$ 10.000 para investir, onde devo colocar e por quê?',
    'Qual canal devo cortar primeiro se o orçamento diminuir 15%?',
    'Quanto da minha receita vem do marketing vs demanda orgânica natural?',
    'Quais canais estão mais próximos do teto de saturação?'
  ];

  return (
    <div id="insights-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Consultoria Estratégica de Marketing & Recomendações Táticas com Inteligência Artificial Gemini sobre Meridian MMM
      </h1>

      {/* Guidance Banner */}
      <StepGuidanceBanner
        id="insights-ai"
        stepNumber="8"
        title="Etapa 8: Recomendações Estratégicas com IA (Gemini)"
        subtitle="Transforme os resultados estatísticos em decisões práticas de marketing com explicações claras e transparentes."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '🤖', text: 'Sem Alucinações: As respostas são estritamente fundamentadas nos números do modelo Google Meridian.' },
          { icon: '🔍', text: 'Evidências Transparentes: Abra o detalhamento de cada recomendação para ver os dados que a sustentam.' },
          { icon: '💬', text: 'Pergunte em Linguagem Natural: Faça qualquer pergunta sobre o seu mix de canais.' }
        ]}
        proTip="Clique em uma das perguntas rápidas abaixo para obter uma análise estratégica instantânea."
      />

      {/* Top Banner with Interactive Strategic Q&A Box */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Consultor Estratégico com IA</h2>
              <p className="text-xs text-slate-300">
                Respostas executivas com base nos dados do seu modelo econométrico
              </p>
            </div>
          </div>
          <button
            onClick={loadInsights}
            disabled={isLoading}
            className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar Análises</span>
          </button>
        </div>

        {/* Input Box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={e => setCustomQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk(customQuestion)}
            placeholder="Faça qualquer pergunta sobre onde investir, cortar gastos ou retornos dos canais..."
            className="flex-1 text-xs bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-blue-400"
          />
          <button
            onClick={() => handleAsk(customQuestion)}
            disabled={isAnswering || !customQuestion.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition shrink-0"
          >
            <Send className={`w-3.5 h-3.5 ${isAnswering ? 'animate-pulse' : ''}`} />
            <span>{isAnswering ? 'Analisando...' : 'Perguntar'}</span>
          </button>
        </div>

        {/* Quick Questions Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-400" />
            Perguntas sugeridas:
          </span>
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => handleAsk(q)}
              className="text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 px-2.5 py-1 rounded-lg transition text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Custom Answer Output */}
        {customAnswer && (
          <div className="p-4 bg-white/10 backdrop-blur-xs rounded-xl border border-white/15 space-y-2 mt-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold text-emerald-300">Resposta Estratégica da IA</span>
            </div>
            <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-line">
              {customAnswer}
            </p>
          </div>
        )}
      </div>

      {/* List of Insights / Recommendations using InsightCard */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Recomendações e Descobertas Estratégicas
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {insights.length} análises geradas
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Sintetizando insights econométricos com Gemini AI...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {insights.map((item, idx) => (
              <InsightCard
                key={item.id || idx}
                title={item.title}
                category={
                  item.type === 'opportunity'
                    ? 'Oportunidade de Escala'
                    : item.type === 'saturation'
                    ? 'Alerta de Saturação'
                    : item.type === 'risk'
                    ? 'Risco de Alocação'
                    : 'Eficiência de Mídia'
                }
                finding={item.summary || item.detail || item.description || ''}
                actionText={item.actionableStep}
                impact={item.impact}
                status={item.type === 'risk' || item.type === 'saturation' ? 'warning' : 'info'}
                evidence={{
                  metric: item.metric || 'ROI Marginal (mROI)',
                  value: item.channel ? 'Curva de Saturação Hill' : 'Portfólio Consolidado',
                  channel: item.channel,
                  explanation:
                    item.detail ||
                    item.summary ||
                    (item.channel
                      ? `Baseado no ROI observado, taxa de saturação e curva de resposta de ${item.channel}.`
                      : 'Baseado na distribuição global de investimentos e retorno consolidado do modelo.')
                }}
                onApplyAction={onNavigateToOptimizer}
                actionButtonLabel="Aplicar no Otimizador"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
