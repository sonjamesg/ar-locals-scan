import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renewalInfo,relDays} from './renewal.js';
import {friendlyVisit} from './visits.js';

const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const members=readFileSync(join(root,'src/components/Members.jsx'),'utf8');
const sel=members.slice(members.indexOf('export function Selected'),members.indexOf('export function UnlinkCard'));
const vs=readFileSync(join(root,'src/components/VisitStats.jsx'),'utf8');
const css=readFileSync(join(root,'src/styles.css'),'utf8');
const NOW=Date.parse('2026-11-10T09:00:00Z');

describe('renewalInfo',()=>{
  it('prefers Bookwhen renewal; far date is ok tone',()=>{
    const r=renewalInfo({bw_renews_at:'2027-03-06',membership_ends_at:'2027-03-06'},NOW);
    assert.equal(r.source,'bookwhen'); assert.equal(r.tone,'ok'); assert.equal(r.label,'Renews 6 Mar 2027'); assert.equal(r.rel,'in 4 months');
    assert.equal(r.endsDiffers,false);
  });
  it('within 30 days is soon, past is expired',()=>{
    assert.equal(renewalInfo({bw_renews_at:'2026-11-25'},NOW).tone,'soon');
    assert.equal(renewalInfo({bw_renews_at:'2026-11-25'},NOW).rel,'in 15 days');
    const x=renewalInfo({bw_renews_at:'2026-11-01'},NOW); assert.equal(x.tone,'expired'); assert.equal(x.rel,'9 days ago');
  });
  it('shows ends only when it differs; falls back to ends date',()=>{
    const r=renewalInfo({bw_renews_at:'2027-03-06',membership_ends_at:'2027-11-10'},NOW);
    assert.equal(r.endsDiffers,true); assert.match(r.endsLabel,/10 Nov 2027/);
    const e=renewalInfo({membership_ends_at:'2027-01-01'},NOW); assert.equal(e.source,'ends'); assert.match(e.label,/^Valid until 1 Jan 2027/);
    assert.equal(renewalInfo({},NOW),null);
  });
  it('relDays',()=>{assert.equal(relDays(0),'today');assert.equal(relDays(1),'in 1 day');assert.equal(relDays(400),'in 13 months');});
});

describe('friendlyVisit',()=>{
  it('omits the year this year, London time',()=>{
    assert.equal(friendlyVisit('2026-11-06T16:55:00Z',new Date(NOW)),'6 Nov, 16:55');
    assert.equal(friendlyVisit('2025-07-01T09:05:00Z',new Date(NOW)),'1 Jul 2025, 10:05');
  });
});

describe('member detail v3 layout',()=>{
  it('square profile tile with a person icon (no initials circle)',()=>{
    assert.match(sel,/md-tile-avatar[\s\S]*?<IconUser\/>/);
    assert.doesNotMatch(sel,/md-avatar"/);
    assert.match(css,/\.md-tile-avatar\{[^}]*border-radius:16px/);
  });
  it('name inputs live in the header only (no duplicate name form below)',()=>{
    assert.match(sel,/showInputs=editable&&\(!name\|\|editing\)/);
    assert.equal((sel.match(/placeholder="First name"/g)||[]).length,1);
    assert.doesNotMatch(sel,/className="name-edit"/);
    assert.match(sel,/aria-label="Edit name"/);
  });
  it('key facts: status, card number, prominent renewal; no separate Ends chip',()=>{
    assert.match(sel,/md-fact-status/); assert.match(sel,/md-fact-card[\s\S]*?h\.card_barcode\?/); assert.match(sel,/md-fact-renew/);
    assert.doesNotMatch(sel,/>Ends \{h\.membership_ends_at\}/);
    assert.match(css,/\.md-renew-date\{[^}]*font:800 20px/);
  });
  it('Check user sits in a closed Advanced section',()=>{
    assert.match(sel,/<details className="md-adv"><summary>[\s\S]*?Advanced[\s\S]*?<CheckUser /);
    assert.doesNotMatch(sel,/<details className="md-adv" open/);
    const before=sel.slice(0,sel.indexOf('<details'));
    assert.doesNotMatch(before,/<CheckUser/);
  });
  it('Bookwhen links are secondary buttons',()=>{assert.match(sel,/md-links[\s\S]*?btn ghost sm[\s\S]*?Memberships/);});
  it('gym visits use icon tiles + friendly last visit, no raw date list',()=>{
    assert.match(vs,/IconCalendarCheck/); assert.match(vs,/IconLogIn/); assert.match(vs,/IconClock/);
    assert.match(vs,/Last visit <b>\{friendlyVisit\(st\.last_visit_at\)\}/);
    assert.doesNotMatch(vs,/visit-hist/);
    assert.match(vs,/slice\(1,6\)/);
  });
  it('responsive facts grid',()=>{assert.match(css,/@media \(max-width:720px\)\{\s*\.md-facts\{grid-template-columns:1fr 1fr\}/);});
});

describe('Re-sync names is visible in the sessions header',()=>{
  const sp=readFileSync(join(root,'src/components/SessionsPanel.jsx'),'utf8');
  it('button sits in .sess-head beside Refresh, before the scroll list',()=>{
    const head=sp.slice(sp.indexOf('<div className="sess-head">'),sp.indexOf('<div className="sess-scroll">'));
    assert.match(head,/onClick=\{reSyncAttendees\}[\s\S]*?Re-sync names[\s\S]*?Refresh/);
    assert.match(head,/\{syncErr&&<div className="err md-err" role="alert">/);
    const scroll=sp.slice(sp.indexOf('<div className="sess-scroll">'),sp.indexOf('<div className="sess-foot">'));
    assert.doesNotMatch(scroll,/reSyncAttendees/);
  });
  it('still button-only: only the button calls it',()=>{assert.equal((sp.match(/reSyncAttendees/g)||[]).length,2);assert.match(sp,/async function reSyncAttendees\(/);assert.match(sp,/onClick=\{reSyncAttendees\}/);});
});
