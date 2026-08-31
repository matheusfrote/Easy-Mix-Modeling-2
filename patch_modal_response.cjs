const fs = require('fs');
const path = 'src/components/integration/ConnectSourceModal.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /onConnectedSuccess\(instance\);\n\s*onClose\(\);/g,
  'onConnectedSuccess(instance, syncData.dataset);\n        onClose();'
);

fs.writeFileSync(path, code);
