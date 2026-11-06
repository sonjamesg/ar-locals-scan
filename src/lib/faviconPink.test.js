import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=join(dirname(fileURLToPath(import.meta.url)),'..','..');
const pub=join(root,'public');

describe('pink favicon same logo',()=>{
  it('favicon-192 is predominantly pink disc with dark mark',()=>{
    const path=join(pub,'favicon-192.png');
    assert.ok(existsSync(path));
    const out=execFileSync('python3',[
      '-c',
      'from PIL import Image\n'
      + 'im=Image.open('+repr(path)+').convert("RGBA")\n'
      + 'pink=ink=0\n'
      + 'w,h=im.size\n'
      + 'for y in range(h):\n'
      + '  for x in range(w):\n'
      + '    r,g,b,a=im.getpixel((x,y))\n'
      + '    if a<40: continue\n'
      + '    if r>200 and b>140 and g>100: pink+=1\n'
      + '    elif r<60 and g<60 and b<60: ink+=1\n'
      + 'print(pink, ink, w)\n'
    ],{encoding:'utf8'}).trim();
    const[pink,ink,w]=out.split(/\s+/).map(Number);
    assert.ok(pink>10000, `expected large pink disc, got ${pink}`);
    assert.ok(ink>2000, `expected dark logo mark retained, got ${ink}`);
    assert.equal(w,192);
  });
  it('html references cache-busted pink favicons; logos unchanged names',()=>{
    const html=readFileSync(join(root,'index.html'),'utf8');
    assert.match(html,/favicon-192\.png\?v=pink1/);
    assert.doesNotMatch(html,/ar-logo-white\.png\?v=pink/);
  });
});
