import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseAttendancesHtml,headerMap,registerReady,looksLoggedOutAttendances,parseAttendedMarker} from '../../extension/parseAttendances.js';
import {extVersionAtLeast,MIN_SYNC_EXT,attendeesForEvent} from './attendeeSync.js';

const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const fix=readFileSync(join(root,'extension/fixtures/attendances-bookwhen-2026.html'),'utf8');
const href='https://atlanticreach.bookwhen.com/events/ev-test-20261110103000/attendances';
const bg=readFileSync(join(root,'extension/background.js'),'utf8');
const manifest=JSON.parse(readFileSync(join(root,'extension/manifest.json'),'utf8'));

describe('live Bookwhen register markup (sanitised fixture)',()=>{
  it('fixture keeps the real sortable headers with raw "click->" attributes (the v1.2.0 failure)',()=>{
    assert.match(fix,/data-action="click->/);
    assert.match(fix,/class="full_name table-sort-header"/);
  });
  it('finds Booking / Attended / Name columns despite button+svg headers',()=>{
    const t=/<table\b[\s\S]*?<\/table>/i.exec(fix)[0];
    const {idx}=headerMap(t);
    assert.equal(idx.booking,0); assert.equal(idx.attended,1); assert.equal(idx.name,2);
  });
  it('parses all 5 names, matching the footer count',()=>{
    const r=parseAttendancesHtml(fix,href);
    assert.equal(r.error,undefined);
    assert.equal(r.event_id,'ev-test-20261110103000');
    assert.equal(r.row_count,5); assert.equal(r.footer_count,5); assert.equal(r.incomplete,false);
    assert.deepEqual(r.attendees.map(a=>a.name),['Alex Example','Sam Example','Jordan Sample','Riley Demo','Casey Fixture']);
    assert.ok(r.attendees.every(a=>a.identity==='name_only'&&a.email===null&&/^bkfake\d+$/.test(a.booking_id)));
    assert.ok(r.attendees.every(a=>a.attended==='unknown'));
  });
  it('also parses when Chrome escapes > in attributes',()=>{
    const r=parseAttendancesHtml(fix.replace(/click->/g,'click-&gt;'),href);
    assert.equal(r.row_count,5);
  });
  it('reads checked tri-state attended radio',()=>{
    assert.equal(parseAttendedMarker('<input type="radio" value="yes" checked="checked" /><input type="radio" value="unknown" />'),'yes');
    assert.equal(parseAttendedMarker('<input type="radio" value="yes" /><input type="radio" value="no" checked />'),'no');
  });
  it('register page is ready and not mistaken for a sign-in page',()=>{
    assert.equal(registerReady(fix),true);
    assert.equal(looksLoggedOutAttendances(fix),false);
    assert.equal(looksLoggedOutAttendances('<form><input name="password"> Log in</form>'),true);
    assert.equal(registerReady('<div id="loading"></div>'),false);
  });
  it('fixture contains no email addresses',()=>{assert.doesNotMatch(fix,/[\w.+-]+@[\w-]+\.[\w.]+/);});
});

describe('extension v1.2.1 sync behaviour',()=>{
  it('manifest is 1.2.2; app still accepts 1.2.1',()=>{assert.equal(manifest.version,'1.2.2');assert.equal(MIN_SYNC_EXT,'1.2.1');});
  it('version compare',()=>{
    assert.equal(extVersionAtLeast('1.2.0','1.2.1'),false);
    assert.equal(extVersionAtLeast('1.2.1','1.2.1'),true);
    assert.equal(extVersionAtLeast('1.10.0','1.2.1'),true);
    assert.equal(extVersionAtLeast(true,'1.2.1'),false);
  });
  it('attaches the load listener before navigating and ignores about:blank completion',()=>{
    const nav=/function navigate[\s\S]*?\n}\n/.exec(bg)[0];
    assert.ok(nav.indexOf('onUpdated.addListener')<nav.indexOf('chrome.tabs.update'));
    assert.match(nav,/onTarget\(tab\?\.url\)/);
  });
  it('waits for the register to render',()=>{assert.match(bg,/registerReady\(page\[1\]\)/);});
  it('never aborts the batch: login failure marks remaining sessions failed',()=>{
    const fn=/async function syncAttendances[\s\S]*?\n}\n/.exec(bg)[0];
    assert.doesNotMatch(fn,/\bbreak\b/);
    assert.match(fn,/if \(loginError\) return fail\(ev, id, loginError\)/);
  });
  it('failed snapshot exposes its reason to the session row',()=>{
    const g=attendeesForEvent([{event_id:'ev-a-20261110103000',status:'failed',error:'Bookwhen took too long'}],'ev-a-20261110103000');
    assert.equal(g.failed,true); assert.equal(g.error,'Bookwhen took too long');
  });
  it('sync stays button-only and read-only (no attendance writes)',()=>{
    assert.doesNotMatch(bg,/set_attendance|update_all|method:\s*['"](POST|PUT|PATCH)/i);
    const sp=readFileSync(join(root,'src/components/SessionsPanel.jsx'),'utf8');
    assert.doesNotMatch(sp,/useEffect\([^)]*reSyncAttendees/);
  });
});
