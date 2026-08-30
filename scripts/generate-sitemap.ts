import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROUTE_METADATA } from '../src/services/seoManager.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Production Base URL (can be customized via VITE_APP_URL environment variable)
const BASE_URL = (process.env.VITE_APP_URL || 'https://ais-pre-2fwaekxosn3hca6jypeypw-779336876744.us-east1.run.app').replace(/\/$/, '');

// Frequency and priority mapping based on tool/view category
const CATEGORY_SEO_WEIGHTS: Record<string, { changefreq: 'daily' | 'weekly' | 'monthly'; priority: number }> = {
  'Analytics & Dashboards': { changefreq: 'daily', priority: 0.95 },
  'Budget Optimization': { changefreq: 'daily', priority: 0.95 },
  'Channel Analytics': { changefreq: 'daily', priority: 0.90 },
  'Scenario Planning': { changefreq: 'weekly', priority: 0.85 },
  'AI Advisory': { changefreq: 'weekly', priority: 0.85 },
  'Benchmark Database': { changefreq: 'weekly', priority: 0.80 },
  'Documentation & Science': { changefreq: 'monthly', priority: 0.80 },
  'Executive Reports': { changefreq: 'weekly', priority: 0.80 },
  'Data Quality': { changefreq: 'monthly', priority: 0.80 },
  'Econometric Modeling': { changefreq: 'monthly', priority: 0.80 },
  'Data Management': { changefreq: 'monthly', priority: 0.80 },
  'Data Processing': { changefreq: 'monthly', priority: 0.75 },
  'Configuration': { changefreq: 'monthly', priority: 0.60 }
};

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Dynamically builds sitemap entries based on the platform's navigation routes and SEO metadata
 */
export function buildSitemapEntries(): SitemapEntry[] {
  const today = new Date().toISOString().split('T')[0];

  // 1. Root / Landing entry
  const entries: SitemapEntry[] = [
    {
      loc: `${BASE_URL}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: 1.0
    }
  ];

  // 2. Iterate through all registered platform views
  for (const [key, meta] of Object.entries(ROUTE_METADATA)) {
    const weights = CATEGORY_SEO_WEIGHTS[meta.category] || { changefreq: 'weekly', priority: 0.80 };
    const loc = `${BASE_URL}/${meta.hash}`;

    entries.push({
      loc,
      lastmod: today,
      changefreq: weights.changefreq,
      priority: weights.priority
    });
  }

  return entries;
}

/**
 * Converts sitemap entries to valid XML conforming to the sitemaps.org 0.9 protocol
 */
export function generateSitemapXml(): string {
  const entries = buildSitemapEntries();

  const urlsXml = entries
    .map(entry => {
      return `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(2)}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>
`;
}

/**
 * Generates and writes sitemap.xml to both /public and /dist
 */
export function writeSitemapFiles(): { publicPath: string; distPath?: string; totalRoutes: number } {
  const xmlContent = generateSitemapXml();
  const entries = buildSitemapEntries();

  // 1. Write to public/sitemap.xml
  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(publicPath, xmlContent, 'utf-8');
  console.log(`[Sitemap Generator] Generated ${publicPath} with ${entries.length} indexed URLs.`);

  // 2. Write to dist/sitemap.xml if the build folder exists
  let distPath: string | undefined;
  const distDir = path.join(projectRoot, 'dist');
  if (fs.existsSync(distDir)) {
    distPath = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distPath, xmlContent, 'utf-8');
    console.log(`[Sitemap Generator] Copied sitemap.xml to ${distPath}`);
  }

  return { publicPath, distPath, totalRoutes: entries.length };
}

// Automatically execute when run as a script via tsx/node
writeSitemapFiles();

