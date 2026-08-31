const fs = require('fs');

const path = 'src/server/apiRouter.ts';
let code = fs.readFileSync(path, 'utf8');

const importStatement = "\nimport { registry } from './connectors/ConnectorRegistry';\n";

if (!code.includes('import { registry }')) {
  // Inject after the last import
  code = code.replace(/(import .*;\n)(?=(?:.|\n)*\/\/\sIn-memory session store)/, "$1" + importStatement);
}

const connectorRoutes = `
    // 12.1 Connectors API - List
    if (path === '/api/connectors/list' && method === 'GET') {
      return {
        status: 200,
        data: { connectors: registry.listAvailable() }
      };
    }

    // 12.2 Connectors API - Auth
    if (path === '/api/connectors/auth' && method === 'POST') {
      try {
        const { connectorId, credentials } = body;
        const connector = registry.get(connectorId);
        const result = await connector.authenticate(credentials);
        return {
          status: 200,
          data: { success: result }
        };
      } catch (err: any) {
        return {
          status: 400,
          data: { error: err.message }
        };
      }
    }

    // 12.3 Connectors API - Sync
    if (path === '/api/connectors/sync' && method === 'POST') {
      try {
        const { connectorId, config } = body;
        const connector = registry.get(connectorId);
        const result = await connector.sync(config);
        
        if (result.success) {
          // Merge to unified dataset for MMM
          if (!state.dataset) {
             state.dataset = {
               rows: [],
               columns: [],
               mappings: [],
               isSynthetic: false
             };
          }
          // Normally we'd merge by date and channel. For now we append and sort.
          // Note: In real app, we handle full union of keys.
          result.rows.forEach(r => {
             const anyR = r as any;
             state.dataset!.rows.push(anyR);
          });
          
          // Re-infer mappings and validation
          if (state.dataset.rows.length > 0) {
            state.dataset.columns = Array.from(new Set(state.dataset.rows.flatMap(Object.keys)));
            state.dataset.mappings = inferColumnMappings(state.dataset.columns, state.dataset.rows as unknown as DataRow[]);
          }
        }

        return {
          status: result.success ? 200 : 400,
          data: result
        };
      } catch (err: any) {
        return {
          status: 500,
          data: { error: err.message }
        };
      }
    }
`;

if (!code.includes('/api/connectors/list')) {
  code = code.replace(/\/\/\s13\.\sSecure Google OAuth/, connectorRoutes + '\n    // 13. Secure Google OAuth');
}

fs.writeFileSync(path, code);
