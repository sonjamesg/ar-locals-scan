import {useEffect,useState} from 'react';import {sb} from '../lib.js';
export default function LinkPanel({barcode,onLink}){const[q,setQ]=useState('');const[hits,setHits]=useState([]);const[busy,setBusy]=useState(false);const[add,setAdd]=useState(false);
 useEffect(()=>{if(q.trim().length<2){setHits([]);return;}const t=setTimeout(async()=>{setBusy(true);
  const[l,bw]=await Promise.all([sb.rpc('search_members',{p_q:q}),sb.functions.invoke('bookwhen-search',{body:{q}}).catch(()=>({data:[]}))]);
  const loc=(l.data||[]).map(m=>({...m,src:'Local'}));const ids=new Set(loc.map(m=>m.bookwhen_customer_id).filter(Boolean));
  setHits([...loc,...(Array.isArray(bw.data)?bw.data:[]).filter(x=>!ids.has(x.bookwhen_customer_id)).map(x=>({...x,src:'Bookwhen'}))]);setBusy(false);},250);return()=>clearTimeout(t);},[q]);
 const addNew=e=>{e.preventDefault();const f=new FormData(e.target);onLink({src:'New',first_name:f.get('fn'),last_name:f.get('ln'),email:f.get('em')});};
 return <section className="panel"><h2>Link card <code>{barcode}</code> to a member</h2>
  <input className="big-input" value={q} onChange={e=>setQ(e.target.value)} autoFocus placeholder="Start typing the member’s name…"/>
  <ul className="hits">{busy&&<li className="muted">Searching…</li>}
   {!busy&&q.trim().length>=2&&!hits.length&&<li className="muted">No matches — add them below</li>}
   {hits.map((h,i)=><li key={i}><button className="hit" onClick={()=>onLink(h)}>
    <span className="hit-name">{h.first_name} {h.last_name}</span>
    <span className="hit-meta">{h.email_hint||h.email||''}{h.membership_ends_at?` · ends ${h.membership_ends_at}`:''}</span>
    <span className={`tag ${h.src.toLowerCase()}`}>{h.src}</span></button></li>)}</ul>
  {!add?<button className="btn ghost" onClick={()=>setAdd(true)}>+ Not found? Add new member</button>:
  <form className="add" onSubmit={addNew}><input name="fn" placeholder="First name" required autoFocus/><input name="ln" placeholder="Last name" required/><input name="em" type="email" placeholder="Email (optional)"/><button className="btn primary">Add &amp; link card</button></form>}
 </section>;}
