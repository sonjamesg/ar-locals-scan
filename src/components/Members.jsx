import {useEffect,useState} from 'react';import {sb} from '../lib.js';
export const bwUrl=id=>`https://atlanticreach.bookwhen.com/customers/${encodeURIComponent(id)}/subscriptions`;
const ph=v=>!v||!v.trim()||/^\(.*\)$/.test(v.trim())||v.trim()==='-';
export const nameOf=h=>{const n=[h.first_name,h.last_name].filter(x=>!ph(x)).join(' ');return n||null;};
export const label=h=>nameOf(h)||h.email||'(no name)';
export function OpenBtn({h}){return h.bookwhen_customer_id?<a className="btn ghost" href={bwUrl(h.bookwhen_customer_id)} target="_blank" rel="noopener noreferrer">Open memberships</a>:null;}
export function MemberInfo({h}){const n=nameOf(h);return <div className="hit-info">
 <span className="hit-name">{n||h.email||'(no name)'}</span>
 {n&&h.email&&<span className="hit-email">{h.email}</span>}
 <span className="hit-meta">{[h.membership_ends_at&&`ends ${h.membership_ends_at}`,h.card_barcode&&`card ${h.card_barcode}`,h.lost_card_at&&'⚠ card lost'].filter(Boolean).join(' · ')}</span></div>;}
export function Confirm({title,children,onYes,onNo,busy}){return <div className="modal-bg"><div className="modal" role="dialog">
 <h3>{title}</h3>{children}<div className="row"><button className="btn ghost lg" onClick={onNo} disabled={busy}>No</button><button className="btn primary lg" onClick={onYes} disabled={busy} autoFocus>Yes</button></div></div></div>;}
export function useSearch(q,withBookwhen){const[hits,setHits]=useState([]);const[busy,setBusy]=useState(false);
 useEffect(()=>{if(q.trim().length<2){setHits([]);return;}const t=setTimeout(async()=>{setBusy(true);
  const[l,bw]=await Promise.all([sb.rpc('search_members',{p_q:q}),withBookwhen?sb.functions.invoke('bookwhen-search',{body:{q}}).catch(()=>({data:[]})):{data:[]}]);
  const loc=(l.data||[]).map(m=>({...m,src:'Local'}));const ids=new Set(loc.map(m=>m.bookwhen_customer_id).filter(Boolean));
  setHits([...loc,...(Array.isArray(bw.data)?bw.data:[]).filter(x=>!ids.has(x.bookwhen_customer_id)).map(x=>({...x,email:x.email||x.email_hint,src:'Bookwhen'}))]);setBusy(false);},250);return()=>clearTimeout(t);},[q]);
 return{hits,busy};}
export function SearchPick({onPick,withBookwhen=true,emptyText='No matches'}){const[q,setQ]=useState('');const{hits,busy}=useSearch(q,withBookwhen);
 return <><input className="big-input" value={q} onChange={e=>setQ(e.target.value)} autoFocus placeholder="Search by name or email…"/>
  <ul className="hits">{busy&&<li className="muted">Searching…</li>}
   {!busy&&q.trim().length>=2&&!hits.length&&<li className="muted">{emptyText}</li>}
   {hits.map((h,i)=><li key={i} className="hit-row"><button className="hit" onClick={()=>onPick(h)}><MemberInfo h={h}/></button><OpenBtn h={h}/></li>)}</ul></>;}
export function Selected({h,onClear,children}){return <div className="selected"><div className="sel-h">// SELECTED MEMBER</div>
 <div className="hit-row"><MemberInfo h={h}/><OpenBtn h={h}/></div><div className="row">{children}<button className="btn ghost lg" onClick={onClear}>Clear</button></div></div>;}
