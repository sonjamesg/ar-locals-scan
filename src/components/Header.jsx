import {useEffect,useState} from 'react';
import {lockDesk} from './PinGate.jsx';
import {IconClock,IconExternalLink,IconFeedback,IconLock} from './Icons.jsx';

export default function Header({onOpenFeedback,onLock}){
  const[t,setT]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i)},[]);
  return <header className="hdr">
    <img src={import.meta.env.BASE_URL+"ar-logo-white.png"} alt="Atlantic Reach" className="logo"/>
    <div className="hdr-title">Locals Card Desk<span>Reception check-in</span></div>
    <div className="hdr-right">
      <div className="clock" aria-live="polite">
        <span className="clock-time"><IconClock className="clock-ico"/>{t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
        <span className="clock-date">{t.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
      </div>
      <div className="hdr-divider" aria-hidden="true"/>
      <div className="hdr-actions">
        <a className="hdr-btn hdr-btn-primary" href="https://atlanticreach.bookwhen.com/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=2qx0sob92cv9" target="_blank" rel="noopener noreferrer" title="Locals Card customers on Bookwhen">
          <IconExternalLink/><span>Open in Bookwhen</span>
        </a>
        <button type="button" className="hdr-btn" onClick={()=>onOpenFeedback?.('compose')} title="Staff feedback" aria-label="Staff feedback">
          <IconFeedback/><span className="hdr-btn-label">Feedback</span>
        </button>
        <button type="button" className="hdr-btn" onClick={()=>{onLock?.();lockDesk();}} title="Lock desk" aria-label="Lock desk">
          <IconLock/><span>Lock</span>
        </button>
      </div>
    </div>
  </header>;
}
