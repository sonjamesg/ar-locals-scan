import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {shouldUseLinkCheckin,visitFromLinkRow,linkSuccessMessage,LINK_CHECKIN_RPC,PLAIN_LINK_RPC} from './linkCheckin.js';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');

describe('link check-in wiring',()=>{
  it('only scan desk uses check-in RPC',()=>{
    assert.equal(shouldUseLinkCheckin('scan_desk'),true);
    assert.equal(shouldUseLinkCheckin('lost_panel'),false);
    assert.equal(shouldUseLinkCheckin('pending'),false);
    assert.equal(shouldUseLinkCheckin('import'),false);
  });
  it('main scan link calls link_card_from_scan; other panels keep link_card',()=>{
    const main=readFileSync(join(root,'main.jsx'),'utf8');
    assert.match(main,new RegExp(LINK_CHECKIN_RPC));
    assert.match(main,/visit recorded/);
    const lost=readFileSync(join(root,'components/LostPanel.jsx'),'utf8');
    assert.match(lost,new RegExp(`rpc\\('${PLAIN_LINK_RPC}'`));
    assert.doesNotMatch(lost,new RegExp(LINK_CHECKIN_RPC));
  });
  it('maps link row into status visit payload',()=>{
    const v=visitFromLinkRow({recorded:true,visits_today:1,visited_at:'2026-11-06T10:00:00Z'});
    assert.equal(v.recorded,true);
    assert.equal(v.visits_today,1);
    assert.match(linkSuccessMessage('Sam',v),/visit recorded/);
    assert.equal(linkSuccessMessage('Sam',{recorded:false}),'Card linked to Sam');
  });
});
