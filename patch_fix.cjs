const fs = require('fs');
const path = 'src/components/DataUploadView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /\{connectedSources\.length > 0 && \(\s*<Connectors\s*connectedSources=\{connectedSources\}\s*onConnectedSuccess=\{handleConnectedSuccess\}\s*onDisconnect=\{handleDisconnectSource\}\s*\/>\s*<\/div>/,
  `          <Connectors 
            connectedSources={connectedSources}
            onConnectedSuccess={handleConnectedSuccess}
            onDisconnect={handleDisconnectSource}
          />
        </div>`
);

fs.writeFileSync(path, code);
