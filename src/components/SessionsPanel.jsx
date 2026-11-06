import {useCallback,useEffect,useState} from 'react';
import {sb} from '../lib.js';
import {capacityLabel,formatSessionRange,PUBLIC_SCHEDULE_URL,sessionLinkLabel,sessionOpenUrl} from '../lib/sessions.js';
import {IconClock,IconExternalLink} from './Icons.jsx';

function SessionRow({s, meta}){
  const cap=capacityLabel(s.attendee_count, s.attendee_limit);
  const href=sessionOpenUrl(s, meta);
  const label=sessionLinkLabel(meta);
  return <li className="sess-item">
    <div className="sess-main">
      <div className="sess-title">{s.title}</div>
      <div className="sess-when">{formatSessionRange(s.start_at,s.end_at)}</div>
      <div className="sess-meta">
        {cap&&<span className="sess-cap">{cap}</span>}
        {(s.tags||[]).slice(0,3).map(t=><span key={t} className="sess-tag">{t}</span>)}
      </div>
    </div>
    <a className="btn ghost sm sess-open" href={href} target="_blank" rel="noopener noreferrer" title={meta.admin_deep_link_note||label}>
      <IconExternalLink/><span>{meta.admin_deep_link?'Open':'Schedule'}</span>
    </a>
  </li>;
}

export default function SessionsPanel(){
  const[state,setState]=useState({loading:true,err:'',data:null});

  const load=useCallback(async()=>{
    setState(s=>({...s,loading:true,err:''}));
    try{
      const{data,error}=await sb.functions.invoke('bookwhen-sessions',{body:{}});
      // supabase-js may put non-2xx body in data or error
      if(error && !data){
        setState({loading:false,err:error.message||'Could not load sessions',data:null});
        return;
      }
      const body=data&&typeof data==='object'?data:{};
      if(body.error && !body.current && !body.upcoming){
        setState({loading:false,err:body.message||body.error,data:body});
        return;
      }
      setState({loading:false,err:'',data:body});
    }catch(e){
      setState({loading:false,err:e.message||'Could not load sessions',data:null});
    }
  },[]);

  useEffect(()=>{load(); const t=setInterval(load,60_000); return()=>clearInterval(t);},[load]);

  const current=state.data?.current||[];
  const upcoming=state.data?.upcoming||[];
  const meta={
    schedule_url:state.data?.schedule_url||PUBLIC_SCHEDULE_URL,
    admin_deep_link:state.data?.admin_deep_link||null,
    admin_deep_link_note:state.data?.admin_deep_link_note||'',
  };
  const empty=!state.loading && !state.err && current.length===0 && upcoming.length===0;

  return <section className="panel sess-panel" aria-live="polite">
    <div className="sess-head">
      <div>
        <h3 className="sess-h"><IconClock className="sess-h-ico"/>Sessions now</h3>
        <p className="muted sess-sub">Venue schedule (London). Does not show if the scanned member is booked.</p>
      </div>
      <button type="button" className="btn ghost sm" onClick={load} disabled={state.loading}>{state.loading?'Refreshing…':'Refresh'}</button>
    </div>

    {state.loading&&!state.data&&<div className="muted sess-empty">Loading sessions…</div>}
    {state.err&&<div className="err md-err" role="alert">{state.err}{(state.data?.error==='missing_token')&&<span> Ask James to set BOOKWHEN_API_TOKEN on the Supabase project.</span>}</div>}
    {empty&&<div className="muted sess-empty">No sessions on now or coming up today/tomorrow.</div>}

    {current.length>0&&<>
      <div className="sess-label">On now</div>
      <ul className="sess-list">{current.map(s=><SessionRow key={s.id} s={s} meta={meta}/>)}</ul>
    </>}
    {upcoming.length>0&&<>
      <div className="sess-label">Coming up</div>
      <ul className="sess-list">{upcoming.map(s=><SessionRow key={s.id} s={s} meta={meta}/>)}</ul>
    </>}

    <div className="sess-foot">
      <a className="btn ghost sm" href={meta.schedule_url} target="_blank" rel="noopener noreferrer">
        <IconExternalLink/><span>Open Bookwhen schedule</span>
      </a>
    </div>
  </section>;
}
