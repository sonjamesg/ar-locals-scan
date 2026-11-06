import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {createRequire} from 'node:module';
const root=join(dirname(fileURLToPath(import.meta.url)),'..','..');
const pub=join(root,'public');
const require=createRequire(import.meta.url);

describe('pink favicon same logo',()=>{
  it('favicon-192 is predominantly pink disc with dark mark',async()=>{
    let Image;
    try{({default:Image}=await import('sharp'));}catch{}
    // Use png parse via raw: check file exists and is PNG; colour via child if needed
    const buf=readFileSync(join(pub,'favicon-192.png'));
    assert.equal(buf[0],0x89);
    assert.equal(buf[1],0x50); // PNG
    // Sample centre-ish bytes aren't reliable; use dynamic import of sharp? may not exist.
    // Fallback: spawn python check
    const {execFileSync}=await import('node:child_process');
    const out=execFileSync('python3',['-c',`
from PIL import Image
im=Image.open('${join(pub,'favicon-192.png')}').convert('RGBA')
w,h=im.size
pink=ink=0
for y in range(h):
  for x in range(w):
    r,g,b,a=im.getpixel((x,y))
    if a<40: continue
    if r>200 and b>140 and g>100: pink+=1
    elif r<60 and g<60 and b<60: ink+=1
print(pink,ink,w)
`],text=True).strip()
    pink,ink,w=map(int,out.split())
    assert.ok(pink>10000, 'expected large pink disc')
    assert.ok(ink>2000, 'expected dark logo mark retained')
  });
  it('html references cache-busted pink favicons; logos unchanged names',()=>{
    const html=readFileSync(join(root,'index.html'),'utf8');
    assert.match(html,/favicon-192\.png\?v=pink1/);
    assert.doesNotMatch(html,/ar-logo-white\.png\?v=pink/);
  });
});
