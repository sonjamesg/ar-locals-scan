import {useEffect,useState} from 'react';
import {sb} from '../lib.js';
import {formatVisitWhen} from '../lib/visits.js';

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
  return <div className="md-panel visit-stats">
    <div className="md-label">Gym visits (reception check-ins)</div>
    {err&&<div className="err md-err">{err}</div>}
    {!st&&!err&&<div className="muted">Loading visits…</div>}
    {st&&<>
      <div className="md-chips">
        <span className="chip"><em>Days</em>{st.distinct_days||0}</span>
        <span className="chip"><em>Check-ins</em>{st.total_visits||0}</span>
        <span className="chip"><em>This month</em>{st.days_this_month||0}d / {st.visits_this_month||0}</span>
        {st.last_visit_at&&<span className="chip"><em>Last</em>{formatVisitWhen(st.last_visit_at)}</span>}
      </div>
      {hist&&hist.length>0&&<ul className="visit-hist">{hist.map(h=><li key={h.id}>{formatVisitWhen(h.visited_at)}</li>)}</ul>}
      {hist&&!hist.length&&<div className="muted md-checked">No check-ins recorded yet</div>}
    </>}
  </div>;
}
