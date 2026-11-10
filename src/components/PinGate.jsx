import React,{useState,useRef,useEffect} from 'react';
const PIN=String(import.meta.env.DESK_PIN||import.meta.env.VITE_DESK_PIN||'6767');
const KEY='ar_desk_unlocked';const N=PIN.length;
export const lockDesk=()=>{sessionStorage.removeItem(KEY);location.reload();};
export default function PinGate({children}){
 const[ok,setOk]=useState(sessionStorage.getItem(KEY)==='1');const[d,setD]=useState(Array(N).fill(''));const[err,setErr]=useState(false);const refs=useRef([]);
 useEffect(()=>{if(!ok)refs.current[0]?.focus();},[ok]);
 const check=arr=>{if(arr.join('')===PIN){sessionStorage.setItem(KEY,'1');setOk(true);}else{setErr(true);setD(Array(N).fill(''));setTimeout(()=>refs.current[0]?.focus(),0);}};
 const set=(i,val)=>{const c=val.replace(/\D/g,'').slice(-1);const a=[...d];a[i]=c;setD(a);setErr(false);if(c&&i<N-1)refs.current[i+1].focus();if(c&&a.every(x=>x))check(a);};
 const key=(i,e)=>{if(e.key==='Backspace'&&!d[i]&&i>0){e.preventDefault();const a=[...d];a[i-1]='';setD(a);refs.current[i-1].focus();}};
 const paste=e=>{const t=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,N).split('');if(t.length){e.preventDefault();const a=Array(N).fill('').map((_,i)=>t[i]||'');setD(a);if(t.length===N)check(a);else refs.current[t.length].focus();}};
 if(ok)return children;
 return <div className="pin-screen" role="dialog" aria-modal="true" aria-labelledby="pin-title"><div className={`pin-box ${err?'is-err':''}`}>
  <div className="pin-tag"><span className="pin-led"/>Staff access</div>
  <img src={import.meta.env.BASE_URL+"ar-logo-white.png"} alt="Atlantic Reach" className="pin-logo" style={{background:'#263241',borderRadius:10,padding:'10px 14px'}}/>
  <h1 id="pin-title">Locals Card Desk</h1><p>Enter your {N}-digit staff PIN to continue</p>
  <div className={`pin-digits ${err?'shake':''}`} onPaste={paste}>{d.map((v,i)=><input key={i} ref={el=>refs.current[i]=el} value={v} onChange={e=>set(i,e.target.value)} onKeyDown={e=>key(i,e)} onFocus={e=>e.target.select()} inputMode="numeric" type="password" maxLength={1} autoComplete="off" placeholder="" aria-label={`PIN digit ${i+1}`} className={`pin-digit ${err?'bad':''}`}/>)}</div>
  <div className="pin-dots" aria-hidden="true">{d.map((v,i)=><span key={i} className={v?'on':''}/>)}</div>
  <div className="pin-err" aria-live="polite">{err?'Incorrect PIN. Please try again':'\u00a0'}</div>
  <div className="pin-foot"><span>Atlantic Reach Leisure</span><span className="pin-sep"/><span>Staff only</span></div>
 </div></div>;}
