import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';

interface DiagnosticResult {
  step: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  details?: unknown;
}

const results: DiagnosticResult[] = [];

function record(step: string, status: 'PASS' | 'WARN' | 'FAIL', message: string, details?: unknown) {
  results.push({ step, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${status}] ${step}: ${message}`);
  if (details && (status === 'FAIL' || status === 'WARN')) {
    console.log(`   Details:`, typeof details === 'string' ? details : JSON.stringify(details, null, 2));
  }
}

async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('🔍 Starting Vite & Dev Server Environment Diagnostics');
  console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
  console.log(`📂 Working Directory: ${process.cwd()}`);
  console.log('='.repeat(60) + '\n');

  // 1. Check Node.js runtime & Active Processes
  try {
    const nodeVersion = process.version;
    const processList = execSync('ps aux | grep -E "node|tsx|vite|bun" | grep -v grep', { encoding: 'utf-8' });
    const lineCount = processList.trim().split('\n').filter(Boolean).length;
    record(
      'Process & Runtime Check',
      'PASS',
      `Node.js ${nodeVersion} detected. ${lineCount} active process(es) running.`,
      processList.trim()
    );
  } catch (err: any) {
    record('Process & Runtime Check', 'WARN', 'Could not query process table via ps', err.message);
  }

  // 2. Validate node_modules and Essential Dependencies
  const essentialPkgs = [
    'vite',
    'express',
    '@vitejs/plugin-react',
    '@tailwindcss/vite',
    'dotenv',
    'tsx'
  ];

  let missingPkgs: string[] = [];
  for (const pkg of essentialPkgs) {
    const pkgPath = path.resolve(process.cwd(), 'node_modules', pkg);
    if (!fs.existsSync(pkgPath)) {
      missingPkgs.push(pkg);
    }
  }

  if (missingPkgs.length === 0) {
    record('node_modules Integrity', 'PASS', `All ${essentialPkgs.length} core dependencies exist in node_modules.`);
  } else {
    record(
      'node_modules Integrity',
      'FAIL',
      `Missing core dependencies in node_modules: ${missingPkgs.join(', ')}`,
      missingPkgs
    );
  }

  // 3. Manual Verification of 'src/server/apiRouter' Import
  try {
    const apiRouterPath = path.resolve(process.cwd(), 'src/server/apiRouter.ts');
    if (!fs.existsSync(apiRouterPath)) {
      record('API Router Module Check', 'FAIL', `File not found at ${apiRouterPath}`);
    } else {
      const apiModule = await import('../src/server/apiRouter');
      if (typeof apiModule.handleApiRequest === 'function') {
        // Probe test dispatch to /api/health
        const mockHealthResult = await apiModule.handleApiRequest('/api/health', 'GET', {});
        record(
          'API Router Import & Handler',
          'PASS',
          `Successfully loaded 'src/server/apiRouter'. 'handleApiRequest' exported and functioning.`,
          mockHealthResult
        );
      } else {
        record(
          'API Router Import & Handler',
          'FAIL',
          `'src/server/apiRouter' imported, but 'handleApiRequest' is not an exported function.`
        );
      }
    }
  } catch (err: any) {
    record(
      'API Router Import & Handler',
      'FAIL',
      `Failed to import 'src/server/apiRouter': ${err?.message || String(err)}`,
      err?.stack || err
    );
  }

  // 4. Environment Variables Validation
  const apiUrl = process.env.VITE_API_URL;
  const geminiKey = process.env.GEMINI_API_KEY;
  const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;

  record(
    'Environment Variables Check',
    'PASS',
    `VITE_API_URL: ${apiUrl ? `"${apiUrl}"` : '(not set, using relative routing)'}, GEMINI_API_KEY: ${
      geminiKey ? '[SET]' : '(not set)'
    }, VITE_GOOGLE_CLIENT_ID: ${googleClientId ? '[SET]' : '(not set)'}`
  );

  // 5. Port 3000 Connectivity Probe
  await new Promise<void>((resolve) => {
    const req = http.get('http://127.0.0.1:3000/api/health', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          record(
            'HTTP Port 3000 Health Probe',
            'PASS',
            `Server responded with HTTP ${res.statusCode} on /api/health`,
            data
          );
        } else {
          record(
            'HTTP Port 3000 Health Probe',
            'WARN',
            `Server responded with non-200 status: ${res.statusCode}`,
            data
          );
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      record(
        'HTTP Port 3000 Health Probe',
        'WARN',
        `Could not reach http://127.0.0.1:3000/api/health directly: ${err.message}`
      );
      resolve();
    });

    req.setTimeout(2000, () => {
      req.destroy();
      record('HTTP Port 3000 Health Probe', 'WARN', 'HTTP probe timed out after 2000ms');
      resolve();
    });
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`📊 Diagnostic Summary: ${passCount} Passed, ${warnCount} Warnings, ${failCount} Failures`);
  console.log('='.repeat(60) + '\n');
}

runDiagnostics().catch((err) => {
  console.error('Diagnostic script execution error:', err);
  process.exit(1);
});
