const fs = require('fs');
const path = 'src/server/apiRouter.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `
          // Re-infer mappings and validation
          let validation = null;
          let readiness = null;
          if (state.dataset.rows.length > 0) {
            state.dataset.columns = Array.from(new Set(state.dataset.rows.flatMap(Object.keys)));
            state.dataset.mappings = inferColumnMappings(state.dataset.columns, state.dataset.rows as unknown as DataRow[]);
            validation = validateDataset(state.dataset.rows as unknown as DataRow[], state.dataset.mappings);
            readiness = calculateDataReadinessScore(state.dataset.rows as unknown as DataRow[], state.dataset.mappings, validation);
          }
          
          result.dataset = {
            rows: state.dataset.rows,
            columns: state.dataset.columns,
            mappings: state.dataset.mappings,
            validation,
            readiness,
            isSynthetic: false
          };
`;

code = code.replace(/if \(state\.dataset\.rows\.length > 0\) \{([\s\S]*?)\}/, replacement);
fs.writeFileSync(path, code);
