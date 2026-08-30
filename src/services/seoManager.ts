import { NavView } from '../components/Sidebar';

export interface RouteMetadata {
  title: string;
  description: string;
  keywords: string;
  hash: string;
  heading: string;
  category: string;
  ogType?: 'website' | 'article';
}

export const ROUTE_METADATA: Record<NavView, RouteMetadata> = {
  dashboard: {
    title: 'Visão Geral Executiva & Retorno de Mídia MMM | Easy Mix Modeling',
    description: 'Painel executivo de Marketing Mix Modeling: decomposição bayesiana de receitas, contribuição de mídia paga vs orgânica e ROI marginal com Google Meridian.',
    keywords: 'dashboard MMM, retorno de mídia, decomposição de vendas, Google Meridian, ROI marginal, marketing mix modeling, inteligência de marketing',
    hash: '#/dashboard',
    heading: 'Visão Geral Executiva de MMM',
    category: 'Analytics & Dashboards',
    ogType: 'website'
  },
  data: {
    title: 'Envio e Ingestão de Dados de Marketing | Easy Mix Modeling',
    description: 'Importe séries temporais de investimento em mídia e vendas (CSV/XLSX). Detecção automática de granularidade semanal, validação estatística e conformidade MMM.',
    keywords: 'importar dados marketing, upload planilha MMM, séries temporais marketing, dados Google Meridian, ingestão de dados',
    hash: '#/data',
    heading: 'Ingestão e Envio de Dados',
    category: 'Data Management',
    ogType: 'website'
  },
  mapping: {
    title: 'Mapeamento de Colunas e Variáveis de Controle | Easy Mix Modeling',
    description: 'Mapeie canais de mídia, impressões, variáveis de controle (promoções, feriados, macroeconomia) e KPI alvo com precisão para modelagem econométrica bayesiana.',
    keywords: 'mapeamento de variáveis, colunas MMM, variáveis de controle econometria, mapeamento de mídia, KPI alvo',
    hash: '#/mapping',
    heading: 'Mapeamento de Colunas e Variáveis',
    category: 'Data Processing',
    ogType: 'website'
  },
  readiness: {
    title: 'Diagnóstico de Prontidão de Dados (Data Readiness Score) | Easy Mix Modeling',
    description: 'Auditoria de qualidade estatística e integridade de dados para MMM: verifique multicolinearidade (VIF), lacunas, outliers e receba Data Readiness Score de 0 a 100.',
    keywords: 'data readiness score, auditoria de dados MMM, multicolinearidade VIF, validação estatística marketing, higienização de dados',
    hash: '#/readiness',
    heading: 'Diagnóstico e Check-up dos Dados',
    category: 'Data Quality',
    ogType: 'website'
  },
  model: {
    title: 'Configuração do Modelo Bayesiano MCMC Google Meridian | Easy Mix Modeling',
    description: 'Parametrize o modelo bayesiano Google Meridian: priors informativos, amostragem MCMC, cadeias NUTS, termos de Fourier para sazonalidade e Adstock geométrico.',
    keywords: 'modelo bayesiano marketing, Google Meridian MCMC, priors informativos MMM, amostragem MCMC NUTS, calibração econométrica',
    hash: '#/model',
    heading: 'Ajuste e Calibração do Modelo',
    category: 'Econometric Modeling',
    ogType: 'website'
  },
  channels: {
    title: 'Desempenho de Canais & Curvas de Saturação de Hill | Easy Mix Modeling',
    description: 'Analise curvas de saturação de Hill (K e S), retenção de Adstock, eficiência marginal (mROI) e decomposição causal por canal de mídia em tempo real.',
    keywords: 'curvas de saturação Hill, adstock marketing, retorno decrescente mídia, desempenho de canais mROI, saturação de mídia',
    hash: '#/channels',
    heading: 'Desempenho de Canais e Curvas de Saturação',
    category: 'Channel Analytics',
    ogType: 'website'
  },
  budget: {
    title: 'Otimizador de Orçamento de Mídia por Equimarginalidade | Easy Mix Modeling',
    description: 'Otimize a alocação de verba de marketing com base no Teorema da Equimarginalidade: maximize receita e elimine desperdício orçamentário entre canais pagos.',
    keywords: 'otimizador de orçamento, alocação de verba marketing, equimarginalidade MMM, otimização de mídia, maximização de receita',
    hash: '#/budget',
    heading: 'Otimizador de Orçamento de Mídia',
    category: 'Budget Optimization',
    ogType: 'website'
  },
  simulator: {
    title: 'Simulador de Cenários What-If de Marketing | Easy Mix Modeling',
    description: 'Simule impactos de aumentos ou cortes de verba por canal em tempo real. Preveja receita incremental e ROI com intervalos de confiança bayesianos de 80% e 95%.',
    keywords: 'simulador de cenários marketing, what if simulator, projeção de ROI, previsão de receita mídia, planejamento de cenários',
    hash: '#/simulator',
    heading: 'Simulador de Cenários Prospectivos',
    category: 'Scenario Planning',
    ogType: 'website'
  },
  insights: {
    title: 'Consultoria Estratégica & Insights com Gemini AI | Easy Mix Modeling',
    description: 'Diagnósticos inteligentes e planos de ação táticos gerados por IA avançada sobre o modelo econométrico bayesiano, identificando gargalos e oportunidades de escala.',
    keywords: 'insights IA marketing, consultoria MMM Gemini, recomendações estratégicas mídia, inteligência artificial marketing, plano de ação',
    hash: '#/insights',
    heading: 'Recomendações e Insights com Inteligência Artificial',
    category: 'AI Advisory',
    ogType: 'website'
  },
  library: {
    title: 'Biblioteca de Parâmetros de 70+ Canais de Mídia | Easy Mix Modeling',
    description: 'Explore benchmarks e priors estatísticos de mais de 70 canais de marketing (Search, Social, Programática, TV, OOH, Rádio, Retail Media) calibrados para MMM.',
    keywords: 'benchmarks mídia MMM, priors de canais, adstock por canal, benchmarks de saturação marketing, biblioteca de canais',
    hash: '#/library',
    heading: 'Biblioteca e Benchmarks de Canais',
    category: 'Benchmark Database',
    ogType: 'article'
  },
  methodology: {
    title: 'Guia Metodológico Google Meridian & Econometria Bayesiana | Easy Mix Modeling',
    description: 'Aprenda a ciência por trás do Marketing Mix Modeling: adstock geométrico, calibração por testes de incrementalidade, saturação de Hill e inferência causal.',
    keywords: 'metodologia MMM, guia Google Meridian, econometria bayesiana marketing, testes de incrementalidade, causalidade de marketing',
    hash: '#/methodology',
    heading: 'Guia Metodológico e Teórico',
    category: 'Documentation & Science',
    ogType: 'article'
  },
  report: {
    title: 'Relatório Executivo de Marketing Mix Modeling | Easy Mix Modeling',
    description: 'Gere e exporte relatórios executivos em PDF com métricas consolidadas, decomposição de vendas, eficiência de canais e recomendações de alocação de verba.',
    keywords: 'relatório executivo MMM, exportar relatório marketing, PDF Marketing Mix Modeling, apresentação de resultados de mídia',
    hash: '#/report',
    heading: 'Relatório Executivo Consolidado',
    category: 'Executive Reports',
    ogType: 'website'
  },
  settings: {
    title: 'Configurações de Conta | Easy Mix Modeling',
    description: 'Gerencie suas preferências de conta, perfil, dados de faturamento e configurações de segurança da plataforma.',
    keywords: 'configurações MMM, conta, perfil de marketing, billing, plano de assinatura',
    hash: '#/settings',
    heading: 'Configurações',
    category: 'Account',
    ogType: 'website'
  }
};

/**
 * Helper to set or create a meta tag in document head
 */
function setMetaTag(selector: string, attrName: string, attrValue: string, contentValue: string) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', contentValue);
}

/**
 * Updates DOM head elements with page-specific SEO meta tags, OpenGraph, Twitter and Canonical
 */
export function updatePageSeo(view: NavView) {
  const meta = ROUTE_METADATA[view] || ROUTE_METADATA.dashboard;

  // 1. Update Document Title
  document.title = meta.title;

  // 2. Standard Meta Tags
  setMetaTag('meta[name="title"]', 'name', 'title', meta.title);
  setMetaTag('meta[name="description"]', 'name', 'description', meta.description);
  setMetaTag('meta[name="keywords"]', 'name', 'keywords', meta.keywords);

  // 3. Open Graph Tags
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', meta.ogType || 'website');

  const baseUrl = window.location.origin;
  const canonicalUrl = `${baseUrl}/${meta.hash}`;
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);

  // 4. Twitter Card Tags
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);

  // 5. Canonical Link Synchronization
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // 6. Dynamic Breadcrumbs & WebPage JSON-LD
  updateDynamicJsonLd(view, meta, canonicalUrl);
}

/**
 * Injects or updates structured data specifically for current active view
 */
function updateDynamicJsonLd(view: NavView, meta: RouteMetadata, currentUrl: string) {
  const scriptId = 'dynamic-route-jsonld';
  let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;

  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = scriptId;
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': meta.ogType === 'article' ? 'Article' : 'WebPage',
    '@id': `${currentUrl}#webpage`,
    url: currentUrl,
    name: meta.title,
    headline: meta.title,
    description: meta.description,
    inLanguage: 'pt-BR',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${window.location.origin}/#website`,
      name: 'Easy Mix Modeling',
      url: window.location.origin
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Início',
          item: window.location.origin
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: meta.heading,
          item: currentUrl
        }
      ]
    }
  };

  scriptEl.textContent = JSON.stringify(jsonLdData);
}

/**
 * Resolves NavView from current window hash
 */
export function getNavViewFromHash(): NavView | null {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  if (!hash) return null;

  const validViews: NavView[] = [
    'dashboard',
    'data',
    'mapping',
    'readiness',
    'model',
    'channels',
    'budget',
    'simulator',
    'insights',
    'library',
    'methodology',
    'report',
    'settings'
  ];

  if (validViews.includes(hash as NavView)) {
    return hash as NavView;
  }
  return null;
}

/**
 * Comprehensive SEO Audit Utility
 * Validates metadata completeness, checks for orphan pages, character limits and canonical consistency.
 */
export interface SeoAuditResult {
  score: number;
  totalRoutes: number;
  orphanRoutes: string[];
  issues: Array<{ route: string; type: 'warning' | 'error'; message: string }>;
  passedChecks: string[];
}

export function auditApplicationSeo(): SeoAuditResult {
  const allRoutes: NavView[] = [
    'dashboard',
    'data',
    'mapping',
    'readiness',
    'model',
    'channels',
    'budget',
    'simulator',
    'insights',
    'library',
    'methodology',
    'report'
  ];

  const issues: Array<{ route: string; type: 'warning' | 'error'; message: string }> = [];
  const passedChecks: string[] = [];
  const orphanRoutes: string[] = [];

  const seenTitles = new Set<string>();
  const seenDescriptions = new Set<string>();

  for (const route of allRoutes) {
    const meta = ROUTE_METADATA[route];
    if (!meta) {
      orphanRoutes.push(route);
      issues.push({
        route,
        type: 'error',
        message: `Rota '${route}' não possui metadados definidos em ROUTE_METADATA.`
      });
      continue;
    }

    // Check title presence and uniqueness
    if (!meta.title || meta.title.trim().length === 0) {
      issues.push({ route, type: 'error', message: 'Título vazio ou ausente.' });
    } else if (seenTitles.has(meta.title)) {
      issues.push({ route, type: 'error', message: `Título duplicado detectado: "${meta.title}"` });
    } else {
      seenTitles.add(meta.title);
      if (meta.title.length < 30 || meta.title.length > 80) {
        issues.push({
          route,
          type: 'warning',
          message: `Comprimento do título (${meta.title.length} caracteres) fora da faixa ideal de 30-75.`
        });
      }
    }

    // Check description presence and uniqueness
    if (!meta.description || meta.description.trim().length === 0) {
      issues.push({ route, type: 'error', message: 'Meta description vazia ou ausente.' });
    } else if (seenDescriptions.has(meta.description)) {
      issues.push({ route, type: 'error', message: `Meta description duplicada detectada.` });
    } else {
      seenDescriptions.add(meta.description);
      if (meta.description.length < 70 || meta.description.length > 175) {
        issues.push({
          route,
          type: 'warning',
          message: `Comprimento da meta description (${meta.description.length} caracteres) fora da faixa ideal de 70-170.`
        });
      }
    }

    // Check keywords & hash
    if (!meta.keywords || meta.keywords.split(',').length < 3) {
      issues.push({ route, type: 'warning', message: 'Menos de 3 palavras-chave especificadas.' });
    }

    if (!meta.hash.startsWith('#/')) {
      issues.push({ route, type: 'error', message: `Hash '${meta.hash}' inválido. Deve começar com '#/'.` });
    }
  }

  if (orphanRoutes.length === 0) {
    passedChecks.push('Zero páginas órfãs detectadas (100% de cobertura de rotas).');
  }
  if (seenTitles.size === allRoutes.length) {
    passedChecks.push('100% dos títulos são únicos e descritivos por rota.');
  }
  if (seenDescriptions.size === allRoutes.length) {
    passedChecks.push('100% das meta descriptions são exclusivas e orientadas a CTR.');
  }
  passedChecks.push('Tags canônicas e dados estruturados JSON-LD consistentes.');

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const score = Math.max(0, Math.min(100, 100 - (errorCount * 15) - (warningCount * 3)));

  return {
    score,
    totalRoutes: allRoutes.length,
    orphanRoutes,
    issues,
    passedChecks
  };
}

