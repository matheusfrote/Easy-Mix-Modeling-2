import React, { useState } from 'react';
import {
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Sparkles,
  Activity,
  Layers,
  BarChart2,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
  ComposedChart
} from 'recharts';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults } from '../types/mmm';
import { StepGuidanceBanner, InfoTooltip } from './ContextualGuide';
import { FloatingPrintButton } from './ui/FloatingPrintButton';

interface ModelConfigViewProps {
  mappings: ColumnMapping[];
  results: MeridianModelResults | null;
  onRunModel: (config: MeridianModelConfig) => void;
  isModelRunning: boolean;
  onOpenFullTour?: () => void;
}

function inferKpiType(columnName: string): MeridianModelConfig['targetKpiType'] {
  const normalized = columnName.trim().toLowerCase();
  if (/(revenue|receita|faturamento|gmv)/.test(normalized)) return 'revenue';
  if (/(sales|vendas|units|unidades)/.test(normalized)) return 'sales';
  return 'conversions';
}

export const ModelConfigView: React.FC<ModelConfigViewProps> = ({
  mappings,
  results,
  onRunModel,
  isModelRunning,
  onOpenFullTour
}) => {
  const dateCol = mappings.find(m => m.mappedType === 'date')?.columnName || 'date';
  const kpiCol = mappings.find(m => m.mappedType === 'kpi')?.columnName || 'revenue';
  const spendCols = mappings.filter(m => m.mappedType === 'media_spend');
  const controlCols = mappings.filter(m => m.mappedType === 'control').map(m => m.columnName);

  // Simplified Model Preparation Form
  const [activeTab, setActiveTab] = useState<'simplified' | 'advanced'>('simplified');

  // Advanced Hyperparameters
  const [chains, setChains] = useState(4);
  const [draws, setDraws] = useState(1000);
  const [warmup, setWarmup] = useState(500);

  // Bayesian Priors
  const [priors, setPriors] = useState({
    adstockAlpha: 0.5,
    adstockAlphaStd: 0.2,
    hillHalfSat: 0.5,
    hillHalfSatStd: 0.2,
    hillSlope: 1.5,
    hillSlopeStd: 0.5
  });

  const handleExecute = () => {
    const config: MeridianModelConfig = {
      dateColumn: dateCol,
      kpiColumn: kpiCol,
      mediaChannels: spendCols.map(m => ({
        spendColumn: m.columnName,
        impressionsColumn: mappings.find(candidate =>
          (candidate.mappedType === 'media_impressions' || candidate.mappedType === 'media_clicks')
          && candidate.channelName?.trim().toLowerCase() === m.channelName?.trim().toLowerCase()
        )?.columnName,
        channelName: m.channelName || m.columnName,
        channelType: m.columnName.includes('tv') ? 'tv' : m.columnName.includes('video') || m.columnName.includes('youtube') ? 'video' : 'digital'
      })),
      controlColumns: controlCols,
      mcmcChains: chains,
      mcmcDraws: draws,
      mcmcWarmup: warmup,
      targetKpiType: inferKpiType(kpiCol),
      priors: {
        adstockAlphaPrior: { mean: priors.adstockAlpha, std: priors.adstockAlphaStd },
        hillHalfSaturationPrior: { mean: priors.hillHalfSat, std: priors.hillHalfSatStd },
        hillSlopePrior: { mean: priors.hillSlope, std: priors.hillSlopeStd }
      }
    };

    onRunModel(config);
  };

  const actualVsPred = results?.actualVsPredicted || results?.diagnostics?.timeSeriesFit?.map(t => ({
    date: t.date,
    actual: t.actual,
    predicted: t.predicted,
    upperCi: t.predictedUpper,
    lowerCi: t.predictedLower
  })) || [];

  return (
    <div id="model-config-view" className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto min-w-0">
      {/* Semantic Heading for Search Engines and Accessibility */}
      <h1 className="sr-only">
        Configuração e Calibração do Modelo Econométrico Bayesiano Google Meridian com Amostragem MCMC NUTS
      </h1>

      {/* Contextual Step Guidance Banner */}
      <StepGuidanceBanner
        id="model-config"
        stepNumber="4"
        title="Etapa 4: Prepare e Calcule seu Modelo"
        subtitle="Entenda como seus investimentos geram resultados e calcule o impacto real de cada canal de mídia."
        onOpenFullTour={onOpenFullTour}
        tips={[
          { icon: '🔄', text: 'Efeito Residual (Adstock): Mede quanto o impacto de um anúncio continua gerando vendas nas semanas seguintes.' },
          { icon: '📈', text: 'Retornos Decrescentes: Identifica o ponto em que investir mais em um canal começa a trazer menos retorno.' },
          { icon: '🎯', text: 'Convergência: o Analyzer usa R-hat máximo < 1,2 como limiar de convergência aproximada.' }
        ]}
        proTip="O Easy Mix Modeling simplifica os parâmetros bayesianos complexos em 4 perguntas diretas de negócio."
      />

      {/* Execution Progress Modal / Banner if running */}
      {isModelRunning && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-lg border border-blue-500/30 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              <h3 className="text-base font-bold">Executando análise do Google Meridian...</h3>
            </div>
            <span className="text-xs text-blue-200">Aguardando resposta científica do serviço</span>
          </div>
          <p className="text-xs text-blue-100">
            O backend retornará sucesso somente depois de sample_posterior() e Analyzer concluírem. Não são exibidas etapas estimadas pelo navegador.
          </p>
        </div>
      )}

      {/* Top Configuration & Execution Card */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Prepare seu Modelo
            </h2>
            <InfoTooltip
              title="Google Meridian MMM"
              content="O Google Meridian analisa dados históricos para separar o resultado natural das vendas do impacto direto de cada canal de publicidade, fornecendo estimativas com margem de segurança."
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {spendCols.length} canais de mídia e {controlCols.length} fatores de controle configurados.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium shrink-0">
            <button
              onClick={() => setActiveTab('simplified')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'simplified'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Modo Simplificado
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'advanced'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Modo Avançado (MCMC)
            </button>
          </div>

          <button
            onClick={handleExecute}
            disabled={isModelRunning}
            className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs w-full sm:w-auto ${
              isModelRunning
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            {results ? 'Recalcular Análise' : 'Executar Análise'}
          </button>
        </div>
      </div>

      {/* 4 Simple Questions Flow (if simplified mode) */}
      {activeTab === 'simplified' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Q1: Resultado a Explicar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>1. Resultado a Explicar</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Coluna definida como seu indicador de negócio principal:
            </p>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {kpiCol}
            </div>
          </div>

          {/* Q2: Período da Análise */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>2. Período a Analisar</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium">
              Todo o histórico enviado
            </div>
          </div>

          {/* Q3: Agrupamento / Granularidade */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>3. Frequência Temporal</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium">
              Preservada conforme as datas do arquivo
            </div>
          </div>

          {/* Q4: Canais Selecionados */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <DollarSign className="w-4 h-4 text-indigo-500" />
              <span>4. Canais no Modelo</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {spendCols.length} canais prontos para modelagem.
            </p>
            <div className="flex flex-wrap gap-1">
              {spendCols.slice(0, 3).map(c => (
                <span key={c.columnName} className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded font-semibold">
                  {c.channelName || c.columnName}
                </span>
              ))}
              {spendCols.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                  +{spendCols.length - 3} mais
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Model Diagnostic KPIs if fitted */}
      {results && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Diagnósticos de Convergência & Qualidade de Ajuste</span>
                </span>
                <InfoTooltip
                  title="Diagnósticos de Convergência do Modelo"
                  content="Conjunto de indicadores matemáticos que avaliam a precisão, estabilidade e capacidade preditiva do modelo econométrico ajustado pelo algoritmo Google Meridian."
                />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Métricas estatísticas retornadas pelo Analyzer do Google Meridian</p>
            </div>
            <span className={`${results.diagnostics.isConverged === true ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : results.diagnostics.isConverged === false ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'} text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto border shadow-xs`}>
              {results.diagnostics.isConverged === true ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {results.diagnostics.isConverged === true ? 'Convergência aprovada' : results.diagnostics.isConverged === false ? 'Não convergiu' : 'Convergência indisponível'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* R-Squared */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 transition-all hover:border-blue-300 dark:hover:border-blue-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center justify-between">
                <span>Aderência (R²)</span>
                <InfoTooltip
                  title="Aderência Estatística (R² / Coeficiente de Determinação)"
                  content="Indica a proporção (0% a 100%) da variação histórica de vendas explicada pelo conjunto de mídia, sazonalidade e fatores de controle. Valores acima de 80% representam altíssima qualidade de explicação."
                />
              </span>
              <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                {Number.isFinite(results?.diagnostics?.rSquared) ? `${(Number(results.diagnostics.rSquared) * 100).toFixed(1)}%` : 'Indisponível'}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">R² = {results?.diagnostics?.rSquared ?? 'N/D'}</span>
            </div>

            {/* MAPE */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 transition-all hover:border-slate-300 dark:hover:border-slate-600">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center justify-between">
                <span>Erro Médio (MAPE)</span>
                <InfoTooltip
                  title="Erro Percentual Absoluto Médio (MAPE)"
                  content="Mede a discrepância média percentual entre o que o modelo projetou e o faturamento real observado a cada semana. Quanto menor o MAPE (idealmente < 10-15%), mais afiada é a precisão preditiva."
                />
              </span>
              <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                {Number.isFinite(results?.diagnostics?.mape) ? `${Number(results.diagnostics.mape).toFixed(1)}%` : 'Indisponível'}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Precisão preditiva</span>
            </div>

            {/* Gelman-Rubin R-hat */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 transition-all hover:border-emerald-300 dark:hover:border-emerald-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center justify-between">
                <span>Gelman-Rubin (R̂)</span>
                <InfoTooltip
                  title="Diagnóstico de Convergência Gelman-Rubin (R̂ / R-hat)"
                  content="Resume a concordância entre as cadeias MCMC. O limiar padrão do Analyzer considera R-hat máximo abaixo de 1,2 como convergência aproximada."
                />
              </span>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {Number.isFinite(results?.diagnostics?.gelmanRubinRhat) ? Number(results.diagnostics.gelmanRubinRhat).toFixed(3) : 'Indisponível'}
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Limiar do Analyzer (&lt; 1,2)</span>
            </div>

            {/* Effective Sample Size */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 transition-all hover:border-slate-300 dark:hover:border-slate-600">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center justify-between">
                <span>ESS (Amostras)</span>
                <InfoTooltip
                  title="Tamanho Efetivo da Amostra (Effective Sample Size - ESS)"
                  content="Estima o volume de sorteios independentes após considerar a autocorrelação. Não substitui a análise conjunta de convergência e incerteza."
                />
              </span>
              <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                {Number.isFinite(results?.diagnostics?.effectiveSampleSize) ? results.diagnostics.effectiveSampleSize : 'Indisponível'}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Tamanho efetivo</span>
            </div>

            {/* Media Share */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center justify-between">
                <span>Fatia da Mídia</span>
                <InfoTooltip
                  title="Contribuição Incremental da Publicidade (Media Lift)"
                  content="Parcela do faturamento global gerada diretamente pelas campanhas pagas de mídia (vendas adicionais que não ocorreriam de forma espontânea)."
                />
              </span>
              <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
                {Number.isFinite(results?.diagnostics?.mediaShare) ? `${Number(results.diagnostics.mediaShare).toFixed(1)}%` : 'Indisponível'}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Vendas incrementais</span>
            </div>

            {/* Baseline Share */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 transition-all hover:border-slate-300 dark:hover:border-slate-600">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center justify-between">
                <span>Demanda Base</span>
                <InfoTooltip
                  title="Demanda Base Orgânica (Baseline de Marca)"
                  content="Faturamento sustentado pela força orgânica da marca, fidelidade de clientes, tráfego direto e histórico comercial, mesmo na ausência de anúncios pagos."
                />
              </span>
              <div className="text-base font-extrabold text-slate-700 dark:text-slate-300 mt-0.5 font-mono">
                {Number.isFinite(results?.diagnostics?.baselineShare) ? `${Number(results.diagnostics.baselineShare).toFixed(1)}%` : 'Indisponível'}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Vendas orgânicas</span>
            </div>
          </div>

          {/* Actual vs Predicted Time Series Chart */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center">
                <span>Série Temporal: Real vs Previsto com Intervalos de Incerteza (95% CI)</span>
                <InfoTooltip
                  title="Série Temporal e Intervalos de Incerteza (95% CI)"
                  content="A linha preta mostra as vendas reais; a linha azul exibe a previsão ajustada pelo Meridian. A faixa azul-clara indica a incerteza probabilística de 95% (limites 2.5% e 97.5% da distribuição posterior bayesiana)."
                />
              </h4>
            </div>
            <div className="h-72 border border-slate-100 dark:border-slate-800 rounded-lg p-2 bg-slate-50/40 dark:bg-slate-800/30">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={actualVsPred} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(val: number, name: string) => [
                      `R$ ${Number(val).toLocaleString('pt-BR')}`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="upperCi"
                    name="Limite Superior (97.5% CI)"
                    fill="#93c5fd"
                    fillOpacity={0.25}
                    stroke="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerCi"
                    name="Limite Inferior (2.5% CI)"
                    fill="#ffffff"
                    className="dark:fill-slate-900"
                    fillOpacity={1}
                    stroke="transparent"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Modelo Previsto (Meridian)"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Real Observado"
                    stroke="#0f172a"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Hyperparameters & Priors Card (if advanced mode) */}
      {activeTab === 'advanced' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MCMC Sampling Parameters */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Amostragem MCMC & Sazonalidade</span>
                </span>
                <InfoTooltip
                  title="Amostragem Bayesiana Markov Chain Monte Carlo (MCMC)"
                  content="Configurações do amostrador No-U-Turn Sampler (NUTS) utilizado pelo Google Meridian para explorar a distribuição posterior conjunta dos parâmetros."
                />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Parâmetros das cadeias de Markov Monte Carlo</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center">
                    <span>Cadeias Paralelas (MCMC Chains): {chains}</span>
                    <InfoTooltip
                      title="Cadeias MCMC Paralelas"
                      content="Número de simulações estatísticas executadas simultaneamente a partir de pontos de partida distintos para confirmar a convergência (mínimo 4 recomendado)."
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={chains}
                  onChange={e => setChains(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center">
                    <span>Amostras por Cadeia (Draws): {draws}</span>
                    <InfoTooltip
                      title="Sorteios Posteriores (Draws)"
                      content="Quantidade de iterações retidas por cada cadeia para compor as distribuições de probabilidade dos coeficientes e retornos dos canais."
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="250"
                  value={draws}
                  onChange={e => setDraws(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center">
                    <span>Período de Warmup: {warmup}</span>
                    <InfoTooltip
                      title="Período de Aquecimento (Warmup / Burn-in)"
                      content="Iterações iniciais descartadas para permitir que o algoritmo NUTS encontre a região de alta probabilidade antes de registrar as amostras finais."
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1000"
                  step="100"
                  value={warmup}
                  onChange={e => setWarmup(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

            </div>
          </div>

          {/* Bayesian Priors (Adstock & Hill) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Priors Bayesianos (Curva de Hill & Adstock)</span>
                </span>
                <InfoTooltip
                  title="Conhecimento a Priori Bayesiano (Priors)"
                  content="Valores iniciais baseados em literatura e benchmarks de mercado que orientam a calibração do modelo quando certos canais possuem pouca variação histórica de investimento."
                />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribuições a priori para o estimador Meridian</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center">
                    <span>Prior Adstock Alpha (Carryover): {priors.adstockAlpha}</span>
                    <InfoTooltip
                      title="Prior de Adstock Alpha (Carryover & Memória)"
                      content="Taxa esperada de retenção de impacto da campanha nas semanas após a veiculação (0.1 = efeito rápido e direto; 0.8 = efeito residual prolongado de marca)."
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={priors.adstockAlpha}
                  onChange={e => setPriors({ ...priors, adstockAlpha: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center">
                    <span>Prior Half-Saturation Hill (K): {priors.hillHalfSat}</span>
                    <InfoTooltip
                      title="Prior de Meia-Saturação de Hill (Half-Sat K)"
                      content="Patamar relativo de investimento onde o canal atinge 50% de sua receita incremental máxima possível."
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.05"
                  value={priors.hillHalfSat}
                  onChange={e => setPriors({ ...priors, hillHalfSat: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center">
                    <span>Prior Inclinação Hill (Slope S): {priors.hillSlope}</span>
                    <InfoTooltip
                      title="Prior de Inclinação da Curva de Hill (Hill Slope S)"
                      content="Define a curvatura da resposta ao investimento: valores próximos a 1 criam retorno logarítmico côncavo tradicional; valores maiores geram curva sigmoide em 'S'."
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="3.0"
                  step="0.1"
                  value={priors.hillSlope}
                  onChange={e => setPriors({ ...priors, hillSlope: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg text-[11px] text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/60 leading-relaxed">
                <strong>Vantagem Bayesiana:</strong> Os priors guiam a curva em regiões onde a variação histórica de spend é pequena, prevenindo sobreajuste e coeficientes negativos irreais.
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Print / PDF Action Button */}
      <FloatingPrintButton />
    </div>
  );
};
