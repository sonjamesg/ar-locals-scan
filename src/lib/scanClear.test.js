import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');
describe('scan Clear button green',()=>{
  it('only scan result Clear uses success class',()=>{
    const main=read('main.jsx');
    assert.match(main,/className="btn success lg scan-clear"/);
    assert.match(main,/scan-clear"[\s\S]*?>Clear</);
    const add=read('components/AddMemberPanel.jsx');
    assert.doesNotMatch(add,/btn success[^>]*>Clear</);
  });
  it('CSS defines solid green success button',()=>{
    const css=read('styles.css');
    assert.match(css,/\.btn\.success[^}]*background:var\(--ok\)/);
    assert.match(css,/\.btn\.success[^}]*color:#fff/);
  });
});
