import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');

describe('header toolbar polish',()=>{
  it('ships inline SVG icon components (no emoji)',()=>{
    const icons=read('components/Icons.jsx');
    for(const name of ['IconExternalLink','IconFeedback','IconLock','IconClock']){
      assert.match(icons,new RegExp(`export function ${name}`));
    }
    assert.match(icons,/stroke:'currentColor'/);
    assert.doesNotMatch(icons,/❓|🔒|🗓|emoji/);
  });
  it('header uses icons, Feedback label, primary Bookwhen, divider',()=>{
    const h=read('components/Header.jsx');
    assert.match(h,/IconExternalLink/);
    assert.match(h,/IconFeedback/);
    assert.match(h,/IconLock/);
    assert.match(h,/IconClock/);
    assert.match(h,/Feedback/);
    assert.match(h,/Open in Bookwhen/);
    assert.match(h,/hdr-btn-primary/);
    assert.match(h,/hdr-divider/);
    assert.match(h,/aria-label="Staff feedback"/);
    assert.match(h,/aria-label="Lock desk"/);
    assert.doesNotMatch(h,/>\?</);
  });
  it('CSS uses compact 8px corners, 1px borders, 40px hit targets',()=>{
    const css=read('styles.css');
    assert.match(css,/\.hdr \.hdr-btn\{[^}]*border-radius:8px/);
    assert.match(css,/\.hdr \.hdr-btn\{[^}]*border:1px solid/);
    assert.match(css,/\.hdr \.hdr-btn\{[^}]*min-height:40px/);
    assert.match(css,/\.hdr \.hdr-btn-primary\{[^}]*background:#fff/);
    assert.match(css,/\.hdr-divider\{/);
    assert.doesNotMatch(css,/\.hdr \.hdr-btn\{[^}]*border-radius:999px/);
  });
});
