const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const css=readFileSync(join(__dirname,'../styles.css'),'utf8');

test('painel de homologação mantém escala tipográfica legível',()=>{
 assert.match(css,/body\s*\{[^}]*font-size:\s*16px/);
 assert.match(css,/\.metric-label\s*\{[^}]*font-size:\s*13px/);
 assert.match(css,/\.criterion h3\s*\{[^}]*font-size:\s*15px/);
});
test('controles principais e filtros alcançam tamanho de toque confortável',()=>{
 assert.match(css,/\.btn\s*\{[^}]*min-height:\s*46px/);
 assert.match(css,/\.filters select\s*\{[^}]*min-height:\s*46px/);
 assert.match(css,/\.mobile-nav button\s*\{[^}]*min-height:\s*50px/);
});
test('estados de foco e telas estreitas permanecem contemplados',()=>{
 assert.match(css,/:where\(button,\s*a,\s*input,\s*select,\s*textarea\):focus-visible/);
 assert.match(css,/@media\s*\(max-width:\s*390px\)/);
 assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
