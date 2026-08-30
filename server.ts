import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { handleApiRequest } from './src/server/apiRouter';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Security & SEO Performance Response Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Explicit SEO Endpoint Handlers (robots.txt, sitemap.xml, manifest.json, favicon.svg)
  app.get('/robots.txt', (_req, res) => {
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
    if (fs.existsSync(robotsPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(robotsPath);
    }
    res.type('text/plain').send("User-agent: *\nAllow: /\nSitemap: https://ais-pre-2fwaekxosn3hca6jypeypw-779336876744.us-east1.run.app/sitemap.xml\n");
  });

  app.get('/sitemap.xml', (_req, res) => {
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(sitemapPath);
    }
    res.status(404).send('Not found');
  });

  app.get('/manifest.json', (_req, res) => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(manifestPath);
    }
    res.status(404).send('Not found');
  });

  app.get('/favicon.svg', (_req, res) => {
    const faviconPath = path.join(process.cwd(), 'public', 'favicon.svg');
    if (fs.existsSync(faviconPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.sendFile(faviconPath);
    }
    res.status(404).send('Not found');
  });

  // API Proxy to internal router
  app.all(['/api', '/api/*'], async (req, res) => {
    const urlPath = req.path;
    const method = req.method;
    const body = req.body;

    try {
      const result = await handleApiRequest(urlPath, method, body);
      res.status(result.status).json(result.data);
    } catch (error: any) {
      console.error('Server error:', error);
      res.status(500).json({ error: error?.message || 'Erro interno do servidor' });
    }
  });

  // Explicit safety catch for any API subroute to avoid serving index.html as JSON
  app.all('/api*', (_req, res) => {
    res.status(404).json({ error: 'Endpoint da API não encontrado' });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));

    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Easy Mix Modeling MMM Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

