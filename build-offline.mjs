import fs from 'node:fs';
const files=['chemistry','data','curriculum','ui','simulations','extra-tools','auth-ui','assembly','sandbox','app'];
const js=files.map(name=>fs.readFileSync(`dist/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
const html=fs.readFileSync('dist/index.html','utf8').replace('<link rel="stylesheet" href="style.css">',()=>`<style>${fs.readFileSync('dist/style.css','utf8')}</style>`).replace('<script type="module" src="app.js"></script>',()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`).replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','');
fs.writeFileSync('dist/Chemlab.html',html);
console.log('Created dist/Chemlab.html — double-click to open offline.');
