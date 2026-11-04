import React,{useState,useEffect} from 'react';
const PIN=String(import.meta.env.DESK_PIN||import.meta.env.VITE_DESK_PIN||'6767');
const KEY='ar_desk_unlocked';
export const lockDesk=()=>{sessionStorage.removeItem(KEY);location.reload();};
export default function PinGate({children}){
 const[ok,setOk]=useState(sessionStorage.getItem(KEY)==='1');const[v,setV]=useState('');const[err,setErr]=useState(false);
 const submit=(val=v)=>{if(val===PIN){sessionStorage.setItem(KEY,'1');setOk(true);}else{setErr(true);setV('');}};
 const press=k=>{setErr(false);if(k==='del')return setV(x=>x.slice(0,-1));if(k==='ok')return submit();const n=(v+k).slice(0,8);setV(n);if(n.length===PIN.length&&n===PIN)submit(n);};
 useEffect(()=>{if(ok)return;const h=e=>{if(/^\d$/.test(e.key))press(e.key);else if(e.key==='Backspace')press('del');else if(e.key==='Enter')press('ok');};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);});
 if(ok)return children;
 return <div className="pin-screen"><div className="pin-box">
  <img src="/logo.png" alt="Atlantic Reach" className="pin-logo" onError={e=>e.target.style.display='none'}/>
  <h1>Reception desk</h1><p>Enter staff PIN</p>
  <div className={`pin-dots ${err?'shake':''}`}>{Array.from({length:PIN.length}).map((_,i)=><span key={i} className={i<v.length?'on':''}/>)}</div>
  {err&&<div className="pin-err">Incorrect PIN — try again</div>}
  <div className="pin-pad">{['1','2','3','4','5','6','7','8','9','del','0','ok'].map(k=><button key={k} type="button" onClick={()=>press(k)} className={`pin-key ${k.length>1?'fn':''}`}>{k==='del'?'⌫':k==='ok'?'Enter':k}</button>)}</div>
 </div></div>;}
