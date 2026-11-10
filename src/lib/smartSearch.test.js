import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {smartSearch,queryTokens,normWords} from './smartSearch.js';
import {filterMembers} from './memberFilters.js';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const rows=[
  {id:'a',first_name:'Isla',last_name:'Kennedy-Holmes',email:'ik.fake@example.test'},
  {id:'b',first_name:null,last_name:null,email:'jamesgraham123@example.test'},
  {id:'c',first_name:'Jamie',last_name:'Grahamson',email:'jg@example.test'},
  {id:'d',first_name:'Holly',last_name:'Holmes',email:'hh@example.test',bw_lcl:'LCL0777',card_barcode:'AR12345'},
  {id:'e',first_name:'Zoë',last_name:"O'Neill",email:'zo@example.test'},
  {id:'f',first_name:'Isla',last_name:null,email:'isla.only@example.test'},
];
const ids=(q,o)=>smartSearch(rows,q,o).map(r=>r.id+(r._partial?'~':''));
describe('smartSearch',()=>{
  it('normalises accents, apostrophes and separators',()=>{
    assert.equal(normWords("Zoë O’Neill-Smith_2"),'zoe oneill smith');
    assert.deepEqual(queryTokens("Holme's"),[['holmes','holme']]);
    assert.deepEqual(queryTokens('Mr J and the Smith'),[['smith']]);
  });
  it("finds 'Isla Kennedy - Holmes’s' (full name, hyphen, possessive)",()=>{
    const r=ids("Isla Kennedy - Holmes’s");
    assert.equal(r[0],'a');
  });
  it('holme\'s == holmes',()=>{assert.deepEqual(ids("holme's"),ids('holmes'));assert.ok(ids('holmes').includes('d'));});
  it('"james graham" matches jamesgraham123@ (no name on file) first',()=>{
    const r=ids('james graham'); assert.equal(r[0],'b'); assert.ok(r.includes('c~'));
  });
  it('"kennedyholmes" matches Kennedy-Holmes',()=>{assert.deepEqual(ids('kennedyholmes'),['a']);});
  it('accent-free query finds accented name',()=>{assert.deepEqual(ids('zoe oneill'),['e']);});
  it('partial matches follow full matches with a flag',()=>{
    const r=ids('isla smith'); assert.deepEqual(r.sort(),['a~','f~']);
    const s=ids('isla holmes'); assert.equal(s[0],'a'); assert.ok(s.slice(1).every(x=>x.endsWith('~')));
  });
  it('single-word query never shows partials; limit respected',()=>{
    assert.ok(ids('isla').every(x=>!x.endsWith('~')));
    assert.equal(smartSearch(rows,'example',{limit:2}).length,0); // domain is not searched
    assert.equal(smartSearch(rows,'is',{limit:1}).length,1);
  });
  it('exact LCL / barcode / email lookups still work',()=>{
    assert.deepEqual(ids('LCL0777'),['d']); assert.deepEqual(ids('0777'),['d']); assert.deepEqual(ids('ar12345'),['d']);
    assert.deepEqual(ids('jamesgraham123@example.test'),['b']);
  });
  it('All members filter uses the same forgiving ranking',()=>{
    assert.equal(filterMembers(rows,{q:'james graham'})[0].id,'b');
    assert.equal(filterMembers(rows,{q:'x'}).length,rows.length);
  });
  it('Search Users searches the loaded member list client-side (fallback to RPC)',()=>{
    const m=readFileSync(join(root,'src/components/Members.jsx'),'utf8');
    assert.match(m,/smartSearch\(await loadMembers\(\),q\)/);
    assert.match(m,/sb\.rpc\('search_members'/);
    assert.match(m,/partial match/);
  });
});
