import { ColumnMapping, ColumnType } from '../types/mmm';
import { DataRow } from './dataValidator';
import { matchChannelFromColumn, CHANNEL_LIBRARY } from '../data/channelLibrary';
import { identifyMetricFromColumn, METRIC_CATALOG } from './metricsEngine';

/**
 * Heuristics to automatically map columns to their MMM roles with Channel Library & Metric Catalog intelligence
 */
export function inferColumnMappings(
  columns: string[],
  sampleRows: DataRow[]
): ColumnMapping[] {
  const mappings: ColumnMapping[] = columns.map(col => {
    const lower = col.toLowerCase().trim();
    let mappedType: ColumnType = 'ignore';
    let channelName: string | undefined = undefined;
    let channelCategory: string | undefined = undefined;
    let modelingClassification: 'direct' | 'caution' | 'control' | undefined = undefined;
    let detectedMetricFamily: string | undefined = undefined;
    let description = '';

    const matchedChannel = matchChannelFromColumn(col);
    const matchedMetric = identifyMetricFromColumn(col);

    if (matchedMetric) {
      detectedMetricFamily = matchedMetric.familyLabel;
    }

    // Structural fields must be detected before generic business metrics.
    if (
      lower === 'date' ||
      lower === 'data' ||
      lower === 'week' ||
      lower === 'semana' ||
      lower === 'period' ||
      lower === 'periodo' ||
      lower === 'ds' ||
      lower.startsWith('ds_') ||
      lower.endsWith('_ds') ||
      lower.includes('timestamp') ||
      lower.endsWith('_date') ||
      lower.endsWith('_data') ||
      lower.startsWith('dt_')
    ) {
      mappedType = 'date';
      description = 'Índice temporal (data da semana/período)';
    }
    else if (/^(geo|geography|region|state|city|market|dma|uf|regiao|estado|cidade)$/i.test(lower)) {
      mappedType = 'geo';
      description = 'Dimensão geográfica do modelo';
    }
    else if (lower === 'population' || lower === 'populacao' || lower.endsWith('_population')) {
      mappedType = 'population';
      description = 'População da unidade geográfica';
    }
    else if (
      lower === 'revenue_per_kpi' ||
      lower === 'revenue_per_conversion' ||
      lower === 'receita_por_kpi' ||
      lower === 'receita_por_conversao'
    ) {
      mappedType = 'revenue_per_kpi';
      description = 'Receita média por unidade do KPI não monetário';
    }
    else if (lower.includes('frequency') || lower.includes('frequencia')) {
      mappedType = 'media_frequency';
      channelName = matchedChannel?.channel || formatChannelName(col);
      description = `Frequência de exposição (${channelName})`;
    }
    else if (matchedMetric?.id === 'reach' || lower.includes('reach') || lower.includes('alcance')) {
      mappedType = 'media_reach';
      channelName = matchedChannel?.channel || formatChannelName(col);
      description = `Alcance de mídia (${channelName})`;
    }
    // 2. KPI / Business Output Detection
    else if (
      matchedMetric?.family === 'business' ||
      lower === 'revenue' ||
      lower === 'receita' ||
      lower === 'sales' ||
      lower === 'vendas' ||
      lower === 'conversions' ||
      lower === 'conversoes' ||
      lower === 'orders' ||
      lower === 'pedidos' ||
      lower === 'kpi' ||
      lower === 'target' ||
      lower === 'faturamento' ||
      lower === 'units_sold' ||
      lower === 'unidades'
    ) {
      mappedType = 'kpi';
      description = matchedMetric ? `${matchedMetric.name} (Variável de Resultado)` : 'Resultado a ser explicado pelo modelo';
    }
    // 3. Media Spend Detection
    else if (
      matchedMetric?.family === 'investment' ||
      lower.includes('spend') ||
      lower.includes('cost') ||
      lower.includes('investimento') ||
      lower.includes('custo') ||
      lower.includes('gasto') ||
      lower.includes('verba') ||
      lower.endsWith('_spend') ||
      lower.endsWith('_cost')
    ) {
      mappedType = 'media_spend';
      if (matchedChannel) {
        channelName = matchedChannel.channel;
        channelCategory = matchedChannel.category;
        modelingClassification = matchedChannel.modelingType;
        description = `Investimento em ${channelName} (${matchedChannel.category})`;
      } else {
        channelName = formatChannelName(col);
        channelCategory = 'Paid Media';
        modelingClassification = 'direct';
        description = `Investimento em mídia (${channelName})`;
      }
    }
    // 4. Impressions Detection
    else if (
      matchedMetric?.id === 'impressions' ||
      matchedMetric?.id === 'grp_trp' ||
      matchedMetric?.id === 'video_views' ||
      lower.includes('impression') ||
      lower.includes('impressao') ||
      lower.includes('impressoes') ||
      lower.includes('impr') ||
      lower.includes('views')
    ) {
      mappedType = 'media_impressions';
      if (matchedChannel) {
        channelName = matchedChannel.channel;
        channelCategory = matchedChannel.category;
        modelingClassification = matchedChannel.modelingType;
        description = `Exposição / Impressões (${channelName})`;
      } else {
        channelName = formatChannelName(col);
        description = `Impressões de mídia (${channelName})`;
      }
    }
    // 5. Clicks / Engagements Detection
    else if (
      matchedMetric?.family === 'engagement' ||
      lower.includes('click') ||
      lower.includes('clique') ||
      lower.includes('sessao') ||
      lower.includes('session')
    ) {
      mappedType = 'media_clicks';
      if (matchedChannel) {
        channelName = matchedChannel.channel;
        channelCategory = matchedChannel.category;
        modelingClassification = matchedChannel.modelingType;
        description = `Cliques / Engajamento (${channelName})`;
      } else {
        channelName = formatChannelName(col);
        description = `Cliques de mídia (${channelName})`;
      }
    }
    // 6. Controls / Context Detection
    else if (
      matchedChannel?.category === 'Controles' ||
      matchedMetric?.family === 'control' ||
      lower.includes('holiday') ||
      lower.includes('feriado') ||
      lower.includes('promo') ||
      lower.includes('desconto') ||
      lower.includes('discount') ||
      lower.includes('price') ||
      lower.includes('preco') ||
      lower.includes('temperature') ||
      lower.includes('temperatura') ||
      lower.includes('clima') ||
      lower.includes('cpi') ||
      lower.includes('ipca') ||
      lower.includes('gdp') ||
      lower.includes('pib') ||
      lower.includes('selic') ||
      lower.includes('dolar') ||
      lower.includes('cambio') ||
      lower.includes('black_friday') ||
      lower.includes('covid') ||
      lower.includes('trend') ||
      lower.includes('competitor') ||
      lower.includes('concorrente') ||
      lower.includes('season') ||
      lower.includes('sazonal')
    ) {
      mappedType = 'control';
      modelingClassification = 'control';
      channelCategory = 'Controles';
      description = matchedChannel ? matchedChannel.businessDescription : 'Fator externo / Variável de controle';
    }
    // 7. Fallback: recognized channel in name with no explicit spend keyword
    else if (matchedChannel) {
      if (matchedChannel.category === 'Paid Media' || matchedChannel.category === 'Offline Media' || matchedChannel.category === 'Creator / Influence') {
        mappedType = 'media_spend';
        channelName = matchedChannel.channel;
        channelCategory = matchedChannel.category;
        modelingClassification = matchedChannel.modelingType;
        description = `Investimento identificado: ${channelName}`;
      } else {
        mappedType = 'media_spend';
        channelName = matchedChannel.channel;
        channelCategory = matchedChannel.category;
        modelingClassification = matchedChannel.modelingType;
        description = `Canal identificado: ${channelName} (${matchedChannel.category})`;
      }
    }

    const sampleValues = sampleRows
      .slice(0, 5)
      .map(r => r[col])
      .filter((v): v is string | number => v !== undefined && v !== null);

    return {
      columnName: col,
      mappedType,
      channelName,
      channelCategory,
      modelingClassification,
      detectedMetricFamily,
      description,
      sampleValues
    };
  });

  // Post-process: Guarantee unique channelName across media_spend columns
  const spendCounts: Record<string, number> = {};
  for (const m of mappings) {
    if (m.mappedType === 'media_spend' && m.channelName) {
      spendCounts[m.channelName] = (spendCounts[m.channelName] || 0) + 1;
    }
  }

  // Pair exposure/reach/frequency columns with their spend channel when the
  // column stem is identical (for example search_spend/search_reach).
  const spendByStem = new Map(
    mappings
      .filter(mapping => mapping.mappedType === 'media_spend')
      .map(mapping => [channelStem(mapping.columnName), mapping.channelName] as const)
  );
  for (const mapping of mappings) {
    if (['media_impressions', 'media_clicks', 'media_reach', 'media_frequency'].includes(mapping.mappedType)) {
      const pairedChannel = spendByStem.get(channelStem(mapping.columnName));
      if (pairedChannel) mapping.channelName = pairedChannel;
    }
  }

  const seenSpendNames: Record<string, number> = {};
  for (const m of mappings) {
    if (m.mappedType === 'media_spend' && m.channelName && spendCounts[m.channelName] > 1) {
      seenSpendNames[m.channelName] = (seenSpendNames[m.channelName] || 0) + 1;
      m.channelName = `${m.channelName} (${formatChannelName(m.columnName)})`;
    }
  }

  return mappings;
}

function formatChannelName(rawName: string): string {
  let clean = rawName
    .replace(/_spend$/i, '')
    .replace(/_cost$/i, '')
    .replace(/_impressions?$/i, '')
    .replace(/_clicks?$/i, '')
    .replace(/_reach$/i, '')
    .replace(/_alcance$/i, '')
    .replace(/_frequency$/i, '')
    .replace(/_frequencia$/i, '')
    .replace(/_investimento$/i, '')
    .replace(/_/g, ' ')
    .trim();

  // Capitalize channel names nicely
  clean = clean
    .split(' ')
    .map(word => {
      const w = word.toLowerCase();
      if (w === 'tv') return 'TV';
      if (w === 'ooh') return 'OOH';
      if (w === 'cpm') return 'CPM';
      if (w === 'cpc') return 'CPC';
      if (w === 'pmax') return 'Performance Max';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  if (clean.toLowerCase().includes('google') && !clean.toLowerCase().includes('ads') && !clean.toLowerCase().includes('search') && !clean.toLowerCase().includes('display')) {
    clean = clean.replace(/Google/i, 'Google Ads');
  }
  if (clean.toLowerCase().includes('meta') && !clean.toLowerCase().includes('ads')) {
    clean = clean.replace(/Meta/i, 'Meta Ads');
  }

  return clean || rawName;
}

function channelStem(rawName: string): string {
  return rawName
    .toLowerCase()
    .replace(/(?:_|\s)+(spend|cost|investimento|gasto|impressions?|impressoes?|clicks?|cliques?|reach|alcance|frequency|frequencia|views?)$/i, '')
    .replace(/[^a-z0-9]+/g, '');
}
