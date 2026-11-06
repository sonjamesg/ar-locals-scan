import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {statusTone,statusMeta,isLinkableStatus,STATUS_TONES} from './statusCard.js';

describe('statusTone',()=>{
  it('green only when valid',()=>{
    assert.equal(statusTone('valid'),STATUS_TONES.valid);
  });
  it('red for expired/cancelled/invalid/lost — never green just because known',()=>{
    for(const s of ['expired','cancelled','invalid','lost']){
      assert.notEqual(statusTone(s),STATUS_TONES.valid);
      assert.ok([STATUS_TONES.expired,STATUS_TONES.lost].includes(statusTone(s)));
    }
  });
  it('orange for unlinked/unknown',()=>{
    assert.equal(statusTone('unknown'),STATUS_TONES.unknown);
    assert.equal(statusTone('whatever'),STATUS_TONES.unknown);
  });
});

describe('statusMeta',()=>{
  it('exposes explicit labels for every tone',()=>{
    for(const s of ['valid','expired','lost','unknown',null]){
      const m=statusMeta(s);
      assert.ok(m.label);
      assert.ok(m.tone);
    }
  });
});

describe('isLinkableStatus',()=>{
  it('only unknown cards open the link panel',()=>{
    assert.equal(isLinkableStatus('unknown'),true);
    assert.equal(isLinkableStatus('valid'),false);
    assert.equal(isLinkableStatus('expired'),false);
    assert.equal(isLinkableStatus('lost'),false);
  });
});
