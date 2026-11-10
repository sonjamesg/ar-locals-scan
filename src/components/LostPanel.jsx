import {useEffect,useState} from 'react';import {sb} from '../lib.js';import {SearchPick,Selected,Confirm,MemberInfo,OpenBtn,MarkLost,UnlinkCard,label,BwChips,StatusChip,RenewChip,NewBadge,nameOf,bwTerm,bwSearchUrl,bwUrl} from './Members.jsx';
import {isUnchecked} from '../lib/memberFilters.js';
import {IconCardLink,IconX,IconExternalLink} from './Icons.jsx';
import {MEMBER_NOT_FOUND_SHORT} from '../lib/memberNotFound.js';
export function LostPanel({onDone,onMsg,searchPrefill=""}){const[sel,setSel]=useState(null);const[ask,setAsk]=useState(false);const[busy,setBusy]=useState(false);
 async function mark(){setBusy(true);const{error}=await sb.rpc('mark_card_lost',{p_member_id:sel.id});setBusy(false);setAsk(false);
  if(error)return onMsg({err:1,t:error.message});onMsg({t:`${label(sel)} added to the lost cards list`});onDone();}
 return <section className="panel"><h2>Search users</h2>
  {sel?<Selected h={sel} onClear={()=>setSel(null)} onUpdate={setSel}><MarkLost h={sel} onMarked={h=>{setSel(h);onMsg({t:`${label(h)} added to the lost cards list`});}}/><UnlinkCard h={sel} onUnlinked={h=>{setSel(h);onMsg({t:`Card unlinked from ${label(h)} — now pending a new card`});}}/></Selected>:null}
  <div hidden={!!sel}><SearchPick onPick={setSel} withBookwhen={false} initialQuery={searchPrefill} emptyText="No matching members — try part of the name or email" emptyGuide={<><b>Cannot find them?</b> {MEMBER_NOT_FOUND_SHORT}</>}/></div>
  {ask&&<Confirm title="Confirm lost card" busy={busy} onNo={()=>setAsk(false)} onYes={mark}><p>Confirm this is a real Locals member with an active membership (check Bookwhen) who has genuinely lost their card:</p><MemberInfo h={sel}/></Confirm>}
 </section>;}
export function QueuePanel({onMsg}){const[rows,setRows]=useState(null);const[sel,setSel]=useState(null);const[bc,setBc]=useState('');const[ask,setAsk]=useState(false);const[busy,setBusy]=useState(false);
 const load=async()=>{const{data,error}=await sb.rpc('list_lost_cards');if(error)onMsg({err:1,t:error.message});setRows(data||[]);};useEffect(()=>{load();},[]);
 async function link(){setBusy(true);const b=bc.trim();const{error}=await sb.rpc('link_card',{p_barcode:b,p_member_id:sel.id});setBusy(false);setAsk(false);
  if(error)return onMsg({err:1,t:error.message});onMsg({t:`New card ${b} linked to ${label(sel)} — removed from lost list`});setSel(null);setBc('');load();}
 async function unmark(h){const{error}=await sb.rpc('unmark_card_lost',{p_member_id:h.id});if(error)return onMsg({err:1,t:error.message});load();}
 return <section className="panel"><h2>Lost cards — replacement queue {rows&&<span className="muted">({rows.length})</span>}</h2>
  {sel?<Selected h={sel} onClear={()=>{setSel(null);setBc('');}} onUpdate={setSel}>
    <form onSubmit={e=>{e.preventDefault();if(bc.trim())setAsk(true);}} className="row"><input className="big-input" autoFocus value={bc} onChange={e=>setBc(e.target.value)} placeholder="Scan new card…" autoComplete="off"/><button className="btn primary lg" disabled={!bc.trim()}>Done</button></form></Selected>
  :<ul className="hits">{rows===null&&<li className="muted">Loading…</li>}{rows?.length===0&&<li className="muted">No lost cards waiting</li>}
   {rows?.map(h=><li key={h.id} className="hit-row"><MemberInfo h={h}/><div className="row"><OpenBtn h={h}/><button className="btn primary" onClick={()=>setSel(h)}>Link new card</button><button className="btn ghost" title="Remove from list" onClick={()=>unmark(h)}>✕</button></div></li>)}</ul>}
  {ask&&<Confirm title="Confirm details?" busy={busy} onNo={()=>setAsk(false)} onYes={link}><p>Link new card <code>{bc.trim()}</code> to:</p><MemberInfo h={sel}/>{sel.card_barcode&&<p className="muted">Old card {sel.card_barcode} will be deactivated.</p>}</Confirm>}
 </section>;}
export function PendingPanel({onMsg}){const[rows,setRows]=useState(null);const[sel,setSel]=useState(null);const[bc,setBc]=useState('');const[ask,setAsk]=useState(false);const[busy,setBusy]=useState(false);
 const load=async()=>{const{data,error}=await sb.rpc('list_pending_cards');if(error)onMsg({err:1,t:error.message});setRows(data||[]);};useEffect(()=>{load();},[]);
 async function link(){setBusy(true);const b=bc.trim();const{error}=await sb.rpc('link_card',{p_barcode:b,p_member_id:sel.id});if(!error)await sb.rpc('mark_card_issued',{p_member_id:sel.id});setBusy(false);setAsk(false);
  if(error)return onMsg({err:1,t:error.message});onMsg({t:`Card ${b} linked to ${label(sel)} — ready to hand over`});setSel(null);setBc('');load();}
 async function clear(h){const{error}=await sb.rpc('mark_card_issued',{p_member_id:h.id});if(error)return onMsg({err:1,t:error.message});load();}
 return <section className="panel"><header className="pend-head"><h2>Pending cards{rows&&<span className="pend-count" aria-label={`${rows.length} waiting`}>{rows.length}</span>}</h2><p className="pend-sub">New members waiting for a physical card</p></header>
  {sel?<Selected h={sel} onClear={()=>{setSel(null);setBc('');}} onUpdate={setSel}>
    <form onSubmit={e=>{e.preventDefault();if(bc.trim())setAsk(true);}} className="row"><input className="big-input" autoFocus value={bc} onChange={e=>setBc(e.target.value)} placeholder="Scan new card…" autoComplete="off"/><button className="btn primary lg" disabled={!bc.trim()}>Done</button></form></Selected>
  :rows===null?<p className="muted">Loading…</p>:rows.length===0?<PendingEmpty/>
   :<ul className="pend-list">{rows.map(h=><PendingRow key={h.id} h={h} onLink={()=>setSel(h)} onClear={()=>clear(h)}/>)}</ul>}
  {ask&&<Confirm title="Confirm details?" busy={busy} onNo={()=>setAsk(false)} onYes={link}><p>Link card <code>{bc.trim()}</code> to:</p><MemberInfo h={sel}/></Confirm>}
 </section>;}
/** Show the end date only when it adds something (no Bookwhen renewal chip, or it differs). */
export function pendingEnds(h){const e=h.membership_ends_at;if(!e)return null;const r=RenewChip({h});if(r&&h.bw_renews_at&&String(h.bw_renews_at).slice(0,10)===String(e).slice(0,10))return null;
 return new Date(e).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function PendingEmpty(){return <div className="pend-empty"><span className="pend-empty-ico"><IconCardLink width={26} height={26}/></span><h3>All caught up</h3><p>No new members are waiting for a card. New Bookwhen sign-ups appear here automatically.</p></div>;}
export function PendingRow({h,onLink,onClear}){const n=nameOf(h);const shown=n||h.email||'(no name)';const t=bwTerm(h);const ends=pendingEnds(h);
 return <li className="pend-row">
  <div className="pend-info">
   <div className="pend-name-row"><NewBadge h={h}/><span className="pend-name" title={shown}>{shown}</span><span className="card-link-badge card-unlinked pend-chip" title="Paid member — needs a Locals card linked">Card pending</span></div>
   {n&&h.email&&<span className="pend-email" title={h.email}>{h.email}</span>}
   {(ends||isUnchecked(h))&&<span className="pend-meta">{isUnchecked(h)&&<span className="hit-unchecked" title="Not checked in Bookwhen yet — run Check user">Unchecked</span>}{ends&&<span>Valid until {ends}</span>}</span>}
  </div>
  <div className="pend-chips"><span className="hit-slot hit-slot-status"><StatusChip h={h}/></span><span className="hit-slot hit-slot-renew"><RenewChip h={h}/></span></div>
  <div className="pend-acts">
   {t&&<a className="btn ghost pend-sec" href={bwSearchUrl(t)} target="_blank" rel="noopener noreferrer" title={`Search Bookwhen Locals for "${t}"`}>Bookwhen <IconExternalLink width={13} height={13}/></a>}
   {h.bookwhen_customer_id&&<a className="btn ghost pend-sec" href={bwUrl(h.bookwhen_customer_id)} target="_blank" rel="noopener noreferrer" title="Open Bookwhen memberships">Memberships <IconExternalLink width={13} height={13}/></a>}
   <button className="btn primary pend-link" onClick={onLink}><IconCardLink width={16} height={16}/> Link card</button>
   <button className="pend-x" title="Remove from list" aria-label={`Remove ${shown} from pending cards`} onClick={onClear}><IconX width={16} height={16}/></button>
  </div>
 </li>;}
