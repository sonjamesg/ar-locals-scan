import {useEffect,useRef,useState} from 'react';
import {EXT_LATEST,EXT_ZIP_PATH,CHROME_EXT_ADDRESS} from '../lib/attendeeSync.js';
import {IconDownload,IconCopy,IconCheck} from './Icons.jsx';

export const extZipUrl=()=>((typeof import.meta!=='undefined'&&import.meta.env?.BASE_URL)||'./')+EXT_ZIP_PATH;
const OPEN_EVT='ar-ext-help';
/** Open the install guide from anywhere (e.g. Sessions panel). */
export const openExtHelp=()=>window.dispatchEvent(new Event(OPEN_EVT));

export function ExtDownloadLink({className='btn primary sm',label,onClick}){
  return <a className={className+' ext-dl'} href={extZipUrl()} download={`Locals-Card-Extension-v${EXT_LATEST}.zip`}
    onClick={e=>{onClick&&onClick(e);}} title={`Download the Locals Card Chrome extension v${EXT_LATEST} (.zip)`}>
    <IconDownload/><span>{label||`Download Chrome extension (v${EXT_LATEST})`}</span></a>;
}

function CopyAddress(){
  const[ok,setOk]=useState(false);
  async function copy(){
    try{await navigator.clipboard.writeText(CHROME_EXT_ADDRESS);}catch{
      const t=document.createElement('textarea');t.value=CHROME_EXT_ADDRESS;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch{}t.remove();}
    setOk(true);setTimeout(()=>setOk(false),2000);
  }
  return <span className="ext-addr"><code>{CHROME_EXT_ADDRESS}</code>
    <button type="button" className="btn ghost sm" onClick={copy} aria-live="polite">{ok?<><IconCheck/><span>Copied</span></>:<><IconCopy/><span>Copy address</span></>}</button></span>;
}

export function ExtInstallModal({open,onClose}){
  const ref=useRef(null);
  useEffect(()=>{if(!open)return;const k=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);ref.current?.focus();return()=>window.removeEventListener('keydown',k);},[open,onClose]);
  if(!open) return null;
  return <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal ext-modal" role="dialog" aria-modal="true" aria-labelledby="ext-modal-title" tabIndex={-1} ref={ref}>
      <h3 id="ext-modal-title">Install the Locals Card extension</h3>
      <p className="muted ext-sub">Chrome on Windows or Mac · v{EXT_LATEST} · needed for Check user and Re-sync names.</p>
      <ol className="ext-steps">
        <li><b>Download</b> the extension zip. <ExtDownloadLink className="btn primary sm" label="Download extension"/></li>
        <li><b>Unzip it</b> — double-click the downloaded file. Keep the folder somewhere safe (e.g. Documents); Chrome loads it from there.</li>
        <li><b>Open Chrome's extensions page</b> — sites can't open it for you, so copy this, paste it into the address bar and press Enter: <CopyAddress/></li>
        <li><b>Turn on Developer mode</b> (switch at the top right).</li>
        <li><b>Click “Load unpacked”</b> and choose the unzipped folder.</li>
        <li><b>Sign in to Bookwhen</b> in this Chrome, then <b>hard-refresh this desk</b> (Ctrl+Shift+R, or ⌘+Shift+R on Mac).</li>
      </ol>
      <div className="ext-update"><b>Updating an older version?</b> Unzip the new download over the old folder (replace the files), then press <b>↻ Reload</b> on “AR Locals – Bookwhen Check” in chrome://extensions and hard-refresh this desk.</div>
      <div className="modal-acts ext-acts"><button type="button" className="btn primary" onClick={onClose}>Done</button></div>
    </div>
  </div>;
}

/** Footer: download button + How to install, owns the modal and listens for openExtHelp(). */
export function ExtFooter(){
  const[open,setOpen]=useState(false);
  useEffect(()=>{const f=()=>setOpen(true);window.addEventListener(OPEN_EVT,f);return()=>window.removeEventListener(OPEN_EVT,f);},[]);
  return <span className="foot-ext">
    <ExtDownloadLink className="btn ghost sm" onClick={()=>setOpen(true)}/>
    <button type="button" className="foot-fb" onClick={()=>setOpen(true)}>How to install</button>
    <ExtInstallModal open={open} onClose={()=>setOpen(false)}/>
  </span>;
}
