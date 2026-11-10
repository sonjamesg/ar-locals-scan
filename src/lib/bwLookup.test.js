import {describe,it} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');const m=readFileSync(join(root,'components/Members.jsx'),'utf8');const ext=readFileSync(join(root,'../extension/parse.js'),'utf8');
const BASE='https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9';
const url=q=>`${BASE}&search_text=${encodeURIComponent(String(q||'').trim())}`; // mirror of bwLocalsLookupUrl
describe('Search Bookwhen for a Locals membership',()=>{
  it('uses the Locals group list + search_text (same param the extension uses for Check user by email)',()=>{
    assert.ok(m.includes(`export const BW_LOCALS_LIST='${BASE}'`));
    assert.match(m,/bwLocalsLookupUrl=q=>`\$\{BW_LOCALS_LIST\}&search_text=\$\{encodeURIComponent\(String\(q\|\|''\)\.trim\(\)\)\}`/);
    assert.match(ext,/&search_text=\$\{encodeURIComponent\(t\)\}/);
    assert.equal(url(' fake.person+1@example.test '),BASE+'&search_text=fake.person%2B1%40example.test');
    assert.equal(url("Jo O'Neil & Co"),BASE+'&search_text=Jo%20O\'Neil%20%26%20Co');
  });
  it('only when the search is empty, in the shared SearchPick (Search Users + scan Link card)',()=>{
    assert.match(m,/\{empty&&<BwLookup q=\{q\}\/>\}/);
    const lp=readFileSync(join(root,'components/LinkPanel.jsx'),'utf8'),lost=readFileSync(join(root,'components/LostPanel.jsx'),'utf8');
    assert.match(lp,/<SearchPick/);assert.match(lost,/<SearchPick/);
  });
  it('button opens new tab, copies the text, careful copy',()=>{
    const b=m.slice(m.indexOf('export function BwLookup'));
    assert.match(b,/target="_blank" rel="noopener noreferrer"/);
    assert.match(b,/copyText\(t\)\.then\(setCopied\)/);
    assert.match(b,/Search Bookwhen for a Locals membership/);
    assert.match(b,/Not found on the desk\. Check Bookwhen\. If nothing shows there, they don't have a Locals Card\./);
    assert.match(b,/copied\. Paste into Bookwhen search if it isn't filled\./);
  });
});
