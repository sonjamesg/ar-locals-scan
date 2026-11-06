import {useCallback,useEffect,useRef,useState} from 'react';
import {sb} from '../lib.js';
import {
  capacityLabel,formatAsOf,formatSessionRange,partitionSessions,reconcileSessions,
  PUBLIC_SCHEDULE_URL,sessionFreshness,sessionLinkLabel,sessionOpenUrl,visibleUpcoming
} from '../lib/sessions.js';
import {IconClock,IconExternalLink} from './Icons.jsx';

const POLL_MS=45_000;
const UPCOMING_PREVIEW=3;

function SessionRow({s}){
  const cap=capacityLabel(s.attendee_count, s.attendee_limit);
  const href=sessionOpenUrl(s);
  const label=sessionLinkLabel(s);
  return <li className="sess-item">
    <div className="sess-main">
      <div className="sess-title">{s.title}</div>
      <div className="sess-when">{formatSessionRange(s.start_at,s.end_at)}</div>
      <div className="sess-meta">
        {cap&&<span className="sess-cap">{cap}</span>}
        {(s.tags||[]).slice(0,3).map(t=><span key={t} className="sess-tag">{t}</span>)}
      </div>
    </div>
    <a className="btn ghost sm sess-open" href={href} target="_blank" rel="noopener noreferrer" title={label}>
      <IconExternalLink/><span>{label==='Open register'?'Register':'Schedule'}</span>
    </a>
  </li>;
}

export default function SessionsPanel(){
  const[loading,setLoading]=useState(true);
  const[err,setErr]=useState('');
  const[errKind,setErrKind]=useState(''); // missing_token | upstream | network | ''
  const[rows,setRows]=useState([]); // reconciled live list
  const[asOf,setAsOf]=useState(null);
  const[scheduleUrl,setScheduleUrl]=useState(PUBLIC_SCHEDULE_URL);
  const[nowTick,setNowTick]=useState(()=>new Date());
  const[expanded,setExpanded]=useState(false);
  const bust=useRef(0);

  const load=useCallback(async({manual=false}={})=>{
    setLoading(true);
    if(manual) setErr('');
    try{
      bust.current+=1;
      const{data,error}=await sb.functions.invoke('bookwhen-sessions',{body:{bust:bust.current,manual:!!manual}});
      if(error && !data){
        setErr(error.message||'Could not load sessions');
        setErrKind('network');
        // Keep previous rows but mark error — do not pretend empty schedule
        setLoading(false);
        return;
      }
      const body=data&&typeof data==='object'?data:{};
      if(body.error && !(body.current||body.upcoming)?.length && body.error!=='ok'){
        // missing_token / upstream with empty lists
        setErr(body.message||body.error);
        setErrKind(body.error||'upstream');
        if(body.as_of) setAsOf(body.as_of);
        if(body.schedule_url) setScheduleUrl(body.schedule_url);
        // On hard config error, clear rows so we don't show stale events as live
        if(body.error==='missing_token') setRows([]);
        setLoading(false);
        return;
      }
      const merged=[...(body.current||[]),...(body.upcoming||[])];
      setRows(prev=>reconcileSessions(prev, merged));
      setAsOf(body.as_of||new Date().toISOString());
      if(body.schedule_url) setScheduleUrl(body.schedule_url);
      setErr('');
      setErrKind('');
      setLoading(false);
    }catch(e){
      setErr(e.message||'Could not load sessions');
      setErrKind('network');
      setLoading(false);
    }
  },[]);

  useEffect(()=>{load(); const t=setInterval(()=>load(),POLL_MS); return()=>clearInterval(t);},[load]);
  useEffect(()=>{const t=setInterval(()=>setNowTick(new Date()),15_000); return()=>clearInterval(t);},[]);

  const {current,upcoming}=partitionSessions(rows, nowTick);
  const preview=visibleUpcoming(upcoming,{limit:UPCOMING_PREVIEW,expanded});
  const fresh=sessionFreshness(asOf, nowTick);
  const empty=!loading && !err && current.length===0 && upcoming.length===0;
  const showingStale=!!err && rows.length>0;

  return <section className="panel sess-panel" aria-live="polite">
    <div className="sess-head">
      <div>
        <h3 className="sess-h"><IconClock className="sess-h-ico"/>Sessions now</h3>
        <p className="muted sess-sub">Live Bookwhen schedule (London). Not whether the scanned member is booked. Closes early / removals drop off after refresh.</p>
      </div>
      <button type="button" className="btn ghost sm" onClick={()=>load({manual:true})} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button>
    </div>

    <div className="sess-status-line muted">
      {asOf?<>Updated {formatAsOf(asOf)}{fresh.stale?' · may be out of date':''}</>:'Not updated yet'}
      {showingStale&&<> · showing last good list (refresh failed)</>}
    </div>

    <div className="sess-scroll">
      {loading&&!rows.length&&!err&&<div className="muted sess-empty">Loading live sessions…</div>}
      {err&&<div className="err md-err" role="alert">
        {errKind==='missing_token'
          ? 'Bookwhen API token is not set on the server — live sessions cannot load. Ask James to set BOOKWHEN_API_TOKEN on Supabase.'
          : err}
        {errKind==='network'&&rows.length===0&&' This is a connection/API error, not “no sessions”.'}
      </div>}
      {empty&&<div className="muted sess-empty">No sessions on now or coming up (live empty — not an error).</div>}

      {current.length>0&&<>
        <div className="sess-label">On now</div>
        <ul className="sess-list">{current.map(s=><SessionRow key={s.id} s={s}/>)}</ul>
      </>}
      {preview.shown.length>0&&<>
        <div className="sess-label">Coming up</div>
        <ul className="sess-list">{preview.shown.map(s=><SessionRow key={s.id} s={s}/>)}</ul>
      </>}
      {preview.truncated&&!expanded&&(
        <button type="button" className="btn ghost sm sess-more" onClick={()=>setExpanded(true)}>
          Show {preview.hidden} more upcoming
        </button>
      )}
      {expanded&&preview.total>UPCOMING_PREVIEW&&(
        <button type="button" className="btn ghost sm sess-more" onClick={()=>setExpanded(false)}>
          Show fewer
        </button>
      )}
    </div>

    <div className="sess-foot">
      <a className="btn ghost sm" href={scheduleUrl} target="_blank" rel="noopener noreferrer">
        <IconExternalLink/><span>Open Bookwhen schedule</span>
      </a>
    </div>
  </section>;
}
