const fs = require('fs');
const path = 'src/components/integration/Connectors.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /<ConnectSourceModal\s*source=\{selectedSourceForModal\}/,
  '<ConnectSourceModal\n          source={selectedSourceForModal}\n          isOpen={true}'
);

fs.writeFileSync(path, code);
