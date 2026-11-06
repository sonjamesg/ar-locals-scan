import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySession,partitionSessions,reconcileSessions,capacityLabel,
  sessionOpenUrl,sessionLinkLabel,adminAttendanceUrl,publicEventUrl,isValidEventId,
  sessionFreshness,visibleUpcoming,PUBLIC_SCHEDULE_URL
} from './sessions.js';

describe('sessions classify',()=>{
  const now=new Date('2026-11-06T14:00:00Z');
  it('marks current when now inside window',()=>{
    assert.equal(classifySession({start_at:'2026-11-06T13:00:00Z',end_at:'2026-11-06T15:00:00Z'},now),'current');
  });
  it('marks upcoming and past',()=>{
    assert.equal(classifySession({start_at:'2026-11-06T16:00:00Z',end_at:'2026-11-06T17:00:00Z'},now),'upcoming');
    assert.equal(classifySession({start_at:'2026-11-06T10:00:00Z',end_at:'2026-11-06T11:00:00Z'},now),'past');
  });
  it('partitions concurrent current sessions',()=>{
    const {current,upcoming}=partitionSessions([
      {id:'a',start_at:'2026-11-06T13:00:00Z',end_at:'2026-11-06T15:00:00Z'},
      {id:'b',start_at:'2026-11-06T13:30:00Z',end_at:'2026-11-06T14:30:00Z'},
      {id:'c',start_at:'2026-11-06T18:00:00Z',end_at:'2026-11-06T19:00:00Z'},
    ],now);
    assert.deepEqual(current.map(s=>s.id),['a','b']);
    assert.deepEqual(upcoming.map(s=>s.id),['c']);
  });
  it('time bucket transition: current becomes past after end',()=>{
    const s={id:'ev-x-20261106130000',start_at:'2026-11-06T13:00:00Z',end_at:'2026-11-06T14:30:00Z'};
    assert.equal(classifySession(s,new Date('2026-11-06T14:00:00Z')),'current');
    assert.equal(classifySession(s,new Date('2026-11-06T14:30:00Z')),'past');
  });
});

describe('sessions reconcile live schedule',()=>{
  it('drops events no longer returned (early close / removed)',()=>{
    const prev=[
      {id:'ev-keep-20261106140000',start_at:'2026-11-06T14:00:00Z',end_at:'2026-11-06T15:30:00Z',title:'Keep'},
      {id:'ev-gone-20261106140000',start_at:'2026-11-06T14:00:00Z',end_at:'2026-11-06T15:00:00Z',title:'Closed early'},
    ];
    const next=[
      {id:'ev-keep-20261106140000',start_at:'2026-11-06T14:00:00Z',end_at:'2026-11-06T15:30:00Z',title:'Keep'},
    ];
    const out=reconcileSessions(prev,next);
    assert.deepEqual(out.map(s=>s.id),['ev-keep-20261106140000']);
  });
  it('applies edited times from latest payload for same id',()=>{
    const prev=[{id:'ev-edit-20261106140000',start_at:'2026-11-06T14:00:00Z',end_at:'2026-11-06T15:30:00Z'}];
    const next=[{id:'ev-edit-20261106140000',start_at:'2026-11-06T14:00:00Z',end_at:'2026-11-06T15:00:00Z'}]; // ended early
    const out=reconcileSessions(prev,next);
    assert.equal(out[0].end_at,'2026-11-06T15:00:00Z');
    assert.equal(classifySession(out[0],new Date('2026-11-06T15:05:00Z')),'past');
  });
});

describe('sessions verified links',()=>{
  it('validates event id shape',()=>{
    assert.equal(isValidEventId('ev-srg2i-20261106140000'),true);
    assert.equal(isValidEventId('ev-sw9x-20261107090000'),true);
    assert.equal(isValidEventId('../evil'),false);
    assert.equal(isValidEventId(''),false);
  });
  it('builds verified admin attendances URL from live id',()=>{
    assert.equal(
      adminAttendanceUrl('ev-srg2i-20261106140000'),
      'https://atlanticreach.bookwhen.com/events/ev-srg2i-20261106140000/attendances'
    );
    assert.equal(
      publicEventUrl('ev-srg2i-20261106140000'),
      'https://bookwhen.com/atlanticreach/e/ev-srg2i-20261106140000'
    );
  });
  it('Open register uses live id — never a stale hardcoded slug',()=>{
    const s={id:'ev-sw9x-20261107090000'};
    assert.equal(sessionOpenUrl(s),adminAttendanceUrl(s.id));
    assert.equal(sessionLinkLabel(s),'Open register');
    assert.equal(sessionOpenUrl({id:'bad'}),PUBLIC_SCHEDULE_URL);
  });
  it('capacity label',()=>{
    assert.equal(capacityLabel(3,10),'3/10');
    assert.equal(capacityLabel(3,null),'3 booked');
  });
});

describe('sessions freshness',()=>{
  it('marks stale after threshold',()=>{
    const now=new Date('2026-11-06T14:05:00Z');
    assert.equal(sessionFreshness('2026-11-06T14:04:00Z',now).stale,false);
    assert.equal(sessionFreshness('2026-11-06T14:00:00Z',now).stale,true);
    assert.equal(sessionFreshness(null,now).kind,'unknown');
  });
});

describe('sessions compact upcoming',()=>{
  const list=[{id:'1'},{id:'2'},{id:'3'},{id:'4'},{id:'5'}];
  it('shows first 3 and reports hidden when collapsed',()=>{
    const out=visibleUpcoming(list,{limit:3,expanded:false});
    assert.deepEqual(out.shown.map(s=>s.id),['1','2','3']);
    assert.equal(out.hidden,2);
    assert.equal(out.truncated,true);
  });
  it('shows all when expanded',()=>{
    const out=visibleUpcoming(list,{limit:3,expanded:true});
    assert.equal(out.shown.length,5);
    assert.equal(out.truncated,false);
  });
  it('does not truncate short lists',()=>{
    const out=visibleUpcoming([{id:'a'}],{limit:3,expanded:false});
    assert.equal(out.truncated,false);
    assert.equal(out.hidden,0);
  });
});
