export type IntegrationCategory =
  | 'cloud'
  | 'files'
  | 'templates';

export type IntegrationStatus = 'available' | 'csv_template' | 'coming_soon';

export interface IntegrationSource {
  id: string;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  badgeColor: string;
  connectionType: 'Google Sheets Link' | 'Arquivo Excel (XLSX)' | 'Arquivo CSV' | 'Template Pronto';
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
  { id: 'all', label: 'Todas as Planilhas' },
  { id: 'cloud', label: 'Planilhas em Nuvem (Google Sheets)' },
  { id: 'files', label: 'Arquivos Locais (Excel & CSV)' },
  { id: 'templates', label: 'Modelos & Templates Estruturados' }
];

export const INTEGRATION_SOURCES: IntegrationSource[] = [
  // ==========================================
  // 1. PLANILHAS EM NUVEM (Google Sheets)
  // ==========================================
  {
    id: 'google-sheets',
    name: 'Google Sheets (Planilhas Google)',
    category: 'cloud',
    categoryLabel: 'Planilha em Nuvem',
    badgeColor: 'emerald',
    connectionType: 'Google Sheets Link',
    availableData: ['Séries Temporais', 'Investimentos de Mídia', 'Faturamento / Vendas', 'Variáveis de Controle'],
    status: 'available',
    statusLabel: '🟢 Conectável via Link',
    tagline: 'Conecte sua planilha diretamente pelo link do Google Sheets com leitura em tempo real.',
    description: 'A forma mais rápida e colaborativa: mantenha sua equipe atualizando a planilha do Google e carregue dados instantaneamente no Easy Mix Modeling sem precisar exportar arquivos manualmente.',
    metrics: ['Data Semanal (date)', 'Investimentos por Canal (spend)', 'Impressões / Cliques', 'Receita / Conversões (kpi)'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Planilha do Google Sheets compartilhada ("Qualquer pessoa com o link") ou link público de visualização'],
    sampleColumns: ['date', 'google_ads_spend', 'meta_ads_spend', 'offline_spend', 'revenue'],
    supportsLiveConnect: true
  },

  // ==========================================
  // 2. ARQUIVOS LOCAIS (Excel & CSV)
  // ==========================================
  {
    id: 'excel-workbook',
    name: 'Planilha Microsoft Excel (.xlsx / .xls)',
    category: 'files',
    categoryLabel: 'Arquivo de Planilha',
    badgeColor: 'emerald',
    connectionType: 'Arquivo Excel (XLSX)',
    availableData: ['Pastas de Trabalho Excel', 'Múltiplos Canais de Mídia', 'Métricas Comerciais', 'Feriados & Sazonalidade'],
    status: 'available',
    statusLabel: '🟢 Suporte Nativo',
    tagline: 'Importe sua pasta de trabalho do Excel (.xlsx ou .xls) com processamento seguro no navegador.',
    description: 'Carregue suas planilhas de investimento e vendas criadas no Microsoft Excel. O sistema extrai a aba de dados automaticamente com sanitização e validação para modelagem estatística.',
    metrics: ['Data de início da semana', 'Investimentos de mídia (R$)', 'Volume de vendas', 'Variáveis de contexto'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Arquivo Excel (.xlsx ou .xls) local com cabeçalhos na primeira linha'],
    sampleColumns: ['data_semana', 'gasto_google', 'gasto_meta', 'gasto_tv', 'faturamento_total'],
    supportsLiveConnect: true
  },
  {
    id: 'csv-spreadsheet',
    name: 'Planilha CSV (Série Histórica Tabular)',
    category: 'files',
    categoryLabel: 'Arquivo de Planilha',
    badgeColor: 'blue',
    connectionType: 'Arquivo CSV',
    availableData: ['Dados Tabulares Delimitados', 'Histórico de 1 a 3 anos', 'Spend de Mídia', 'Receita Líquida'],
    status: 'available',
    statusLabel: '🟢 Formato Padrão',
    tagline: 'O formato padrão para dados tabulares em ciência de dados e econometria.',
    description: 'Compatível com qualquer arquivo CSV exportado de ferramentas de BI, ERP ou planilhas. Suporte automático a separadores por vírgula (,) e ponto-e-vírgula (;).',
    metrics: ['Séries temporais semanais', 'Canais de mídia pagos', 'Controles exógenos', 'KPI principal'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Arquivo .csv com codificação UTF-8'],
    sampleColumns: ['date', 'search_spend', 'social_spend', 'display_spend', 'conversions'],
    supportsLiveConnect: true
  },

  // ==========================================
  // 3. MODELOS & TEMPLATES ESTRUTURADOS
  // ==========================================
  {
    id: 'meridian-template',
    name: 'Template Oficial Google Meridian',
    category: 'templates',
    categoryLabel: 'Modelo Estruturado',
    badgeColor: 'indigo',
    connectionType: 'Template Pronto',
    availableData: ['Estrutura Recomendada pelo Google', 'Colunas de Mídia e Controles', 'Exemplo Pré-formatado de 104 Semanas'],
    status: 'available',
    statusLabel: '⭐ Recomendado',
    tagline: 'Modelo oficial com a estrutura recomendada pela equipe do Google Meridian.',
    description: 'Utilize o template pronto com colunas pré-definidas para data, canais de mídia, impressões, variáveis de controle de preço e promoções. Disponível para download ou cópia no Google Sheets.',
    metrics: ['Semana (date)', 'Spend por canal', 'Impressões por canal', 'Promoções (controle)', 'Faturamento (KPI)'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Nenhum — template pronto para uso imediato'],
    sampleColumns: ['date', 'google_search_spend', 'google_search_impressions', 'meta_spend', 'meta_impressions', 'promo_flag', 'sales'],
    supportsLiveConnect: true
  },
  {
    id: 'consolidated-media-sheet',
    name: 'Planilha Consolidada Multicanal',
    category: 'templates',
    categoryLabel: 'Modelo Estruturado',
    badgeColor: 'purple',
    connectionType: 'Template Pronto',
    availableData: ['Mídia Online & Offline', 'Google, Meta, TikTok, TV e OOH', 'Histórico Completo de Investimento'],
    status: 'available',
    statusLabel: '📊 Modelo Consolidado',
    tagline: 'Estrutura ideal para consolidar múltiplos canais digitais e tradicionais.',
    description: 'Planilha preparada para empresas que investem em múltiplos canais simultâneos (Search, Social, Display, TV aberta, Rádio, Influenciadores) e precisam de uma visão unificada para o modelo bayesiano.',
    metrics: ['Canais Online (Digital)', 'Canais Offline (Tradicional)', 'Investimentos Semanais', 'Receita Total'],
    recommendedGranularity: 'Semanal',
    authRequirements: ['Nenhum — template pronto para download'],
    sampleColumns: ['date', 'google_ads', 'meta_ads', 'tiktok_ads', 'tv_spend', 'influencers_spend', 'total_revenue'],
    supportsLiveConnect: true
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
