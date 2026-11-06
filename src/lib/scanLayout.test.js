import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const css=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../styles.css'),'utf8');
describe('scan layout equal-height columns',()=>{
  it('desktop stretch + scan-card fills row; mobile restores natural height',()=>{
    assert.match(css,/\.scan-layout\{[^}]*align-items:stretch/);
    assert.match(css,/\.scan-card\{[^}]*display:flex[^}]*flex-direction:column/);
    assert.match(css,/\.scan-card>\.status\{[^}]*flex:1/);
    assert.match(css,/@media\(max-width:900px\)\{[\s\S]*?\.scan-layout\{[^}]*align-items:start/);
    assert.doesNotMatch(css,/\.scan-layout\{[^}]*align-items:start[^}]*1\.35fr/);
  });
});
