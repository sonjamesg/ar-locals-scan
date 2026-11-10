import {describe,it} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const src=readFileSync(join(root,'components/LostPanel.jsx'),'utf8');const css=readFileSync(join(root,'styles.css'),'utf8');
const pend=src.slice(src.indexOf('export function PendingPanel'));
describe('Pending cards v2',()=>{
  it('title has count badge and one-line subtitle, no em dash',()=>{
    assert.match(pend,/<h2>Pending cards\{rows&&<span className="pend-count"/);
    assert.match(pend,/New members waiting for a physical card/);
    assert.doesNotMatch(pend.slice(0,pend.indexOf('PendingEmpty')),/Pending cards —/);
  });
  it('rows are bordered cards with Card pending chip by the name',()=>{
    assert.match(pend,/<li className="pend-row">/);
    assert.match(pend,/pend-name-row"><NewBadge h=\{h\}\/><span className="pend-name"[^]*Card pending<\/span>/);
    assert.match(css,/\.pend-row\{[^}]*border:1\.5px solid var\(--line\);border-radius:14px/);
  });
  it('actions in one row: Bookwhen, Memberships, primary Link card, subtle X with tooltip',()=>{
    const acts=pend.slice(pend.indexOf('className="pend-acts"'));
    const iB=acts.indexOf('>Bookwhen '),iM=acts.indexOf('>Memberships '),iL=acts.indexOf('Link card</button>'),iX=acts.indexOf('className="pend-x" title="Remove from list"');
    assert.ok(iB>0&&iB<iM&&iM<iL&&iL<iX);
    assert.match(acts,/btn primary pend-link" onClick=\{onLink\}/);
    assert.match(css,/\.pend-acts\{display:flex;align-items:center;gap:8px;flex-wrap:nowrap\}/);
  });
  it('drops ends line when it equals the Bookwhen renewal',()=>{
    assert.match(src,/export function pendingEnds\(h\)[^]*bw_renews_at[^]*===String\(e\)\.slice\(0,10\)\)return null/);
  });
  it('keeps existing behaviour: link_card then mark_card_issued; X = mark_card_issued',()=>{
    assert.match(pend,/rpc\('link_card',\{p_barcode:b,p_member_id:sel\.id\}\);if\(!error\)await sb\.rpc\('mark_card_issued'/);
    assert.match(pend,/async function clear\(h\)\{const\{error\}=await sb\.rpc\('mark_card_issued'/);
    assert.match(pend,/onClear=\{\(\)=>clear\(h\)\}/);
  });
  it('friendly empty state',()=>{assert.match(src,/function PendingEmpty[^]*All caught up/);});
});
describe('Pending cards v2.1 alignment',()=>{
  it('fixed grid columns and placeholder slots',()=>{
    assert.match(css,/\.pend-row\{grid-template-columns:minmax\(0,1fr\) 222px 418px\}/);
    assert.match(css,/\.pend-acts\{display:grid;grid-template-columns:110px 128px 128px 34px/);
    assert.match(pend,/<span className="hit-slot hit-slot-renew"><RenewChip h=\{h\}\/><\/span>/);
    assert.match(pend,/pend-slot-ms">\{h\.bookwhen_customer_id\?<a[^]*:<span className="btn ghost pend-sec pend-sec-off" aria-disabled="true"/);
  });
  it('no underline on secondary links',()=>{assert.match(css,/\.pend-acts a\.pend-sec,\.pend-acts a\.pend-sec:hover,\.pend-acts a\.pend-sec:focus\{text-decoration:none\}/);});
});
