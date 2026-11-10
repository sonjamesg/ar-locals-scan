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
  it('vertical list, one clickable row per name (names only)',()=>{
    assert.match(names,/<ol className="sess-names-list">/);
    assert.match(names,/sess-name-txt">\{a\.name\}/);
    assert.doesNotMatch(names,/Child|Adult|ticket|sess-ticket|sess-name-type/i);
    assert.match(names,/onSearchName&&onSearchName\(q\)/);
    assert.match(css,/\.sess-names-list\{[^}]*flex-direction:column/);
    assert.doesNotMatch(css,/\.sess-ticket|\.sess-name-type/);
  });
  it('short muted disclaimer',()=>{assert.match(names,/Names from Bookwhen · not verified Locals/);assert.doesNotMatch(names,/Possible member/);});
  it('session time is larger with a clock icon',()=>{assert.match(sp,/sess-when"><IconClock\/>/);assert.match(css,/\.sess-when\{[^}]*font:700 14px/);});
});

import {namesOnly,mergeSnapshots} from './attendeeSync.js';
import {parseAttendancesHtml} from '../../extension/parseAttendances.js';
describe('names only (ticket choice is trust-based)',()=>{
  it('older/newer extension payloads with tickets are stripped to names',()=>{
    const fix=readFileSync(join(root,'extension/fixtures/attendances-bookwhen-2026.html'),'utf8');
    const r=parseAttendancesHtml(fix,'https://atlanticreach.bookwhen.com/events/ev-test-20261110103000/attendances');
    assert.ok(r.attendees.length>0&&r.attendees.some(a=>a.ticket));
    const snap={event_id:'ev1',status:'ok',attendees:r.attendees};
    const merged=mergeSnapshots([{event_id:'ev0',attendees:[{name:'Test Person',ticket:'LOCALS CARD Child - £5.00'}]}],snap);
    for(const s of merged)for(const a of s.attendees){assert.equal(a.ticket,undefined);assert.ok(a.name);}
    assert.deepEqual(namesOnly({event_id:'x',attendees:[{name:'Fake Name',ticket:'LEISURE PASS',price:'£0'}]}).attendees,[{name:'Fake Name'}]);
    assert.equal(namesOnly(null),null);
  });
  it('no ticket helper or badges left in the desk',()=>{
    const lib=readFileSync(join(root,'src/lib/attendeeSync.js'),'utf8');
    assert.doesNotMatch(lib,/export function ticketInfo/);
    assert.doesNotMatch(sp,/ticketInfo|sess-ticket|Locals Card<\/span>|Leisure Pass/);
  });
});

describe('sessions panel v3 layout',()=>{
  const main=readFileSync(join(root,'src/main.jsx'),'utf8');
  it('Quick help removed',()=>{assert.doesNotMatch(main,/Quick help|help-panel/);assert.doesNotMatch(css,/\.help-panel|\.help-list/);});
  it('no always-on Updated / Names not synced lines; warnings only when wrong',()=>{
    assert.doesNotMatch(sp,/>Updated \{formatAsOf/);
    assert.doesNotMatch(sp,/Names not synced/);
    assert.match(sp,/\(showingStale\|\|\(asOf&&fresh\.stale\)\)&&<div className="sess-warn"/);
    assert.match(sp,/\{sum\.ok>0&&<div className="muted sess-att-asof">/);
  });
  it('one short subtitle and a taller panel',()=>{
    assert.match(sp,/<p className="muted sess-sub">Live Bookwhen schedule<\/p>/);
    assert.match(css,/\.sess-panel\{max-height:min\(78vh,900px\)/);
  });
});
