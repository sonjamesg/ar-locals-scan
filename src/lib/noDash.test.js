import {describe,it} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,statSync} from 'node:fs';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {noDash} from './noDash.js';import {formatSessionRange} from './sessions.js';
const src=join(dirname(fileURLToPath(import.meta.url)),'..');
const walk=d=>readdirSync(d).flatMap(f=>{const p=join(d,f);return statSync(p).isDirectory()?walk(p):[p];});
describe('no em dashes on the desk',()=>{
  it('no em dash anywhere in desk source (excluding tests) or index.html',()=>{
    const files=[...walk(src).filter(f=>/\.(jsx?|css)$/.test(f)&&!/\.test\.js$/.test(f)),join(src,'../index.html')];
    for(const f of files){const t=readFileSync(f,'utf8');assert.ok(!/\u2014|&mdash;/.test(t),f);}
  });
  it('outside text (extension/server errors) is cleaned before display',()=>{
    assert.equal(noDash('Bookwhen session not signed in — log in to Bookwhen in this browser'),'Bookwhen session not signed in. Log in to Bookwhen in this browser');
    assert.equal(noDash('No Bookwhen customer ID — use Open in Bookwhen'),'No Bookwhen customer ID. Use Open in Bookwhen');
    assert.equal(noDash('plain'),'plain');assert.equal(noDash(null),null);
    assert.ok(!/\u2014/.test(noDash('a—b — c')));
  });
  it('time ranges use a plain hyphen',()=>{
    const r=formatSessionRange('2026-11-10T13:30:00Z','2026-11-10T14:30:00Z');
    assert.match(r,/13:30 - 14:30/);assert.ok(!/[\u2013\u2014]/.test(r));
  });
});
