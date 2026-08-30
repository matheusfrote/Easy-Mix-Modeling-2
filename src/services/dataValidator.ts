import {
  AlertSeverity,
  ChannelAnomalyDetail,
  ColumnMapping,
  DataIntegritySummary,
  TemporalDiagnosis,
  ValidationAlert,
  ValidationCategory,
  ValidationCheckResult
} from '../types/mmm';

export interface DataRow {
  [key: string]: string | number | null | undefined;
}

export interface StatisticalValidationReport {
  isValid: boolean;
  canRunModel: boolean;
  isModelBlocked: boolean;
  blockingReason?: string;
  integritySummary: DataIntegritySummary;
  temporalDiagnosis: TemporalDiagnosis;
  channelAnomalies: ChannelAnomalyDetail[];
  checks: ValidationCheckResult[];
  alerts: ValidationAlert[];
  correlationMatrix: {
    channels: string[];
    matrix: number[][];
  };
  summaryStats: Record<string, {
    min: number;
    max: number;
    mean: number;
    std: number;
    zeros: number;
    nulls: number;
    negatives: number;
    outlierCount: number;
    coefficientOfVariation: number;
  }>;
}

export interface SanitizationResult {
  cleanedRows: DataRow[];
  fixedIssues: string[];
  recordsDeduplicated: number;
  negativeValuesClipped: number;
  missingValuesImputed: number;
  datesReordered: boolean;
}

/**
 * Computes Pearson correlation coefficient between two number arrays
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denom));
}

/**
 * Helper to parse a date string into a timestamp safely
 */
function parseDateSafe(val: any): number | null {
  if (!val) return null;
  const str = String(val).trim();
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return parsed;

  // Try parsing DD/MM/YYYY or YYYY-MM-DD
  const parts = str.split(/[-/]/);
  if (parts.length === 3) {
    // If year is first (YYYY-MM-DD)
    if (parts[0].length === 4) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) return d.getTime();
    }
    // If year is last (DD/MM/YYYY)
    if (parts[2].length === 4) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  return null;
}

/**
 * Validates marketing dataset:
 * - Missing values (nulls, NaNs)
 * - Negative values in KPI and spend
 * - Duplicate records (exact and date duplicates)
 * - Temporal inconsistencies (irregular steps, chronological order, time series gaps)
 * - Channel anomalies (constant spend / low variance, zero spend, high sparsity, outliers)
 * - Multicollinearity
 *
 * Distinguishes strictly between critical blockers and informative non-blocking alerts.
 */
export function validateDataset(
  data: DataRow[],
  mappings: ColumnMapping[]
): StatisticalValidationReport {
  const alerts: ValidationAlert[] = [];
  const checks: ValidationCheckResult[] = [];
  const channelAnomalies: ChannelAnomalyDetail[] = [];

  const dateCol = mappings.find(m => m.mappedType === 'date')?.columnName;
  const kpiCol = mappings.find(m => m.mappedType === 'kpi')?.columnName;
  const spendCols = mappings.filter(m => m.mappedType === 'media_spend').map(m => m.columnName);
  const impressionCols = mappings.filter(m => m.mappedType === 'media_impressions').map(m => m.columnName);
  const controlCols = mappings.filter(m => m.mappedType === 'control').map(m => m.columnName);

  const numRows = data.length;
  const summaryStats: Record<string, {
    min: number;
    max: number;
    mean: number;
    std: number;
    zeros: number;
    nulls: number;
    negatives: number;
    outlierCount: number;
    coefficientOfVariation: number;
  }> = {};

  let totalMissingCells = 0;
  let totalNegativeCells = 0;

  // ==========================================
  // 1. CHECAGEM DE DUPLICIDADE DE REGISTROS
  // ==========================================
  let exactDuplicateCount = 0;
  const rowHashes = new Set<string>();

  for (const row of data) {
    const serialized = JSON.stringify(row);
    if (rowHashes.has(serialized)) {
      exactDuplicateCount++;
    } else {
      rowHashes.add(serialized);
    }
  }

  if (exactDuplicateCount > 0) {
    alerts.push({
      id: 'exact_duplicate_rows',
      title: `Registros 100% duplicados detectados (${exactDuplicateCount} linhas)`,
      message: `Foram encontrados ${exactDuplicateCount} registros com todas as colunas perfeitamente idênticas.`,
      severity: 'ALTO',
      category: 'duplicates',
      affectedRowsCount: exactDuplicateCount,
      econometricImpact: 'Linhas duplicadas inflam artificialmente o volume amostral e geram sobreponderação enviesada dos períodos repetidos no cálculo do posterior bayesiano.',
      recommendation: 'Aplique a remoção de linhas duplicadas ou ative o saneamento automático.',
      autoFixAvailable: true
    });
    checks.push({
      id: 'check_duplicates',
      name: 'Unicidade de Registros',
      description: 'Verifica a ausência de linhas completamente idênticas',
      status: 'warning',
      severity: 'ALTO',
      findingCount: exactDuplicateCount,
      affectedColumns: [],
      details: `${exactDuplicateCount} linhas duplicadas identificadas na base.`
    });
  } else {
    checks.push({
      id: 'check_duplicates',
      name: 'Unicidade de Registros',
      description: 'Verifica a ausência de linhas completamente idênticas',
      status: 'pass',
      findingCount: 0,
      affectedColumns: [],
      details: 'Nenhum registro duplicado exato encontrado.'
    });
  }

  // ==========================================
  // 2. CONSISTÊNCIA TEMPORAL & DATAS
  // ==========================================
  const temporalDiagnosis: TemporalDiagnosis = {
    isChronological: true,
    duplicateDateCount: 0,
    duplicateDateSamples: [],
    exactDuplicateRowCount: exactDuplicateCount,
    detectedFrequency: 'irregular',
    averageStepDays: 7,
    irregularStepCount: 0,
    gapCount: 0,
    gaps: [],
    totalObservations: numRows,
    startDate: '',
    endDate: ''
  };

  if (!dateCol) {
    alerts.push({
      id: 'missing_date',
      title: 'Coluna de data não mapeada (CRÍTICO)',
      message: 'Nenhuma coluna foi selecionada como data temporal para o modelo.',
      severity: 'CRÍTICO',
      category: 'time_series',
      econometricImpact: 'Impossibilita a estruturação da série temporal e a aplicação de Adstock geométrico ou sazonalidade.',
      recommendation: 'Acesse o Mapeamento de Colunas e selecione a coluna com as datas do período histórico.'
    });
    checks.push({
      id: 'check_date_exists',
      name: 'Definição da Dimensão Temporal',
      description: 'Verifica se uma coluna de data válida está mapeada',
      status: 'fail',
      severity: 'CRÍTICO',
      findingCount: 1,
      affectedColumns: [],
      details: 'Coluna de data não definida.'
    });
  } else {
    const rawDates = data.map(r => String(r[dateCol] || '').trim()).filter(Boolean);
    const dateCounts: Record<string, number> = {};
    const parsedTimestamps: { idx: number; raw: string; ts: number }[] = [];

    rawDates.forEach((d, idx) => {
      dateCounts[d] = (dateCounts[d] || 0) + 1;
      const ts = parseDateSafe(d);
      if (ts !== null) {
        parsedTimestamps.push({ idx, raw: d, ts });
      }
    });

    // Check duplicate dates
    const dupDates = Object.entries(dateCounts).filter(([_, count]) => count > 1);
    temporalDiagnosis.duplicateDateCount = dupDates.length;
    temporalDiagnosis.duplicateDateSamples = dupDates.slice(0, 5).map(([d, c]) => `${d} (${c}x)`);

    if (dupDates.length > 0) {
      alerts.push({
        id: 'duplicate_dates',
        title: `Datas duplicadas na série temporal (${dupDates.length} datas)`,
        message: `Existem ${dupDates.length} datas com múltiplos registros na mesma observação temporal (${temporalDiagnosis.duplicateDateSamples.join(', ')}).`,
        severity: 'ALTO',
        category: 'time_series',
        affectedColumns: [dateCol],
        affectedRowsCount: dupDates.reduce((acc, [_, c]) => acc + c, 0),
        econometricImpact: 'Marketing Mix Models exigem uma única observação por período temporal (semana ou dia) para calcular corretamente o decaimento residual de adstock.',
        recommendation: 'Agregue os valores por data somando o investimento e KPI antes da modelagem ou use a limpeza automática.',
        autoFixAvailable: true
      });
      checks.push({
        id: 'check_duplicate_dates',
        name: 'Unicidade de Datas Temporais',
        description: 'Verifica se cada data corresponde a uma única linha',
        status: 'warning',
        severity: 'ALTO',
        findingCount: dupDates.length,
        affectedColumns: [dateCol],
        details: `${dupDates.length} datas aparecem repetidas no dataset.`
      });
    } else {
      checks.push({
        id: 'check_duplicate_dates',
        name: 'Unicidade de Datas Temporais',
        description: 'Verifica se cada data corresponde a uma única linha',
        status: 'pass',
        findingCount: 0,
        affectedColumns: [dateCol],
        details: 'Todas as datas são únicas no dataset.'
      });
    }

    // Chronology & Frequency Gaps
    if (parsedTimestamps.length > 1) {
      temporalDiagnosis.startDate = parsedTimestamps[0].raw;
      temporalDiagnosis.endDate = parsedTimestamps[parsedTimestamps.length - 1].raw;

      let isSorted = true;
      const stepDaysList: number[] = [];

      for (let i = 1; i < parsedTimestamps.length; i++) {
        const diffMs = parsedTimestamps[i].ts - parsedTimestamps[i - 1].ts;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        stepDaysList.push(diffDays);

        if (diffDays < 0) {
          isSorted = false;
        }

        // Detect substantial gaps (e.g. step > 14 days in weekly data or > 2 days in daily data)
        if (diffDays > 14) {
          temporalDiagnosis.gapCount++;
          if (temporalDiagnosis.gaps.length < 5) {
            temporalDiagnosis.gaps.push({
              from: parsedTimestamps[i - 1].raw,
              to: parsedTimestamps[i].raw,
              missingDays: diffDays
            });
          }
        }
      }

      temporalDiagnosis.isChronological = isSorted;

      const avgStep = stepDaysList.length > 0
        ? stepDaysList.reduce((a, b) => a + b, 0) / stepDaysList.length
        : 7;
      temporalDiagnosis.averageStepDays = Math.round(avgStep * 10) / 10;

      // Frequency detection
      if (avgStep >= 6 && avgStep <= 8) {
        temporalDiagnosis.detectedFrequency = 'weekly';
      } else if (avgStep >= 0.8 && avgStep <= 1.5) {
        temporalDiagnosis.detectedFrequency = 'daily';
      } else if (avgStep >= 27 && avgStep <= 32) {
        temporalDiagnosis.detectedFrequency = 'monthly';
      } else {
        temporalDiagnosis.detectedFrequency = 'irregular';
      }

      // Count irregular steps
      const expectedStep = temporalDiagnosis.detectedFrequency === 'weekly' ? 7 : temporalDiagnosis.detectedFrequency === 'daily' ? 1 : 30;
      const irregularSteps = stepDaysList.filter(s => Math.abs(s - expectedStep) > 2);
      temporalDiagnosis.irregularStepCount = irregularSteps.length;

      if (!isSorted) {
        alerts.push({
          id: 'non_chronological_dates',
          title: 'Datas fora de ordem cronológica',
          message: 'As linhas da planilha não estão ordenadas temporalmente da data mais antiga para a mais recente.',
          severity: 'ALTO',
          category: 'time_series',
          affectedColumns: [dateCol],
          econometricImpact: 'A ordem temporal incorreta corrompe o cálculo da convolução de Adstock residual e da decomposição de sazonalidade.',
          recommendation: 'Ordene a planilha por data crescente antes de treinar o modelo.',
          autoFixAvailable: true
        });
      }

      if (temporalDiagnosis.gapCount > 0 || (temporalDiagnosis.detectedFrequency === 'irregular' && numRows > 15)) {
        alerts.push({
          id: 'irregular_time_frequency',
          title: `Frequência temporal irregular (${temporalDiagnosis.gapCount} lacunas detectadas)`,
          message: `O espaçamento médio entre datas é de ${temporalDiagnosis.averageStepDays} dias, com ${temporalDiagnosis.gapCount} saltos temporais significativos (ex: de ${temporalDiagnosis.gaps[0]?.from} a ${temporalDiagnosis.gaps[0]?.to}).`,
          severity: 'ALTO',
          category: 'time_series',
          affectedColumns: [dateCol],
          econometricImpact: 'Intervalos desiguais geram distorções no parâmetro de meia-vida do Adstock e nas estimativas sazonais por Fourier.',
          recommendation: 'Recomenda-se preencher semanas faltantes com zero ou agregar a base em intervalos regulares de 7 dias.',
          autoFixAvailable: true
        });
        checks.push({
          id: 'check_time_frequency',
          name: 'Regularidade da Frequência Temporal',
          description: 'Verifica cadência semanal ou diária uniforme sem buracos na série',
          status: 'warning',
          severity: 'ALTO',
          findingCount: temporalDiagnosis.gapCount,
          affectedColumns: [dateCol],
          details: `Cadência detectada: ${temporalDiagnosis.detectedFrequency} (média ${temporalDiagnosis.averageStepDays} dias/passo) com ${temporalDiagnosis.gapCount} gaps.`
        });
      } else {
        checks.push({
          id: 'check_time_frequency',
          name: 'Regularidade da Frequência Temporal',
          description: 'Verifica cadência semanal ou diária uniforme sem buracos na série',
          status: 'pass',
          findingCount: 0,
          affectedColumns: [dateCol],
          details: `Série temporal perfeitamente regular em cadência ${temporalDiagnosis.detectedFrequency}.`
        });
      }
    }

    // Volume of history
    if (numRows < 26) {
      alerts.push({
        id: 'short_history_critical',
        title: `Histórico temporal curto (${numRows} observações)`,
        message: `O dataset possui apenas ${numRows} semanas. Recomenda-se no mínimo 52 semanas para capturar sazonalidade anual completa.`,
        severity: numRows < 15 ? 'CRÍTICO' : 'MÉDIO',
        category: 'time_series',
        affectedColumns: [dateCol],
        econometricImpact: 'Menos de 26 semanas ampliam a incerteza bayesiana posterior e dificultam a convergência dos parâmetros de Hill.',
        recommendation: 'Reúna pelo menos 1 a 2 anos (52 a 104 semanas) de histórico de marketing se possível.'
      });
      checks.push({
        id: 'check_history_volume',
        name: 'Volume do Histórico Temporal',
        description: 'Mínimo de 52 semanas recomendado para modelagem bayesiana',
        status: numRows < 15 ? 'fail' : 'warning',
        severity: numRows < 15 ? 'CRÍTICO' : 'MÉDIO',
        findingCount: numRows,
        affectedColumns: [dateCol],
        details: `${numRows} observações disponíveis.`
      });
    } else {
      checks.push({
        id: 'check_history_volume',
        name: 'Volume do Histórico Temporal',
        description: 'Mínimo de 52 semanas recomendado para modelagem bayesiana',
        status: 'pass',
        findingCount: numRows,
        affectedColumns: [dateCol],
        details: `${numRows} semanas de histórico (atende ao padrão ouro do Meridian).`
      });
    }
  }

  // ==========================================
  // 3. VALIDAÇÃO DO KPI DEPENDENTE
  // ==========================================
  if (!kpiCol) {
    alerts.push({
      id: 'missing_kpi',
      title: 'Métrica de KPI principal não definida (CRÍTICO)',
      message: 'Não foi selecionada uma coluna de KPI (vendas, receita, conversões) como variável dependente.',
      severity: 'CRÍTICO',
      category: 'missing_data',
      econometricImpact: 'O modelo econométrico não possui variável dependente a ser explicada.',
      recommendation: 'Mapeie a coluna com a métrica de vendas/receita no Mapeamento de Colunas.'
    });
    checks.push({
      id: 'check_kpi_exists',
      name: 'Definição da Métrica de Negócio (KPI)',
      description: 'Verifica se a métrica dependente (receita, conversões) está mapeada',
      status: 'fail',
      severity: 'CRÍTICO',
      findingCount: 1,
      affectedColumns: [],
      details: 'KPI não mapeado.'
    });
  } else {
    const kpiValues: number[] = [];
    let nullKpi = 0;
    let negKpi = 0;
    let zeroKpi = 0;

    for (const row of data) {
      const raw = row[kpiCol];
      if (raw === null || raw === undefined || raw === '' || isNaN(Number(raw))) {
        nullKpi++;
        totalMissingCells++;
      } else {
        const val = Number(raw);
        if (val < 0) {
          negKpi++;
          totalNegativeCells++;
        }
        if (val === 0) zeroKpi++;
        kpiValues.push(val);
      }
    }

    // Nulls in KPI
    if (nullKpi > 0) {
      const isCritical = nullKpi === numRows || nullKpi > numRows * 0.4;
      alerts.push({
        id: 'kpi_nulls',
        title: `Dados faltantes no KPI (${nullKpi} linhas)`,
        message: `A coluna ${kpiCol} possui ${nullKpi} valores vazios ou não-numéricos (${((nullKpi / numRows) * 100).toFixed(1)}%).`,
        severity: isCritical ? 'CRÍTICO' : 'ALTO',
        category: 'missing_data',
        affectedColumns: [kpiCol],
        affectedRowsCount: nullKpi,
        econometricImpact: 'Valores nulos no KPI introduzem descontinuidades na série de treino do MCMC e distorcem a perda do modelo.',
        recommendation: 'Preencha ou impute os valores ausentes de vendas antes de rodar o modelo.',
        autoFixAvailable: true
      });
      checks.push({
        id: 'check_kpi_nulls',
        name: 'Completude de Dados no KPI',
        description: 'Verifica a ausência de valores nulos ou vazios no KPI',
        status: isCritical ? 'fail' : 'warning',
        severity: isCritical ? 'CRÍTICO' : 'ALTO',
        findingCount: nullKpi,
        affectedColumns: [kpiCol],
        details: `${nullKpi} registros ausentes detectados no KPI.`
      });
    } else {
      checks.push({
        id: 'check_kpi_nulls',
        name: 'Completude de Dados no KPI',
        description: 'Verifica a ausência de valores nulos ou vazios no KPI',
        status: 'pass',
        findingCount: 0,
        affectedColumns: [kpiCol],
        details: 'KPI 100% preenchido sem valores nulos.'
      });
    }

    // Negative values in KPI
    if (negKpi > 0) {
      alerts.push({
        id: 'kpi_negatives',
        title: `Valores negativos detectados no KPI (${negKpi} ocorrências)`,
        message: `A coluna ${kpiCol} possui ${negKpi} registros com valor negativo.`,
        severity: 'ALTO',
        category: 'negative_values',
        affectedColumns: [kpiCol],
        affectedRowsCount: negKpi,
        econometricImpact: 'Modelos MMM operam sob pressupostos log-normais ou não-negativos para receita. Valores negativos corrompem a inferência e o cálculo do ROI.',
        recommendation: 'Corrija estornos/devoluções ou aplique o truncamento automático em zero.',
        autoFixAvailable: true
      });
      checks.push({
        id: 'check_kpi_negatives',
        name: 'Não-Negatividade do KPI',
        description: 'Verifica se a receita ou volume de vendas é estritamente não-negativo',
        status: 'warning',
        severity: 'ALTO',
        findingCount: negKpi,
        affectedColumns: [kpiCol],
        details: `${negKpi} valores negativos encontrados no KPI.`
      });
    } else {
      checks.push({
        id: 'check_kpi_negatives',
        name: 'Não-Negatividade do KPI',
        description: 'Verifica se a receita ou volume de vendas é estritamente não-negativo',
        status: 'pass',
        findingCount: 0,
        affectedColumns: [kpiCol],
        details: 'Todos os valores de KPI são não-negativos.'
      });
    }

    // Summary stats for KPI
    if (kpiValues.length > 0) {
      const mean = kpiValues.reduce((a, b) => a + b, 0) / kpiValues.length;
      const variance = kpiValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / kpiValues.length;
      const std = Math.sqrt(variance);
      const min = Math.min(...kpiValues);
      const max = Math.max(...kpiValues);
      const cv = mean > 0 ? std / mean : 0;

      let outliers = 0;
      for (const v of kpiValues) {
        if (std > 0 && Math.abs((v - mean) / std) > 3.5) {
          outliers++;
        }
      }

      summaryStats[kpiCol] = {
        min,
        max,
        mean,
        std,
        zeros: zeroKpi,
        nulls: nullKpi,
        negatives: negKpi,
        outlierCount: outliers,
        coefficientOfVariation: cv
      };

      if (outliers > 0) {
        alerts.push({
          id: 'kpi_outliers',
          title: `Picos atípicos (outliers) no KPI (${outliers} observações)`,
          message: `Foram detectados ${outliers} períodos com desvio superior a 3.5σ da média na receita/vendas.`,
          severity: 'MÉDIO',
          category: 'statistics',
          affectedColumns: [kpiCol],
          affectedRowsCount: outliers,
          econometricImpact: 'Grandes picos não associados a eventos conhecidos podem ser atribuídos erroneamente à mídia paga.',
          recommendation: 'Mapeie variáveis de controle para períodos promocionais (ex: Black Friday) ou feriados.'
        });
      }
    }
  }

  // ==========================================
  // 4. VALIDAÇÃO DOS CANAIS DE MÍDIA & INVESTIMENTO
  // ==========================================
  if (spendCols.length === 0) {
    alerts.push({
      id: 'missing_spend_channels',
      title: 'Nenhum canal de investimento em mídia mapeado (CRÍTICO)',
      message: 'É obrigatório mapear ao menos 1 coluna de investimento de mídia para modelar o retorno de marketing.',
      severity: 'CRÍTICO',
      category: 'channel_anomalies',
      econometricImpact: 'Impossibilita o cálculo de ROI, contribuição de mídia e curvas de saturação de Hill.',
      recommendation: 'No Mapeamento de Colunas, selecione as colunas de investimento (ex: google_ads_spend, meta_ads_spend).'
    });
    checks.push({
      id: 'check_media_channels_exist',
      name: 'Mapeamento de Canais de Mídia',
      description: 'Verifica a existência de colunas de investimento mapeadas',
      status: 'fail',
      severity: 'CRÍTICO',
      findingCount: 1,
      affectedColumns: [],
      details: 'Nenhum canal de mídia mapeado.'
    });
  } else {
    checks.push({
      id: 'check_media_channels_exist',
      name: 'Mapeamento de Canais de Mídia',
      description: 'Verifica a existência de colunas de investimento mapeadas',
      status: 'pass',
      findingCount: spendCols.length,
      affectedColumns: spendCols,
      details: `${spendCols.length} canais de mídia mapeados.`
    });

    let totalNegSpendCount = 0;
    let totalNullSpendCount = 0;
    let constantSpendCount = 0;

    for (const col of spendCols) {
      const values: number[] = [];
      let nullCount = 0;
      let zeroCount = 0;
      let negCount = 0;

      for (const row of data) {
        const raw = row[col];
        if (raw === null || raw === undefined || raw === '' || isNaN(Number(raw))) {
          nullCount++;
          totalNullSpendCount++;
          totalMissingCells++;
        } else {
          const val = Number(raw);
          if (val < 0) {
            negCount++;
            totalNegSpendCount++;
            totalNegativeCells++;
          }
          if (val === 0) zeroCount++;
          values.push(val);
        }
      }

      const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const variance = values.length > 0 ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length : 0;
      const std = Math.sqrt(variance);
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const cv = mean > 0 ? std / mean : 0;

      let outliers = 0;
      for (const v of values) {
        if (std > 0 && Math.abs((v - mean) / std) > 3.5) {
          outliers++;
        }
      }

      summaryStats[col] = {
        min,
        max,
        mean,
        std,
        zeros: zeroCount,
        nulls: nullCount,
        negatives: negCount,
        outlierCount: outliers,
        coefficientOfVariation: cv
      };

      // Check Constant Spend (CV < 0.05)
      const isConstant = cv < 0.05 && mean > 0 && numRows >= 10;
      if (isConstant) constantSpendCount++;

      const zeroPct = numRows > 0 ? (zeroCount / numRows) * 100 : 0;
      const negPct = numRows > 0 ? (negCount / numRows) * 100 : 0;

      let channelStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (mean === 0 || negCount > 0) {
        channelStatus = 'critical';
      } else if (isConstant || zeroPct > 50 || nullCount > 0) {
        channelStatus = 'warning';
      }

      channelAnomalies.push({
        columnName: col,
        channelName: col.replace(/_spend$/i, '').replace(/_/g, ' ').toUpperCase(),
        mean,
        std,
        coefficientOfVariation: cv,
        isConstantSpend: isConstant,
        zeroCount,
        zeroPercentage: Math.round(zeroPct * 10) / 10,
        negativeCount: negCount,
        negativePercentage: Math.round(negPct * 10) / 10,
        nullCount,
        outlierCount: outliers,
        min,
        max,
        status: channelStatus
      });

      // 4.1 Missing values in channel
      if (nullCount > 0) {
        alerts.push({
          id: `null_spend_${col}`,
          title: `Dados ausentes no canal ${col} (${nullCount} linhas)`,
          message: `O canal de mídia ${col} possui ${nullCount} linhas vazias ou não-numéricas.`,
          severity: nullCount > numRows * 0.2 ? 'ALTO' : 'MÉDIO',
          category: 'missing_data',
          affectedColumns: [col],
          affectedRowsCount: nullCount,
          econometricImpact: 'Valores vazios de investimento impedem o cálculo exato do Adstock acumulado nas semanas seguintes.',
          recommendation: 'Preencha com zero ou utilize o saneamento automático de dados.',
          autoFixAvailable: true
        });
      }

      // 4.2 Negative spend values
      if (negCount > 0) {
        alerts.push({
          id: `neg_spend_${col}`,
          title: `Investimento negativo em ${col} (${negCount} ocorrências)`,
          message: `O canal ${col} possui ${negCount} registros com investimento negativo.`,
          severity: 'ALTO',
          category: 'negative_values',
          affectedColumns: [col],
          affectedRowsCount: negCount,
          econometricImpact: 'Investimento negativo viola os axiomas econométricos de retornos marginais positivos e corrompe as curvas de Hill.',
          recommendation: 'Valores de mídia devem ser estritamente não-negativos. Trunque para 0.',
          autoFixAvailable: true
        });
      }

      // 4.3 Zero spend in entire history
      if (mean === 0 && numRows > 0) {
        alerts.push({
          id: `zero_spend_${col}`,
          title: `Canal inativo sem investimento: ${col}`,
          message: `O canal ${col} possui investimento 0 em todas as ${numRows} semanas do histórico.`,
          severity: 'ALTO',
          category: 'channel_anomalies',
          affectedColumns: [col],
          econometricImpact: 'Canais sem atividade geram parâmetros não-identificáveis no MCMC e não contribuem para o modelo.',
          recommendation: 'Desmarque ou ignore este canal no mapeamento de colunas.'
        });
      }
      // 4.4 Constant spend (low variance)
      else if (isConstant) {
        alerts.push({
          id: `constant_spend_${col}`,
          title: `Investimento constante em ${col} (CV = ${(cv * 100).toFixed(1)}%)`,
          message: `O canal ${col} possui valor quase constante (R$ ${Math.round(mean).toLocaleString('pt-BR')} ± R$ ${Math.round(std).toLocaleString('pt-BR')}) em todo o período histórico.`,
          severity: 'ALTO',
          category: 'channel_anomalies',
          affectedColumns: [col],
          econometricImpact: 'A ausência de variação no investimento impede que o Meridian identifique os pontos de saturação da curva de Hill (meia-saturação K e inclinação S), gerando posterior indistinguível do prior.',
          recommendation: 'Insira variações de orçamento históricas ou configure priors bayesianos informativos para guiar a estimativa deste canal.'
        });
      }
      // 4.5 High Sparsity / sporadic investment
      else if (zeroPct > 60) {
        alerts.push({
          id: `sparse_spend_${col}`,
          title: `Alta esparsidade no canal ${col} (${zeroPct.toFixed(0)}% de zeros)`,
          message: `O canal ${col} teve investimento zero na maior parte do histórico (${zeroCount} de ${numRows} semanas).`,
          severity: 'MÉDIO',
          category: 'channel_anomalies',
          affectedColumns: [col],
          econometricImpact: 'Canais muito esparsos podem ter o efeito de adstock superestimado ou subestimado caso os pulsos sejam muito pontuais.',
          recommendation: 'Avalie se o canal é sazonal ou se deve ser modelado como variável de pulso.'
        });
      }
    }

    // Global checks for spend
    checks.push({
      id: 'check_spend_negatives',
      name: 'Não-Negatividade de Investimentos',
      description: 'Garante que os orçamentos de mídia sejam >= 0',
      status: totalNegSpendCount > 0 ? 'warning' : 'pass',
      severity: 'ALTO',
      findingCount: totalNegSpendCount,
      affectedColumns: spendCols,
      details: totalNegSpendCount > 0
        ? `${totalNegSpendCount} valores negativos identificados nos canais de mídia.`
        : 'Todos os investimentos são não-negativos.'
    });

    checks.push({
      id: 'check_spend_variance',
      name: 'Variabilidade de Investimento por Canal',
      description: 'Verifica se os canais possuem variância histórica suficiente (CV >= 5%)',
      status: constantSpendCount > 0 ? 'warning' : 'pass',
      severity: 'ALTO',
      findingCount: constantSpendCount,
      affectedColumns: channelAnomalies.filter(c => c.isConstantSpend).map(c => c.columnName),
      details: constantSpendCount > 0
        ? `${constantSpendCount} canal(is) apresentam investimento plano/constante.`
        : 'Todos os canais possuem variabilidade adequada para calibração de Hill.'
    });
  }

  // ==========================================
  // 5. MATRIZ DE CORRELAÇÃO & MULTICOLINEARIDADE
  // ==========================================
  const correlationMatrix: {
    channels: string[];
    matrix: number[][];
  } = {
    channels: spendCols,
    matrix: []
  };

  const channelSeries: Record<string, number[]> = {};
  for (const col of spendCols) {
    channelSeries[col] = data.map(r => Number(r[col]) || 0);
  }

  let highCorrCount = 0;
  for (let i = 0; i < spendCols.length; i++) {
    const rowCorr: number[] = [];
    for (let j = 0; j < spendCols.length; j++) {
      if (i === j) {
        rowCorr.push(1.0);
      } else {
        const corr = calculatePearsonCorrelation(channelSeries[spendCols[i]], channelSeries[spendCols[j]]);
        rowCorr.push(Math.round(corr * 100) / 100);

        if (i < j && corr > 0.85) {
          highCorrCount++;
          alerts.push({
            id: `high_corr_${spendCols[i]}_${spendCols[j]}`,
            title: `Alta correlação entre ${spendCols[i]} e ${spendCols[j]} (r = ${corr.toFixed(2)})`,
            message: `Dois canais investem em forte sincronia ao longo do tempo, gerando multicolinearidade.`,
            severity: corr > 0.95 ? 'ALTO' : 'MÉDIO',
            category: 'correlation',
            affectedColumns: [spendCols[i], spendCols[j]],
            econometricImpact: 'A multicolinearidade inflaciona a variância posterior do MCMC, tornando difícil separar quanto do ROI pertence a cada canal.',
            recommendation: 'Recomenda-se usar priors informativos no Meridian ou aplicar testes de calibração incremental (Geo Experiments).'
          });
        }
      }
    }
    correlationMatrix.matrix.push(rowCorr);
  }

  checks.push({
    id: 'check_multicollinearity',
    name: 'Independência entre Canais (Multicolinearidade)',
    description: 'Verifica se os canais não investem em sincronia extrema (r < 0.85)',
    status: highCorrCount > 0 ? 'warning' : 'pass',
    severity: 'MÉDIO',
    findingCount: highCorrCount,
    affectedColumns: [],
    details: highCorrCount > 0
      ? `${highCorrCount} par(es) de canais com correlação elevada (r > 0.85).`
      : 'Sem problemas severos de multicolinearidade entre os canais.'
  });

  // ==========================================
  // 6. VARIÁVEIS DE CONTROLE
  // ==========================================
  if (controlCols.length === 0) {
    alerts.push({
      id: 'no_controls',
      title: 'Nenhuma variável de controle externa mapeada',
      message: 'Não foram mapeadas variáveis de controle como feriados, eventos promocionais, índice de preços ou macroeconomia.',
      severity: 'BAIXO',
      category: 'statistics',
      econometricImpact: 'O modelo dependerá exclusivamente de termos harmônicos de Fourier para isolar sazonalidade e linha de base.',
      recommendation: 'Variáveis de controle específicas protegem contra atribuição espúria de picos de vendas à mídia.'
    });
  }

  // ==========================================
  // 7. CÁLCULO DA INTEGRIDADE GLOBAL & BLOQUEIO
  // ==========================================
  const criticalCount = alerts.filter(a => a.severity === 'CRÍTICO').length;
  const highCount = alerts.filter(a => a.severity === 'ALTO').length;
  const mediumCount = alerts.filter(a => a.severity === 'MÉDIO').length;
  const lowCount = alerts.filter(a => a.severity === 'BAIXO').length;

  // CRITICAL BLOCKING: Only blocks when mathematically impossible to model
  const hasNoDate = !dateCol;
  const hasNoKpi = !kpiCol;
  const hasNoChannels = spendCols.length === 0;
  const isCriticallySmall = numRows < 15;

  const isModelBlocked = hasNoDate || hasNoKpi || hasNoChannels || isCriticallySmall || criticalCount > 0;
  let blockingReason: string | undefined;

  if (hasNoDate) blockingReason = 'Coluna de data temporal obrigatória não está definida.';
  else if (hasNoKpi) blockingReason = 'Coluna de KPI (métrica dependente) obrigatória não está definida.';
  else if (hasNoChannels) blockingReason = 'Nenhum canal de investimento em mídia foi selecionado.';
  else if (isCriticallySmall) blockingReason = `Volume de dados insuficiente (${numRows} linhas). Necessário ao menos 15 observações para inicializar a modelagem.`;
  else if (criticalCount > 0) blockingReason = alerts.find(a => a.severity === 'CRÍTICO')?.title;

  // Health Score (0 - 100)
  let healthScore = 100;
  healthScore -= criticalCount * 30;
  healthScore -= highCount * 10;
  healthScore -= mediumCount * 4;
  healthScore -= lowCount * 2;
  healthScore = Math.max(10, Math.min(100, healthScore));

  const passedChecksCount = checks.filter(c => c.status === 'pass').length;

  const integritySummary: DataIntegritySummary = {
    totalChecks: checks.length,
    passedChecks: passedChecksCount,
    criticalAlerts: criticalCount,
    highAlerts: highCount,
    mediumAlerts: mediumCount,
    lowAlerts: lowCount,
    overallHealthScore: healthScore,
    isModelBlocked,
    blockingReason,
    duplicateRowCount: exactDuplicateCount,
    duplicateDateCount: temporalDiagnosis.duplicateDateCount,
    totalMissingCells,
    totalNegativeCells,
    constantSpendChannelsCount: channelAnomalies.filter(c => c.isConstantSpend).length
  };

  return {
    isValid: alerts.length === 0,
    canRunModel: !isModelBlocked,
    isModelBlocked,
    blockingReason,
    integritySummary,
    temporalDiagnosis,
    channelAnomalies,
    checks,
    alerts,
    correlationMatrix,
    summaryStats
  };
}

/**
 * Automatically cleans and sanitizes dataset:
 * - Removes exact duplicate rows
 * - Aggregates duplicate dates by summing spends and KPI
 * - Clips negative values to zero
 * - Imputes missing numeric values with 0 or linear forward fill
 * - Sorts chronologically by date
 */
export function sanitizeDataset(
  data: DataRow[],
  mappings: ColumnMapping[]
): SanitizationResult {
  const fixedIssues: string[] = [];
  let recordsDeduplicated = 0;
  let negativeValuesClipped = 0;
  let missingValuesImputed = 0;
  let datesReordered = false;

  const dateCol = mappings.find(m => m.mappedType === 'date')?.columnName || 'date';
  const numericCols = mappings
    .filter(m => m.mappedType !== 'date' && m.mappedType !== 'ignore')
    .map(m => m.columnName);

  // 1. Remove exact duplicate rows
  const seenHashes = new Set<string>();
  const deduplicatedRows: DataRow[] = [];

  for (const row of data) {
    const hash = JSON.stringify(row);
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      deduplicatedRows.push({ ...row });
    } else {
      recordsDeduplicated++;
    }
  }

  if (recordsDeduplicated > 0) {
    fixedIssues.push(`Removidos ${recordsDeduplicated} registros duplicados exatos.`);
  }

  // 2. Aggregate duplicate dates
  const groupedByDate: Record<string, DataRow[]> = {};
  for (const row of deduplicatedRows) {
    const rawDate = String(row[dateCol] || '').trim();
    if (!groupedByDate[rawDate]) {
      groupedByDate[rawDate] = [];
    }
    groupedByDate[rawDate].push(row);
  }

  let aggregatedRows: DataRow[] = [];
  let duplicateDateAggregations = 0;

  for (const [dateVal, rows] of Object.entries(groupedByDate)) {
    if (rows.length === 1) {
      aggregatedRows.push(rows[0]);
    } else {
      duplicateDateAggregations += rows.length - 1;
      const combined: DataRow = { [dateCol]: dateVal };
      for (const col of numericCols) {
        const sum = rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
        combined[col] = sum;
      }
      aggregatedRows.push(combined);
    }
  }

  if (duplicateDateAggregations > 0) {
    fixedIssues.push(`Consolidados ${duplicateDateAggregations} registros de datas duplicadas somando investimentos e KPI.`);
  }

  // 3. Sort chronologically
  const sorted = [...aggregatedRows].sort((a, b) => {
    const tsA = parseDateSafe(a[dateCol]) || 0;
    const tsB = parseDateSafe(b[dateCol]) || 0;
    return tsA - tsB;
  });

  if (JSON.stringify(sorted) !== JSON.stringify(aggregatedRows)) {
    datesReordered = true;
    fixedIssues.push('Série temporal reordenada em ordem cronológica estrita.');
  }

  // 4. Clip negative values & impute nulls (Forward-Fill for KPI/Controls, Zero for Media)
  const lastValidValues: Record<string, number> = {};
  
  const cleanedRows: DataRow[] = sorted.map(row => {
    const clean: DataRow = { ...row };
    for (const col of numericCols) {
      let val = clean[col];
      const mapping = mappings.find(m => m.columnName === col);
      const isMedia = mapping?.mappedType === 'media_spend' || mapping?.mappedType === 'media_impressions';
      
      if (val === null || val === undefined || val === '' || isNaN(Number(val))) {
        if (!isMedia && lastValidValues[col] !== undefined) {
          clean[col] = lastValidValues[col]; // Forward Fill (carry forward last known value)
        } else {
          clean[col] = 0;
        }
        missingValuesImputed++;
      } else {
        const num = Number(val);
        if (num < 0) {
          clean[col] = 0;
          negativeValuesClipped++;
        } else {
          clean[col] = num;
          lastValidValues[col] = num;
        }
      }
    }
    return clean;
  });

  if (negativeValuesClipped > 0) {
    fixedIssues.push(`Truncados ${negativeValuesClipped} valores negativos para zero (0).`);
  }
  if (missingValuesImputed > 0) {
    fixedIssues.push(`Imputados ${missingValuesImputed} valores nulos/vazios com zero (0).`);
  }

  return {
    cleanedRows,
    fixedIssues,
    recordsDeduplicated: recordsDeduplicated + duplicateDateAggregations,
    negativeValuesClipped,
    missingValuesImputed,
    datesReordered
  };
}
