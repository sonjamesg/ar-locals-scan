import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {isLinked,isCancelled,cardCounts,filterMembers,matchStatus} from './memberFilters.js';

const rows=[
  {id:1,first_name:'Ada',last_name:'Lovelace',email:'ada@x.com',card_barcode:'604001',bw_status:'ACTIVE',cancelled_at:null,joined_at:new Date().toISOString()},
  {id:2,first_name:'Bob',last_name:'NoCard',email:'bob@x.com',card_barcode:null,bw_status:'ACTIVE',cancelled_at:null,joined_at:new Date().toISOString()},
  {id:3,first_name:'Cat',last_name:'Cancel',email:'cat@x.com',card_barcode:'604002',bw_status:'CANCELLED',cancelled_at:'2026-01-01',joined_at:'2020-01-01T00:00:00Z'},
  {id:4,first_name:'Dan',last_name:'Pending',email:'dan@x.com',card_barcode:'',bw_status:'UNKNOWN',cancelled_at:null,pending_card:true,joined_at:null},
  {id:5,first_name:'Eve',last_name:'ActiveUnlinked',email:'eve@x.com',card_barcode:null,bw_status:'ACTIVE',cancelled_at:null,joined_at:'2020-01-01T00:00:00Z'},
];

describe('isLinked',()=>{
  it('true only when card_barcode is non-empty',()=>{
    assert.equal(isLinked(rows[0]),true);
    assert.equal(isLinked(rows[1]),false);
    assert.equal(isLinked(rows[3]),false);
    assert.equal(isLinked({}),false);
  });
});

describe('cardCounts',()=>{
  it('counts linked/unlinked over full dataset',()=>{
    assert.deepEqual(cardCounts(rows),{total:5,linked:2,unlinked:3});
  });
  it('handles empty',()=>assert.deepEqual(cardCounts([]),{total:0,linked:0,unlinked:0}));
});

describe('filterMembers',()=>{
  it('card=unlinked returns everyone without a barcode',()=>{
    const out=filterMembers(rows,{card:'unlinked'});
    assert.equal(out.length,3);
    assert.ok(out.every(r=>!r.card_barcode));
  });
  it('card=linked returns only barcode holders',()=>{
    const out=filterMembers(rows,{card:'linked'});
    assert.equal(out.length,2);
    assert.ok(out.every(r=>!!r.card_barcode));
  });
  it('combines Active + Unlinked',()=>{
    const out=filterMembers(rows,{status:'active',card:'unlinked'});
    assert.deepEqual(out.map(r=>r.id),[2,5]);
  });
  it('combines Cancelled + Linked',()=>{
    const out=filterMembers(rows,{status:'cancelled',card:'linked'});
    assert.equal(out.length,1);
    assert.equal(out[0].id,3);
  });
  it('search still applies with card filter',()=>{
    const out=filterMembers(rows,{card:'unlinked',q:'eve'});
    assert.equal(out.length,1);
    assert.equal(out[0].id,5);
  });
  it('does not page — uses full matching set',()=>{
    const many=Array.from({length:400},(_,i)=>({id:i,card_barcode:i%2?String(i):null,bw_status:'ACTIVE',first_name:'M'+i,last_name:'X',email:'m'+i+'@x.com'}));
    assert.equal(filterMembers(many,{card:'unlinked'}).length,200);
    assert.equal(cardCounts(many).unlinked,200);
  });
});

describe('matchStatus',()=>{
  it('active excludes cancelled even if bw_status ACTIVE',()=>{
    assert.equal(matchStatus({bw_status:'ACTIVE',cancelled_at:'2026-01-01'},'active'),false);
    assert.equal(isCancelled({bw_status:'CANCELLED'}),true);
  });
});
