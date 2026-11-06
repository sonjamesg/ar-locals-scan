import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {isManualAddView,safeDeskView,MEMBER_NOT_FOUND_GUIDE} from './memberNotFound.js';

describe('manual add hide',()=>{
  it('treats add as manual create view',()=>assert.equal(isManualAddView('add'),true));
  it('falls back stale add tab to scan',()=>{
    assert.equal(safeDeskView('add',['scan','lost','visits']),'scan');
    assert.equal(safeDeskView('visits',['scan','lost','visits']),'visits');
  });
  it('guide mentions signup email and James',()=>{
    assert.match(MEMBER_NOT_FOUND_GUIDE,/original Locals Card signup/i);
    assert.match(MEMBER_NOT_FOUND_GUIDE,/contact James/i);
    assert.doesNotMatch(MEMBER_NOT_FOUND_GUIDE,/wrong email/i);
  });
});
describe('feedback desk view',()=>{
  it('allows feedback page view',()=>{
    assert.equal(safeDeskView('feedback',['scan','feedback']),'feedback');
  });
});
