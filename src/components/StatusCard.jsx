import {left,fmt} from '../lib.js';
const C={valid:'STATUS 200 · ACCESS OK',expired:'STATUS 410 · EXPIRED',unknown:'STATUS 404 · NOT LINKED'};const L={valid:['✓','VALID'],expired:['!','EXPIRED'],unknown:['?','UNKNOWN CARD']};
export default function StatusCard({res}){
 if(!res)return <section className="status idle" data-code="SYS · ONLINE"><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/><i className="reticle"/><div className="idle-icon">▮▯▮▮▯▮</div><div className="idle-t">AWAITING SCAN</div><div className="idle-s">Scan a locals card with the barcode scanner</div></section>;
 const s=res.status||'unknown';const[ic,lab]=L[s]||L.unknown;
 return <section className={`status ${s}`} data-code={C[s]||C.unknown} key={res.barcode+s}><div className="st-icon">{ic}</div><div className="st-body">
  <div className="st-label">{lab}</div>
  {s!=='unknown'?<><div className="st-name">{res.first_name} {res.last_name}</div>
   <div className="st-meta">{res.membership_ends_at?<>{left(res.membership_ends_at)} <span>· {s==='expired'?'ended':'until'} {fmt(res.membership_ends_at)}</span></>:'No expiry set'}</div>
   {s==='expired'&&<div className="st-hint">Please renew via Bookwhen — £10 / 12 months</div>}</>
  :<div className="st-meta">Card <b>{res.barcode}</b> isn’t linked yet{res.err?<span> · {res.err}</span>:null}</div>}
  </div></section>;}
