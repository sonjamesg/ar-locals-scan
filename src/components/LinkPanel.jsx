import {useState} from 'react';import {SearchPick,Selected,Confirm,MemberInfo,label} from './Members.jsx';
const addYear=d=>{const[y,m,dd]=d.split('-').map(Number);const x=new Date(Date.UTC(y+1,m-1,dd));if(x.getUTCMonth()!==m-1)x.setUTCDate(0);return x.toISOString().slice(0,10);};
const gb=d=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export default function LinkPanel({barcode,onLink,onAdd}){const[sel,setSel]=useState(null);const[add,setAdd]=useState(false);const[ask,setAsk]=useState(null);const[busy,setBusy]=useState(false);
 const today=new Date().toISOString().slice(0,10);const[iss,setIss]=useState(today);const until=iss?addYear(iss):'';
 const go=async fn=>{setBusy(true);try{await fn();}finally{setBusy(false);setAsk(null);}};
 const addNew=e=>{e.preventDefault();const f=new FormData(e.target);setAsk({t:'add',d:{first_name:f.get('fn'),last_name:f.get('ln'),email:f.get('em'),issued_on:iss}});};
 return <section className="panel"><h2>Link card <code>{barcode}</code> to a member</h2>
  {sel?<Selected h={sel} onClear={()=>setSel(null)} onUpdate={setSel}><button className="btn primary lg" onClick={()=>setAsk({t:'link'})}>Done</button></Selected>
   :<SearchPick onPick={setSel} emptyText="No matches — add them below"/>}
  {!sel&&(!add?<button className="btn ghost" onClick={()=>setAdd(true)}>+ Not found? Add new member</button>:
  <form className="add" onSubmit={addNew}><div className="add-h"><span>// NEW MEMBER</span><span className="add-card">CARD <code>{barcode}</code></span></div>
   <label>First name<input name="fn" placeholder="e.g. Jane" required autoFocus/></label>
   <label>Last name<input name="ln" placeholder="e.g. Smith" required/></label>
   <label className="span2">Card issue date<input type="date" value={iss} max={today} onChange={e=>setIss(e.target.value)} required/></label>
   <label className="span2">Valid until<output className="until">{until?gb(until):'—'}</output></label>
   <label className="span4">Email <i>(optional)</i><input name="em" type="email" placeholder="name@example.com"/></label>
   <div className="add-acts"><button type="reset" className="btn ghost" onClick={()=>{setIss(today);setAdd(false);}}>Clear</button><button className="btn primary">Done</button></div></form>)}
  {ask?.t==='link'&&<Confirm title="Are you sure the details are correct?" busy={busy} onNo={()=>setAsk(null)} onYes={()=>go(()=>onLink(sel))}>
   <p>Link card <code>{barcode}</code> to:</p><MemberInfo h={sel}/></Confirm>}
  {ask?.t==='add'&&<Confirm title="Are you sure the details are correct?" busy={busy} onNo={()=>setAsk(null)} onYes={()=>go(()=>onAdd(ask.d))}>
   <p><b>{ask.d.first_name} {ask.d.last_name}</b>{ask.d.email&&<> · {ask.d.email}</>}</p><p>Card <code>{barcode}</code> · issued {gb(ask.d.issued_on)} · valid until {gb(addYear(ask.d.issued_on))}</p></Confirm>}
 </section>;}
