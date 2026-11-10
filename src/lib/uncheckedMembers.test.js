import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isUnchecked,isPurchaseUnchecked,isActiveChecked,filterMembers,cardLinkStatus} from './memberFilters.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const purchaseOld={id:'p1',email:'p1@example.test',bw_status:'ACTIVE',bw_checked_at:'2026-11-05T10:00:00Z',membership_ends_at:'2027-11-05',pending_card:true}; // fake ingest stamp
const purchaseNew={id:'p2',email:'p2@example.test',bw_status:'ACTIVE',bw_checked_at:null,membership_ends_at:'2027-11-10',pending_card:true};
const never={id:'n1',email:'n1@example.test',bw_status:null,bw_checked_at:null};
const checked={id:'c1',email:'c1@example.test',bw_status:'ACTIVE',bw_checked_at:'2026-11-04T10:00:00Z',bw_lcl:'LCL0001',bw_renews_at:'2027-03-01',card_barcode:'X1'};
const checkedNone={id:'c2',email:'c2@example.test',bw_status:'NONE',bw_checked_at:'2026-11-04T10:00:00Z'};
const cancelled={id:'x1',email:'x1@example.test',bw_status:'CANCELLED',cancelled_at:'2026-10-01'};
const rows=[purchaseOld,purchaseNew,never,checked,checkedNone,cancelled];
describe('unchecked members',()=>{
  it('purchase-email members: ACTIVE + Unchecked until a successful check',()=>{
    for(const r of [purchaseOld,purchaseNew]){assert.equal(isUnchecked(r),true);assert.equal(isPurchaseUnchecked(r),true);assert.equal(isActiveChecked(r),true);}
  });
  it('never-checked non-email members are Unchecked (not active)',()=>{assert.equal(isUnchecked(never),true);assert.equal(isPurchaseUnchecked(never),false);});
  it('a real check clears Unchecked (found subscription, or found none)',()=>{assert.equal(isUnchecked(checked),false);assert.equal(isUnchecked(checkedNone),false);assert.equal(isUnchecked(cancelled),false);});
  it('Unchecked filter includes both groups; Active includes paid purchase-email members',()=>{
    assert.deepEqual(filterMembers(rows,{status:'unchecked'}).map(r=>r.id),['p1','p2','n1']);
    assert.deepEqual(filterMembers(rows,{status:'active'}).map(r=>r.id),['p1','p2','c1']);
  });
  it('paid member without a card shows Card pending',()=>{assert.equal(cardLinkStatus(purchaseNew).label,'Card pending');assert.equal(cardLinkStatus(checked).label,'Card linked');});
  it('UI: Unchecked tag in rows/detail, Check user prominent, batch targets unchecked, scan hint',()=>{
    const m=readFileSync(join(root,'src/components/Members.jsx'),'utf8');
    assert.match(m,/hit-unchecked/); assert.match(m,/chip chip-unchecked/);
    assert.match(m,/isPurchaseUnchecked\(h\)\)return <span className="amc amc-st bw-ok"/);
    assert.match(m,/Card pending<\/span><span className="md-fact-sub">Needs a card/);
    const a=readFileSync(join(root,'src/components/AllMembersPanel.jsx'),'utf8');
    assert.match(a,/eligible\.filter\(isUnchecked\)/); assert.match(a,/\['unchecked',`Unchecked \(\$\{unchecked\}\)`\]/);
    assert.match(readFileSync(join(root,'src/components/StatusCard.jsx'),'utf8'),/res\.unchecked&&/);
  });
  it('ingest: paid → ACTIVE + provisional 12 months, never stamps bw_checked_at',()=>{
    const sql=readFileSync(join(root,'supabase/migrations/20261110103000_ingest_not_checked.sql'),'utf8');
    assert.match(sql,/v_email,true,'ACTIVE',null,current_date,\(current_date \+ interval '12 months'\)::date\)/);
    assert.doesNotMatch(sql,/bw_checked_at=now\(\)/);
  });
});
