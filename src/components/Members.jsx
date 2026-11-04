import {useEffect,useState} from 'react';import {sb} from '../lib.js';
export const bwUrl=id=>`https://atlanticreach.bookwhen.com/customers/${encodeURIComponent(id)}/subscriptions`;
const ph=v=>!v||!v.trim()||/^\(.*\)$/.test(v.trim())||v.trim()==='-';
export const nameOf=h=>{const n=[h.first_name,h.last_name].filter(x=>!ph(x)).join(' ');return n||null;};
export const label=h=>nameOf(h)||h.email||'(no name)';
export const bwTerm=h=>{const e=(h.email||'').trim();if(e.includes('@'))return e.toLowerCase();const n=nameOf(h);return n?n.split(' ')[0]:'';};
export const bwSearchUrl=t=>`https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=&filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9&order=last_seen&reverse=0&search_text=${encodeURIComponent(t)}`;
export function OpenBtn({h}){const t=bwTerm(h);if(!t&&!h.bookwhen_customer_id)return null;return <div className="bw-acts" onClick={e=>e.stopPropagation()}>
 {t&&<a className="btn ghost bw-btn" href={bwSearchUrl(t)} target="_blank" rel="noopener noreferrer" title={`Search Bookwhen Locals for "${t}"`}>Open in Bookwhen ↗</a>}
 {h.bookwhen_customer_id&&<a className="btn ghost bw-btn" href={bwUrl(h.bookwhen_customer_id)} target="_blank" rel="noopener noreferrer">Memberships ↗</a>}</div>;}
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
export function NameEdit({h,onSaved}){const cl=v=>ph(v)?'':v;const[f,setF]=useState(cl(h.first_name));const[l,setL]=useState(cl(h.last_name));const[st,setSt]=useState('');
 useEffect(()=>{setF(cl(h.first_name));setL(cl(h.last_name));setSt('');},[h.id]);
 if(!h.id||h.src==='Bookwhen')return null;const dirty=f.trim()!==cl(h.first_name).trim()||l.trim()!==cl(h.last_name).trim();
 async function save(){setSt('Saving…');const{error}=await sb.rpc('update_member_name',{p_member_id:h.id,p_first_name:f,p_last_name:l});
  if(error)return setSt('Error: '+error.message);setSt('✓ Saved');onSaved&&onSaved({...h,first_name:f.trim()||null,last_name:l.trim()||null});}
 return <form className="name-edit" onSubmit={e=>{e.preventDefault();if(dirty)save();}}>
  <label>First name<input value={f} onChange={e=>{setF(e.target.value);setSt('');}} placeholder="First name"/></label>
  <label>Last name<input value={l} onChange={e=>{setL(e.target.value);setSt('');}} placeholder="Last name"/></label>
  <button className="btn ghost" disabled={!dirty||st==='Saving…'}>Save name</button>{st&&<span className={st.startsWith('Error')?'err':'ok'}>{st}</span>}</form>;}
export function Selected({h,onClear,onUpdate,children}){return <div className="selected"><div className="sel-h"><span>// SELECTED MEMBER</span><button className="sel-x" onClick={onClear} title="Clear selection">✕ Clear</button></div>
 <div className="sel-body"><MemberInfo h={h}/><OpenBtn h={h}/></div><NameEdit h={h} onSaved={onUpdate}/><div className="sel-acts">{children}</div></div>;}
export function MarkLost({h,onMarked}){const[ask,setAsk]=useState(false);const[busy,setBusy]=useState(false);const[st,setSt]=useState('');
 if(!h.id||h.src==='Bookwhen')return null;
 if(h.lost_card_at)return <span className="muted">⚠ Already on lost cards list</span>;
 async function mark(){setBusy(true);const{error}=await sb.rpc('mark_card_lost',{p_member_id:h.id});setBusy(false);setAsk(false);
  if(error)return setSt('Error: '+error.message);setSt('✓ Added to lost cards list');onMarked&&onMarked({...h,lost_card_at:new Date().toISOString()});}
 return <><button type="button" className="btn ghost lg" onClick={()=>setAsk(true)}>Mark as lost</button>{st&&<span className={st.startsWith('Error')?'err':'ok'}>{st}</span>}
  {ask&&<Confirm title="Confirm lost card" busy={busy} onNo={()=>setAsk(false)} onYes={mark}><p>Confirm this is a real Locals member with an active membership (check Bookwhen) who has genuinely lost their card:</p><MemberInfo h={h}/><p className="muted">They'll be added to the Lost cards list for a replacement.</p></Confirm>}</>;}
