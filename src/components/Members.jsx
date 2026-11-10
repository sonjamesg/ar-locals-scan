import VisitStats from './VisitStats.jsx';
import {useEffect,useState} from 'react';import {sb} from '../lib.js';
import {IconSearch,IconArrowLeft,IconUser,IconPencil,IconCalendar,IconSettings,IconExternalLink} from './Icons.jsx';
import {renewalInfo} from '../lib/renewal.js';
import {smartSearch} from '../lib/smartSearch.js';
import {cardLinkStatus,isNew} from '../lib/memberFilters.js';
export const bwUrl=id=>`https://atlanticreach.bookwhen.com/customers/${encodeURIComponent(id)}/subscriptions`;
const ph=v=>!v||!v.trim()||/^\(.*\)$/.test(v.trim())||v.trim()==='-';
export const nameOf=h=>{const n=[h.first_name,h.last_name].filter(x=>!ph(x)).join(' ');return n||null;};
export const label=h=>nameOf(h)||h.email||'(no name)';
export const bwTerm=h=>{const e=(h.email||'').trim();if(e.includes('@'))return e.toLowerCase();const n=nameOf(h);return n?n.split(' ')[0]:'';};
export const bwSearchUrl=t=>`https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=&filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9&order=last_seen&reverse=0&search_text=${encodeURIComponent(t)}`;
export function OpenBtn({h}){const t=bwTerm(h);if(!t&&!h.bookwhen_customer_id)return null;return <div className="bw-acts" onClick={e=>e.stopPropagation()}>
 {t&&<a className="btn ghost bw-btn" href={bwSearchUrl(t)} target="_blank" rel="noopener noreferrer" title={`Search Bookwhen Locals for "${t}"`}>Open in Bookwhen ↗</a>}
 {h.bookwhen_customer_id&&<a className="btn primary bw-btn" href={bwUrl(h.bookwhen_customer_id)} target="_blank" rel="noopener noreferrer">Memberships ↗</a>}</div>;}
export const ago=t=>{const m=Math.round((Date.now()-new Date(t))/6e4);return m<1?'just now':m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:new Date(t).toLocaleDateString('en-GB');};
export function CardLinkBadge({h}){const s=cardLinkStatus(h);return <span className={'card-link-badge '+(s.linked?'card-linked':'card-unlinked')} title={s.linked?'Has an active Locals card barcode':'No usable Locals card linked yet'}>{s.label}</span>;}
/** Row status chip: Cancelled > Pending card (unchecked) > Bookwhen status. LCL ids stay on member detail. */
export function StatusChip({h}){
 if(h.cancelled_at)return <span className="amc amc-st bw-cancel" title={'Cancelled '+new Date(h.cancelled_at).toLocaleDateString('en-GB')}><i/>Cancelled</span>;
 if(h.bw_checked_at)return <span className={'amc amc-st '+(h.bw_status==='ACTIVE'?'bw-ok':'bw-bad')} title={'Checked '+ago(h.bw_checked_at)}><i/>{h.bw_status||'?'}</span>;
 if(h.pending_card)return <span className="amc amc-pend">PENDING CARD</span>;
 return null;}
/** Bookwhen renewal date chip (no trailing last-checked date in rows). */
export function RenewChip({h}){if(!h.bw_checked_at||h.cancelled_at||!h.bw_renews_at)return null;
 const d=new Date(h.bw_renews_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});
 return <span className="amc amc-renew" title="Renews (Bookwhen)">↻ {d}</span>;}
/** Compact chips for simple lists (e.g. Pending cards). */
export function BwChips({h}){const s=StatusChip({h}),r=RenewChip({h});if(!s&&!r)return null;return <span className="am-chips">{s}{r}</span>;}
export function MemberInfo({h,badge=true}){const n=nameOf(h);const shown=n||h.email||'(no name)';return <div className="hit-info">
 <div className="hit-name-row"><span className="hit-name" title={shown}>{shown}</span>{badge&&<CardLinkBadge h={h}/>}</div>
 {n&&h.email&&<span className="hit-email" title={h.email}>{h.email}</span>}
 <span className="hit-meta">{h._partial&&<span className="hit-partial" title={`Matches ${h._matched} of ${h._total} words`}>partial match</span>}{[h.membership_ends_at&&`ends ${h.membership_ends_at}`,h.lost_card_at&&'⚠ card lost',h.cancelled_at&&'✕ cancelled'].filter(Boolean).join(' · ')}</span></div>;}
/** Aligned list row: name | NEW | (right) status · card · renewal. Empty cells keep columns from shifting. */
export function MemberRowCells({h,newBadge=null,status}){return <>
 <MemberInfo h={h} badge={false}/>
 <span className="hit-col hit-col-new">{newBadge}</span>
 <span className="hit-col hit-col-right">
  <span className="hit-slot hit-slot-status">{status===undefined?<StatusChip h={h}/>:status}</span>
  <span className="hit-slot hit-slot-card"><CardLinkBadge h={h}/></span>
  <span className="hit-slot hit-slot-renew"><RenewChip h={h}/></span>
 </span></>;}
export const NewBadge=({h})=>isNew(h)?<span className="amc new-badge" title={'Joined '+new Date(h.joined_at).toLocaleDateString('en-GB')}>NEW</span>:null;
export function Confirm({title,children,onYes,onNo,busy}){return <div className="modal-bg"><div className="modal" role="dialog">
 <h3>{title}</h3>{children}<div className="row"><button className="btn ghost lg" onClick={onNo} disabled={busy}>No</button><button className="btn primary lg" onClick={onYes} disabled={busy} autoFocus>Yes</button></div></div></div>;}
/** Member list cache for forgiving client-side search (~1k rows). Refreshes when older than 60s. */
let memberCache={rows:null,at:0,p:null};
export function invalidateMemberCache(){memberCache={rows:null,at:0,p:null};}
async function loadMembers(){
 if(memberCache.rows&&Date.now()-memberCache.at<60_000)return memberCache.rows;
 if(memberCache.p)return memberCache.p;
 memberCache.p=(async()=>{const{data,error}=await sb.rpc('list_members');memberCache.p=null;if(error)throw error;memberCache={rows:data||[],at:Date.now(),p:null};return memberCache.rows;})();
 return memberCache.p;}
export function useSearch(q,withBookwhen){const[hits,setHits]=useState([]);const[busy,setBusy]=useState(false);const[err,setErr]=useState('');
 useEffect(()=>{if(q.trim().length<2){setHits([]);setErr('');return;}let off=false;const t=setTimeout(async()=>{setBusy(true);setErr('');
  let loc=[];
  try{loc=smartSearch(await loadMembers(),q).map(m=>({...m,src:'Local'}));}
  catch(e){const l=await sb.rpc('search_members',{p_q:q});if(l.error){if(!off){setErr(l.error.message);setHits([]);setBusy(false);}return;}loc=(l.data||[]).map(m=>({...m,src:'Local'}));}
  const bw=withBookwhen?await sb.functions.invoke('bookwhen-search',{body:{q}}).catch(()=>({data:[]})):{data:[]};
  if(off)return;
  const ids=new Set(loc.map(m=>m.bookwhen_customer_id).filter(Boolean));
  setHits([...loc,...(Array.isArray(bw.data)?bw.data:[]).filter(x=>!ids.has(x.bookwhen_customer_id)).map(x=>({...x,email:x.email||x.email_hint,src:'Bookwhen'}))]);setBusy(false);},200);return()=>{off=true;clearTimeout(t);};},[q,withBookwhen]);
 return{hits,busy,err};}
export function SearchPick({onPick,withBookwhen=true,emptyText='No matches',emptyGuide=null,label='Find existing member',placeholder='Search by name or signup email',initialQuery=''}){const[q,setQ]=useState(initialQuery||'');useEffect(()=>{if(initialQuery!=null&&initialQuery!=='')setQ(initialQuery);},[initialQuery]);const{hits,busy,err}=useSearch(q,withBookwhen);
 const empty=!busy&&!err&&q.trim().length>=2&&!hits.length;
 return <div className="search-pick">
  {label&&<label className="search-label" htmlFor="member-search">{label}</label>}
  <div className="search-field">
   <span className="search-ico" aria-hidden="true"><IconSearch/></span>
   <input id="member-search" className="big-input search-input" value={q} onChange={e=>setQ(e.target.value)} autoFocus placeholder={placeholder} aria-label={placeholder||label||'Search by name or signup email'}/>
  </div>
  {err&&<div className="err md-err" role="alert">Search failed — {err}</div>}
  <ul className="hits">{busy&&<li className="muted">Searching…</li>}
   {empty&&<li className="muted">{emptyText}</li>}
   {hits.map((h,i)=><li key={i} className="hit-row"><button className="hit hit-grid" onClick={()=>onPick(h)}><MemberRowCells h={h} newBadge={<NewBadge h={h}/>}/></button><OpenBtn h={h}/></li>)}</ul>
  {empty&&emptyGuide&&<div className="not-found-guide">{emptyGuide}</div>}
 </div>;}
/** Status tile text + tone for member detail. */
function statusOf(h){
 if(h.cancelled_at)return {t:'Cancelled',tone:'bad',sub:'on '+new Date(h.cancelled_at).toLocaleDateString('en-GB')};
 if(h.bw_checked_at)return {t:h.bw_status||'Unknown',tone:h.bw_status==='ACTIVE'?'ok':'bad',sub:h.bw_lcl?'LCL '+String(h.bw_lcl).replace(/^LCL/,''):null};
 if(h.pending_card)return {t:'Card pending',tone:'warn',sub:null};
 return {t:'Not checked',tone:'mut',sub:null};}
export function Selected({h,onClear,onUpdate,children,extra}){const cl=v=>ph(v)?'':v;const[f,setF]=useState(cl(h.first_name));const[l,setL]=useState(cl(h.last_name));const[st,setSt]=useState('');const[editing,setEditing]=useState(false);
 useEffect(()=>{setF(cl(h.first_name));setL(cl(h.last_name));setEditing(false);},[h.id]);useEffect(()=>{setSt('');},[h.id]);
 const editable=h.id&&h.src!=='Bookwhen';const dirty=editable&&(f.trim()!==cl(h.first_name).trim()||l.trim()!==cl(h.last_name).trim());
 const name=nameOf(h);const showInputs=editable&&(!name||editing);
 async function save(){if(!dirty){setSt('✓ No changes');setEditing(false);return;}setSt('Saving…');const{error}=await sb.rpc('update_member_name',{p_member_id:h.id,p_first_name:f,p_last_name:l});
  if(error)return setSt('Error: '+error.message);setSt('✓ Saved');setEditing(false);onUpdate&&onUpdate({...h,first_name:f.trim()||null,last_name:l.trim()||null});setTimeout(()=>setSt(s=>s==='✓ Saved'?'':s),2500);}
 function cancelEdit(){setF(cl(h.first_name));setL(cl(h.last_name));setEditing(false);setSt('');}
 const s=statusOf(h);const rn=renewalInfo(h);const t=bwTerm(h);
 return <div className="selected md-v3"><div className="sel-h"><button type="button" className="btn-back sel-back" onClick={onClear} title="Back to results"><IconArrowLeft/><span>Back</span></button><span>Member details</span></div>
 {h.cancelled_at&&<div className="md-cancel">Membership cancelled on {new Date(h.cancelled_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} — do not issue a card.</div>}
 <div className="md-head">
  <div className="md-tile-avatar" aria-hidden="true"><IconUser/></div>
  <div className="md-id">
   {showInputs
    ?<form className="md-name-form" onSubmit={e=>{e.preventDefault();save();}} aria-label="Member name">
      <div className="md-name-inputs">
       <label><span className="sr-only">First name</span><input value={f} onChange={e=>{setF(e.target.value);setSt('');}} placeholder="First name" aria-label="First name" autoFocus={editing}/></label>
       <label><span className="sr-only">Last name</span><input value={l} onChange={e=>{setL(e.target.value);setSt('');}} placeholder="Last name" aria-label="Last name"/></label>
      </div>
      <div className="md-name-acts"><button type="submit" className={'btn sm '+(dirty?'primary':'ghost')} disabled={st==='Saving…'}>Save name</button>{editing&&<button type="button" className="btn ghost sm" onClick={cancelEdit}>Cancel</button>}{!name&&!editing&&<span className="md-hint">No name yet — type it in</span>}</div>
     </form>
    :<div className="md-name-row"><h3 className="md-name">{name||(h.email||'(no name)').split('@')[0]}</h3>{editable&&<button type="button" className="md-edit" onClick={()=>setEditing(true)} aria-label="Edit name" title="Edit name"><IconPencil/></button>}</div>}
   {h.email&&<div className="md-email" title={h.email}>{h.email}</div>}
   {(h.lost_card_at||(h.pending_card&&!h.cancelled_at&&h.bw_checked_at))&&<div className="md-tags">{h.lost_card_at&&<span className="chip chip-warn">⚠ Card lost</span>}{h.pending_card&&!h.cancelled_at&&h.bw_checked_at&&<span className="chip chip-pend">⏳ Card pending</span>}</div>}
  </div></div>
 <div className="md-facts">
  <div className={'md-fact md-fact-status tone-'+s.tone}><span className="md-fact-k">Status</span><span className="md-fact-v"><i className="md-dot"/>{s.t}</span>{s.sub&&<span className="md-fact-sub">{s.sub}</span>}</div>
  <div className="md-fact md-fact-card"><span className="md-fact-k">Card number</span>{h.card_barcode?<span className="md-fact-v md-mono">{h.card_barcode}</span>:<span className="md-fact-v md-card-none">No card linked</span>}</div>
  <div className={'md-fact md-fact-renew tone-'+(rn?rn.tone:'mut')}><span className="md-renew-ico"><IconCalendar/></span><span className="md-renew-txt"><span className="md-fact-k">{rn?.source==='ends'?'Membership':'Renewal'}</span><span className="md-renew-date">{rn?rn.label:'No renewal date'}</span>{rn&&<span className="md-fact-sub">{rn.rel}{rn.tone==='soon'?' — renewal due soon':rn.tone==='expired'?' — expired':''}</span>}{rn?.endsDiffers&&<span className="md-fact-sub">{rn.endsLabel}</span>}</span></div>
 </div>
 {(t||h.bookwhen_customer_id)&&<div className="md-links">
  {t&&<a className="btn ghost sm" href={bwSearchUrl(t)} target="_blank" rel="noopener noreferrer" title={`Search Bookwhen Locals for "${t}"`}>Open in Bookwhen <IconExternalLink/></a>}
  {h.bookwhen_customer_id&&<a className="btn ghost sm" href={bwUrl(h.bookwhen_customer_id)} target="_blank" rel="noopener noreferrer">Memberships <IconExternalLink/></a>}</div>}
 {extra&&<div className="sel-extra">{extra}</div>}
 {h.id&&h.src!=='Bookwhen'&&<VisitStats memberId={h.id}/>}
 {editable&&<details className="md-adv"><summary><IconSettings/><span>Advanced</span></summary><div className="md-adv-body"><CheckUser h={h} onUpdate={onUpdate}/></div></details>}
 <div className="sel-foot"><div className="sel-left">{children}</div><div className="sel-right">{st&&<span className={st.startsWith('Error')?'err':'ok'}>{st}</span>}
  {editable&&<button className={'btn lg '+(dirty?'primary':'ghost')} disabled={st==='Saving…'} onClick={save}>Save</button>}</div></div></div>;}
export function UnlinkCard({h,onUnlinked}){const[ask,setAsk]=useState(false);const[busy,setBusy]=useState(false);const[st,setSt]=useState('');
 if(!h.id||h.src==='Bookwhen'||!h.card_barcode)return st?<span className="ok">{st}</span>:null;
 async function go(){setBusy(true);const{error}=await sb.rpc('unlink_card',{p_member_id:h.id});setBusy(false);setAsk(false);
  if(error)return setSt('Error: '+error.message);setSt('✓ Card '+h.card_barcode+' unlinked — link a new card');onUnlinked&&onUnlinked({...h,card_barcode:null,pending_card:true});}
 return <><button type="button" className="btn ghost lg" onClick={()=>setAsk(true)}>Unlink card</button>{st&&<span className={st.startsWith('Error')?'err':'ok'}>{st}</span>}
  {ask&&<Confirm title="Unlink card?" busy={busy} onNo={()=>setAsk(false)} onYes={go}><p>Are you sure you want to unlink card <b>{h.card_barcode}</b> from this member?</p><MemberInfo h={h}/><p className="muted">The card will stop scanning for them and they'll show as card pending, so you can link a new card. The barcode is freed for re-use.</p></Confirm>}</>;}
export function MarkLost({h,onMarked}){const[ask,setAsk]=useState(false);const[busy,setBusy]=useState(false);const[st,setSt]=useState('');
 if(!h.id||h.src==='Bookwhen')return null;
 if(h.lost_card_at)return <span className="muted">⚠ Already on lost cards list</span>;
 async function mark(){setBusy(true);const{error}=await sb.rpc('mark_card_lost',{p_member_id:h.id});setBusy(false);setAsk(false);
  if(error)return setSt('Error: '+error.message);setSt('✓ Added to lost cards list');onMarked&&onMarked({...h,lost_card_at:new Date().toISOString()});}
 return <><button type="button" className="btn ghost lg" onClick={()=>setAsk(true)}>Mark as lost</button>{st&&<span className={st.startsWith('Error')?'err':'ok'}>{st}</span>}
  {ask&&<Confirm title="Confirm lost card" busy={busy} onNo={()=>setAsk(false)} onYes={mark}><p>Confirm this is a real Locals member with an active membership (check Bookwhen) who has genuinely lost their card:</p><MemberInfo h={h}/><p className="muted">They'll be added to the Lost cards list for a replacement.</p></Confirm>}</>;}

if(typeof window!=='undefined'){window.addEventListener('message',e=>{if(e.source===window&&e.data?.type==='AR_EXT_READY')window.__arExt=e.data.version;});window.postMessage({type:'AR_EXT_PING'},location.origin);}
export function extCheck(customerId,email){return new Promise(ok=>{const reqId=Math.random().toString(36).slice(2);
 const t=setTimeout(()=>{window.removeEventListener('message',f);ok({error:'Extension timed out — use Memberships ↗'});},45000);
 const f=e=>{if(e.source===window&&e.data?.type==='AR_CHECK_RESULT'&&e.data.reqId===reqId){clearTimeout(t);window.removeEventListener('message',f);ok(e.data);}};
 window.addEventListener('message',f);window.postMessage({type:'AR_CHECK',reqId,customerId,email},location.origin);});}
export function extAttendeeSync(events,onProgress){return new Promise(ok=>{const reqId=Math.random().toString(36).slice(2);
 const t=setTimeout(()=>{window.removeEventListener('message',f);ok({error:'Extension timed out — open a register manually or retry Re-sync'});},300000);
 const f=e=>{if(e.source!==window||e.data?.reqId!==reqId)return;
  if(e.data.type==='AR_ATTENDEE_SYNC_PROGRESS'){onProgress&&onProgress(e.data.done,e.data.total);return;}
  if(e.data.type==='AR_ATTENDEE_SYNC_RESULT'){clearTimeout(t);window.removeEventListener('message',f);ok(e.data);}};
 window.addEventListener('message',f);window.postMessage({type:'AR_ATTENDEE_SYNC',reqId,events},location.origin);});}
export function CheckUser({h,onUpdate,actions}){const[r,setR]=useState(null);const[busy,setBusy]=useState(false);const[err,setErr]=useState('');
 useEffect(()=>{setR(null);setErr('');},[h.id]);
 if(!h.id||h.src==='Bookwhen')return actions?<div className="md-actions">{actions}</div>:null;
 const v=r||(h.bw_checked_at?h:null);const em=(h.email||'').trim().toLowerCase();const can=!!h.bookwhen_customer_id||em.includes('@');
 async function run(){if(!can){setErr('No Bookwhen ID or email on this member');return;}setBusy(true);setErr('');
  if(!window.__arExt){setBusy(false);if(h.bookwhen_customer_id){window.open(bwUrl(h.bookwhen_customer_id),'_blank','noopener');setErr('Extension not installed — opened Memberships to check manually');}else{window.open(bwSearchUrl(em),'_blank','noopener');setErr('Extension needed to check by email — opened Bookwhen search instead');}return;}
  const res=await extCheck(h.bookwhen_customer_id||null,h.bookwhen_customer_id?null:em);
  if(res.error){setBusy(false);setErr(res.error);return;}
  if(!res.status&&!res.customer_id&&!h.bookwhen_customer_id){setBusy(false);setErr('Check returned nothing — member not found in Bookwhen');return;}
  const{data,error}=await sb.rpc('save_bw_check',{p_member_id:h.id,p_status:res.status||'UNKNOWN',p_lcl:res.lcl,p_renews_at:res.renews_at,p_renews_text:res.renews_text,p_sub_id:res.sub_id,p_bookwhen_customer_id:res.customer_id||null});
  setBusy(false);if(error){setErr(error.message);return;}
  const body={...(data&&data[0]),bw_status:(data&&data[0]?.bw_status)||res.status};setR(body);onUpdate&&onUpdate({...h,...body});}
 return <div className="bw-check">
  <p className="md-adv-note">Re-check this member's Locals membership in Bookwhen (needs the extension). Status and renewal above update automatically.</p>
  <div className="md-chips"><span className="md-checked">{v?.bw_checked_at?<>Last checked {ago(v.bw_checked_at)}</>:'Not checked yet'}</span></div>
  {err&&<div className="err md-err">{err}{/session|extension/i.test(err)&&' — use Memberships ↗ to check manually'}<div className="contact-admin">⚠ contact admin - James</div></div>}
  <div className="md-actions"><button type="button" className="btn primary bw-btn md-check" onClick={run} disabled={busy} title={h.bookwhen_customer_id?'Check Locals membership in Bookwhen':can?'Find in Bookwhen by email, check Locals and save CustomerID':'No Bookwhen ID or email — use Open in Bookwhen'}>{busy?'Checking…':'↻ Check user'}</button>{actions}</div>
 </div>;}
