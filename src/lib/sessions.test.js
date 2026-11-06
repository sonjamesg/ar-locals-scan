import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {classifySession,partitionSessions,capacityLabel,sessionOpenUrl,sessionLinkLabel,PUBLIC_SCHEDULE_URL} from './sessions.js';

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
});

describe('sessions links',()=>{
  it('uses honest schedule fallback until admin URL verified',()=>{
    assert.equal(sessionOpenUrl({id:'ev-x'},{}),PUBLIC_SCHEDULE_URL);
    assert.equal(sessionLinkLabel({}),'Open Bookwhen schedule');
  });
  it('capacity label',()=>{
    assert.equal(capacityLabel(3,10),'3/10');
    assert.equal(capacityLabel(3,null),'3 booked');
  });
});
