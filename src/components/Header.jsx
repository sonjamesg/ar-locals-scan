import {useEffect,useState} from 'react';import {lockDesk} from './PinGate.jsx';
import FeedbackPanel from './FeedbackPanel.jsx';
export default function Header(){
 const[t,setT]=useState(new Date());
 const[fb,setFb]=useState(false);
 useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i)},[]);
 return <header className="hdr"><img src={import.meta.env.BASE_URL+"ar-logo.png"} alt="Atlantic Reach" className="logo"/>
  <div className="hdr-title">Locals Card<span>Reception check-in</span></div>
  <div className="clock">{t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}<span>{t.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span></div>
  <a className="btn ghost bw-btn" href="https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9" target="_blank" rel="noopener noreferrer" title="Locals Card customers on Bookwhen">↗ Open in Bookwhen</a>
  <button type="button" className="btn ghost fb-btn" onClick={()=>setFb(true)} title="Staff feedback" aria-label="Staff feedback">?</button>
  <button type="button" className="btn ghost lock-btn" onClick={()=>{setFb(false);lockDesk();}}>🔒 Lock</button>
  <FeedbackPanel open={fb} onClose={()=>setFb(false)}/>
 </header>;}
