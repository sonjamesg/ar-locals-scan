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

describe('aligned member list rows',()=>{
  const all=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../components/AllMembersPanel.jsx'),'utf8');
  const css=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../styles.css'),'utf8');
  it('All members and Search Users use fixed column cells',()=>{
    assert.match(members,/export function MemberRowCells/);
    assert.match(members,/hit-col-card/);
    assert.match(members,/hit-col-new/);
    assert.match(members,/hit-col-status/);
    assert.match(members,/className="hit hit-grid"/);
    assert.match(all,/className="hit hit-grid"/);
    assert.match(all,/MemberRowCells/);
  });
  it('BwChips emits fixed slots so status/renew/checked align',()=>{
    for(const k of ['flag','status','renew','ago']) assert.match(members,new RegExp("slot\\('"+k+"'"));
  });
  it('grid columns fixed and names ellipsis',()=>{
    assert.match(css,/\.hit\.hit-grid\{display:grid;grid-template-columns:minmax\(0,1fr\) 118px 56px 408px/);
    assert.match(css,/text-overflow:ellipsis/);
    assert.match(css,/\.hit-col-status \.am-chips\{display:grid/);
  });
});
