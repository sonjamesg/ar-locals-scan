import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {shouldAutofocusNote} from './feedbackFocus.js';

describe('shouldAutofocusNote',()=>{
  it('focuses only when opening',()=>{
    assert.equal(shouldAutofocusNote(false,true),true);
    assert.equal(shouldAutofocusNote(undefined,true),true);
  });
  it('does not refocus while already open (clock/rerender)',()=>{
    assert.equal(shouldAutofocusNote(true,true),false);
  });
  it('does not focus when closed',()=>{
    assert.equal(shouldAutofocusNote(true,false),false);
    assert.equal(shouldAutofocusNote(false,false),false);
  });
});
