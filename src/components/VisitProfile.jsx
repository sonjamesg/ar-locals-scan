import {useEffect,useMemo,useState} from 'react';
import {sb} from '../lib.js';
import {memberById,StatusChip,nameOf} from './Members.jsx';
import {renewalInfo} from '../lib/renewal.js';
import {memberStats,sharingFlags,weekSeries,monthSeries} from '../lib/visitInsights.js';
import {SHARING_RULES} from '../lib/visitRules.js';
import {formatVisitWhen} from '../lib/visits.js';
import {FlagChip,boardName} from './VisitBits.jsx';
import {IconArrowLeft,IconUser,IconAlert,IconCalendarCheck,IconLogIn,IconTrend,IconClock,IconCalendar} from './Icons.jsx';

const WEEKDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SOURCE={scan_desk:'Scan',card_link:'Card linked',manual_check:'Manual'};
const ORIGIN={purchase_email:'Bookwhen purchase email',desk:'Desk or member import'};
const fmtDate=iso=>iso?new Date(iso).toLocaleDateString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric'}):'-';
/** Simple accessible bar chart (CSS bars, value labels). */
export function Bars({series,label,unit='check-ins',compact}){const max=Math.max(1,...series.map(s=>s.value));const total=series.reduce((a,s)=>a+s.value,0);
  return <figure className={'vp-chart'+(compact?' compact':'')}><figcaption>{label}</figcaption>
    <div className="vp-bars" role="img" aria-label={`${label}: `+series.map(s=>`${s.label} ${s.value}`).join(', ')}>
      {series.map(s=><div key={s.key??s.label} className="vp-bar" title={`${s.label}: ${s.value} ${unit}`}><span className="vp-bar-v">{s.value||''}</span><span className="vp-bar-fill" style={{height:`${Math.round(s.value/max*100)}%`}}/><span className="vp-bar-l">{s.label}</span></div>)}
    </div>{!total&&<p className="vp-chart-empty">No check-ins yet</p>}</figure>;}

export default function VisitProfile({row,visits,norm,onBack,now=new Date()}){
  const[m,setM]=useState(null);const[card,setCard]=useState(null);
  useEffect(()=>{let off=false;memberById(row.member_id).then(x=>{if(!off)setM(x);});
    sb.rpc('member_card_profile',{p_member_id:row.member_id}).then(({data})=>{if(!off)setCard(data?.[0]||{});});return()=>{off=true;};},[row.member_id]);
  const st=useMemo(()=>memberStats(visits,now),[visits]);
  const flag=useMemo(()=>sharingFlags(st,{norm}),[st,norm]);
  const h=m||row;const name=nameOf(h)||boardName(row);const rn=m?renewalInfo(m):null;
  const {openHour,closeHour}=SHARING_RULES;
  const lo=Math.min(openHour,...st.visits.map(v=>v.p.hour)),hi=Math.max(closeHour-1,...st.visits.map(v=>v.p.hour));
  const hours=[];for(let i=lo;i<=hi;i++)hours.push({key:i,label:String(i).padStart(2,'0'),value:st.hours[i]});
  const usual=st.total?[...st.hours.keys()].sort((a,b)=>st.hours[b]-st.hours[a])[0]:null;
  const usualDay=st.total?[...st.weekdays.keys()].sort((a,b)=>st.weekdays[b]-st.weekdays[a])[0]:null;
  const list=[...st.visits].reverse();
  return <div className="vp">
    <div className="sel-h"><button type="button" className="btn-back" onClick={onBack} title="Back to the board"><IconArrowLeft/><span>Back</span></button><span>Visit profile</span></div>
    <header className="vp-head">
      <span className="md-tile-avatar" aria-hidden="true"><IconUser/></span>
      <div className="vp-id"><h2>{name||h.email||'Member'}</h2>{name&&h.email&&<span className="vp-email">{h.email}</span>}
        <div className="vp-chips">{m&&<StatusChip h={m}/>}<FlagChip flag={flag}/></div></div>
    </header>

    {flag.severity!=='none'&&<section className={'vp-flagbox sev-'+flag.severity} aria-label="Worth checking">
      <div className="vp-flag-title"><IconAlert width={18} height={18}/><b>Worth checking</b><span>Patterns that can happen when a card is shared. They are hints, not proof: ask politely and check ID if unsure.</span></div>
      <ul>{flag.reasons.map((r,i)=><li key={i} className={'sev-'+r.severity}><span className="vp-sev">{r.severity==='high'?'Look closer':'Check'}</span>{r.text}</li>)}</ul>
    </section>}

    <div className="vp-tiles">
      <div className="vp-tile"><IconCalendarCheck/><b>{st.monthDays}</b><span>Days this month</span><small>{st.monthVisits} check-in{st.monthVisits===1?'':'s'}</small></div>
      <div className="vp-tile"><IconTrend/><b>{st.days}</b><span>Days all time</span><small>{st.total} check-in{st.total===1?'':'s'}</small></div>
      <div className="vp-tile"><IconCalendar/><b className="sm">{fmtDate(st.first)}</b><span>First seen</span></div>
      <div className="vp-tile"><IconClock/><b className="sm">{st.last?formatVisitWhen(st.last):'-'}</b><span>Last seen</span></div>
    </div>

    <div className="vp-grid">
      <Bars series={weekSeries(st.byWeek,8,now)} label="Check-ins per week"/>
      <Bars series={monthSeries(st.byMonth,6,now)} label="Check-ins per month"/>
      <Bars series={hours} label={`Time of day${usual!=null?` (usually around ${String(usual).padStart(2,'0')}:00)`:''}`} compact/>
      <Bars series={WEEKDAYS.map((d,i)=>({key:d,label:d,value:st.weekdays[i]}))} label={`Day of week${usualDay!=null?` (mostly ${WEEKDAYS[usualDay]})`:''}`}/>
    </div>

    <div className="vp-cols">
      <section className="vp-card"><h3>On file</h3><dl className="vp-dl">
        <dt>Name</dt><dd>{name||'-'}</dd>
        <dt>Email</dt><dd>{h.email||'-'}</dd>
        <dt>LCL number</dt><dd className="mono">{m?.bw_lcl||'-'}</dd>
        <dt>Card number</dt><dd className="mono">{card?.card_barcode||m?.card_barcode||'No card linked'}</dd>
        <dt>Card linked</dt><dd>{card?.card_linked_at?formatVisitWhen(card.card_linked_at):'-'}{card?.cards_total>1?` (${card.cards_total} cards over time)`:''}</dd>
        <dt>Renewal</dt><dd>{rn?rn.label:'-'}</dd>
        <dt>Source</dt><dd>{card?ORIGIN[card.origin]||'-':'-'}</dd>
      </dl></section>
      <section className="vp-card"><h3>Every check-in <span className="muted">({st.total})</span></h3>
        {!list.length?<p className="muted">No check-ins recorded yet.</p>:<ol className="vp-log">{list.map((v,i)=><li key={i}><span>{formatVisitWhen(v.visited_at)}</span><span className={'vp-src src-'+(v.source||'')}>{SOURCE[v.source]||v.source||'Scan'}</span></li>)}</ol>}
        <p className="vp-note">Only counted check-ins are stored. Repeat scans within 3 hours on the same day are not saved, so they cannot be shown here.</p>
      </section>
    </div>
  </div>;
}
