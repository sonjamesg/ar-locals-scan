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
