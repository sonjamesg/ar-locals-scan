import {useEffect,useState} from 'react';import {sb} from '../lib.js';
export const bwUrl=id=>`https://atlanticreach.bookwhen.com/customers/${encodeURIComponent(id)}/subscriptions`;
const ph=v=>!v||!v.trim()||/^\(.*\)$/.test(v.trim())||v.trim()==='-';
export const nameOf=h=>{const n=[h.first_name,h.last_name].filter(x=>!ph(x)).join(' ');return n||null;};
export const label=h=>nameOf(h)||h.email||'(no name)';
export const bwTerm=h=>{const e=(h.email||'').trim();if(e.includes('@'))return e.toLowerCase();const n=nameOf(h);return n?n.split(' ')[0]:'';};
export const bwSearchUrl=t=>`https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=&filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9&order=last_seen&reverse=0&search_text=${encodeURIComponent(t)}`;
export function OpenBtn({h}){const t=bwTerm(h);if(!t&&!h.bookwhen_customer_id)return null;return <div className="bw-acts" onClick={e=>e.stopPropagation()}>
 {t&&<a className="btn ghost bw-btn" href={bwSearchUrl(t)} target="_blank" rel="noopener noreferrer" title={`Search Bookwhen Locals for "${t}"`}>Open in Bookwhen ↗</a>}
 {h.bookwhen_customer_id&&<a className="bw-sub" href={bwUrl(h.bookwhen_customer_id)} target="_blank" rel="noopener noreferrer">memberships</a>}</div>;}
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
export function Selected({h,onClear,children}){return <div className="selected"><div className="sel-h"><span>// SELECTED MEMBER</span><button className="sel-x" onClick={onClear} title="Clear selection">✕ Clear</button></div>
 <div className="sel-body"><MemberInfo h={h}/><OpenBtn h={h}/></div><div className="sel-acts">{children}</div></div>;}
