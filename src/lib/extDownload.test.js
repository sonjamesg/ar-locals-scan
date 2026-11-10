import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EXT_LATEST,EXT_ZIP_PATH,MIN_SYNC_EXT,extNeed,CHROME_EXT_ADDRESS} from './attendeeSync.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const help=readFileSync(join(root,'src/components/ExtensionHelp.jsx'),'utf8');
const main=readFileSync(join(root,'src/main.jsx'),'utf8');
const sp=readFileSync(join(root,'src/components/SessionsPanel.jsx'),'utf8');
describe('extension download',()=>{
  it('advertised version matches the extension manifest and the published zip exists',()=>{
    const m=JSON.parse(readFileSync(join(root,'extension/manifest.json'),'utf8'));
    assert.equal(EXT_LATEST,m.version);
    assert.ok(existsSync(join(root,'docs',EXT_ZIP_PATH)));
    assert.ok(!(EXT_LATEST<MIN_SYNC_EXT));
  });
  it('footer has the download button + How to install',()=>{
    assert.match(main,/<footer className="foot">[\s\S]*?<ExtFooter\/>/);
    assert.match(help,/download=\{`Locals-Card-Extension-v\$\{EXT_LATEST\}\.zip`\}/);
    assert.match(help,/Download Chrome extension \(v\$\{EXT_LATEST\}\)/);
    assert.match(help,/How to install/);
  });
  it('install guide: numbered steps incl. copy chrome://extensions, Developer mode, Load unpacked, update/reload',()=>{
    assert.equal(CHROME_EXT_ADDRESS,'chrome://extensions');
    assert.match(help,/<ol className="ext-steps">/);
    for(const t of [/Copy address/,/Developer mode/,/Load unpacked/,/Reload/,/hard-refresh/,/Sign in to Bookwhen/]) assert.match(help,t);
    assert.match(help,/navigator\.clipboard\.writeText\(CHROME_EXT_ADDRESS\)/);
    assert.doesNotMatch(help,/href="chrome:/);
  });
  it('Re-sync shows friendly missing/outdated card with Download + How to install',()=>{
    assert.equal(extNeed(undefined),'missing'); assert.equal(extNeed('1.2.0'),'outdated'); assert.equal(extNeed('1.2.1'),null);
    assert.match(sp,/<ExtWarning kind=\{extProblem\} action="Re-sync names" min=\{MIN_SYNC_EXT\}/);
    assert.doesNotMatch(sp,/load unpacked extension folder/);
  });
});
describe('service worker',()=>{
  it('never serves the extension zip from cache',()=>{
    const sw=readFileSync(join(root,'public/sw.js'),'utf8');
    assert.match(sw,/if\(\/\\\.zip\$\/i\.test\(new URL\(r\.url\)\.pathname\)\)return;/);
  });
});
