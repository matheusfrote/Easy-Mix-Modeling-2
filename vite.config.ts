import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';

function validateApiUrl(apiUrl: string | undefined, logger?: { warn: (msg: string) => void }) {
  if (!apiUrl || typeof apiUrl !== 'string') {
    return;
  }

  const trimmed = apiUrl.trim();
  const logWarn = (message: string) => {
    if (logger?.warn) {
      logger.warn(message);
    } else {
      console.warn(message);
    }
  };

  // If path-based relative URL
  if (trimmed.startsWith('/')) {
    if (trimmed.length > 1 && trimmed.endsWith('/')) {
      logWarn(
        `[vite:env-validation] Warning: 'VITE_API_URL' has a trailing slash ("${apiUrl}"). ` +
        `Relative API requests might form double slashes.`
      );
    }
    return;
  }

  // Check for missing protocol (e.g. "localhost:3000" or "api.example.com")
  if (!/^https?:\/\//i.test(trimmed)) {
    logWarn(
      `\n⚠️  [vite:env-validation] Invalid 'VITE_API_URL' configuration: "${apiUrl}"\n` +
      `   Backend URL must include the protocol (e.g. 'http://localhost:3000' or 'https://api.example.com')\n` +
      `   or be a root-relative path (e.g. '/api').\n` +
      `   Please verify your .env / environment settings to avoid broken API requests.\n`
    );
    return;
  }

  // Parse and validate URL structure
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) {
      logWarn(
        `\n⚠️  [vite:env-validation] 'VITE_API_URL' ("${apiUrl}") is missing a valid hostname.\n` +
        `   Please verify the host configuration.\n`
      );
    }
    if (parsed.pathname && parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      logWarn(
        `[vite:env-validation] Notice: 'VITE_API_URL' ("${apiUrl}") ends with a trailing slash. ` +
        `Ensure frontend API client calls do not append duplicate slashes.`
      );
    }
  } catch (err: any) {
    logWarn(
      `\n⚠️  [vite:env-validation] Malformed 'VITE_API_URL' ("${apiUrl}"): ${err?.message || String(err)}\n` +
      `   Please supply a valid URL format (e.g. 'http://localhost:3000').\n`
    );
  }
}

function apiPlugin(options?: { apiUrl?: string }): Plugin {
  const apiUrl = options?.apiUrl;

  return {
    name: 'meridian-api-server',
    buildStart() {
      validateApiUrl(apiUrl);
    },
    configureServer(server) {
      // Validate VITE_API_URL on dev server initialization
      validateApiUrl(apiUrl, server.config.logger);

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        const [urlPath] = req.url.split('?');

        // Parse body for write requests with stream error protection
        let body: any = {};
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          try {
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const raw = Buffer.concat(buffers).toString('utf-8');
            if (raw.trim()) {
              try {
                body = JSON.parse(raw);
              } catch {
                body = raw;
              }
            }
          } catch (streamErr: any) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Failed to read request stream',
              details: streamErr?.message || String(streamErr)
            }));
            return;
          }
        }

        // Dynamically load the API router with error resilience and fallback
        let apiHandler: ((path: string, method: string, body: any) => Promise<{ status: number; data: any }>) | null = null;
        let importError: Error | null = null;

        try {
          const apiModule = await import('./src/server/apiRouter');
          if (typeof apiModule.handleApiRequest === 'function') {
            apiHandler = apiModule.handleApiRequest;
          } else {
            throw new Error("Export 'handleApiRequest' not found in './src/server/apiRouter'");
          }
        } catch (err: any) {
          importError = err instanceof Error ? err : new Error(String(err));
          // Log warning to dev server console without crashing process
          server.config.logger.error(
            `[vite:api-plugin] Failed to load backend API router ('./src/server/apiRouter'): ${importError.message}`,
            { error: importError }
          );
        }

        // Execute API router if loaded
        if (apiHandler) {
          try {
            const result = await apiHandler(urlPath, req.method || 'GET', body);
            res.statusCode = result.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result.data));
            return;
          } catch (handlerErr: any) {
            server.config.logger.error(
              `[vite:api-plugin] Error executing API handler for ${req.method} ${urlPath}: ${handlerErr?.message || handlerErr}`
            );
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Internal API error',
              message: handlerErr?.message || 'An unexpected error occurred while processing the API request.'
            }));
            return;
          }
        }

        // Fallback responder when apiRouter fails to import
        res.setHeader('Content-Type', 'application/json');
        if (urlPath === '/api/health') {
          res.statusCode = 200;
          res.end(JSON.stringify({
            status: 'degraded',
            mode: 'fallback',
            message: 'Dev server is running, but the backend API router failed to load.',
            importError: importError?.message || 'Module load error'
          }));
          return;
        }

        res.statusCode = 503;
        res.end(JSON.stringify({
          status: 'service_unavailable',
          code: 'ROUTER_IMPORT_FAILED',
          error: 'The backend routing module is temporarily unavailable.',
          details: importError?.message || 'Failed to dynamically import apiRouter',
          timestamp: new Date().toISOString()
        }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || process.env.VITE_API_URL;

  return {
    plugins: [react(), tailwindcss(), apiPlugin({ apiUrl })],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
