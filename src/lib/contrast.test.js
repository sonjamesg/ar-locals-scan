import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
function lum(hex){const h=hex.replace('#','');const[r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);const f=c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)}
function ratio(a,b){const[L1,L2]=[lum(a),lum(b)].sort((x,y)=>y-x);return (L1+0.05)/(L2+0.05)}
const brand='#263241';
describe('brand contrast WCAG AA',()=>{
  it('white on brand header >=4.5',()=>assert.ok(ratio('#FFFFFF',brand)>=4.5));
  it('body text on page bg >=4.5',()=>assert.ok(ratio('#1a232b','#f5f7f9')>=4.5));
  it('muted text on page bg >=4.5',()=>assert.ok(ratio('#3f4f5a','#f5f7f9')>=4.5));
  it('brand on white >=3',()=>assert.ok(ratio(brand,'#FFFFFF')>=3));
  it('success/error on soft bgs >=4.5',()=>{assert.ok(ratio('#17663a','#e6f5ec')>=4.5);assert.ok(ratio('#a11b14','#fceceb')>=4.5);});
});

describe('NEW badge contrast',()=>{
  it('white on brand navy meets AA',()=>assert.ok(ratio('#FFFFFF',brand)>=4.5));
});
describe('status colour contrast',()=>{
  it('warn orange on warn bg meets large-text AA',()=>assert.ok(ratio('#c05600','#fff4e8')>=3));
  it('ok green on ok bg meets large-text AA',()=>assert.ok(ratio('#17663a','#e6f5ec')>=3));
  it('bad red on bad bg meets large-text AA',()=>assert.ok(ratio('#a11b14','#fceceb')>=3));
});
