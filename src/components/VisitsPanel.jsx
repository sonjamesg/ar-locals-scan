import {useEffect,useState} from 'react';
import {noDash} from '../lib/noDash.js';
import {sb} from '../lib.js';
import {currentLondonMonth,formatVisitWhen,monthLabel,VISIT_TZ} from '../lib/visits.js';

export default function VisitsPanel({onMsg}){
  const now=currentLondonMonth();
  const[year,setYear]=useState(now.year);
  const[month,setMonth]=useState(now.month);
  const[rows,setRows]=useState(null);
  const[err,setErr]=useState('');

  async function load(y=year,m=month){
    setErr('');setRows(null);
    const{data,error}=await sb.rpc('visits_month_report',{p_year:y,p_month:m});
    if(error){setErr(error.message);setRows([]);onMsg?.({err:1,t:error.message});return;}
    setRows(data||[]);
  }
  useEffect(()=>{load();},[year,month]);

  const months=[];
  for(let i=0;i<12;i++){
    let m=now.month-i,y=now.year;
    while(m<=0){m+=12;y-=1;}
    months.push({y,m,label:monthLabel(y,m)});
  }

  const totalVisits=(rows||[]).reduce((a,r)=>a+Number(r.visit_count||0),0);
  const totalPeople=(rows||[]).length;
  const topDays=(rows||[]).reduce((a,r)=>Math.max(a,Number(r.distinct_days||0)),0);

  return <section className="panel visits-panel">
    <h2>Visits</h2>
    <p className="visits-note">Reception check-ins from the Scan desk (scans and the first confirmed card link). First check-in each day counts; another the same day counts after 3 hours. Leaderboard ranks by <b>distinct days</b> in {VISIT_TZ} (fair for member of the month). Tracking starts from when this feature went live, so past gym visits were not imported. Scans show someone checked in at reception; they do not prove floor entry beyond that.</p>
    <div className="visits-controls">
      <label>Month<select value={`${year}-${month}`} onChange={e=>{const[y,m]=e.target.value.split('-').map(Number);setYear(y);setMonth(m);}}>
        {months.map(x=><option key={x.label} value={`${x.y}-${x.m}`}>{x.label}</option>)}
      </select></label>
      <button type="button" className="btn ghost" onClick={()=>load()}>Refresh</button>
    </div>
    {err&&<div className="err">{noDash(err)}</div>}
    {rows&&<div className="am-stats visits-stats">
      <div className="am-stat"><b>{totalPeople}</b><span>Members visited</span></div>
      <div className="am-stat"><b>{totalVisits}</b><span>Check-ins</span></div>
      <div className="am-stat ok"><b>{topDays||'-'}</b><span>Top distinct days</span></div>
    </div>}
    <h3 className="visits-h">Member of the month board</h3>
    <p className="muted visits-sub">Sorted by distinct visit days, then check-in count. Same-day repeats within 3 hours do not add days or visits.</p>
    <ul className="hits visits-list">
      {rows===null&&<li className="muted">Loading…</li>}
      {rows&&!rows.length&&<li className="muted fb-empty">No check-ins recorded for {monthLabel(year,month)} yet.</li>}
      {(rows||[]).map((r,i)=><li key={r.member_id} className="hit-row visits-row">
        <div className="hit visits-hit">
          <span className="visits-rank">#{i+1}</span>
          <div className="hit-info">
            <span className="hit-name">{[r.first_name,r.last_name].filter(Boolean).join(' ')||r.email||'Member'}</span>
            <span className="hit-meta">{r.distinct_days} day{r.distinct_days==1?'':'s'} · {r.visit_count} check-in{r.visit_count==1?'':'s'} · last {formatVisitWhen(r.last_visit_at)}</span>
          </div>
        </div>
      </li>)}
    </ul>
  </section>;
}
