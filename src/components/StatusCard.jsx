import {left,fmt} from '../lib.js';
import {formatVisitWhen} from '../lib/visits.js';
import {statusMeta} from '../lib/statusCard.js';
import {IconAlert,IconBan,IconBarcode,IconCardLink,IconCheck,IconSearch} from './Icons.jsx';

const ICONS={valid:IconCheck,expired:IconAlert,lost:IconBan,unknown:IconCardLink,idle:IconSearch};

export default function StatusCard({res}){
  if(!res){
    return <section className="status idle" aria-live="polite">
      <div className="st-idle-icon" aria-hidden="true"><IconBarcode/></div>
      <div className="st-label">Ready to scan</div>
      <div className="st-meta">Point the barcode scanner at a Locals card. Membership details will appear here.</div>
    </section>;
  }
  const meta=statusMeta(res.status);
  const Icon=ICONS[meta.tone]||IconCardLink;
  const v=res.visit;
  const toneClass=meta.tone==='lost'?'expired lost':meta.tone;
  return <section className={`status ${toneClass}`} aria-live="polite" data-tone={meta.tone}>
    <div className="st-icon" aria-hidden="true"><Icon/></div>
    <div className="st-body">
      <div className="st-label">{meta.label}</div>
      {meta.tone==='unknown'?(
        <div className="st-meta">Card <b className="st-barcode">{res.barcode}</b> is not linked yet{res.err?<span> · {res.err}</span>:null}</div>
      ):(
        <>
          <div className="st-name">{res.first_name} {res.last_name}</div>
          <div className="st-meta">{res.membership_ends_at?<>{left(res.membership_ends_at)} <span>· {meta.tone==='expired'?'ended':'until'} {fmt(res.membership_ends_at)}</span></>:'No expiry set'}</div>
          {meta.tone==='valid'&&res.unchecked&&<div className="st-hint unchecked">Unchecked in Bookwhen — run Check user (Search Users) to confirm renewal date</div>}
          {meta.tone==='expired'&&<div className="st-hint">Please renew via Bookwhen — £10 / 12 months</div>}
          {meta.tone==='lost'&&<div className="st-hint">Do not accept this card — use Lost cards to issue a replacement</div>}
          {meta.tone==='valid'&&v?.recorded&&<div className="st-hint ok">Visit recorded · {formatVisitWhen(v.visited_at)} · today {v.visits_today}</div>}
          {meta.tone==='valid'&&v?.suppressed&&<div className="st-hint">Already checked in · next visit after {formatVisitWhen(v.next_eligible_at)}</div>}
          {meta.tone==='valid'&&v?.error&&<div className="st-hint err">Check-in not saved — {v.error}</div>}
        </>
      )}
    </div>
  </section>;
}
