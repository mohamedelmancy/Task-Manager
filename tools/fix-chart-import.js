const fs = require('fs');
const path = require('path');

const chartDist = path.join(__dirname, 'node_modules/chart.js/dist');
const colorPackage = path.join(__dirname, 'node_modules/@kurkle/color');
const files = ['chart.js', 'helpers.js', 'chunks/index.js'];

for (const file of files) {
  const fullPath = path.join(chartDist, file);
  const relativePath = path.relative(path.dirname(fullPath), colorPackage).replaceAll('\\', '/');
  const source = fs.readFileSync(fullPath, 'utf8');
  const next = source
    .replaceAll("from '@kurkle/color'", `from '${relativePath}'`)
    .replaceAll("import '@kurkle/color'", `import '${relativePath}'`);

  if (next !== source) {
    fs.writeFileSync(fullPath, next);
  }
}
