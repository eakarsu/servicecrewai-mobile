'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src');
const destination = path.join(root, 'dist');
const required = ['index.html', 'app.js', 'styles.css'];

for (const name of required) {
  const input = path.join(source, name);
  if (!fs.existsSync(input)) {
    throw new Error(`Missing required web asset: src/${name}`);
  }
}

fs.mkdirSync(destination, { recursive: true });
for (const name of required) {
  fs.copyFileSync(path.join(source, name), path.join(destination, name));
}

console.log(`Built ${required.length} bundled web assets in dist/`);
