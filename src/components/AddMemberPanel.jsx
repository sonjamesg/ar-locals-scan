import {useState} from 'react';import {sb} from '../lib.js';import {Confirm,MemberInfo,OpenBtn,label} from './Members.jsx';
const today=()=>new Date().toISOString().slice(0,10);
const plus12=d=>{const[y,m,dd]=d.split('-').map(Number);const e=new Date(Date.UTC(y+1,m-1,dd));if(e.getUTCMonth()!==m-1)e.setUTCDate(0);return e.toISOString().slice(0,10);};
export default function AddMemberPanel({onMsg}){
 const[f,setF]=useState({email:'',first_name:'',last_name:'',barcode:'',issued_on:today()});const set=k=>e=>setF({...f,[k]:e.target.value});
 const[existing,setExisting]=useState(null);const[checked,setChecked]=useState(false);const[ask,setAsk]=useState(null);const[busy,setBusy]=useState(false);
 const email=f.email.trim().toLowerCase();const okEmail=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
 const reset=()=>{setF({email:'',first_name:'',last_name:'',barcode:'',issued_on:today()});setExisting(null);setChecked(false);setAsk(null);};
 async function check(e){e?.preventDefault();if(!okEmail)return onMsg({err:1,t:'Enter a valid email first'});setBusy(true);
  const{data,error}=await sb.rpc('search_members',{p_q:email});setBusy(false);if(error)return onMsg({err:1,t:error.message});
  setExisting((data||[]).filter(h=>(h.email||'').trim().toLowerCase()===email));setChecked(true);}
 async function save(){const b=f.barcode.trim();setBusy(true);let r;
  if(ask.member){r=await sb.rpc('link_card',{p_barcode:b,p_member_id:ask.member.id});}
  else{const fn=f.first_name.trim(),ln=f.last_name.trim();
   r=await sb.rpc('add_member_with_card',{p_first_name:fn,p_last_name:ln,p_barcode:b,p_issued_on:f.issued_on,p_email:email});
   if(r.error&&/function|schema cache|PGRST202/i.test((r.error.message||'')+(r.error.code||'')))
    r=await sb.rpc('link_card',{p_barcode:b,p_first_name:fn,p_last_name:ln||'-',p_email:email,p_ends_at:plus12(f.issued_on)});}
  setBusy(false);setAsk(null);if(r.error)return onMsg({err:1,t:r.error.message});
  onMsg({t:ask.member?`Card ${b} linked to ${label(ask.member)}`:`Added ${f.first_name} ${f.last_name} — card ${b} linked`});reset();}
 const cardOk=f.barcode.trim().length>=3&&f.issued_on;
 return <section className="panel"><h2>Add member</h2>
  <form onSubmit={check} className="row"><input className="big-input" type="email" autoFocus value={f.email} onChange={e=>{set('email')(e);setChecked(false);setExisting(null);}} placeholder="Email (required) — checks for existing member" autoComplete="off"/><button className="btn primary lg" disabled={!okEmail||busy}>Check email</button>{(f.email||checked)&&<button type="button" className="btn ghost lg" onClick={reset}>Clear</button>}</form>
  {checked&&<>
   {existing?.length?<><div className="am-banner warn"><b>Already a member</b><span>This email is in the system — link the card instead of creating a duplicate.</span></div>
    <div className="row"><input className="big-input" value={f.barcode} onChange={set('barcode')} placeholder="Scan / type card barcode…" autoComplete="off"/><label className="muted">Issued <input type="date" value={f.issued_on} onChange={set('issued_on')}/></label></div>
    <ul className="hits">{existing.map(h=><li key={h.id} className="hit-row"><MemberInfo h={h}/><div className="row"><OpenBtn h={h}/><button className="btn primary" disabled={!cardOk} onClick={()=>setAsk({member:h})}>Link card</button></div></li>)}</ul></>
   :<form className="add" onSubmit={e=>{e.preventDefault();if(cardOk&&f.first_name.trim()&&f.last_name.trim())setAsk({});}}>
    <div className="add-h"><span>// NEW MEMBER</span><span className="add-card">{f.barcode.trim()?<>CARD <code>{f.barcode.trim()}</code></>:'NO CARD YET'}</span></div>
    <div className="am-banner ok span4"><b>✓ Email is free</b><span>No member with this email — creating a new member.</span></div>
    <label>First name<input value={f.first_name} onChange={set('first_name')} placeholder="e.g. Jane" required autoFocus/></label>
    <label>Last name<input value={f.last_name} onChange={set('last_name')} placeholder="e.g. Smith" required/></label>
    <label className="span4">Email<output className="until am-email">{email}</output></label>
    <label className="span4">Card barcode<input value={f.barcode} onChange={set('barcode')} placeholder="Scan / type card barcode…" autoComplete="off" required/></label>
    <label>Card issue date<input type="date" value={f.issued_on} max={today()} onChange={set('issued_on')} required/></label>
    <label>Valid until<output className="until">{f.issued_on?plus12(f.issued_on):'—'}</output></label>
    <div className="add-acts"><button type="button" className="btn ghost" onClick={reset}>Clear</button><button className="btn primary" disabled={!cardOk||!f.first_name.trim()||!f.last_name.trim()}>Done</button></div></form>}
  </>}
  {ask&&<Confirm title="Are you sure the details are correct?" busy={busy} onNo={()=>setAsk(null)} onYes={save}>
   {ask.member?<><p>Link card <code>{f.barcode.trim()}</code> to:</p><MemberInfo h={ask.member}/></>
   :<><p><b>{f.first_name} {f.last_name}</b><br/>{email}</p><p>Card <code>{f.barcode.trim()}</code> · issued {f.issued_on} · expires {plus12(f.issued_on)}</p></>}</Confirm>}
 </section>;}
