import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {shouldCountVisit,applyVisitAttempt,distinctVisitDays,VISIT_GAP_MS} from './visits.js';

describe('shouldCountVisit / 3h session',()=>{
  const t0='2026-07-15T07:00:00.000Z'; // 08:00 BST
  it('counts first ever',()=>assert.equal(shouldCountVisit(null,t0).count,true));
  it('suppresses under 3h',()=>{
    const r=shouldCountVisit(t0,'2026-07-15T09:59:00.000Z'); // +2h59
    assert.equal(r.count,false);
    assert.equal(r.reason,'within_session_window');
  });
  it('counts at exactly 3h',()=>{
    const r=shouldCountVisit(t0,new Date(Date.parse(t0)+VISIT_GAP_MS).toISOString());
    assert.equal(r.count,true);
    assert.equal(r.reason,'session');
  });
  it('suppressed scans do not reset timer',()=>{
    let st={lastCountedIso:null,visits:[],suppressed:[]};
    st=applyVisitAttempt(st,t0);
    st=applyVisitAttempt(st,'2026-07-15T08:00:00.000Z'); // +1h suppress
    assert.equal(st.visits.length,1);
    assert.equal(st.suppressed.length,1);
    assert.equal(st.lastCountedIso,t0);
    st=applyVisitAttempt(st,new Date(Date.parse(t0)+VISIT_GAP_MS).toISOString());
    assert.equal(st.visits.length,2);
  });
  it('London day rollover counts even if <3h',()=>{
    // 15 Jul 23:00 BST = 22:00 UTC; 16 Jul 00:30 BST = 15 Jul 23:30 UTC (<3h)
    const late='2026-07-15T22:00:00.000Z';
    const earlyNext='2026-07-15T23:30:00.000Z';
    const r=shouldCountVisit(late,earlyNext);
    assert.equal(r.count,true);
    assert.equal(r.reason,'first_today');
  });
  it('two sessions same day => 2 visits, 1 distinct day',()=>{
    let st={lastCountedIso:null,visits:[],suppressed:[]};
    st=applyVisitAttempt(st,'2026-07-15T07:00:00.000Z');
    st=applyVisitAttempt(st,'2026-07-15T11:00:00.000Z');
    assert.equal(st.visits.length,2);
    assert.equal(distinctVisitDays(st.visits),1);
  });
});
