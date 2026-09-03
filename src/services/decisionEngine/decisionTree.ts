import { ChannelFeatures, PortfolioBenchmarks, DecisionAction, ReasonCode, ReallocationPair } from './types';
import { DECISION_THRESHOLDS } from './config';
import { classifyMarginalRoi, classifySaturation } from './benchmarkEngine';

export interface DecisionTreeOutput {
  decision: DecisionAction;
  reasonCodes: ReasonCode[];
  ruleTriggered: string;
  confidenceAssessment: string;
  suggestedActionRationale: string;
}

/**
 * Evaluates the Decision Tree for an individual marketing channel
 */
export function evaluateChannelDecisionTree(
  features: ChannelFeatures,
  benchmarks: PortfolioBenchmarks,
  diagnostics?: { rSquared?: number | string; mape?: number | string; gelmanRubinRhat?: number | string; effectiveSampleSize?: number | string; isConverged?: boolean }
): DecisionTreeOutput {
  const reasonCodes: ReasonCode[] = [];

  // ==========================================
  // NODE 1: DATA SUFFICIENCY & UNCERTAINTY GATE
  // ==========================================
  const rhatNum = typeof diagnostics?.gelmanRubinRhat === 'number'
    ? diagnostics.gelmanRubinRhat
    : parseFloat(String(diagnostics?.gelmanRubinRhat || ''));
  const isMcmcNonConvergedNum = !isNaN(rhatNum) && rhatNum > DECISION_THRESHOLDS.dataSufficiency.maxRhat;
  const isMcmcNonConverged = isMcmcNonConvergedNum || diagnostics?.isConverged === false;
  
  const isHighUncertainty = features.mroiCiWidth > DECISION_THRESHOLDS.uncertainty.highCiWidthRatio || features.roiCiWidth > DECISION_THRESHOLDS.uncertainty.highCiWidthRatio;
  const isInsufficientSpend = features.spend < DECISION_THRESHOLDS.dataSufficiency.minSpend;

  // Global block for rejected models
  if (isMcmcNonConverged) {
    reasonCodes.push('MCMC_NON_CONVERGED', 'HIGH_UNCERTAINTY', 'INSUFFICIENT_DATA');
    return {
      decision: 'BLOCKED',
      reasonCodes,
      ruleTriggered: 'DATA_SUFFICIENCY_MCMC_UNCERTAINTY',
      confidenceAssessment: 'Convergência do modelo abaixo do ideal estatístico (reprovado).',
      suggestedActionRationale: 'Modelo reprovado. Os dados ainda não fornecem evidências confiáveis para recomendar qualquer alocação orçamentária.'
    };
  }

  if (isInsufficientSpend) {
    reasonCodes.push('INSUFFICIENT_DATA');
    return {
      decision: 'INVESTIGATE',
      reasonCodes,
      ruleTriggered: 'INSUFFICIENT_HISTORICAL_SPEND',
      confidenceAssessment: 'Volume de investimento histórico muito baixo para extrapolação confiável da curva de saturação.',
      suggestedActionRationale: 'Dados limitados. Manter monitoramento ou investigar para colher dados suficientes de tração.'
    };
  }

  // Reason codes classification
  const mroiClass = classifyMarginalRoi(features.marginalRoi, benchmarks);
  const satClass = classifySaturation(features.saturationLevel, benchmarks);

  if (mroiClass === 'high') {
    reasonCodes.push('HIGH_MARGINAL_ROI');
  } else if (mroiClass === 'low') {
    reasonCodes.push('LOW_MARGINAL_ROI');
  } else {
    reasonCodes.push('MODERATE_MARGINAL_ROI');
  }

  if (satClass === 'critical') {
    reasonCodes.push('CRITICAL_SATURATION', 'HIGH_SATURATION');
  } else if (satClass === 'high') {
    reasonCodes.push('HIGH_SATURATION');
  } else if (satClass === 'moderate') {
    reasonCodes.push('MODERATE_SATURATION');
  } else {
    reasonCodes.push('LOW_SATURATION');
  }

  if (features.confidence === 'Alta' && !isHighUncertainty) {
    reasonCodes.push('HIGH_CONFIDENCE');
  } else if (features.confidence === 'Baixa' || isHighUncertainty) {
    reasonCodes.push('LOW_CONFIDENCE', 'HIGH_UNCERTAINTY');
  } else {
    reasonCodes.push('MEDIUM_CONFIDENCE');
  }

  if (features.trendPct > DECISION_THRESHOLDS.trend.positive) {
    reasonCodes.push('POSITIVE_TREND');
  } else if (features.trendPct < DECISION_THRESHOLDS.trend.negative) {
    reasonCodes.push('NEGATIVE_TREND', 'DECLINING_EFFICIENCY');
  } else {
    reasonCodes.push('STABLE_TREND');
  }

  if (features.kpiShare > benchmarks.contribution.p75) {
    reasonCodes.push('HIGH_CONTRIBUTION');
  } else if (features.kpiShare < benchmarks.contribution.p25) {
    reasonCodes.push('LOW_CONTRIBUTION');
  }

  // ==========================================
  // NODE 2: HIGH MARGINAL ROI BRANCH
  // ==========================================
  if (mroiClass === 'high' || (features.marginalRoi > 1.25 && features.marginalRoi >= benchmarks.marginalRoi.median)) {
    // Saturação baixa: espaço livre para expansão
    if (satClass === 'low') {
      reasonCodes.push('UNDERINVESTED');

      if (features.confidence === 'Alta' && !isHighUncertainty) {
        return {
          decision: 'INCREASE',
          reasonCodes,
          ruleTriggered: 'HIGH_MROI_LOW_SATURATION_HIGH_CONFIDENCE',
          confidenceAssessment: 'Alta confiança estatística com retorno marginal superior e ampla folga de saturação.',
          suggestedActionRationale: 'Avaliar aumento gradual do investimento no canal para capturar receita incremental.'
        };
      } else {
        return {
          decision: 'TEST',
          reasonCodes,
          ruleTriggered: 'HIGH_MROI_LOW_SATURATION_MODERATE_CONFIDENCE',
          confidenceAssessment: 'Potencial de expansão identificado, porém com intervalo de credibilidade amplo. Recomenda-se teste controlado.',
          suggestedActionRationale: 'Realizar teste de incremento gradual (+10% a +15%) monitorando a resposta de mROI.'
        };
      }
    }

    // Saturação moderada: expansão controlada
    if (satClass === 'moderate') {
      if (features.confidence === 'Alta' && features.trendPct >= 0 && !isHighUncertainty) {
        return {
          decision: 'INCREASE',
          reasonCodes,
          ruleTriggered: 'HIGH_MROI_MODERATE_SATURATION_CONTROLLED_EXPANSION',
          confidenceAssessment: 'Retorno marginal positivo com saturação moderada. Espaço para aumento dosado.',
          suggestedActionRationale: 'Avaliar expansão dosada, monitorando proximidade com a zona de retornos decrescentes.'
        };
      } else {
        return {
          decision: 'MAINTAIN',
          reasonCodes,
          ruleTriggered: 'HIGH_MROI_MODERATE_SATURATION_MAINTAIN',
          confidenceAssessment: 'Nível atual equilibrado entre retorno marginal e proximidade de inflexão da curva.',
          suggestedActionRationale: 'Manter nível atual de investimento para preservar a margem operacional.'
        };
      }
    }

    // Conflito: mROI alto, mas saturação alta / crítica
    if (satClass === 'high' || satClass === 'critical') {
      reasonCodes.push('HIGH_SATURATION');
      return {
        decision: 'MAINTAIN',
        reasonCodes,
        ruleTriggered: 'HIGH_MROI_HIGH_SATURATION_CONFLICT_RESOLVED',
        confidenceAssessment: 'Apesar do mROI passado favorável, o canal opera próximo ao teto da curva de Hill.',
        suggestedActionRationale: 'Manter orçamento sem novos aumentos expressivos para evitar entrada em retornos decrescentes severos.'
      };
    }
  }

  // ==========================================
  // NODE 3: LOW MARGINAL ROI BRANCH
  // ==========================================
  if (mroiClass === 'low' || features.marginalRoi < 0.95 || (features.marginalRoi < benchmarks.marginalRoi.p25 && features.marginalRoi < benchmarks.blendedRoi * 0.75)) {
    // Saturação alta ou crítica: canal esgotado na margem
    if (satClass === 'high' || satClass === 'critical') {
      reasonCodes.push('OVERINVESTED');

      if (features.confidence !== 'Baixa' && !isHighUncertainty) {
        return {
          decision: 'DECREASE',
          reasonCodes,
          ruleTriggered: 'LOW_MROI_HIGH_SATURATION_DECREASE',
          confidenceAssessment: 'Forte evidência de retornos decrescentes e saturação na margem.',
          suggestedActionRationale: 'Avaliar redução do investimento excedente ou realocação para canais com maior potencial marginal.'
        };
      } else {
        return {
          decision: 'INVESTIGATE',
          reasonCodes,
          ruleTriggered: 'LOW_MROI_HIGH_SATURATION_HIGH_UNCERTAINTY',
          confidenceAssessment: 'Sinais de retornos decrescentes com incerteza estatística considerável.',
          suggestedActionRationale: 'Investigar qualidade de rastreamento e dados de conversão antes de cortes bruscos.'
        };
      }
    }

    // Conflito: mROI baixo, mas saturação baixa
    if (satClass === 'low' || satClass === 'moderate') {
      if (features.trendPct > DECISION_THRESHOLDS.trend.positive) {
        return {
          decision: 'TEST',
          reasonCodes,
          ruleTriggered: 'LOW_MROI_LOW_SATURATION_POSITIVE_TREND',
          confidenceAssessment: 'Eficiência marginal atual contida, porém com trajetória recente de melhora.',
          suggestedActionRationale: 'Executar testes criativos ou de segmentação para melhorar a taxa de conversão marginal.'
        };
      } else {
        return {
          decision: 'INVESTIGATE',
          reasonCodes,
          ruleTriggered: 'LOW_MROI_LOW_SATURATION_INVESTIGATE',
          confidenceAssessment: 'Canal opera abaixo da saturação, mas entrega baixo retorno incremental por real.',
          suggestedActionRationale: 'Avaliar estratégia de audiência e formatos antes de alterar verba.'
        };
      }
    }
  }

  // ==========================================
  // NODE 4: MODERATE / AVERAGE MROI BRANCH
  // ==========================================
  if (satClass === 'critical') {
    reasonCodes.push('OVERINVESTED');
    return {
      decision: 'DECREASE',
      reasonCodes,
      ruleTriggered: 'MODERATE_MROI_CRITICAL_SATURATION',
      confidenceAssessment: 'Canal em patamar avançado de saturação.',
      suggestedActionRationale: 'Reduzir levemente a verba e realocar o excedente para oportunidades subinvestidas.'
    };
  }

  if (satClass === 'low' && features.confidence === 'Alta') {
    return {
      decision: 'TEST',
      reasonCodes,
      ruleTriggered: 'MODERATE_MROI_LOW_SATURATION_TEST_EXPANSION',
      confidenceAssessment: 'Espaço para teste controlado de escala.',
      suggestedActionRationale: 'Testar aumentos pontuais com monitoramento rigoroso de mROI.'
    };
  }

  // Baseline Default: Maintain
  reasonCodes.push('OPTIMAL_INVESTMENT');
  return {
    decision: 'MAINTAIN',
    reasonCodes,
    ruleTriggered: 'PORTFOLIO_EQUILIBRIUM_MAINTAIN',
    confidenceAssessment: 'Alocação equilibrada com o atual estágio da curva de resposta.',
    suggestedActionRationale: 'Manter nível atual de investimento.'
  };
}

/**
 * Evaluates Portfolio-level Reallocation Opportunities (Source Channel -> Target Channel)
 */
export function identifyReallocationOpportunities(
  channelsFeatures: ChannelFeatures[],
  benchmarks: PortfolioBenchmarks,
  diagnostics?: { gelmanRubinRhat?: number | string; isConverged?: boolean }
): ReallocationPair[] {
  const rhatNum = typeof diagnostics?.gelmanRubinRhat === 'number'
    ? diagnostics.gelmanRubinRhat
    : parseFloat(String(diagnostics?.gelmanRubinRhat || ''));
  const isMcmcNonConvergedNum = !isNaN(rhatNum) && rhatNum > DECISION_THRESHOLDS.dataSufficiency.maxRhat;
  const isMcmcNonConverged = isMcmcNonConvergedNum || diagnostics?.isConverged === false;

  // Block reallocation completely if model is rejected
  if (isMcmcNonConverged) {
    return [];
  }

  const pairs: ReallocationPair[] = [];

  // Candidates for reduction: High Saturation + Low Marginal ROI
  const sourceCandidates = channelsFeatures
    .filter(c => (c.saturationLevel >= DECISION_THRESHOLDS.saturation.moderate && c.marginalRoi < benchmarks.marginalRoi.median) || c.saturationLevel >= DECISION_THRESHOLDS.saturation.high)
    .sort((a, b) => a.marginalRoi - b.marginalRoi);

  // Candidates for increase: Low Saturation + High Marginal ROI
  const targetCandidates = channelsFeatures
    .filter(c => c.saturationLevel < DECISION_THRESHOLDS.saturation.high && c.marginalRoi > benchmarks.marginalRoi.median)
    .sort((a, b) => b.marginalRoi - a.marginalRoi);

  if (sourceCandidates.length > 0 && targetCandidates.length > 0) {
    const source = sourceCandidates[0];
    const target = targetCandidates[0];

    // Only create pair if there is a meaningful efficiency spread
    if (target.marginalRoi > source.marginalRoi * 1.25) {
      pairs.push({
        sourceChannel: source.channelName,
        targetChannel: target.channelName,
        sourceMarginalRoi: source.marginalRoi,
        targetMarginalRoi: target.marginalRoi,
        sourceSaturation: source.saturationLevel,
        targetSaturation: target.saturationLevel,
        efficiencySpread: target.marginalRoi - source.marginalRoi,
        rationale: `Migração de verba de ${source.channelName} (mROI ${source.marginalRoi.toFixed(2)}x, saturação ${source.saturationLevel.toFixed(0)}%) para ${target.channelName} (mROI ${target.marginalRoi.toFixed(2)}x, saturação ${target.saturationLevel.toFixed(0)}%).`
      });
    }
  }

  return pairs;
}
