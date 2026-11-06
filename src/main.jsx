import React,{useEffect,useRef,useState} from 'react';import {createRoot} from 'react-dom/client';
import './styles.css';import {sb} from './lib.js';
import Header from './components/Header.jsx';import StatusCard from './components/StatusCard.jsx';import LinkPanel from './components/LinkPanel.jsx';import PinGate from './components/PinGate.jsx';import {LostPanel,QueuePanel,PendingPanel} from './components/LostPanel.jsx';import {label} from './components/Members.jsx';import AllMembersPanel from './components/AllMembersPanel.jsx';
import FeedbackPanel from './components/FeedbackPanel.jsx';
import FeedbackPage from './components/FeedbackPage.jsx';
import VisitsPanel from './components/VisitsPanel.jsx';
import {safeDeskView} from './lib/memberNotFound.js';
function App(){const inp=useRef();const[code,setCode]=useState('');const[res,setRes]=useState(null);const[msg,setMsg]=useState(null);const ALLOWED=['scan','lost','pending','queue','all','visits','feedback'];const[view,setView]=useState(()=>safeDeskView('scan',ALLOWED));const[prevView,setPrevView]=useState('scan');const viewHold=useRef('scan');const go=v=>{const next=safeDeskView(v,ALLOWED);if(viewHold.current!=='feedback'&&next==='feedback') setPrevView(viewHold.current);viewHold.current=next;setView(next);};const[fb,setFb]=useState(null); // null | 'compose'
 const focus=()=>setTimeout(()=>{if(document.querySelector('[aria-modal="true"]'))return;inp.current?.focus();},0);useEffect(focus,[]);
 function scan(e){e.preventDefault();runScan(code.trim());}
 async function runScan(b){if(!b||viewRef.current!=='scan')return;setMsg(null);setCode('');
  // Scan desk only: record_scan_visit (lookup_card stays read-only for Search/Check/link).
  const{data,error}=await sb.rpc('record_scan_visit',{p_barcode:b});
  const row=Array.isArray(data)?data[0]:data;
  if(error){
    // Fall back to lookup for access display, but never claim a saved visit.
    const look=await sb.rpc('lookup_card',{p_barcode:b});
    const base=look.data?.[0]||{status:'unknown'};
    setRes({...base,barcode:b,visit:{error:error.message}});
    setMsg({err:1,t:'Check-in not recorded — '+error.message});
    return;
  }
  if(!row){setRes({status:'unknown',barcode:b});return;}
  const visit={recorded:!!row.recorded,suppressed:!!row.suppressed,reason:row.reason,visit_id:row.visit_id,visited_at:row.visited_at,last_counted_at:row.last_counted_at,visits_today:row.visits_today,next_eligible_at:row.next_eligible_at};
  setRes({status:row.status||'unknown',first_name:row.first_name,last_name:row.last_name,membership_ends_at:row.membership_ends_at,member_id:row.member_id,barcode:b,visit});
  if(row.status==='valid'&&row.recorded) setMsg({t:'Visit recorded'});
  else if(row.status==='valid'&&row.suppressed) setMsg({t:'Already checked in — another visit counts after 3 hours'});
  if(row.status&&row.status!=='unknown')focus();}
 const viewRef=useRef(view);viewRef.current=view;const scanRef=useRef(runScan);scanRef.current=runScan;
 useEffect(()=>{let buf='',last=0;const GAP=100;
  const isField=el=>el&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const onKey=e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;
   if(isField(t)){buf='';return;} // focused scan box handles itself; never steal from other text fields
   const now=performance.now();if(now-last>GAP)buf='';last=now;
   if(e.key==='Enter'){if(buf.length>=3){e.preventDefault();const b=buf;buf='';scanRef.current(b.trim());}else buf='';return;}
   if(e.key.length===1){buf+=e.key;if(buf.length>1)e.preventDefault();}};
  window.addEventListener('keydown',onKey,true);return()=>window.removeEventListener('keydown',onKey,true);},[]);
 async function link(h){const p=h.src==='Local'?{p_member_id:h.id}:{p_first_name:h.first_name,p_last_name:h.last_name,p_email:h.email,p_bookwhen_customer_id:h.bookwhen_customer_id,p_ends_at:h.membership_ends_at};
  const{error}=await sb.rpc('link_card',{p_barcode:res.barcode,...p});if(error)return setMsg({err:1,t:error.message});
  setMsg({t:`Card linked to ${label(h)}`});const{data}=await sb.rpc('lookup_card',{p_barcode:res.barcode});setRes({...data[0],barcode:res.barcode});focus();}
 const s=res?.status;
 return <div className="app"><Header onOpenFeedback={v=>setFb(v||'compose')} onLock={()=>setFb(null)}/>
  <main className="main">
   <nav className="row tabs"><button className={`btn ${view==='scan'?'primary':'ghost'}`} onClick={()=>{go('scan');focus();}}>Scan</button><button className={`btn ${view==='lost'?'primary':'ghost'}`} onClick={()=>{go('lost');setMsg(null);}}>Search Users</button><button className={`btn ${view==='pending'?'primary':'ghost'}`} onClick={()=>{go('pending');setMsg(null);}}>Pending cards</button><button className={`btn ${view==='queue'?'primary':'ghost'}`} onClick={()=>{go('queue');setMsg(null);}}>Lost cards</button><button className={`btn ${view==='all'?'primary':'ghost'}`} onClick={()=>{go('all');setMsg(null);}}>All members</button><button className={`btn ${view==='visits'?'primary':'ghost'}`} onClick={()=>{go('visits');setMsg(null);}}>Visits</button></nav>
   {view==='scan'&&<div className="scan-layout"><div className="scan-card"><form className="scan" onSubmit={scan}><label htmlFor="scan">Scan card</label>
    <div className="scan-row"><input id="scan" ref={inp} value={code} onChange={e=>setCode(e.target.value)} placeholder="Barcode appears here when scanned…" autoComplete="off" autoFocus className="scan-input"/>
    <button className="btn primary lg">Check</button>{res&&<button type="button" className="btn success lg scan-clear" onClick={()=>{setRes(null);setMsg(null);focus();}}>Clear</button>}</div></form>
   <StatusCard res={res}/>
      {s==='unknown'&&<LinkPanel key={res.barcode} barcode={res.barcode} onLink={link}/>}
  </div>
  <aside className="help-panel panel"><h3>Quick help</h3><p className="muted">Simple steps for reception.</p>
   <ul className="help-list">
    <li><b>Scan</b>Check someone in at the desk.</li>
    <li><b>Search Users</b>Find a member by name or email.</li>
    <li><b>Pending / Lost</b>Issue or replace a card.</li>
    <li><b>Need help?</b>Use Feedback beside Lock, or email james@atlanticreach.co.uk</li>
   </ul></aside></div>}
   {view==='lost'&&<LostPanel onMsg={setMsg} onDone={()=>setView('queue')}/>}
      {view==='pending'&&<PendingPanel onMsg={setMsg}/>}
   {view==='queue'&&<QueuePanel onMsg={setMsg}/>}
   {view==='all'&&<AllMembersPanel onMsg={setMsg}/>}
   {view==='visits'&&<VisitsPanel onMsg={setMsg}/>}
   {view==='feedback'&&<FeedbackPage onBack={()=>go(prevView||'scan')} onWrite={()=>setFb('compose')}/>}
   {msg&&<div className={`toast ${msg.err?'err':''}`}>{msg.t}</div>}
  </main><footer className="foot"><span>Atlantic Reach Leisure · Locals Card</span><span className="foot-right"><button type="button" className="foot-fb" onClick={()=>{setFb(null);go('feedback');}}>Feedback</button><span className="foot-ver"> · v2.0</span></span></footer>
  <FeedbackPanel open={fb} onClose={()=>setFb(null)} onSeeAll={()=>go('feedback')}/>
</div>;}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{scope:import.meta.env.BASE_URL}).catch(()=>{}));
createRoot(document.getElementById('root')).render(<PinGate><App/></PinGate>);
