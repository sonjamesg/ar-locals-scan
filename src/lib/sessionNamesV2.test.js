import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {formatHM} from './sessions.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const sp=readFileSync(join(root,'src/components/SessionsPanel.jsx'),'utf8');
const css=readFileSync(join(root,'src/styles.css'),'utf8');
const names=sp.slice(sp.indexOf('function SessionNames'),sp.indexOf('function SessionRow'));
describe('session names v2',()=>{
  it('synced time is HH:MM (no seconds), London',()=>{assert.equal(formatHM('2026-11-10T09:45:12Z'),'09:45');assert.equal(formatHM('2026-07-01T08:05:59Z'),'09:05');});
  it('header says "Synced HH:MM"',()=>{assert.match(names,/Synced \{when\}/);assert.match(names,/formatHM\(group\.captured_at\)/);});
  it('vertical list, one clickable row per name with type tag',()=>{
    assert.match(names,/<ol className="sess-names-list">/);
    assert.match(names,/sess-name-txt">\{a\.name\}/);
    assert.match(names,/a\.child\?'Child':'Adult'/);
    assert.match(names,/onSearchName&&onSearchName\(q\)/);
    assert.match(css,/\.sess-names-list\{[^}]*flex-direction:column/);
    assert.match(css,/\.sess-name-type\{[^}]*margin-left:auto/);
  });
  it('short muted disclaimer',()=>{assert.match(names,/Names from Bookwhen · not verified Locals/);assert.doesNotMatch(names,/Possible member/);});
  it('session time is larger with a clock icon',()=>{assert.match(sp,/sess-when"><IconClock\/>/);assert.match(css,/\.sess-when\{[^}]*font:700 14px/);});
});
