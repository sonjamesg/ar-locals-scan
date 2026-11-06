import {useState} from 'react';
import {SearchPick,Selected,Confirm,MemberInfo,MarkLost,UnlinkCard} from './Members.jsx';
import {MEMBER_NOT_FOUND_GUIDE} from '../lib/memberNotFound.js';
import {IconCardLink} from './Icons.jsx';

export default function LinkPanel({barcode,onLink}){
  const[sel,setSel]=useState(null);
  const[ask,setAsk]=useState(null);
  const[busy,setBusy]=useState(false);
  const go=async fn=>{setBusy(true);try{await fn();}finally{setBusy(false);setAsk(null);}};
  return <section className="panel link-panel">
    <div className="link-head">
      <div className="link-ico" aria-hidden="true"><IconCardLink/></div>
      <div>
        <h2>Link card <code>{barcode}</code> to a member</h2>
        <p className="link-guide muted">Use the <b>original Locals Card signup email</b> if the name search fails — it can differ from the email they give at reception.</p>
      </div>
    </div>
    {sel?<Selected h={sel} onClear={()=>setSel(null)} onUpdate={setSel}><MarkLost h={sel} onMarked={setSel}/><UnlinkCard h={sel} onUnlinked={setSel}/><button className="btn ghost lg" onClick={()=>setAsk({t:'link'})}>Link card</button></Selected>:null}
    <div hidden={!!sel}>
      <SearchPick
        onPick={setSel}
        label="Find existing member"
        placeholder="Search by name or signup email"
        emptyText="No matches — try the original signup email or name"
        emptyGuide={<><b>Cannot find them?</b>{MEMBER_NOT_FOUND_GUIDE}</>}
      />
    </div>
    {ask?.t==='link'&&<Confirm title="Confirm card link" busy={busy} onNo={()=>setAsk(null)} onYes={()=>go(()=>onLink(sel))}>
      <p>Link card <code>{barcode}</code> to:</p><MemberInfo h={sel}/>
    </Confirm>}
  </section>;
}
