import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFbView,afterPostUi,mergeFeedbackPage,feedbackHasMore,FB_VIEWS} from './feedbackViews.js';

describe('normalizeFbView',()=>{
  it('defaults to compose',()=>{
    assert.equal(normalizeFbView(null),FB_VIEWS.compose);
    assert.equal(normalizeFbView('list'),FB_VIEWS.list);
  });
});

describe('afterPostUi',()=>{
  it('flags See feedback after post',()=>{
    const u=afterPostUi({});
    assert.equal(u.showSeeFeedback,true);
    assert.equal(u.suggestedView,FB_VIEWS.list);
  });
});

describe('mergeFeedbackPage',()=>{
  it('appends uniquely newest-first pages',()=>{
    const a=[{id:'1'},{id:'2'}];
    const b=[{id:'2'},{id:'3'}];
    assert.deepEqual(mergeFeedbackPage(a,b,{append:true}).map(x=>x.id),['1','2','3']);
  });
});

describe('feedbackHasMore',()=>{
  it('compares loaded vs total',()=>{
    assert.equal(feedbackHasMore(50,120),true);
    assert.equal(feedbackHasMore(120,120),false);
    assert.equal(feedbackHasMore(0,0),false);
  });
});
