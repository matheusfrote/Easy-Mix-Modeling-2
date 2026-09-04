import { ColumnMapping, DataReadinessScore, ReadinessItem } from '../types/mmm';
import { DataRow, StatisticalValidationReport } from './dataValidator';

export function calculateDataReadinessScore(
  data: DataRow[],
  mappings: ColumnMapping[],
  validation: StatisticalValidationReport
): DataReadinessScore {
  const items: ReadinessItem[] = [];
  const numRows = data.length;
  
  const dateCol = mappings.find(m => m.mappedType === 'date')?.columnName;
  const kpiCol = mappings.find(m => m.mappedType === 'kpi')?.columnName;
  const spendCols = mappings.filter(m => m.mappedType === 'media_spend').map(m => m.columnName);
  const controlCols = mappings.filter(m => m.mappedType === 'control').map(m => m.columnName);

  // 1. Temporal History (Weight: 20)
  let historyScore = 0;
  let historyStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let historyDetails = '';

  let monthsCoverage = 0;
  if (dateCol && data.length > 0) {
    const dates = data.map(r => new Date(r[dateCol])).filter(d => !isNaN(d.getTime()));
    if (dates.length > 1) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      monthsCoverage = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth());
    }
  }

  if (monthsCoverage >= 36) {
    historyScore = 20;
    historyStatus = 'pass';
    historyDetails = `${monthsCoverage} meses de dados históricos. Ideal para capturar sazonalidade anual completa e ciclos econômicos.`;
  } else if (monthsCoverage >= 24) {
    historyScore = 15;
    historyStatus = 'pass';
    historyDetails = `${monthsCoverage} meses de dados históricos. Faixa recomendada para capturar ciclos anuais com maior robustez.`;
  } else if (monthsCoverage >= 12) {
    historyScore = 8;
    historyStatus = 'warning';
    historyDetails = `${monthsCoverage} meses detectados. O pipeline pode rodar se as demais pré-condições forem atendidas; avalie a incerteza posterior.`;
  } else {
    historyScore = 0;
    historyStatus = 'fail';
    historyDetails = `Apenas ${monthsCoverage} meses. O histórico curto reduz a capacidade de identificar efeitos temporais; a decisão final depende dos diagnósticos posteriores.`;
  }

  items.push({
    id: 'temporal_history',
    label: 'Histórico temporal',
    status: historyStatus,
    weight: 20,
    score: historyScore,
    details: historyDetails
  });

  // 2. Regular Weekly Data (Weight: 15)
  const hasDateDuplicates = validation.alerts.some(a => a.id === 'duplicate_dates');
  let weeklyScore = 0;
  let weeklyStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let weeklyDetails = '';

  if (dateCol && !hasDateDuplicates) {
    weeklyScore = 15;
    weeklyStatus = 'pass';
    weeklyDetails = 'Série temporal regular sem duplicidades de data.';
  } else if (dateCol && hasDateDuplicates) {
    weeklyScore = 7;
    weeklyStatus = 'warning';
    weeklyDetails = 'Foram encontradas datas repetidas. Recomenda-se agregação consistente.';
  } else {
    weeklyScore = 0;
    weeklyStatus = 'fail';
    weeklyDetails = 'Coluna de data não definida ou formato inconsistente.';
  }

  items.push({
    id: 'weekly_data',
    label: 'Dados semanais regulares',
    status: weeklyStatus,
    weight: 15,
    score: weeklyScore,
    details: weeklyDetails
  });

  // 3. Investment per Channel (Weight: 20)
  const lowVarChannels = validation.alerts.filter(a => a.id.startsWith('constant_spend_'));
  const negChannels = validation.alerts.filter(a => a.id.startsWith('neg_spend_'));
  let channelScore = 0;
  let channelStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let channelDetails = '';

  if (spendCols.length >= 3 && lowVarChannels.length === 0 && negChannels.length === 0) {
    channelScore = 20;
    channelStatus = 'pass';
    channelDetails = `${spendCols.length} canais de mídia mapeados com boa variabilidade de investimento ao longo do tempo.`;
  } else if (spendCols.length >= 1 && negChannels.length === 0) {
    channelScore = 13;
    channelStatus = lowVarChannels.length > 0 ? 'warning' : 'pass';
    channelDetails = `${spendCols.length} canais mapeados.${lowVarChannels.length > 0 ? ' Atenção: alguns canais têm baixa variabilidade histórica.' : ''}`;
  } else {
    channelScore = 0;
    channelStatus = 'fail';
    channelDetails = 'Nenhum canal válido ou presença de investimentos negativos.';
  }

  items.push({
    id: 'channel_investment',
    label: 'Investimento por canal',
    status: channelStatus,
    weight: 20,
    score: channelScore,
    details: channelDetails
  });

  // 4. KPI Defined & Integrity (Weight: 15)
  const kpiAlerts = validation.alerts.filter(a => a.affectedColumns?.includes(kpiCol || ''));
  let kpiScore = 0;
  let kpiStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let kpiDetails = '';

  if (kpiCol && kpiAlerts.length === 0) {
    kpiScore = 15;
    kpiStatus = 'pass';
    kpiDetails = `KPI principal "${kpiCol}" definido com valores positivos e consistentes.`;
  } else if (kpiCol && !kpiAlerts.some(a => a.severity === 'CRÍTICO')) {
    kpiScore = 10;
    kpiStatus = 'warning';
    kpiDetails = `KPI "${kpiCol}" identificado, com pequenos avisos estatísticos.`;
  } else {
    kpiScore = 0;
    kpiStatus = 'fail';
    kpiDetails = 'KPI principal ausente ou com dados inválidos.';
  }

  items.push({
    id: 'kpi_defined',
    label: 'KPI definido',
    status: kpiStatus,
    weight: 15,
    score: kpiScore,
    details: kpiDetails
  });

  // 5. Missing Data / Nulls (Weight: 10)
  let totalNulls = 0;
  let totalCells = 0;
  for (const col of [...spendCols, kpiCol || '']) {
    if (validation.summaryStats[col]) {
      totalNulls += validation.summaryStats[col].nulls;
      totalCells += numRows;
    }
  }

  const nullPercentage = totalCells > 0 ? (totalNulls / totalCells) * 100 : 0;
  let missingScore = 0;
  let missingStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let missingDetails = '';

  if (nullPercentage === 0) {
    missingScore = 10;
    missingStatus = 'pass';
    missingDetails = '0% de dados ausentes nas colunas principais de mídia e resultado.';
  } else if (nullPercentage < 3) {
    missingScore = 6;
    missingStatus = 'warning';
    missingDetails = `${nullPercentage.toFixed(1)}% de valores ausentes (baixo impacto).`;
  } else {
    missingScore = 0;
    missingStatus = 'fail';
    missingDetails = `${nullPercentage.toFixed(1)}% de valores ausentes. Corrija os dados na fonte antes do ajuste.`;
  }

  items.push({
    id: 'missing_data',
    label: 'Dados ausentes',
    status: missingStatus,
    weight: 10,
    score: missingScore,
    details: missingDetails
  });

  // 6. Outliers & Anomaly Detection (Weight: 5)
  const outlierAlerts = validation.alerts.filter(a => a.id.includes('outliers'));
  let outlierScore = 0;
  let outlierStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let outlierDetails = '';

  if (outlierAlerts.length === 0) {
    outlierScore = 5;
    outlierStatus = 'pass';
    outlierDetails = 'Sem picos atípicos extremos não explicados.';
  } else {
    outlierScore = 3;
    outlierStatus = 'warning';
    outlierDetails = 'Picos atípicos detectados. Variáveis de controle de feriados/promoções recomendadas.';
  }

  items.push({
    id: 'outliers',
    label: 'Outliers e anomalias',
    status: outlierStatus,
    weight: 5,
    score: outlierScore,
    details: outlierDetails
  });

  // 7. Control Variables (Weight: 10)
  let controlScore = 0;
  let controlStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let controlDetails = '';

  if (controlCols.length >= 2) {
    controlScore = 10;
    controlStatus = 'pass';
    controlDetails = `${controlCols.length} variáveis de controle mapeadas (ex: ${controlCols.slice(0, 3).join(', ')}).`;
  } else if (controlCols.length === 1) {
    controlScore = 7;
    controlStatus = 'pass';
    controlDetails = `1 variável de controle mapeada (${controlCols[0]}).`;
  } else {
    controlScore = 3;
    controlStatus = 'warning';
    controlDetails = 'Nenhuma variável externa/controle fornecida; avalie o risco de confundimento antes de interpretar o modelo.';
  }

  items.push({
    id: 'control_variables',
    label: 'Variáveis de controle',
    status: controlStatus,
    weight: 10,
    score: controlScore,
    details: controlDetails
  });

  // 8. Observation Volume (Weight: 5)
  let obsScore = 0;
  let obsStatus: 'pass' | 'warning' | 'fail' = 'fail';
  let obsDetails = '';

  if (numRows >= 52) {
    obsScore = 5;
    obsStatus = 'pass';
    obsDetails = `Volume amostral adequado (${numRows} observações).`;
  } else if (numRows >= 26) {
    obsScore = 3;
    obsStatus = 'warning';
    obsDetails = `${numRows} observações. Atende ao mínimo operacional.`;
  } else {
    obsScore = 0;
    obsStatus = 'fail';
    obsDetails = `${numRows} observações. O pipeline exige ao menos 15; volumes baixos podem elevar a incerteza.`;
  }

  items.push({
    id: 'observation_quantity',
    label: 'Quantidade de observações',
    status: obsStatus,
    weight: 5,
    score: obsScore,
    details: obsDetails
  });

  const totalScore = Math.min(100, Math.round(items.reduce((acc, it) => acc + it.score, 0)));

  let tier: 'Excelente' | 'Bom' | 'Limitado' | 'Insuficiente' = 'Insuficiente';
  if (totalScore >= 90) tier = 'Excelente';
  else if (totalScore >= 75) tier = 'Bom';
  else if (totalScore >= 60) tier = 'Limitado';
  else tier = 'Insuficiente';

  const isModelReady = validation.canRunModel && !validation.isModelBlocked;

  let summary = '';
  if (!isModelReady) {
    summary = `Execução bloqueada: ${validation.blockingReason || 'corrija os erros de entrada indicados antes de ajustar o modelo'}.`;
  } else if (tier === 'Excelente') {
    summary = 'Os dados possuem alta qualidade, excelente histórico e variabilidade adequada para inferência bayesiana precisa no Meridian.';
  } else if (tier === 'Bom') {
    summary = 'Dados bem estruturados e preparados para execução do modelo. Algumas advertências não-críticas foram identificadas.';
  } else if (tier === 'Limitado') {
    summary = 'Os dados atendem aos requisitos operacionais para rodar o modelo, mas as estimativas podem apresentar maior incerteza.';
  } else {
    summary = 'O pipeline pode ser executado, mas a qualidade dos dados requer atenção e as estimativas podem apresentar maior incerteza.';
  }

  return {
    score: totalScore,
    tier,
    items,
    summary,
    isModelReady
  };
}
