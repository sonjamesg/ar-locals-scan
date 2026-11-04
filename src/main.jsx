import React,{useEffect,useRef,useState} from 'react'; import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
const sb=createClient(import.meta.env.SUPABASE_URL,import.meta.env.SUPABASE_ANON_KEY);
const left=d=>{const n=Math.ceil((new Date(d)-new Date())/864e5);return n<0?`Expired ${-n} days ago`:n>60?`${Math.floor(n/30)} months left`:`${n} days left`;};
const C={valid:'#16a34a',expired:'#dc2626',unknown:'#d97706'};
function App(){
 const inp=useRef();const[code,setCode]=useState('');const[res,setRes]=useState(null);
 const[q,setQ]=useState('');const[hits,setHits]=useState([]);const[msg,setMsg]=useState('');
 const focus=()=>setTimeout(()=>inp.current?.focus(),0);useEffect(focus,[]);
 async function scan(e){e.preventDefault();const b=code.trim();if(!b)return;setMsg('');setQ('');setHits([]);
  const{data,error}=await sb.rpc('lookup_card',{p_barcode:b});
  setRes(error?{status:'unknown',err:error.message,barcode:b}:{...data[0],barcode:b});setCode('');
  if(data?.[0]?.status!=='unknown')focus();}
 useEffect(()=>{if(q.trim().length<2){setHits([]);return;}const t=setTimeout(async()=>{
  const[l,bw]=await Promise.all([sb.rpc('search_members',{p_q:q}),sb.functions.invoke('bookwhen-search',{body:{q}}).catch(()=>({data:[]}))]);
  const loc=(l.data||[]).map(m=>({...m,src:'Local'}));const ids=new Set(loc.map(m=>m.bookwhen_customer_id).filter(Boolean));
  setHits([...loc,...(bw.data||[]).filter(x=>!ids.has(x.bookwhen_customer_id)).map(x=>({...x,src:'Bookwhen'}))]);},250);return()=>clearTimeout(t);},[q]);
 async function link(h){const p=h.src==='Local'?{p_member_id:h.id}:{p_first_name:h.first_name,p_last_name:h.last_name,p_email:h.email,p_bookwhen_customer_id:h.bookwhen_customer_id,p_ends_at:h.membership_ends_at};
  const{error}=await sb.rpc('link_card',{p_barcode:res.barcode,...p});if(error)return setMsg(error.message);
  setMsg(`Linked to ${h.first_name} ${h.last_name}`);const{data}=await sb.rpc('lookup_card',{p_barcode:res.barcode});setRes({...data[0],barcode:res.barcode});focus();}
 async function addNew(e){e.preventDefault();const f=new FormData(e.target);
  await link({src:'New',first_name:f.get('fn'),last_name:f.get('ln'),email:f.get('em')});}
 const s=res?.status;
 return <div style={{fontFamily:'system-ui',padding:32,maxWidth:900,margin:'auto'}}>
  <h1>Atlantic Reach · Locals Card</h1>
  <form onSubmit={scan}><input ref={inp} value={code} onChange={e=>setCode(e.target.value)} placeholder="Scan card…" autoFocus style={{fontSize:40,width:'100%',padding:16}}/></form>
  {res&&<div style={{marginTop:24,padding:32,borderRadius:16,color:'#fff',background:C[s]}}>
   <div style={{fontSize:56,fontWeight:800}}>{s.toUpperCase()}</div>
   {s!=='unknown'?<><div style={{fontSize:40}}>{res.first_name} {res.last_name}</div><div style={{fontSize:28}}>{res.membership_ends_at?left(res.membership_ends_at):'No expiry set'}</div></>:<div style={{fontSize:24}}>Card {res.barcode} not linked</div>}</div>}
  {s==='unknown'&&<div style={{marginTop:24}}>
   <h2>Find member by name</h2>
   <input value={q} onChange={e=>setQ(e.target.value)} autoFocus placeholder="Start typing name…" style={{fontSize:28,width:'100%',padding:12}}/>
   <ul style={{listStyle:'none',padding:0}}>{hits.map((h,i)=><li key={i}><button onClick={()=>link(h)} style={{fontSize:22,width:'100%',textAlign:'left',padding:12,margin:'4px 0'}}>
    {h.first_name} {h.last_name} <small>· {h.src}{h.email_hint||h.email?` · ${h.email_hint||h.email}`:''}{h.membership_ends_at?` · ends ${h.membership_ends_at}`:''}</small></button></li>)}</ul>
   <details><summary>Not found? Add new</summary><form onSubmit={addNew}><input name="fn" placeholder="First name" required/> <input name="ln" placeholder="Last name" required/> <input name="em" placeholder="Email (optional)"/> <button>Add & link</button></form></details>
  </div>}
  {msg&&<p style={{fontSize:20}}>{msg}</p>}
 </div>;}
createRoot(document.getElementById('root')).render(<App/>);
