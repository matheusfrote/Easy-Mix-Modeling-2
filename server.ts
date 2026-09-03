import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { handleApiRequest } from './src/server/apiRouter';
import { globalApiRateLimiter } from './src/server/security/rateLimiter';
import { auditLogger } from './src/server/security/auditLogger';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Disable server signature (Information Disclosure prevention)
  app.disable('x-powered-by');

  // 2. Trust reverse proxy (Cloud Run, Nginx) for accurate client IP identification
  app.set('trust proxy', 1);

  // 3. Granular Body Sizing to prevent Memory Exhaustion DoS (CWE-400)
  // Dedicated 15mb parser for dataset uploads only
  app.use('/api/upload', express.json({ limit: '15mb' }));
  // Default 2mb parser for general JSON API endpoints
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 4. Hardened Security Headers (OWASP Top 10 & ASVS 5.0 Compliant)
  app.use((req, res, next) => {
    // Content Security Policy (CSP)
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https://api.dicebear.com https://lh3.googleusercontent.com",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
      "frame-src 'self' https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    if (process.env.NODE_ENV === 'production' || req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // CORS Isolation - Restrict wildcard origins
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = [
        process.env.VITE_APP_URL,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000'
      ].filter(Boolean);

      if (allowedOrigins.some(ao => ao && origin.startsWith(ao as string)) || !process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      }
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  // 5. Global Rate Limiting on API endpoints
  app.use('/api', (req, res, next) => {
    const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();
    const check = globalApiRateLimiter.check(clientIp);
    res.setHeader('X-RateLimit-Limit', '150');
    res.setHeader('X-RateLimit-Remaining', check.remaining.toString());

    if (!check.allowed) {
      const retryAfter = Math.max(1, Math.ceil((check.resetTime - Date.now()) / 1000));
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de requisições excedido. Por favor, aguarde alguns instantes.',
        retryAfter
      });
    }

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

  // API Proxy to internal router with Security Headers & Safe Error Leakage prevention
  app.all(['/api', '/api/*'], async (req, res) => {
    const urlPath = req.path;
    const method = req.method;
    const body = req.body;
    const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();

    try {
      const result = await handleApiRequest(urlPath, method, body, req.headers, clientIp);
      res.status(result.status).json(result.data);
    } catch (error: any) {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      auditLogger.log('AUTH_LOGIN_FAILURE', {
        ip: clientIp,
        path: urlPath,
        method,
        details: { requestId, error: error?.message || String(error) }
      });

      // OWASP: Never leak stack traces, internal paths, or raw database messages to clients
      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocorreu um erro interno ao processar a solicitação.',
        requestId
      });
    }
  });

  // Explicit safety catch for any API subroute to avoid serving index.html as JSON
  app.all('/api*', (_req, res) => {
    res.status(404).json({
      code: 'ROUTE_NOT_FOUND',
      message: 'Endpoint da API não encontrado.'
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
