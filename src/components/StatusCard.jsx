import {left,fmt} from '../lib.js';
import {formatVisitWhen} from '../lib/visits.js';
const L={valid:['✓','Valid'],expired:['!','Expired'],unknown:['?','Card not linked'],lost:['⚠','Card reported lost']};
export default function StatusCard({res}){
 if(!res)return <section className="status idle" aria-live="polite"><div className="idle-t">Ready to scan</div><div className="idle-s">Point the barcode scanner at a Locals card. Membership details will appear here.</div></section>;
 const s=res.status||'unknown';const[ic,lab]=L[s]||L.unknown;
 const v=res.visit;
 return <section className={`status ${s==='lost'?'expired':s}`} aria-live="polite">
  <div className="st-icon" aria-hidden="true">{ic}</div><div className="st-body">
  <div className="st-label">{lab}</div>
  {s!=='unknown'?<><div className="st-name">{res.first_name} {res.last_name}</div>
   <div className="st-meta">{res.membership_ends_at?<>{left(res.membership_ends_at)} <span>· {s==='expired'?'ended':'until'} {fmt(res.membership_ends_at)}</span></>:'No expiry set'}</div>
   {s==='expired'&&<div className="st-hint">Please renew via Bookwhen — £10 / 12 months</div>}
   {s==='valid'&&v?.recorded&&<div className="st-hint ok">Visit recorded · {formatVisitWhen(v.visited_at)} · today {v.visits_today}</div>}
   {s==='valid'&&v?.suppressed&&<div className="st-hint">Already checked in · next visit after {formatVisitWhen(v.next_eligible_at)}</div>}
   {s==='valid'&&v?.error&&<div className="st-hint err">Check-in not saved — {v.error}</div>}
   </>
  :<div className="st-meta">Card <b>{res.barcode}</b> is not linked yet{res.err?<span> · {res.err}</span>:null}</div>}
  </div></section>;}
