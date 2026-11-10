import {describe,it} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {extBlock,extWarnText,isChromiumUA,MIN_CHECK_EXT,MIN_SYNC_EXT} from './attendeeSync.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');const rd=f=>readFileSync(join(root,f),'utf8');
const CHROME='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SAFARI='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const FF='Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';
describe('extension gate',()=>{
  it('detects browser / missing / outdated / ok',()=>{
    assert.equal(isChromiumUA(CHROME),true);assert.equal(isChromiumUA(SAFARI),false);assert.equal(isChromiumUA(FF),false);
    assert.equal(extBlock(null,MIN_CHECK_EXT,SAFARI),'browser');
    assert.equal(extBlock(null,MIN_CHECK_EXT,CHROME),'missing');
    assert.equal(extBlock('1.2.0',MIN_SYNC_EXT,CHROME),'outdated');
    assert.equal(extBlock('1.2.2',MIN_SYNC_EXT,CHROME),null);
    assert.equal(extBlock('1.0.3',MIN_CHECK_EXT,CHROME),null);
  });
  it('copy names the action and version',()=>{
    assert.equal(extWarnText('missing','Check user').body,'Install the Locals Card Chrome extension first to use Check user.');
    assert.equal(extWarnText('missing','Check user').title,'Chrome extension needed');
    assert.match(extWarnText('outdated','Re-sync names','1.2.1').body,/^Update the Chrome extension \(v1\.2\.1 or newer\) to use Re-sync names\.$/);
    assert.match(extWarnText('browser','Check user').body,/only works in Google Chrome/);
  });
  it('every extension action is gated before it runs',()=>{
    const m=rd('components/Members.jsx'),all=rd('components/AllMembersPanel.jsx'),sp=rd('components/SessionsPanel.jsx');
    const run=m.slice(m.indexOf('async function run()'));
    assert.ok(run.indexOf('await extGate(MIN_CHECK_EXT)')<run.indexOf('await extCheck('));
    assert.doesNotMatch(run.slice(0,run.indexOf('await extCheck(')),/window\.open/);
    assert.match(m,/<ExtWarning kind=\{block\} action="Check user"/);
    const st=all.slice(all.indexOf('async function start()'));
    assert.ok(st.indexOf('await extGate(MIN_CHECK_EXT)')<st.indexOf('extCheck('));
    assert.match(all,/<ExtWarning kind=\{block\} action=\{`Check \$\{n\} \(batch Check user\)`\}/);
    const rs=sp.slice(sp.indexOf('async function reSyncAttendees'));
    assert.ok(rs.indexOf('extBlock(await detectExt(),MIN_SYNC_EXT')<rs.indexOf('extAttendeeSync('));
  });
  it('warning is red, dismissible, with Download + How to install',()=>{
    const h=rd('components/ExtensionHelp.jsx'),css=rd('styles.css');
    const w=h.slice(h.indexOf('export function ExtWarning'));
    assert.match(w,/role="alert"/);assert.match(w,/<IconAlert/);assert.match(w,/aria-label="Dismiss warning"/);
    assert.match(w,/<ExtDownloadLink className="btn primary sm"/);assert.match(w,/onClick=\{openExtHelp\}>How to install/);
    assert.match(w,/not Safari, Firefox or phones/);
    assert.match(css,/\.ext-warn\{[^}]*background:var\(--bad-bg\);[^}]*border-left:5px solid var\(--bad\)/);
  });
});
