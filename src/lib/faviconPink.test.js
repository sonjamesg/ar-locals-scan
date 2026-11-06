import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=join(dirname(fileURLToPath(import.meta.url)),'..','..');
const pub=join(root,'public');

describe('pink favicon same logo',()=>{
  it('favicon-192 is predominantly pink disc with dark mark',()=>{
    const path=join(pub,'favicon-192.png');
    assert.ok(existsSync(path));
    const dir=mkdtempSync(join(tmpdir(),'fav-'));
    const py=join(dir,'check.py');
    writeFileSync(py, [
      'from PIL import Image',
      'im=Image.open('+JSON.stringify(path)+').convert("RGBA")',
      'pink=ink=0',
      'w,h=im.size',
      'for y in range(h):',
      '  for x in range(w):',
      '    r,g,b,a=im.getpixel((x,y))',
      '    if a<40: continue',
      '    if r>200 and b>140 and g>100: pink+=1',
      '    elif r<60 and g<60 and b<60: ink+=1',
      'print(pink, ink, w)',
    ].join('\n'));
    const out=execFileSync('python3',[py],{encoding:'utf8'}).trim();
    const[pink,ink,w]=out.split(/\s+/).map(Number);
    assert.ok(pink>10000, 'expected large pink disc, got '+pink);
    assert.ok(ink>2000, 'expected dark logo mark retained, got '+ink);
    assert.equal(w,192);
  });
  it('html references cache-busted pink favicons; logos unchanged names',()=>{
    const html=readFileSync(join(root,'index.html'),'utf8');
    assert.match(html,/favicon-192\.png\?v=pink1/);
    assert.doesNotMatch(html,/ar-logo-white\.png\?v=pink/);
  });
});
