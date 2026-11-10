import {useEffect,useState} from 'react';
import {noDash} from '../lib/noDash.js';
import {sb} from '../lib.js';
import {friendlyVisit} from '../lib/visits.js';
import {IconCalendarCheck,IconLogIn,IconTrend,IconClock} from './Icons.jsx';

export default function VisitStats({memberId}){
  const[st,setSt]=useState(null);
  const[hist,setHist]=useState(null);
  const[err,setErr]=useState('');
  useEffect(()=>{
    if(!memberId) return;
    let cancelled=false;
    (async()=>{
      setErr('');setSt(null);setHist(null);
      const a=await sb.rpc('member_visit_stats',{p_member_id:memberId});
      const b=await sb.rpc('member_visit_history',{p_member_id:memberId,p_limit:10});
      if(cancelled) return;
      if(a.error){setErr(a.error.message);return;}
      setSt(a.data?.[0]||{total_visits:0,distinct_days:0,visits_this_month:0,days_this_month:0});
      setHist(b.error?[]:(b.data||[]));
    })();
    return()=>{cancelled=true;};
  },[memberId]);
  if(!memberId) return null;
  const tiles=st?[
    {k:'days',icon:<IconCalendarCheck/>,v:st.distinct_days||0,l:'Days visited'},
    {k:'checkins',icon:<IconLogIn/>,v:st.total_visits||0,l:'Check-ins'},
    {k:'month',icon:<IconTrend/>,v:st.days_this_month||0,l:'Days this month',sub:(st.visits_this_month||0)+' check-in'+((st.visits_this_month||0)===1?'':'s')},
  ]:[];
  const earlier=(hist||[]).slice(1,6);
  return <div className="md-panel visit-stats">
    <div className="md-label">Gym visits</div>
    {err&&<div className="err md-err">{noDash(err)}</div>}
    {!st&&!err&&<div className="muted">Loading visits…</div>}
    {st&&<>
      <div className="vs-tiles">
        {tiles.map(t=><div key={t.k} className={'vs-tile vs-'+t.k}><span className="vs-ico">{t.icon}</span><span className="vs-num">{t.v}</span><span className="vs-lbl">{t.l}</span>{t.sub&&<span className="vs-sub">{t.sub}</span>}</div>)}
      </div>
      <div className="vs-last"><span className="vs-ico"><IconClock/></span>{st.last_visit_at
        ?<span>Last visit <b>{friendlyVisit(st.last_visit_at)}</b></span>
        :<span className="muted">No check-ins recorded yet</span>}</div>
      {earlier.length>0&&<div className="vs-earlier"><span className="vs-earlier-k">Earlier</span>{earlier.map(h=><span key={h.id} className="vs-pill">{friendlyVisit(h.visited_at)}</span>)}</div>}
    </>}
  </div>;
}
