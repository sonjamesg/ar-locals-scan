import {useEffect,useMemo,useState} from 'react';
import {noDash} from '../lib/noDash.js';
import {sb} from '../lib.js';
import {currentLondonMonth,formatVisitWhen,monthLabel,friendlyVisit} from '../lib/visits.js';
import {memberStats,sharingFlags,boardWeekNorm,groupByMember} from '../lib/visitInsights.js';
import {queryTokens,normWords} from '../lib/smartSearch.js';
import VisitProfile from './VisitProfile.jsx';
import {boardName,FlagChip} from './VisitBits.jsx';
export {boardName,FlagChip};
import {IconSearch,IconUser,IconTrophy} from './Icons.jsx';

const SORTS={days:'Most days',checkins:'Most check-ins',last:'Most recent',name:'Name A to Z'};
export function sortBoard(list,by){const a=[...list];const nm=r=>(boardName(r)||r.email||'').toLowerCase();
  const cmp={days:(x,y)=>y.distinct_days-x.distinct_days||y.visit_count-x.visit_count||Date.parse(y.last_visit_at)-Date.parse(x.last_visit_at),
    checkins:(x,y)=>y.visit_count-x.visit_count||y.distinct_days-x.distinct_days,
    last:(x,y)=>Date.parse(y.last_visit_at||0)-Date.parse(x.last_visit_at||0),
    name:(x,y)=>nm(x).localeCompare(nm(y))}[by]||(()=>0);
  return a.sort(cmp);}
export function filterBoard(list,q){const toks=queryTokens(q);if(!toks.length)return list;
  return list.filter(r=>{const hay=normWords([boardName(r),r.email].filter(Boolean).join(' '));const flat=hay.replace(/\s+/g,'');return toks.every(vs=>vs.some(t=>hay.includes(t)||flat.includes(t)));});}
export default function VisitsPanel({onMsg}){
  const now=currentLondonMonth();
  const[year,setYear]=useState(now.year);const[month,setMonth]=useState(now.month);
  const[rows,setRows]=useState(null);const[raw,setRaw]=useState(null);const[err,setErr]=useState('');
  const[q,setQ]=useState('');const[sort,setSort]=useState('days');const[only,setOnly]=useState('all');const[sel,setSel]=useState(null);

  async function load(y=year,m=month,withRaw=false){
    setErr('');setRows(null);
    const[a,b]=await Promise.all([sb.rpc('visits_month_report',{p_year:y,p_month:m}),withRaw||!raw?sb.rpc('visits_raw',{}):Promise.resolve(null)]);
    if(a.error){setErr(a.error.message);setRows([]);onMsg?.({err:1,t:a.error.message});return;}
    setRows((a.data||[]).map(r=>({...r,distinct_days:Number(r.distinct_days||0),visit_count:Number(r.visit_count||0)})));
    if(b){if(b.error)setRaw([]);else setRaw(b.data||[]);}
  }
  useEffect(()=>{load();},[year,month]);

  const insight=useMemo(()=>{const by=groupByMember(raw||[]);const stats=new Map();for(const[id,v]of by)stats.set(id,memberStats(v));
    const norm=boardWeekNorm([...stats.values()]);const flags=new Map();for(const[id,s]of stats)flags.set(id,sharingFlags(s,{norm}));return {by,stats,flags,norm};},[raw]);

  const months=[];for(let i=0;i<12;i++){let m=now.month-i,y=now.year;while(m<=0){m+=12;y-=1;}months.push({y,m,label:monthLabel(y,m)});}
  const ranked=useMemo(()=>sortBoard(rows||[],'days').map((r,i)=>({...r,rank:i+1,flag:insight.flags.get(r.member_id)})),[rows,insight]);
  const flaggedN=ranked.filter(r=>r.flag&&r.flag.severity!=='none').length;
  const shown=sortBoard(filterBoard(ranked,q),sort).filter(r=>only==='all'||(r.flag&&r.flag.severity!=='none'));
  const totalVisits=ranked.reduce((a,r)=>a+r.visit_count,0);const topDays=ranked.reduce((a,r)=>Math.max(a,r.distinct_days),0);

  if(sel)return <section className="panel visits-panel"><VisitProfile row={sel} visits={insight.by.get(sel.member_id)||[]} norm={insight.norm} onBack={()=>setSel(null)}/></section>;

  return <section className="panel visits-panel">
    <div className="vis-head"><div><h2>Visits</h2><p className="vis-sub">Member of the month board. Ranked by days visited in {monthLabel(year,month)}.</p></div>
      <div className="vis-controls">
        <label className="vis-month">Month<select value={`${year}-${month}`} onChange={e=>{const[y,m]=e.target.value.split('-').map(Number);setYear(y);setMonth(m);}}>
          {months.map(x=><option key={x.label} value={`${x.y}-${x.m}`}>{x.label}</option>)}</select></label>
        <button type="button" className="btn ghost" onClick={()=>load(year,month,true)}>Refresh</button>
      </div></div>
    {err&&<div className="err">{noDash(err)}</div>}
    <div className="vis-stats">
      <div className="vis-stat"><b>{rows?ranked.length:'-'}</b><span>Members visited</span></div>
      <div className="vis-stat"><b>{rows?totalVisits:'-'}</b><span>Check-ins</span></div>
      <div className="vis-stat"><b>{topDays||'-'}</b><span>Top days</span></div>
      <button type="button" className={'vis-stat vis-stat-flag'+(only==='flagged'?' on':'')} onClick={()=>setOnly(only==='flagged'?'all':'flagged')} title={only==='flagged'?'Show all members again':'Show only members worth checking for card sharing'} aria-pressed={only==='flagged'}><b>{raw?flaggedN:'-'}</b><span>Worth checking</span></button>
    </div>
    <div className="vis-tools">
      <div className="search-field vis-search"><span className="search-ico" aria-hidden="true"><IconSearch/></span>
        <input className="big-input search-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Find on the board by name or email" aria-label="Find on the board by name or email"/></div>
      <label className="vis-sel">Sort<select value={sort} onChange={e=>setSort(e.target.value)}>{Object.entries(SORTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <div className="vis-seg" role="group" aria-label="Filter">
        <button type="button" className={only==='all'?'on':''} aria-pressed={only==='all'} onClick={()=>setOnly('all')}>All</button>
        <button type="button" className={only==='flagged'?'on':''} aria-pressed={only==='flagged'} onClick={()=>setOnly('flagged')}>Flagged ({flaggedN})</button>
      </div>
    </div>
    {only==='flagged'&&<div className="vis-filterbar" role="status"><span>Showing flagged only ({flaggedN})</span><button type="button" className="btn ghost sm" onClick={()=>setOnly('all')}>Show all</button></div>}
    <div className="vis-table" role="table" aria-label="Member of the month board">
      <div className="vis-tr vis-th" role="row"><span role="columnheader">#</span><span role="columnheader">Member</span><span role="columnheader" className="num">Days</span><span role="columnheader" className="num">Check-ins</span><span role="columnheader">Last visit</span><span role="columnheader" className="vis-flagcol"></span></div>
      {rows===null&&<div className="muted vis-empty">Loading…</div>}
      {rows&&!ranked.length&&<div className="muted vis-empty">No check-ins recorded for {monthLabel(year,month)} yet.</div>}
      {rows&&ranked.length>0&&!shown.length&&(only==='flagged'
        ?<div className="vis-empty vis-empty-flag"><p>{flaggedN===0?'Nobody is flagged for card sharing this month.':'No flagged member matches that search.'}</p><button type="button" className="btn primary" onClick={()=>{setOnly('all');setQ('');}}>Show all members</button></div>
        :<div className="muted vis-empty">No one on the board matches that search.</div>)}
      {shown.map(r=>{const n=boardName(r);return <button type="button" role="row" key={r.member_id} className={'vis-tr vis-row'+(r.rank<=3?' top top'+r.rank:'')+(r.flag&&r.flag.severity!=='none'?' flagged':'')} onClick={()=>setSel(r)} title="Open visit profile">
        <span className="vis-rank" role="cell">{r.rank<=3?<span className={'vis-trophy t'+r.rank} title={['1st place','2nd place','3rd place'][r.rank-1]} aria-label={['1st place','2nd place','3rd place'][r.rank-1]}><IconTrophy/><b>{r.rank}</b></span>:<i>{r.rank}</i>}</span>
        <span className="vis-who" role="cell"><span className="vis-ava" aria-hidden="true"><IconUser/></span><span className="vis-namebox">{n?<><span className="vis-name">{n}</span>{r.email&&<span className="vis-email">{r.email}</span>}</>:<span className="vis-name vis-name-email">{r.email||'Member'}</span>}</span></span>
        <span className="num" role="cell"><b>{r.distinct_days}</b><small>day{r.distinct_days===1?'':'s'}</small></span>
        <span className="num" role="cell"><b>{r.visit_count}</b><small>check-in{r.visit_count===1?'':'s'}</small></span>
        <span className="vis-last" role="cell" title={formatVisitWhen(r.last_visit_at)}>{friendlyVisit(r.last_visit_at)}</span>
        <span className="vis-flagcol" role="cell"><FlagChip flag={r.flag}/></span>
      </button>;})}
    </div>
    <p className="vis-foot">First check-in each day counts; another the same day counts after 3 hours. Tracking started when this feature went live, so older gym visits are not included. Flags are hints to check, not proof.</p>
  </section>;
}
