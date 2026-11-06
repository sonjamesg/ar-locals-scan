import {left,fmt} from '../lib.js';
import {formatVisitWhen} from '../lib/visits.js';
const C={valid:'STATUS 200 · ACCESS OK',expired:'STATUS 410 · EXPIRED',unknown:'STATUS 404 · NOT LINKED',lost:'STATUS 423 · CARD LOST'};
const L={valid:['✓','VALID'],expired:['!','EXPIRED'],unknown:['?','UNKNOWN CARD'],lost:['⚠','CARD LOST']};
export default function StatusCard({res}){
 if(!res)return <section className="status idle" data-code="SYS · ONLINE"><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/><i className="reticle"/><div className="idle-icon">▮▯▮▮▯▮</div><div className="idle-t">AWAITING SCAN</div><div className="idle-s">Scan a locals card with the barcode scanner</div></section>;
 const s=res.status||'unknown';const[ic,lab]=L[s]||L.unknown;
 const v=res.visit;
 return <section className={`status ${s==='lost'?'expired':s}`} data-code={C[s]||C.unknown} key={(res.barcode||'')+s+(v?.visit_id||v?.reason||'')}>
  <div className="st-icon">{ic}</div><div className="st-body">
  <div className="st-label">{lab}</div>
  {s!=='unknown'?<><div className="st-name">{res.first_name} {res.last_name}</div>
   <div className="st-meta">{res.membership_ends_at?<>{left(res.membership_ends_at)} <span>· {s==='expired'?'ended':'until'} {fmt(res.membership_ends_at)}</span></>:'No expiry set'}</div>
   {s==='expired'&&<div className="st-hint">Please renew via Bookwhen — £10 / 12 months</div>}
   {s==='valid'&&v?.recorded&&<div className="st-hint ok">Visit recorded · {formatVisitWhen(v.visited_at)} · today {v.visits_today}</div>}
   {s==='valid'&&v?.suppressed&&<div className="st-hint">Already checked in · next visit after {formatVisitWhen(v.next_eligible_at)}</div>}
   {s==='valid'&&v?.error&&<div className="st-hint err">Check-in not saved — {v.error}</div>}
   </>
  :<div className="st-meta">Card <b>{res.barcode}</b> isn’t linked yet{res.err?<span> · {res.err}</span>:null}</div>}
  </div></section>;}
