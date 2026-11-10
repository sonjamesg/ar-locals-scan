import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runPool} from '../../extension/pool.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
describe('extension sync pool (v1.2.2)',()=>{
  it('runs at most 5 at once, keeps order, reports progress, tears down every slot',async()=>{
    let inFlight=0,peak=0;const progress=[];const opened=[],closed=[];
    const items=Array.from({length:12},(_,i)=>i);
    const out=await runPool(items,5,async(x,i,slot)=>{inFlight++;peak=Math.max(peak,inFlight);await sleep(5+(x%3)*4);inFlight--;return {x,slot};},
      {setup:async k=>{opened.push(k);return 'tab'+k;},teardown:t=>{closed.push(t);},onDone:(d,t)=>progress.push([d,t])});
    assert.equal(peak,5);
    assert.deepEqual(out.map(r=>r.x),items);
    assert.equal(progress.length,12); assert.deepEqual(progress.at(-1),[12,12]);
    assert.equal(opened.length,5); assert.equal(closed.length,5);
  });
  it('a throwing worker becomes a per-item error, others continue',async()=>{
    const out=await runPool([1,2,3],5,async x=>{if(x===2)throw new Error('boom');return x;});
    assert.equal(out[0],1); assert.equal(out[1].__error.message,'boom'); assert.equal(out[2],3);
  });
  it('fewer items than workers opens only as many slots as needed',async()=>{
    const opened=[];await runPool([1,2],5,async x=>x,{setup:async k=>{opened.push(k);return k;}});
    assert.equal(opened.length,2);
  });
  it('background uses 5 workers, sign-in failure fails remaining fast, sends progress',()=>{
    const bg=readFileSync(join(root,'extension/background.js'),'utf8');
    assert.match(bg,/SYNC_WORKERS = 5/);
    assert.match(bg,/runPool\(list, SYNC_WORKERS/);
    assert.match(bg,/if \(loginError\) return fail\(ev, id, loginError\)/);
    assert.match(bg,/teardown: tab => tab && chrome\.tabs\.remove/);
    assert.match(bg,/type: 'syncProgress'/);
    const br=readFileSync(join(root,'extension/desk-bridge.js'),'utf8');
    assert.match(br,/AR_ATTENDEE_SYNC_PROGRESS/);
  });
  it('desk shows live progress and a soft (non-blocking) update note',()=>{
    const sp=readFileSync(join(root,'src/components/SessionsPanel.jsx'),'utf8');
    assert.match(sp,/setSyncProg\(\{i:done,total\}\)/);
    assert.match(sp,/Faster extension v\{EXT_LATEST\} available/);
  });
});
