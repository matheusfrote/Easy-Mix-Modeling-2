const fs = require('fs');
const path = 'src/components/DataUploadView.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace the scattered catalog imports with Connectors import
if (!code.includes('import { Connectors }')) {
  code = code.replace(
    /import \{ IntegrationCatalog \}.*?import \{ ConnectedSourcesSection \}[^\n]*\n/s,
    "import { Connectors } from './integration/Connectors';\n"
  );
}

// Replace the rendered sections
code = code.replace(
  /<ConnectedSourcesSection[\s\S]*?<IntegrationCatalog[\s\S]*?\/>\s*<\/div>/,
  `<Connectors 
            connectedSources={connectedSources}
            onConnectedSuccess={handleConnectedSuccess}
            onDisconnect={handleDisconnectSource}
          />
        </div>`
);

fs.writeFileSync(path, code);
