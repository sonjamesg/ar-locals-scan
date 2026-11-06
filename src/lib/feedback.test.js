import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFeedbackBody,normalizeFeedbackAuthor,escapeFeedbackText,sortFeedbackNewestFirst,FEEDBACK_MAX} from './feedback.js';

describe('normalizeFeedbackBody',()=>{
  it('rejects blank and whitespace',()=>{
    assert.equal(normalizeFeedbackBody('').ok,false);
    assert.equal(normalizeFeedbackBody('   ').ok,false);
  });
  it('trims and accepts',()=>{
    const r=normalizeFeedbackBody('  hello  ');
    assert.equal(r.ok,true);
    assert.equal(r.value,'hello');
  });
  it('rejects over max',()=>{
    assert.equal(normalizeFeedbackBody('x'.repeat(FEEDBACK_MAX+1)).ok,false);
    assert.equal(normalizeFeedbackBody('x'.repeat(FEEDBACK_MAX)).ok,true);
  });
});

describe('normalizeFeedbackAuthor',()=>{
  it('empty becomes null',()=>assert.equal(normalizeFeedbackAuthor('  ').value,null));
  it('rejects long names',()=>assert.equal(normalizeFeedbackAuthor('n'.repeat(81)).ok,false));
});

describe('escapeFeedbackText',()=>{
  it('escapes html',()=>assert.equal(escapeFeedbackText('<b>&"'),'&lt;b&gt;&amp;&quot;'));
});

describe('sortFeedbackNewestFirst',()=>{
  it('orders by created_at desc',()=>{
    const rows=[{id:1,created_at:'2026-01-01'},{id:2,created_at:'2026-06-01'},{id:3,created_at:'2026-03-01'}];
    assert.deepEqual(sortFeedbackNewestFirst(rows).map(r=>r.id),[2,3,1]);
  });
});
