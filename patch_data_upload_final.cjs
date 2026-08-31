const fs = require('fs');
const path = 'src/components/DataUploadView.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /\{\/\* Connect Source Modal \*\/\}[\s\S]*?<\/div>\s*\);\s*\};\s*$/;
code = code.replace(regex, '</div>\n  );\n};\n');

fs.writeFileSync(path, code);
