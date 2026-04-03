const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Replace hsl(H, S%, L%) with H S% L%
const newCssContent = cssContent.replace(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*([\d.]+%)\s*,\s*([\d.]+%)\s*\)/g, '$1 $2 $3')
    .replace(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*([\d.]+%)?\s*,\s*([\d.]+%)\s*\)/g, '$1 $2 $3'); // Handling potential missing cases if any

fs.writeFileSync(cssPath, newCssContent);
console.log('Successfully updated index.css HSL formats.');
