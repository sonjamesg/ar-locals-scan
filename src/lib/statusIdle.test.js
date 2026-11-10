import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const card=readFileSync(join(here,'../components/StatusCard.jsx'),'utf8');
const css=readFileSync(join(here,'../styles.css'),'utf8');
describe('idle Ready to scan panel',()=>{
  it('centred icon, heading and subtext',()=>{
    assert.match(card,/st-idle-icon/);
    assert.match(card,/IconBarcode/);
    assert.match(card,/Ready to scan/);
    assert.match(css,/\.status\.idle\{[^}]*align-items:center[^}]*text-align:center/);
  });
  it('keeps natural height (no flex grow) and respects reduced motion',()=>{
    assert.match(css,/\.scan-card>\.status\{flex:0 0 auto/);
    assert.match(css,/prefers-reduced-motion:reduce/);
  });
});
