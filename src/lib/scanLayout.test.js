import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const css=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../styles.css'),'utf8');
const panel=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../components/SessionsPanel.jsx'),'utf8');

describe('scan layout — sessions must not stretch status below fold',()=>{
  it('desktop starts columns at top; scan-card is content-sized not 100% row height',()=>{
    assert.match(css,/\.scan-layout\{[^}]*align-items:start/);
    assert.match(css,/\.scan-card\{[^}]*height:auto/);
    assert.doesNotMatch(css,/\.scan-layout\{[^}]*align-items:stretch/);
    assert.doesNotMatch(css,/\.scan-card\{[^}]*height:100%/);
  });
  it('sessions panel is height-capped with internal scroll on desktop',()=>{
    assert.match(css,/\.sess-panel\{[^}]*max-height:min\(58vh,520px\)/);
    assert.match(css,/\.sess-scroll\{[^}]*overflow-y:auto/);
  });
  it('mobile lets sessions flow naturally without forced cap',()=>{
    assert.match(css,/@media\(max-width:900px\)\{[\s\S]*?\.sess-panel\{[^}]*max-height:none/);
  });
  it('SessionsPanel uses compact upcoming preview + expand',()=>{
    assert.match(panel,/UPCOMING_PREVIEW\s*=\s*3/);
    assert.match(panel,/visibleUpcoming/);
    assert.match(panel,/Show \{preview\.hidden\} more upcoming/);
  });
});
