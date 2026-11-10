import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const members=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../components/Members.jsx'),'utf8');
const filters=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'./memberFilters.js'),'utf8');
describe('list row card badge',()=>{
  it('MemberInfo shows CardLinkBadge beside name',()=>{
    assert.match(members,/hit-name-row/);
    assert.match(members,/CardLinkBadge/);
    assert.match(members,/card-link-badge/);
    assert.match(members,/card-linked/);
    assert.match(members,/card-unlinked/);
  });
  it('cardLinkStatus labels Card linked / Card unlinked',()=>{
    assert.match(filters,/Card linked/);
    assert.match(filters,/Card unlinked/);
  });
  it('BwChips list mode does not render bw_lcl chip',()=>{
    const bw=members.slice(members.indexOf('export function BwChips'), members.indexOf('export function MemberInfo'));
    assert.ok(!/h\.bw_lcl&&/.test(bw), 'list BwChips should not emit LCL chip');
  });
});

describe('aligned member list rows v2',()=>{
  const all=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../components/AllMembersPanel.jsx'),'utf8');
  const css=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../styles.css'),'utf8');
  it('[NEW] name inline | right group (status, card, renewal); no separate NEW column',()=>{
    const cells=members.slice(members.indexOf('export function MemberRowCells'));
    const iInfo=cells.indexOf('<MemberInfo h={h} badge={false} newBadge={newBadge}/>'),iS=cells.indexOf('hit-slot-status'),iC=cells.indexOf('hit-slot-card'),iR=cells.indexOf('hit-slot-renew');
    assert.ok(iInfo>0&&iInfo<iS&&iS<iC&&iC<iR);
    assert.doesNotMatch(cells.slice(0,cells.indexOf('export const NewBadge')),/hit-col-new/);
    assert.match(members,/<div className="hit-name-row">\{newBadge\}<span className="hit-name"/);
    assert.match(css,/\.hit-col-right\{grid-template-columns:118px 132px 96px\}/);
    assert.match(css,/\.hit-slot-card \.card-link-badge\{min-width:118px/);
    assert.match(members,/className="hit hit-grid"/);
    assert.match(all,/className="hit hit-grid"/);
    assert.match(all,/NewBadge/);
  });
  it('no trailing last-checked date in rows; single NEW',()=>{
    const chips=members.slice(members.indexOf('export function StatusChip'),members.indexOf('export function MemberInfo'));
    assert.doesNotMatch(chips,/amc-ago/);
    assert.doesNotMatch(chips,/>NEW</);
  });
  it('fixed right columns and ellipsis names',()=>{
    assert.match(css,/\.hit\.hit-grid\{display:grid;grid-template-columns:minmax\(0,360px\) 60px minmax\(0,1fr\)/);
    assert.match(css,/\.hit-col-right\{display:grid;grid-template-columns:120px 116px 96px/);
    assert.match(css,/text-overflow:ellipsis/);
  });
});

describe('member detail card number + back button',()=>{
  const css=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../styles.css'),'utf8');
  const fb=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../components/FeedbackPage.jsx'),'utf8');
  it('shows labelled Card number or No card linked',()=>{
    const sel=members.slice(members.indexOf('export function Selected'));
    assert.match(sel,/Card number/);
    assert.match(sel,/No card linked/);
    assert.match(sel,/h\.card_barcode\?/);
  });
  it('back buttons are solid navy with focus style',()=>{
    assert.match(members,/className="btn-back sel-back"/);
    assert.match(fb,/className="btn-back fb-back"/);
    assert.match(css,/\.btn-back\{[^}]*background:var\(--brand\);color:#fff/);
    assert.match(css,/\.btn-back:focus-visible/);
  });
});
