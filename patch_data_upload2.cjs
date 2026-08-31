const fs = require('fs');
const path = 'src/components/DataUploadView.tsx';
let code = fs.readFileSync(path, 'utf8');

// Remove ConnectSourceModal from the bottom of DataUploadView
code = code.replace(
  /\s*\{\/\* Connect Source Modal \*\/\}[\s\S]*?\{selectedSourceForModal && \([\s\S]*?<\/[a-zA-Z]+>\s*\)\}\s*<\/div>\s*\);\s*\};\s*$/,
  `\n    </div>\n  );\n};\n`
);

// We should also remove the selectedSourceForModal and isConnectModalOpen states
// but it's harmless if we don't. We'll leave them if they don't break anything.

fs.writeFileSync(path, code);
