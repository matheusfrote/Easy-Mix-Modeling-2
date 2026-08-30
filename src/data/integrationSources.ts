export type IntegrationCategory =
  | 'advertising'
  | 'analytics'
  | 'crm'
  | 'ecommerce'
  | 'database';

export type IntegrationStatus = 'available' | 'csv_template' | 'coming_soon';

export interface IntegrationSource {
  id: string;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  badgeColor: string;
  connectionType: 'OAuth 2.0' | 'API Token' | 'Webhook' | 'Google Sheets Link' | 'SQL Connector' | 'REST API';
  availableData: string[];
  status: IntegrationStatus;
  statusLabel: string;
  tagline: string;
  description: string;
  metrics: string[];
  recommendedGranularity: 'Semanal' | 'Diária';
  authRequirements: string[];
  sampleColumns: string[];
  documentationUrl?: string;
  supportsLiveConnect?: boolean;
}

export const INTEGRATION_CATEGORIES: { id: IntegrationCategory | 'all'; label: string; count?: number }[] = [
  { id: 'all', label: 'Todas as Fontes' },
  { id: 'advertising', label: 'Publicidade (Mídia)' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'crm', label: 'CRM & Vendas' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'database', label: 'Dados & Bancos' }
];

export const INTEGRATION_SOURCES: IntegrationSource[] = [
  // ==========================================
  // 1. PUBLICIDADE (Advertising)
  // ==========================================
  {
    id: 'google-ads',
    name: 'Google Ads',
    category: 'advertising',
    categoryLabel: 'Publicidade',
    badgeColor: 'blue',
    connectionType: 'OAuth 2.0',
    availableData: ['Investimento (Spend)', 'Impressões', 'Cliques', 'Conversões', 'ROAS da Plataforma'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Importe automaticamente investimento, impressões, cliques e conversões de Search, Display, YouTube e PMax.',
    description: 'Conecte sua conta do Google Ads para extrair investimentos semanais segmentados por rede (Search, YouTube, Performance Max, Display) com adstock e saturação automáticos.',
    metrics: ['Investimento (R$)', 'Impressões', 'Cliques', 'Conversões', 'CPC Médio'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Conta Google Ads com permissão de leitura', 'OAuth 2.0 / Developer Token'],
    sampleColumns: ['google_search_spend', 'google_display_spend', 'youtube_spend', 'pmax_spend']
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    category: 'advertising',
    categoryLabel: 'Publicidade',
    badgeColor: 'blue',
    connectionType: 'OAuth 2.0',
    availableData: ['Investimento em Mídia', 'Alcance Único (Reach)', 'Impressões', 'Cliques no Link', 'Compras'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Sincronize campanhas do Facebook Ads e Instagram Ads com granularidade semanal e métricas de alcance.',
    description: 'Extração contínua de verbas e métricas de topo/fundo de funil de campanhas do Meta Business Suite.',
    metrics: ['Gasto em Anúncios', 'Alcance (Reach)', 'Impressões', 'Cliques no Link', 'Compras no Pixel'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Meta Business Manager', 'Permissão ads_read via OAuth'],
    sampleColumns: ['meta_feed_spend', 'meta_stories_spend', 'instagram_reels_spend']
  },
  {
    id: 'tiktok-ads',
    name: 'TikTok Ads',
    category: 'advertising',
    categoryLabel: 'Publicidade',
    badgeColor: 'slate',
    connectionType: 'OAuth 2.0',
    availableData: ['Investimento em Mídia', 'Video Views', 'Impressões', 'Cliques', 'Conversões'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Mapeie o impacto de campanhas de vídeo curto no TikTok sobre vendas e reconhecimento de marca.',
    description: 'Sincronização de investimento e métricas de engajamento do TikTok Ads Manager para decomposição bayesiana.',
    metrics: ['Investimento em Mídia', 'Video Views (2s, 6s)', 'Impressões', 'Cliques'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['TikTok for Business Account', 'Access Token de Leitura'],
    sampleColumns: ['tiktok_spend', 'tiktok_video_views', 'tiktok_impressions']
  },
  {
    id: 'linkedin-ads',
    name: 'LinkedIn Ads',
    category: 'advertising',
    categoryLabel: 'Publicidade',
    badgeColor: 'indigo',
    connectionType: 'OAuth 2.0',
    availableData: ['Investimento B2B', 'Impressões', 'Cliques', 'Formulários de Lead (Lead Gen)'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Ideal para modelos de marketing B2B: acompanhe o retorno de Sponsored Content e InMail.',
    description: 'Importação estruturada de campanhas B2B do LinkedIn Campaign Manager.',
    metrics: ['Investimento B2B', 'Impressões', 'Cliques', 'Leads Gerados'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['LinkedIn Campaign Manager', 'OAuth 2.0 r_ads_reporting'],
    sampleColumns: ['linkedin_ads_spend', 'linkedin_clicks', 'linkedin_leads']
  },
  {
    id: 'microsoft-ads',
    name: 'Microsoft Ads',
    category: 'advertising',
    categoryLabel: 'Publicidade',
    badgeColor: 'sky',
    connectionType: 'OAuth 2.0',
    availableData: ['Investimento em Bing Search', 'Cliques', 'Impressões', 'Conversões'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Conecte anúncios da rede Bing e Microsoft Audience Network.',
    description: 'Mapeamento de Search Ads e Audiences da Microsoft Advertising para atribuição no MMM.',
    metrics: ['Investimento', 'Cliques', 'Impressões', 'Conversões'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Microsoft Advertising Account', 'OAuth 2.0'],
    sampleColumns: ['bing_search_spend', 'bing_clicks', 'bing_conversions']
  },

  // ==========================================
  // 2. ANALYTICS
  // ==========================================
  {
    id: 'ga4',
    name: 'Google Analytics 4 (GA4)',
    category: 'analytics',
    categoryLabel: 'Analytics',
    badgeColor: 'amber',
    connectionType: 'OAuth 2.0',
    availableData: ['Sessões Totais', 'Usuários Ativos', 'Eventos de Conversão', 'Receita de E-commerce', 'Origem/Mídia'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Importe tráfego orgânico, sessões e transações para servir como variáveis de resultado (KPI) ou controles.',
    description: 'Conecte sua propriedade do Google Analytics 4 via Data API para extrair o volume de sessões e conversões do site.',
    metrics: ['Sessões Totais', 'Usuários Ativos', 'Transações de E-commerce', 'Receita de Compra'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Propriedade GA4 ativa', 'Permissão de visualizador / analista'],
    sampleColumns: ['ga4_sessions', 'ga4_ecommerce_revenue', 'ga4_organic_traffic']
  },
  {
    id: 'adobe-analytics',
    name: 'Adobe Analytics',
    category: 'analytics',
    categoryLabel: 'Analytics',
    badgeColor: 'rose',
    connectionType: 'API Token',
    availableData: ['Visitas Totais', 'Visitantes Únicos', 'Pedidos (Orders)', 'Receita Omnichannel'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Extração enterprise de métricas de visitação e conversão da Adobe Experience Cloud.',
    description: 'Integração via Adobe Analytics Reporting API 2.0 para consolidação de KPIs em grandes corporações.',
    metrics: ['Visitas', 'Visitantes Únicos', 'Pedidos', 'Receita Total'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Adobe Developer Console Project', 'JWT / OAuth Server-to-Server'],
    sampleColumns: ['adobe_visits', 'adobe_revenue', 'adobe_orders']
  },

  // ==========================================
  // 3. CRM & VENDAS
  // ==========================================
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    categoryLabel: 'CRM & Vendas',
    badgeColor: 'orange',
    connectionType: 'OAuth 2.0',
    availableData: ['Novos Contatos', 'MQLs', 'SQLs', 'Oportunidades Criadas', 'Receita de Deals Fechados'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Conecte o funil de marketing e vendas B2B para estimar o impacto da mídia em geração de pipeline.',
    description: 'Sincronização de estágios do funil do HubSpot CRM (Leads, MQL, Oportunidades e Vendas Ganhas).',
    metrics: ['Novos Leads', 'MQLs', 'Oportunidades Fechadas', 'Receita Ponderada'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['HubSpot Portal Admin', 'OAuth Private App Token'],
    sampleColumns: ['hubspot_deals_won_revenue', 'hubspot_mqls', 'hubspot_new_leads']
  },
  {
    id: 'salesforce',
    name: 'Salesforce CRM',
    category: 'crm',
    categoryLabel: 'CRM & Vendas',
    badgeColor: 'cyan',
    connectionType: 'OAuth 2.0',
    availableData: ['Leads Criados', 'Oportunidades', 'ACV / ARR Fechado', 'Ciclo de Vendas Médio'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Sincronize dados de receita corporativa e oportunidades do Salesforce Sales Cloud.',
    description: 'Integração enterprise com relatórios e objetos de Opportunity e Lead do Salesforce.',
    metrics: ['Leads Criados', 'Oportunidades Ganhas', 'Receita de Vendas'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Salesforce Connected App', 'OAuth 2.0 REST API'],
    sampleColumns: ['salesforce_closed_won_arr', 'salesforce_opportunities']
  },
  {
    id: 'rd-station',
    name: 'RD Station Marketing & CRM',
    category: 'crm',
    categoryLabel: 'CRM & Vendas',
    badgeColor: 'emerald',
    connectionType: 'API Token',
    availableData: ['Leads Convertidos', 'Leads Qualificados', 'Oportunidades', 'Vendas Realizadas'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'A plataforma líder de automação no Brasil: importe conversões de landing pages e nutrição.',
    description: 'Extração de conversões de topo e meio de funil para servir como controles ou KPIs secundários no MMM.',
    metrics: ['Leads Totais', 'Oportunidades de Venda', 'Vendas Concluídas'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['RD Station Marketing API Token', 'Webhook / Polling'],
    sampleColumns: ['rdstation_leads', 'rdstation_sales_count']
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'crm',
    categoryLabel: 'CRM & Vendas',
    badgeColor: 'emerald',
    connectionType: 'API Token',
    availableData: ['Negócios Ganhos', 'Valor Total em Pipeline', 'Atividades Comerciais'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Acompanhe a cadência de fechamento de negócios comerciais semanais.',
    description: 'Sincronização de histórico de vendas ganhas por semana via Pipedrive Deals API.',
    metrics: ['Deals Won Value', 'Deals Won Count', 'Activities Completed'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Pipedrive API Key / Personal Token'],
    sampleColumns: ['pipedrive_revenue', 'pipedrive_won_deals']
  },

  // ==========================================
  // 4. E-COMMERCE
  // ==========================================
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'ecommerce',
    categoryLabel: 'E-commerce',
    badgeColor: 'emerald',
    connectionType: 'OAuth 2.0',
    availableData: ['Receita Bruta (GMV)', 'Receita Líquida', 'Volume de Pedidos', 'Ticket Médio', 'Descontos Aplicados'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Defina automaticamente sua receita total de e-commerce e pedidos como o KPI principal do modelo.',
    description: 'Conexão direta com pedidos e transações da sua loja Shopify para medição precisa de vendas diárias e semanais.',
    metrics: ['Receita Total (R$)', 'Pedidos Concluídos', 'Ticket Médio', 'Descontos (Controle)'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Shopify Store Admin', 'App Customizado / OAuth read_orders'],
    sampleColumns: ['shopify_gross_revenue', 'shopify_order_count', 'shopify_discounts']
  },
  {
    id: 'vtex',
    name: 'VTEX Commerce Cloud',
    category: 'ecommerce',
    categoryLabel: 'E-commerce',
    badgeColor: 'rose',
    connectionType: 'API Token',
    availableData: ['Faturamento Omnichannel', 'Volume de Pedidos Aprovados', 'Cancelamentos', 'Ticket Médio'],
    status: 'csv_template',
    statusLabel: 'Enviar CSV ou Conectar',
    tagline: 'Conecte lojas enterprise VTEX para extrair vendas aprovadas e comportamento promocional.',
    description: 'Integração com VTEX Order Management System (OMS) para agrupamento semanal de receita líquida.',
    metrics: ['Receita Aprovada (R$)', 'Quantidade de Pedidos', 'Promoções Aplicadas'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['VTEX AppKey e AppToken com role OMS Viewer'],
    sampleColumns: ['vtex_approved_revenue', 'vtex_orders_count']
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'ecommerce',
    categoryLabel: 'E-commerce',
    badgeColor: 'purple',
    connectionType: 'REST API',
    availableData: ['Vendas Totais', 'Total de Pedidos', 'Cupons Utilizados', 'Frete e Impostos'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Importe faturamento e pedidos de lojas baseadas em WordPress WooCommerce.',
    description: 'Conexão segura via WooCommerce REST API v3 com chaves de consumidor em modo leitura.',
    metrics: ['Total Sales', 'Order Count', 'Discount Total'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Consumer Key & Consumer Secret do WooCommerce'],
    sampleColumns: ['woo_sales_revenue', 'woo_completed_orders']
  },

  // ==========================================
  // 5. DADOS & BANCOS
  // ==========================================
  {
    id: 'google-sheets',
    name: 'Google Sheets (Planilhas Google)',
    category: 'database',
    categoryLabel: 'Dados & Bancos',
    badgeColor: 'emerald',
    connectionType: 'Google Sheets Link',
    availableData: ['Séries Temporais', 'Investimentos Customizados', 'Faturamento', 'Variáveis de Controle'],
    status: 'available',
    statusLabel: '🟢 Conectável Agora',
    tagline: 'Conecte diretamente uma planilha do Google Sheets via URL pública ou link de exportação CSV.',
    description: 'A forma mais rápida e colaborativa: mantenha sua equipe atualizando a planilha do Google e carregue dados em tempo real no Easy Mix Modeling.',
    metrics: ['Qualquer coluna estruturada', 'Datas semanais', 'Métricas de mídia', 'Vendas'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Link público ou de visualização da planilha Google Sheets'],
    sampleColumns: ['date', 'google_ads_spend', 'meta_ads_spend', 'revenue'],
    supportsLiveConnect: true
  },
  {
    id: 'bigquery',
    name: 'Google BigQuery',
    category: 'database',
    categoryLabel: 'Dados & Bancos',
    badgeColor: 'blue',
    connectionType: 'SQL Connector',
    availableData: ['Data Warehouse Corporativo', 'Tabelas Agregadas de Marketing', 'Modelos dbt'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Execute consultas SQL diretas no seu Data Warehouse do Google Cloud.',
    description: 'Conexão nativa com datasets de BigQuery para alimentar o MMM sem exportações manuais.',
    metrics: ['Tabelas SQL customizadas', 'Séries temporais agregadas'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['GCP Service Account JSON com role BigQuery Data Viewer'],
    sampleColumns: ['week_start_date', 'total_media_spend', 'gross_sales']
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'database',
    categoryLabel: 'Dados & Bancos',
    badgeColor: 'indigo',
    connectionType: 'SQL Connector',
    availableData: ['Tabelas de BI', 'Visões Materializadas', 'Histórico de Faturamento'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Conecte seu banco de dados relacional PostgreSQL via consulta SQL segura (Read-Only).',
    description: 'Sincronização agendada de visões agregadas de marketing e vendas diretamente do banco.',
    metrics: ['Tabelas relacionais', 'Resultados de queries'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Credenciais de banco em modo somente-leitura (Read-Only User)'],
    sampleColumns: ['date', 'channel_spend', 'kpi_revenue']
  },
  {
    id: 'mysql',
    name: 'MySQL',
    category: 'database',
    categoryLabel: 'Dados & Bancos',
    badgeColor: 'orange',
    connectionType: 'SQL Connector',
    availableData: ['Tabelas Transacionais', 'Agrupamentos de Vendas'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Extraia séries históricas de bases de dados relacionais MySQL.',
    description: 'Consultas estruturadas de faturamento e custos diretamente do banco de dados.',
    metrics: ['Visões agregadas semanais'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Usuário MySQL com permissão SELECT'],
    sampleColumns: ['data_semana', 'valor_gasto', 'faturamento_total']
  },
  {
    id: 'rest-api',
    name: 'API REST Customizada',
    category: 'database',
    categoryLabel: 'Dados & Bancos',
    badgeColor: 'slate',
    connectionType: 'REST API',
    availableData: ['JSON de Séries Temporais', 'Webhooks de ETL', 'Pipelines Airflow/Prefect'],
    status: 'coming_soon',
    statusLabel: 'Disponível em breve',
    tagline: 'Alimente o modelo via chamadas HTTP GET/POST para orquestração contínua em MLOps.',
    description: 'Endpoint REST dedicado para envio programático de novas semanas e automação de pipelines de dados.',
    metrics: ['Payloads JSON padronizados'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['API Key no header Authorization: Bearer <token>'],
    sampleColumns: ['rows[] array de objetos com date, spend e kpi']
  }
];

export interface ConnectedSourceInstance {
  id: string;
  sourceId: string;
  name: string;
  category: IntegrationCategory;
  connectedAt: string;
  lastSyncedAt: string;
  status: 'active' | 'syncing' | 'needs_reauth' | 'error';
  statusMessage?: string;
  historicalWeeks: number;
  channelsCount: number;
  totalSpendFound?: number;
  kpiFound?: string;
  frequency: 'manual' | 'daily' | 'weekly';
  historicalPeriod: '12m' | '24m' | '36m';
}
