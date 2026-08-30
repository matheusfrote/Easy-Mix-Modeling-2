export type MetricFamily =
  | 'investment'   // Spend, Cost, Investment, Media Cost, Media Spend
  | 'exposure'     // Impressions, Reach, Frequency, GRP, TRP, Views, Video Views
  | 'engagement'   // Clicks, Engagement, Likes, Shares, Comments, Sessions
  | 'conversion'   // Leads, Purchases, Orders, Revenue, Transactions, Installs
  | 'business'     // Revenue, Units Sold, Average Ticket, Margin, Customers, Market Share
  | 'control';     // Price, Seasonality, Weather, Inflation, etc.

export interface MetricDefinition {
  id: string;
  name: string;
  family: MetricFamily;
  familyLabel: string;
  unit: string;
  format: 'currency' | 'number' | 'percentage' | 'index';
  description: string;
  aliases: string[];
}

export const METRIC_CATALOG: MetricDefinition[] = [
  // 1. INVESTIMENTO
  {
    id: 'spend',
    name: 'Investimento em Mídia',
    family: 'investment',
    familyLabel: 'Investimento (Custo)',
    unit: 'R$',
    format: 'currency',
    description: 'Valor monetário investido veiculando anúncios no canal.',
    aliases: [
      'spend', 'cost', 'investment', 'investimento', 'custo', 'media_spend',
      'media_cost', 'ads_spend', 'valor_gasto', 'verba', 'gasto', 'valor_investido',
      'total_spend', 'budget_spent', 'ad_spend'
    ]
  },

  // 2. EXPOSIÇÃO
  {
    id: 'impressions',
    name: 'Impressões / Exibições',
    family: 'exposure',
    familyLabel: 'Exposição (Alcance e Volume)',
    unit: 'imp.',
    format: 'number',
    description: 'Número de vezes que a peça publicitária foi carregada e exibida na tela.',
    aliases: ['impressions', 'impressoes', 'impressao', 'impr', 'views_count', 'ad_impressions', 'exibicoes']
  },
  {
    id: 'reach',
    name: 'Alcance Único (Reach)',
    family: 'exposure',
    familyLabel: 'Exposição (Alcance e Volume)',
    unit: 'usuários',
    format: 'number',
    description: 'Pessoas ou contas únicas impactadas pelo menos uma vez pela campanha.',
    aliases: ['reach', 'alcance', 'unique_users', 'usuarios_unicos', 'reach_count']
  },
  {
    id: 'frequency',
    name: 'Frequência Média',
    family: 'exposure',
    familyLabel: 'Exposição (Alcance e Volume)',
    unit: 'x',
    format: 'number',
    description: 'Número médio de vezes que cada pessoa atingida foi exposta ao anúncio.',
    aliases: ['frequency', 'frequencia', 'avg_frequency', 'freq_media']
  },
  {
    id: 'grp_trp',
    name: 'GRP / TRP (Gross Rating Points)',
    family: 'exposure',
    familyLabel: 'Exposição (Alcance e Volume)',
    unit: 'pts',
    format: 'number',
    description: 'Pontos de audiência bruta acumulados em mídia offline (TV, Rádio).',
    aliases: ['grp', 'trp', 'rating_points', 'pontos_ibope', 'audiencia_bruta']
  },
  {
    id: 'video_views',
    name: 'Visualizações de Vídeo (Views)',
    family: 'exposure',
    familyLabel: 'Exposição (Alcance e Volume)',
    unit: 'views',
    format: 'number',
    description: 'Reproduções completas ou com mais de 30s em canais em vídeo.',
    aliases: ['video_views', 'views', 'visualizacoes', 'video_plays', 'watch_views']
  },

  // 3. ENGAJAMENTO
  {
    id: 'clicks',
    name: 'Cliques no Anúncio',
    family: 'engagement',
    familyLabel: 'Engajamento (Interações)',
    unit: 'cliques',
    format: 'number',
    description: 'Cliques direcionados para o site, página de destino ou aplicativo.',
    aliases: ['clicks', 'cliques', 'ad_clicks', 'link_clicks', 'cliques_link']
  },
  {
    id: 'sessions',
    name: 'Sessões / Visitas no Site',
    family: 'engagement',
    familyLabel: 'Engajamento (Interações)',
    unit: 'sessões',
    format: 'number',
    description: 'Visitas ativas iniciadas pelos usuários na plataforma.',
    aliases: ['sessions', 'sessoes', 'visitas', 'visits', 'site_sessions', 'traffic']
  },
  {
    id: 'engagement_interactions',
    name: 'Engajamento Geral (Likes, Shares, Comments)',
    family: 'engagement',
    familyLabel: 'Engajamento (Interações)',
    unit: 'interações',
    format: 'number',
    description: 'Soma de reações, comentários, curtidas e compartilhamentos sociais.',
    aliases: ['engagement', 'engajamento', 'likes', 'shares', 'comments', 'interacoes', 'curtidas']
  },

  // 4. CONVERSÃO
  {
    id: 'leads',
    name: 'Leads / Contatos Comerciais',
    family: 'conversion',
    familyLabel: 'Conversão (Leads e Cadastros)',
    unit: 'leads',
    format: 'number',
    description: 'Formulários preenchidos com dados de contato de potenciais clientes.',
    aliases: ['leads', 'contatos', 'formularios', 'registrations', 'cadastros', 'mqls', 'sql']
  },
  {
    id: 'orders',
    name: 'Pedidos / Compras (Transactions)',
    family: 'conversion',
    familyLabel: 'Conversão (Vendas e Pedidos)',
    unit: 'pedidos',
    format: 'number',
    description: 'Quantidade de transações e pedidos de compra finalizados.',
    aliases: ['orders', 'pedidos', 'purchases', 'transactions', 'transacoes', 'vendas_qtd', 'compras']
  },
  {
    id: 'installs',
    name: 'Instalações de Aplicativo (App Installs)',
    family: 'conversion',
    familyLabel: 'Conversão (Aquisição de App)',
    unit: 'installs',
    format: 'number',
    description: 'Downloads e instalações do aplicativo móvel nos dispositivos.',
    aliases: ['installs', 'instalacoes', 'app_installs', 'downloads', 'app_downloads']
  },

  // 5. NEGÓCIO (KPIs DEPENDENTES)
  {
    id: 'revenue',
    name: 'Receita Total / Faturamento',
    family: 'business',
    familyLabel: 'Negócio (KPI Principal)',
    unit: 'R$',
    format: 'currency',
    description: 'Valor total faturado das vendas geradas no período.',
    aliases: [
      'revenue', 'receita', 'sales', 'faturamento', 'vendas_valor',
      'gross_revenue', 'net_revenue', 'receita_liquida', 'receita_bruta',
      'target', 'kpi', 'sales_revenue'
    ]
  },
  {
    id: 'units_sold',
    name: 'Unidades Vendidas (Volume)',
    family: 'business',
    familyLabel: 'Negócio (KPI Principal)',
    unit: 'unidades',
    format: 'number',
    description: 'Volume físico total de itens ou produtos comercializados.',
    aliases: ['units_sold', 'unidades_vendidas', 'volume_vendas', 'units', 'volume']
  },
  {
    id: 'average_ticket',
    name: 'Ticket Médio',
    family: 'business',
    familyLabel: 'Negócio (Indicadores Comerciais)',
    unit: 'R$',
    format: 'currency',
    description: 'Valor médio gasto pelos consumidores em cada transação.',
    aliases: ['average_ticket', 'ticket_medio', 'aov', 'avg_order_value']
  },
  {
    id: 'margin',
    name: 'Margem de Contribuição / Lucro Bruto',
    family: 'business',
    familyLabel: 'Negócio (Indicadores Comerciais)',
    unit: 'R$',
    format: 'currency',
    description: 'Receita subtraída dos custos variáveis de mercadorias.',
    aliases: ['margin', 'margem', 'gross_profit', 'lucro_bruto', 'contribution_margin']
  },
  {
    id: 'customers',
    name: 'Novos Clientes Adquiridos',
    family: 'business',
    familyLabel: 'Negócio (Base de Clientes)',
    unit: 'clientes',
    format: 'number',
    description: 'Volume de clientes inéditos adicionados à base no período.',
    aliases: ['customers', 'novos_clientes', 'new_customers', 'clientes_adquiridos', 'clientes']
  },
  {
    id: 'market_share',
    name: 'Participação de Mercado (Market Share)',
    family: 'business',
    familyLabel: 'Negócio (Posicionamento de Mercado)',
    unit: '%',
    format: 'percentage',
    description: 'Fatia de mercado detida pela empresa dentro da sua categoria.',
    aliases: ['market_share', 'share_de_mercado', 'participacao_mercado', 'market_share_pct']
  },

  // 6. CONTROLE E CONTEXTO
  {
    id: 'control_price',
    name: 'Preço Médio Praticado',
    family: 'control',
    familyLabel: 'Variáveis de Controle',
    unit: 'R$',
    format: 'currency',
    description: 'Preço de tabela ou médio dos produtos ofertados.',
    aliases: ['price', 'preco', 'preco_medio', 'unit_price', 'tabela_preco']
  },
  {
    id: 'control_seasonality',
    name: 'Sazonalidade / Tendência de Mercado',
    family: 'control',
    familyLabel: 'Variáveis de Controle',
    unit: 'índice',
    format: 'index',
    description: 'Variações cíclicas naturais e tendências históricas.',
    aliases: ['seasonality', 'sazonalidade', 'holiday', 'feriado', 'weather', 'clima', 'cpi', 'ipca', 'inflation']
  }
];

/**
 * Identify metric family and normalize metric name from arbitrary column name
 */
export function identifyMetricFromColumn(columnName: string): MetricDefinition | null {
  const lower = columnName.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

  for (const metric of METRIC_CATALOG) {
    for (const alias of metric.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return metric;
      }
    }
  }

  return null;
}
