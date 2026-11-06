import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');

describe('feedback page vs compose modal',()=>{
  it('compose modal has no nested all-feedback list',()=>{
    const p=read('components/FeedbackPanel.jsx');
    assert.match(p,/Write a note/);
    assert.match(p,/onSeeAll/);
    assert.doesNotMatch(p,/Load more/);
    assert.doesNotMatch(p,/list_staff_feedback/);
  });
  it('FeedbackPage is a roomy in-app view with pagination',()=>{
    const p=read('components/FeedbackPage.jsx');
    assert.match(p,/list_staff_feedback/);
    assert.match(p,/Load more/);
    assert.match(p,/Write a note/);
    assert.match(p,/fb-page/);
    assert.match(p,/Delete/);
  });
  it('main routes footer to feedback page and header to compose',()=>{
    const m=read('main.jsx');
    assert.match(m,/view==='feedback'/);
    assert.match(m,/go\('feedback'\)/);
    assert.match(m,/onOpenFeedback=\{v=>setFb/);
  });
});
