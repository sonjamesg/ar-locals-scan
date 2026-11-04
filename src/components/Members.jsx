import {useEffect,useState} from 'react';import {sb} from '../lib.js';
export const bwUrl=id=>`https://atlanticreach.bookwhen.com/customers/${encodeURIComponent(id)}/subscriptions`;
const ph=v=>!v||!v.trim()||/^\(.*\)$/.test(v.trim())||v.trim()==='-';
export const nameOf=h=>{const n=[h.first_name,h.last_name].filter(x=>!ph(x)).join(' ');return n||null;};
export const label=h=>nameOf(h)||h.email||'(no name)';
export const bwTerm=h=>{const e=(h.email||'').trim();if(e.includes('@'))return e.toLowerCase();const n=nameOf(h);return n?n.split(' ')[0]:'';};
export const bwSearchUrl=t=>`https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=&filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9&order=last_seen&reverse=0&search_text=${encodeURIComponent(t)}`;
export function OpenBtn({h}){const t=bwTerm(h);if(!t&&!h.bookwhen_customer_id)return null;return <div className="bw-acts" onClick={e=>e.stopPropagation()}>
 {t&&<a className="btn ghost bw-btn" href={bwSearchUrl(t)} target="_blank" rel="noopener noreferrer" title={`Search Bookwhen Locals for "${t}"`}>Open in Bookwhen ↗</a>}
 {h.bookwhen_customer_id&&<a className="btn primary bw-btn" href={bwUrl(h.bookwhen_customer_id)} target="_blank" rel="noopener noreferrer">Memberships ↗</a>}</div>;}
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
export function Selected({h,onClear,onUpdate,children,extra}){const cl=v=>ph(v)?'':v;const[f,setF]=useState(cl(h.first_name));const[l,setL]=useState(cl(h.last_name));const[st,setSt]=useState('');
 useEffect(()=>{setF(cl(h.first_name));setL(cl(h.last_name));},[h.id]);useEffect(()=>{setSt('');},[h.id]);
 const editable=h.id&&h.src!=='Bookwhen';const dirty=editable&&(f.trim()!==cl(h.first_name).trim()||l.trim()!==cl(h.last_name).trim());
 async function save(){if(!dirty){setSt('✓ No changes');return;}setSt('Saving…');const{error}=await sb.rpc('update_member_name',{p_member_id:h.id,p_first_name:f,p_last_name:l});
  if(error)return setSt('Error: '+error.message);setSt('✓ Saved');onUpdate&&onUpdate({...h,first_name:f.trim()||null,last_name:l.trim()||null});setTimeout(()=>setSt(s=>s==='✓ Saved'?'':s),2500);}
 return <div className="selected"><div className="sel-h"><button className="sel-x sel-back" onClick={onClear} title="Back to results">← Back</button><span>// MEMBER DETAILS</span></div>
 <div className="sel-body"><MemberInfo h={h}/><OpenBtn h={h}/></div>
 <CheckUser h={h} onUpdate={onUpdate}/>
 {editable&&<form className="name-edit" onSubmit={e=>{e.preventDefault();save();}}>
  <label>First name<input value={f} onChange={e=>{setF(e.target.value);setSt('');}} placeholder="First name"/></label>
  <label>Last name<input value={l} onChange={e=>{setL(e.target.value);setSt('');}} placeholder="Last name"/></label></form>}
 {extra&&<div className="sel-extra">{extra}</div>}
 <div className="sel-foot"><div className="sel-left">{children}</div><div className="sel-right">{st&&<span className={st.startsWith('Error')?'err':'ok'}>{st}</span>}
  {editable&&<button className={'btn lg '+(dirty?'primary':'ghost')} disabled={st==='Saving…'} onClick={save}>Save</button>}</div></div></div>;}
export function MarkLost({h,onMarked}){const[ask,setAsk]=useState(false);const[busy,setBusy]=useState(false);const[st,setSt]=useState('');
 if(!h.id||h.src==='Bookwhen')return null;
 if(h.lost_card_at)return <span className="muted">⚠ Already on lost cards list</span>;
 async function mark(){setBusy(true);const{error}=await sb.rpc('mark_card_lost',{p_member_id:h.id});setBusy(false);setAsk(false);
  if(error)return setSt('Error: '+error.message);setSt('✓ Added to lost cards list');onMarked&&onMarked({...h,lost_card_at:new Date().toISOString()});}
 return <><button type="button" className="btn ghost lg" onClick={()=>setAsk(true)}>Mark as lost</button>{st&&<span className={st.startsWith('Error')?'err':'ok'}>{st}</span>}
  {ask&&<Confirm title="Confirm lost card" busy={busy} onNo={()=>setAsk(false)} onYes={mark}><p>Confirm this is a real Locals member with an active membership (check Bookwhen) who has genuinely lost their card:</p><MemberInfo h={h}/><p className="muted">They'll be added to the Lost cards list for a replacement.</p></Confirm>}</>;}

const ago=t=>{const m=Math.round((Date.now()-new Date(t))/6e4);return m<1?'just now':m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:new Date(t).toLocaleDateString('en-GB');};
export function CheckUser({h,onUpdate}){const[r,setR]=useState(null);const[busy,setBusy]=useState(false);const[err,setErr]=useState('');
 useEffect(()=>{setR(null);setErr('');},[h.id]);
 if(!h.id||h.src==='Bookwhen')return null;
 const v=r||(h.bw_checked_at?h:null);
 async function run(){setBusy(true);setErr('');const{data,error}=await sb.functions.invoke('check-bookwhen-member',{body:{member_id:h.id}});
  let body=data;if(error){try{body=await error.context.json();}catch{body={error:error.message};}}
  setBusy(false);if(!body||body.error){setErr((body&&body.error)||'Check failed');return;}
  setR(body);onUpdate&&onUpdate({...h,...body});}
 const cls=v?(v.bw_status==='ACTIVE'?'bw-ok':'bw-bad'):'';
 return <div className="bw-check">
  <button type="button" className="btn primary bw-btn" onClick={run} disabled={busy||!h.bookwhen_customer_id} title={h.bookwhen_customer_id?'Check Locals membership in Bookwhen':'No Bookwhen ID — use Open in Bookwhen'}>{busy?'Checking…':'Check user'}</button>
  {v&&<span className={'bw-status '+cls}><b>{v.bw_status||'?'}</b>{v.bw_lcl&&<> · {v.bw_lcl}</>}{v.bw_renews_at&&<> · renews {new Date(v.bw_renews_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</>}<span className="muted"> · checked {ago(v.bw_checked_at)}</span></span>}
  {err&&<span className="err">{err}{/session/i.test(err)&&' — use Memberships ↗ to check manually'}</span>}
 </div>;}
