import {useEffect,useRef,useState} from 'react';import {sb} from '../lib.js';import {MemberInfo,OpenBtn,Selected,MarkLost,UnlinkCard,extCheck,BwChips,ago} from './Members.jsx';
import {isNew,isCancelled,isLinked,cardCounts,filterMembers} from '../lib/memberFilters.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const DELAY=1500;const WORKERS=5;
function Status({h}){if(h._st==='checking')return <span className="muted">Checking…</span>;if(h._st==='queued')return <span className="muted">Queued</span>;
 if(h._err)return <span className="err">{h._err} <b className="contact-admin inline">· contact admin - James</b></span>;if(!h.bookwhen_customer_id&&!h.bw_checked_at)return <span className="muted">No CustomerID</span>;
 if(!h.bw_checked_at)return <span className="muted">Not checked</span>;
 return <BwChips h={h}/>;}
export default function AllMembersPanel({onMsg}){const[rows,setRows]=useState(null);const[q,setQ]=useState('');const[sf,setSf]=useState('all');const[size,setSize]=useState('10');const[custom,setCustom]=useState('100');
 const[mode,setMode]=useState('unchecked');const[from,setFrom]=useState(1);const[run,setRun]=useState(null);const[sel,setSel]=useState(null);const[cf,setCf]=useState('all');const ctl=useRef({});
 const load=async()=>{const{data,error}=await sb.rpc('list_members');if(error)onMsg({err:1,t:error.message});setRows(data||[]);};useEffect(()=>{load();},[]);
 const patch=(id,p)=>setRows(rs=>rs.map(r=>r.id===id?{...r,...p}:r));
 const eligible=(rows||[]).filter(r=>r.bookwhen_customer_id||(r.email||'').includes('@'));const n=Math.max(1,Math.min(200,parseInt(size==='custom'?custom:size)||1));
 function pick(){const pool=mode==='unchecked'?eligible.filter(r=>!r.bw_checked_at):eligible.slice(Math.max(0,from-1));return pool.slice(0,n);}
 async function start(){if(!window.__arExt)return onMsg({err:1,t:'Extension not detected — install it on this PC and hard-refresh'});
  const list=pick();if(!list.length)return onMsg({t:'Nothing to check in that range'});
  ctl.current={stop:false,pause:false};list.forEach(r=>patch(r.id,{_st:'queued',_err:null}));
  let ok=0,bad=0;setRun({i:0,total:list.length,ok,bad,paused:false});
  let next=0,started=0;
  async function one(h){patch(h.id,{_st:'checking'});setRun(r=>({...r,i:++started}));
   const res=await extCheck(h.bookwhen_customer_id||null,h.bookwhen_customer_id?null:(h.email||'').trim().toLowerCase());
   if(res.error||(!res.status&&!res.customer_id&&!h.bookwhen_customer_id)){bad++;patch(h.id,{_st:null,_err:res.error||'Not found in Bookwhen'});}
   else{const{data,error}=await sb.rpc('save_bw_check',{p_member_id:h.id,p_status:res.status||'UNKNOWN',p_lcl:res.lcl,p_renews_at:res.renews_at,p_renews_text:res.renews_text,p_sub_id:res.sub_id,p_bookwhen_customer_id:res.customer_id||null});
    if(error){bad++;patch(h.id,{_st:null,_err:error.message});}else{ok++;patch(h.id,{_st:null,_err:null,...(data&&data[0]),bw_status:(data&&data[0]?.bw_status)||res.status,bw_checked_at:(data&&data[0]?.bw_checked_at)||new Date().toISOString()});}}
   setRun(r=>({...r,ok,bad}));}
  async function worker(w){await sleep(w*400);
   while(true){while(ctl.current.pause&&!ctl.current.stop)await sleep(300);if(ctl.current.stop)return;
    const i=next++;if(i>=list.length)return;await one(list[i]);if(next<list.length&&!ctl.current.stop)await sleep(DELAY);}}
  await Promise.all(Array.from({length:Math.min(WORKERS,list.length)},(_,w)=>worker(w)));
  setRows(rs=>rs.map(r=>r._st==='queued'?{...r,_st:null}:r));const stopped=ctl.current.stop;setRun(r=>({...r,done:true,stopped}));
  onMsg({t:`${stopped?'Stopped':'Batch done'} — ${ok} checked, ${bad} errors`});if(mode==='range')setFrom(f=>f+list.length);}
 const busy=run&&!run.done;
 const shown=filterMembers(rows,{status:sf,card:cf,q});
 const cards=cardCounts(rows);
 const unchecked=eligible.filter(r=>!r.bw_checked_at).length,active=(rows||[]).filter(r=>r.bw_status==='ACTIVE'&&!r.cancelled_at).length,cancelled=(rows||[]).filter(isCancelled).length;
 if(sel)return <section className="panel"><h2>All members</h2><Selected h={sel} onClear={()=>setSel(null)} onUpdate={h=>{setSel(h);patch(h.id,h);}}><MarkLost h={sel} onMarked={h=>{setSel(h);patch(h.id,h);}}/><UnlinkCard h={sel} onUnlinked={h=>{setSel(h);patch(h.id,h);}}/></Selected></section>;
 return <section className="panel"><h2>All members</h2>
  {rows&&<div className="am-stats">
   <div className="am-stat"><b>{rows.length}</b><span>Members</span></div>
   <div className="am-stat"><b>{eligible.length}</b><span>Checkable</span></div>
   <div className="am-stat warn"><b>{unchecked}</b><span>Unchecked</span></div>
   <div className="am-stat ok"><b>{active}</b><span>Active</span></div>
   <div className="am-stat bad"><b>{cancelled}</b><span>Cancelled</span></div>
   <div className="am-stat warn" title="Members with no active card barcode — still need to link"><b>{cards.unlinked}</b><span>Need card</span></div></div>}
  <div className="batch-card"><div className="batch" title={`Uses the Check user extension, ${WORKERS} members in parallel (${DELAY/1000}s pause per worker). Members without a CustomerID are looked up by email (CustomerID saved). Keep Bookwhen signed in.`}>
   <label>Batch size<select value={size} onChange={e=>setSize(e.target.value)} disabled={busy}>{['5','10','25','50','100','200'].map(v=><option key={v}>{v}</option>)}<option value="custom">Custom…</option></select></label>
   {size==='custom'&&<label>Count<input type="number" min="1" max="200" value={custom} onChange={e=>setCustom(e.target.value)} disabled={busy}/></label>}
   <label>Which<select value={mode} onChange={e=>setMode(e.target.value)} disabled={busy}><option value="unchecked">Next unchecked</option><option value="range">Start from #</option></select></label>
   {mode==='range'&&<label>From #<input type="number" min="1" max={eligible.length||1} value={from} onChange={e=>setFrom(Math.max(1,parseInt(e.target.value)||1))} disabled={busy}/></label>}
   {!busy&&<button className="btn primary lg" onClick={start} disabled={!rows}>Check {n}</button>}
   {busy&&<><button className="btn ghost lg" onClick={()=>{ctl.current.pause=!ctl.current.pause;setRun(r=>({...r,paused:ctl.current.pause}));}}>{run.paused?'Resume':'Pause'}</button>
    <button className="btn ghost lg" onClick={()=>{ctl.current.stop=true;}}>Stop</button></>}
  </div>
  {run&&<div className={'batch-prog'+(run.done?' done':'')}><div className="bp-top"><span className="bp-label">{run.done?(run.stopped?'Stopped':'Done'):run.paused?'Paused':'Checking…'}</span>
   <span className="bp-count">{run.i} / {run.total}</span><span className="bp-ok">✓ {run.ok}</span><span className="bp-bad">✕ {run.bad}</span></div>
   <div className="bar"><i style={{width:`${100*run.i/run.total}%`}}/></div></div>}
  </div>
  <div className="am-filter" role="toolbar" aria-label="Member filters">
   {[['all','All'],['active','Active'],['new',`New (${(rows||[]).filter(isNew).length})`],['cancelled','Cancelled']].map(([k,l])=><button key={k} type="button" className={'btn '+(sf===k?'primary':'ghost')+(k==='cancelled'?' f-cancel':'')} onClick={()=>setSf(k)}>{l}</button>)}
   <span className="am-sep" aria-hidden="true"/>
   {[['all',`All cards`],['linked',`Linked (${cards.linked})`],['unlinked',`Unlinked (${cards.unlinked})`]].map(([k,l])=><button key={'c'+k} type="button" className={'btn '+(cf===k?'primary':'ghost')} onClick={()=>setCf(k)} title={k==='unlinked'?'Members still needing a card link':k==='linked'?'Members with an active card':''}>{l}</button>)}
  </div>
  <input className="big-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter list by name, email or LCL…"/>
  <ul className="hits">{rows===null&&<li className="muted">Loading…</li>}
   {shown.slice(0,300).map(h=><li key={h.id} className={'hit-row'+(h._st==='checking'?' checking':'')}><button className="hit" onClick={()=>setSel(h)}><MemberInfo h={h}/>{isNew(h)&&<span className="amc new-badge" title={'Joined '+new Date(h.joined_at).toLocaleDateString('en-GB')}>NEW</span>}<Status h={h}/></button><OpenBtn h={h}/></li>)}
   {shown.length>300&&<li className="muted">Showing 300 of {shown.length} — filter to narrow</li>}</ul>
 </section>;}
