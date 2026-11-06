import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const css=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../styles.css'),'utf8');
const panel=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../components/SessionsPanel.jsx'),'utf8');

describe('scan layout — independent natural height',()=>{
  it('columns top-aligned; scan-card not stretched to sessions',()=>{
    assert.match(css,/\.scan-layout\{[^}]*align-items:start/);
    assert.match(css,/\.scan-card\{[^}]*height:auto/);
    assert.match(css,/\.scan-card\{[^}]*align-self:start/);
    assert.doesNotMatch(css,/\.scan-layout\{[^}]*align-items:stretch/);
    assert.doesNotMatch(css,/\.scan-card\{[^}]*height:100%/);
  });
  it('status never flex-grows (idle/unknown/valid stay content height)',()=>{
    assert.match(css,/\.scan-card>\.status\{[^}]*flex:0 0 auto/);
    assert.doesNotMatch(css,/\.scan-card>\.status\{[^}]*flex:1/);
    assert.match(css,/\.status\{[^}]*height:auto/);
    assert.match(css,/\.status\{[^}]*align-items:flex-start/);
  });
  it('sessions capped with internal scroll; upcoming compact',()=>{
    assert.match(css,/\.sess-panel\{[^}]*max-height:min\(58vh,520px\)/);
    assert.match(css,/\.sess-scroll\{[^}]*overflow-y:auto/);
    assert.match(panel,/UPCOMING_PREVIEW\s*=\s*3/);
    assert.match(panel,/visibleUpcoming/);
  });
});
