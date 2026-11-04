import {useEffect,useState} from 'react';
export default function Header(){const[t,setT]=useState(new Date());useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i)},[]);
 return <header className="hdr"><img src="/ar-logo.png" alt="Atlantic Reach" className="logo"/>
  <div className="hdr-title">Locals Card<span>Reception check-in</span></div>
  <div className="clock">{t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}<span>{t.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span></div></header>;}
