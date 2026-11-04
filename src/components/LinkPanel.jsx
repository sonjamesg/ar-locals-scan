import {useEffect,useState} from 'react';import {sb} from '../lib.js';
const addYear=d=>{const[y,m,dd]=d.split('-').map(Number);const x=new Date(Date.UTC(y+1,m-1,dd));if(x.getUTCMonth()!==m-1)x.setUTCDate(0);return x.toISOString().slice(0,10);};
export default function LinkPanel({barcode,onLink,onAdd}){const[q,setQ]=useState('');const[hits,setHits]=useState([]);const[busy,setBusy]=useState(false);const[add,setAdd]=useState(false);
 useEffect(()=>{if(q.trim().length<2){setHits([]);return;}const t=setTimeout(async()=>{setBusy(true);
  const[l,bw]=await Promise.all([sb.rpc('search_members',{p_q:q}),sb.functions.invoke('bookwhen-search',{body:{q}}).catch(()=>({data:[]}))]);
  const loc=(l.data||[]).map(m=>({...m,src:'Local'}));const ids=new Set(loc.map(m=>m.bookwhen_customer_id).filter(Boolean));
  setHits([...loc,...(Array.isArray(bw.data)?bw.data:[]).filter(x=>!ids.has(x.bookwhen_customer_id)).map(x=>({...x,src:'Bookwhen'}))]);setBusy(false);},250);return()=>clearTimeout(t);},[q]);
 const today=new Date().toISOString().slice(0,10);const[iss,setIss]=useState(today);
 const until=iss?addYear(iss):'';
 const addNew=e=>{e.preventDefault();const f=new FormData(e.target);onAdd({first_name:f.get('fn'),last_name:f.get('ln'),email:f.get('em'),issued_on:iss});};
 return <section className="panel"><h2>Link card <code>{barcode}</code> to a member</h2>
  <input className="big-input" value={q} onChange={e=>setQ(e.target.value)} autoFocus placeholder="Search by name or email…"/>
  <ul className="hits">{busy&&<li className="muted">Searching…</li>}
   {!busy&&q.trim().length>=2&&!hits.length&&<li className="muted">No matches — add them below</li>}
   {hits.map((h,i)=><li key={i}><button className="hit" onClick={()=>onLink(h)}>
    <span className="hit-name">{h.last_name==='(email)'?(h.email||h.email_hint||h.first_name):`${h.first_name} ${h.last_name}`}</span>
    <span className="hit-meta">{h.email_hint||h.email||''}{h.membership_ends_at?` · ends ${h.membership_ends_at}`:''}</span>
    <span className={`tag ${h.src.toLowerCase()}`}>{h.src}</span></button>
    {h.bookwhen_customer_id&&<a className="btn ghost" href={`https://atlanticreach.bookwhen.com/customers/${encodeURIComponent(h.bookwhen_customer_id)}/subscriptions`} target="_blank" rel="noopener noreferrer">Open memberships</a>}</li>)}</ul>
  {!add?<button className="btn ghost" onClick={()=>setAdd(true)}>+ Not found? Add new member</button>:
  <form className="add" onSubmit={addNew}><div className="add-h">// NEW MEMBER · CARD <code>{barcode}</code></div>
   <label>First name<input name="fn" placeholder="e.g. Jane" required autoFocus/></label>
   <label>Last name<input name="ln" placeholder="e.g. Smith" required/></label>
   <label>Card issue date<input type="date" value={iss} max={today} onChange={e=>setIss(e.target.value)} required/></label>
   <label>Valid until<output className="until">{until?new Date(until).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—'}</output></label>
   <label>Email <i>(optional)</i><input name="em" type="email" placeholder="name@example.com"/></label>
   <button className="btn primary">Add member &amp; check card</button></form>}
 </section>;}
