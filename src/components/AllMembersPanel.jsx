import {useEffect,useRef,useState} from 'react';import {sb} from '../lib.js';import {MemberInfo,OpenBtn,Selected,MarkLost,extCheck} from './Members.jsx';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const DELAY=2500;
const ago=t=>{const m=Math.round((Date.now()-new Date(t))/6e4);return m<1?'just now':m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:new Date(t).toLocaleDateString('en-GB');};
function Status({h}){if(h._st==='checking')return <span className="muted">Checking…</span>;if(h._st==='queued')return <span className="muted">Queued</span>;
 if(h._err)return <span className="err">{h._err}</span>;if(!h.bookwhen_customer_id)return <span className="muted">No CustomerID</span>;
 if(!h.bw_checked_at)return <span className="muted">Not checked</span>;
 const d=h.bw_renews_at&&new Date(h.bw_renews_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});
 return <span className="am-chips" title={'Checked '+ago(h.bw_checked_at)}><span className={'amc amc-st '+(h.bw_status==='ACTIVE'?'bw-ok':'bw-bad')}><i/>{h.bw_status||'?'}</span>{h.bw_lcl&&<span className="amc">{h.bw_lcl}</span>}{d&&<span className="amc">↻ {d}</span>}<span className="amc-ago">{ago(h.bw_checked_at)}</span></span>;}
export default function AllMembersPanel({onMsg}){const[rows,setRows]=useState(null);const[q,setQ]=useState('');const[size,setSize]=useState('10');const[custom,setCustom]=useState('100');
 const[mode,setMode]=useState('unchecked');const[from,setFrom]=useState(1);const[run,setRun]=useState(null);const[sel,setSel]=useState(null);const ctl=useRef({});
 const load=async()=>{const{data,error}=await sb.rpc('list_members');if(error)onMsg({err:1,t:error.message});setRows(data||[]);};useEffect(()=>{load();},[]);
 const patch=(id,p)=>setRows(rs=>rs.map(r=>r.id===id?{...r,...p}:r));
 const eligible=(rows||[]).filter(r=>r.bookwhen_customer_id);const n=Math.max(1,parseInt(size==='custom'?custom:size)||1);
 function pick(){const pool=mode==='unchecked'?eligible.filter(r=>!r.bw_checked_at):eligible.slice(Math.max(0,from-1));return pool.slice(0,n);}
 async function start(){if(!window.__arExt)return onMsg({err:1,t:'Extension not detected — install it on this PC and hard-refresh'});
  const list=pick();if(!list.length)return onMsg({t:'Nothing to check in that range'});
  ctl.current={stop:false,pause:false};list.forEach(r=>patch(r.id,{_st:'queued',_err:null}));
  let ok=0,bad=0;setRun({i:0,total:list.length,ok,bad,paused:false});
  for(let i=0;i<list.length;i++){while(ctl.current.pause&&!ctl.current.stop)await sleep(300);if(ctl.current.stop)break;
   const h=list[i];patch(h.id,{_st:'checking'});setRun(r=>({...r,i:i+1}));
   const res=await extCheck(h.bookwhen_customer_id);
   if(res.error){bad++;patch(h.id,{_st:null,_err:res.error});}
   else{const{data,error}=await sb.rpc('save_bw_check',{p_member_id:h.id,p_status:res.status||'UNKNOWN',p_lcl:res.lcl,p_renews_at:res.renews_at,p_renews_text:res.renews_text,p_sub_id:res.sub_id});
    if(error){bad++;patch(h.id,{_st:null,_err:error.message});}else{ok++;patch(h.id,{_st:null,_err:null,...(data&&data[0]),bw_status:(data&&data[0]?.bw_status)||res.status,bw_checked_at:(data&&data[0]?.bw_checked_at)||new Date().toISOString()});}}
   setRun(r=>({...r,ok,bad}));if(i<list.length-1&&!ctl.current.stop)await sleep(DELAY);}
  setRows(rs=>rs.map(r=>r._st==='queued'?{...r,_st:null}:r));const stopped=ctl.current.stop;setRun(r=>({...r,done:true,stopped}));
  onMsg({t:`${stopped?'Stopped':'Batch done'} — ${ok} checked, ${bad} errors`});if(mode==='range')setFrom(f=>f+list.length);}
 const busy=run&&!run.done;const ql=q.trim().toLowerCase();
 const shown=(rows||[]).filter(r=>!ql||[r.first_name,r.last_name,r.email,r.bw_lcl].join(' ').toLowerCase().includes(ql));
 const unchecked=eligible.filter(r=>!r.bw_checked_at).length,active=(rows||[]).filter(r=>r.bw_status==='ACTIVE').length;
 if(sel)return <section className="panel"><h2>All members</h2><Selected h={sel} onClear={()=>setSel(null)} onUpdate={h=>{setSel(h);patch(h.id,h);}}><MarkLost h={sel} onMarked={h=>{setSel(h);patch(h.id,h);}}/></Selected></section>;
 return <section className="panel"><h2>All members {rows&&<span className="muted">({rows.length} · {eligible.length} with CustomerID · {unchecked} unchecked · {active} ACTIVE)</span>}</h2>
  <div className="batch">
   <label>Batch size<select value={size} onChange={e=>setSize(e.target.value)} disabled={busy}>{['5','10','25','50'].map(v=><option key={v}>{v}</option>)}<option value="custom">Custom…</option></select></label>
   {size==='custom'&&<label>Count<input type="number" min="1" value={custom} onChange={e=>setCustom(e.target.value)} disabled={busy}/></label>}
   <label>Which<select value={mode} onChange={e=>setMode(e.target.value)} disabled={busy}><option value="unchecked">Next unchecked</option><option value="range">Start from #</option></select></label>
   {mode==='range'&&<label>From #<input type="number" min="1" max={eligible.length||1} value={from} onChange={e=>setFrom(Math.max(1,parseInt(e.target.value)||1))} disabled={busy}/></label>}
   {!busy&&<button className="btn primary lg" onClick={start} disabled={!rows}>Check {n}</button>}
   {busy&&<><button className="btn ghost lg" onClick={()=>{ctl.current.pause=!ctl.current.pause;setRun(r=>({...r,paused:ctl.current.pause}));}}>{run.paused?'Resume':'Pause'}</button>
    <button className="btn ghost lg" onClick={()=>{ctl.current.stop=true;}}>Stop</button></>}
  </div>
  {run&&<div className="batch-prog"><div className="bar"><i style={{width:`${100*run.i/run.total}%`}}/></div>
   <span>{run.done?(run.stopped?'Stopped at':'Done'):run.paused?'Paused':'Checking'} {run.i}/{run.total} · ✓ {run.ok} · ✕ {run.bad}</span></div>}
  <p className="muted">Uses the Check user extension one member at a time, {DELAY/1000}s apart. Members without a CustomerID are skipped. Keep Bookwhen signed in.</p>
  <input className="big-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter list by name, email or LCL…"/>
  <ul className="hits">{rows===null&&<li className="muted">Loading…</li>}
   {shown.slice(0,300).map(h=><li key={h.id} className={'hit-row'+(h._st==='checking'?' checking':'')}><button className="hit" onClick={()=>setSel(h)}><MemberInfo h={h}/><Status h={h}/></button><OpenBtn h={h}/></li>)}
   {shown.length>300&&<li className="muted">Showing 300 of {shown.length} — filter to narrow</li>}</ul>
 </section>;}
