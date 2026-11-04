import React,{useEffect,useRef,useState} from 'react';import {createRoot} from 'react-dom/client';
import './styles.css';import {sb} from './lib.js';
import Header from './components/Header.jsx';import StatusCard from './components/StatusCard.jsx';import LinkPanel from './components/LinkPanel.jsx';import PinGate from './components/PinGate.jsx';
function App(){const inp=useRef();const[code,setCode]=useState('');const[res,setRes]=useState(null);const[msg,setMsg]=useState(null);
 const focus=()=>setTimeout(()=>inp.current?.focus(),0);useEffect(focus,[]);
 function scan(e){e.preventDefault();runScan(code.trim());}
 async function runScan(b){if(!b)return;setMsg(null);setCode('');
  const{data,error}=await sb.rpc('lookup_card',{p_barcode:b});
  setRes(error||!data?.[0]?{status:'unknown',err:error?.message,barcode:b}:{...data[0],barcode:b});
  if(data?.[0]?.status&&data[0].status!=='unknown')focus();}
 const scanRef=useRef(runScan);scanRef.current=runScan;
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
  setMsg({t:`Card linked to ${h.first_name} ${h.last_name}`});const{data}=await sb.rpc('lookup_card',{p_barcode:res.barcode});setRes({...data[0],barcode:res.barcode});focus();}
 const s=res?.status;
 return <div className="app"><Header/>
  <main className="main">
   <form className="scan" onSubmit={scan}><label htmlFor="scan">Scan card</label>
    <div className="scan-row"><input id="scan" ref={inp} value={code} onChange={e=>setCode(e.target.value)} placeholder="Waiting for barcode…" autoComplete="off" autoFocus className="scan-input"/>
    <button className="btn primary lg">Check</button>{res&&<button type="button" className="btn ghost lg" onClick={()=>{setRes(null);setMsg(null);focus();}}>Clear</button>}</div></form>
   <StatusCard res={res}/>
   {msg&&<div className={`toast ${msg.err?'err':''}`}>{msg.t}</div>}
   {s==='unknown'&&<LinkPanel key={res.barcode} barcode={res.barcode} onLink={link}/>}
  </main><footer className="foot">Atlantic Reach Leisure · Locals Card £10 / 12 months</footer></div>;}
createRoot(document.getElementById('root')).render(<PinGate><App/></PinGate>);
