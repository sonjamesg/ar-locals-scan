import {useEffect,useState} from 'react';import {lockDesk} from './PinGate.jsx';
export default function Header({onOpenFeedback,onLock}){
 const[t,setT]=useState(new Date());
 useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i)},[]);
 return <header className="hdr"><img src={import.meta.env.BASE_URL+"ar-logo.png"} alt="Atlantic Reach" className="logo"/>
  <div className="hdr-title">Locals Card<span>Reception check-in</span></div>
  <div className="clock">{t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}<span>{t.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span></div>
  <a className="btn ghost bw-btn" href="https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9" target="_blank" rel="noopener noreferrer" title="Locals Card customers on Bookwhen">↗ Open in Bookwhen</a>
  <button type="button" className="btn ghost fb-btn" onClick={()=>onOpenFeedback?.('compose')} title="Staff feedback" aria-label="Staff feedback">?</button>
  <button type="button" className="btn ghost lock-btn" onClick={()=>{onLock?.();lockDesk();}}>🔒 Lock</button>
 </header>;}
