import {useCallback,useEffect,useRef,useState} from 'react';
import {sb} from '../lib.js';
import {
  capacityLabel,filterActivitySessions,formatAsOf,formatHM,formatSessionRange,partitionSessions,reconcileSessions,
  PUBLIC_SCHEDULE_URL,sessionFreshness,sessionLinkLabel,sessionOpenUrl,visibleUpcoming
} from '../lib/sessions.js';
import {
  syncEventAllowlist,mergeSnapshots,searchQueryFromAttendeeName,snapshotSummary,attendeesForEvent,ticketInfo,MIN_SYNC_EXT,extVersionAtLeast,extNeed,EXT_LATEST
} from '../lib/attendeeSync.js';
import {extAttendeeSync} from './Members.jsx';
import {ExtDownloadLink,openExtHelp} from './ExtensionHelp.jsx';
import {IconClock,IconExternalLink,IconUsers,IconUser} from './Icons.jsx';

const POLL_MS=45_000;
const UPCOMING_PREVIEW=3;

function SessionNames({group, onSearchName}){
  const[open,setOpen]=useState(false);
  if(!group?.synced){
    return <div className="sess-names">
      <div className="sess-names-status muted">Names · not synced yet</div>
    </div>;
  }
  if(group.failed){
    return <div className="sess-names">
      <div className="sess-names-status muted" title={group.error||''}>Names · sync failed{group.error?` — ${group.error}`:''}</div>
    </div>;
  }
  const n=(group.attendees||[]).length;
  const when=group.captured_at?formatHM(group.captured_at):'';
  return <div className="sess-names">
    <button type="button" className="sess-names-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span className="sess-names-count"><IconUsers/>{n} name{n===1?'':'s'}{group.incomplete?' · incomplete':''}</span>
      <span className="sess-names-right">{when&&<span className="sess-synced">Synced {when}</span>}<span aria-hidden="true">{open?'▾':'▸'}</span></span>
    </button>
    {open&&<>
      <p className="sess-names-disclaimer">Names from Bookwhen · not verified Locals</p>
      {n===0
        ? <div className="muted sess-names-empty">No names on this register snapshot</div>
        : <ol className="sess-names-list">
            {group.attendees.map((a,i)=>{
              const q=searchQueryFromAttendeeName(a.name);
              return <li key={(a.booking_id||'')+':'+a.name+':'+i}>
                <button type="button" className="sess-name-btn" disabled={!q}
                  onClick={()=>onSearchName&&onSearchName(q)}
                  title="Search members for this name — confirm before linking a card">
                  <span className="sess-name-ico" aria-hidden="true"><IconUser/></span>
                  <span className="sess-name-txt">{a.name}</span>
                  {(()=>{const tk=ticketInfo(a.ticket);
                    if(!tk) return <span className={'sess-name-type'+(a.child?' is-child':'')}>{a.child?'Child':'Adult'}</span>;
                    return <span className="sess-ticket" title={tk.raw}>
                      <span className={'sess-ticket-badge tk-'+tk.kind}>{tk.label}</span>
                      {tk.detail&&<span className="sess-ticket-detail">{tk.detail}</span>}
                    </span>;})()}
                </button>
              </li>;
            })}
          </ol>}
    </>}
  </div>;
}

function SessionRow({s, nameGroup, onSearchName}){
  const cap=capacityLabel(s.attendee_count, s.attendee_limit);
  const href=sessionOpenUrl(s);
  const label=sessionLinkLabel(s);
  return <li className="sess-item">
    <div className="sess-item-top">
      <div className="sess-main">
        <div className="sess-title">{s.title}</div>
        <div className="sess-when"><IconClock/><span>{formatSessionRange(s.start_at,s.end_at)}</span></div>
        <div className="sess-meta">
          {cap&&<span className="sess-cap">{cap}</span>}
          {(s.tags||[]).slice(0,3).map(t=><span key={t} className="sess-tag">{t}</span>)}
        </div>
      </div>
      <a className="btn ghost sm sess-open" href={href} target="_blank" rel="noopener noreferrer" title={label}>
        <IconExternalLink/><span>{label==='Open register'?'Register':'Schedule'}</span>
      </a>
    </div>
    <SessionNames group={nameGroup} onSearchName={onSearchName}/>
  </li>;
}

export default function SessionsPanel({onSearchName}){
  const[loading,setLoading]=useState(true);
  const[err,setErr]=useState('');
  const[errKind,setErrKind]=useState('');
  const[rows,setRows]=useState([]);
  const[asOf,setAsOf]=useState(null);
  const[scheduleUrl,setScheduleUrl]=useState(PUBLIC_SCHEDULE_URL);
  const[nowTick,setNowTick]=useState(()=>new Date());
  const[expanded,setExpanded]=useState(false);
  const bust=useRef(0);

  // Attendee re-sync — session-local only; NEVER on mount/poll
  const[snapshots,setSnapshots]=useState([]);
  const[syncBusy,setSyncBusy]=useState(false);
  const[syncErr,setSyncErr]=useState('');
  const[extProblem,setExtProblem]=useState(null);
  const[syncProg,setSyncProg]=useState(null); // {i,total}
  const syncGen=useRef(0);

  const load=useCallback(async({manual=false}={})=>{
    setLoading(true);
    if(manual) setErr('');
    try{
      bust.current+=1;
      const{data,error}=await sb.functions.invoke('bookwhen-sessions',{body:{bust:bust.current,manual:!!manual}});
      if(error && !data){
        setErr(error.message||'Could not load sessions');
        setErrKind('network');
        setLoading(false);
        return;
      }
      const body=data&&typeof data==='object'?data:{};
      if(body.error && !(body.current||body.upcoming)?.length && body.error!=='ok'){
        setErr(body.message||body.error);
        setErrKind(body.error||'upstream');
        if(body.as_of) setAsOf(body.as_of);
        if(body.schedule_url) setScheduleUrl(body.schedule_url);
        if(body.error==='missing_token') setRows([]);
        setLoading(false);
        return;
      }
      const merged=filterActivitySessions([...(body.current||[]),...(body.upcoming||[])]);
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

  const allowlist=syncEventAllowlist(current, preview.shown);

  async function reSyncAttendees(){
    setSyncErr('');
    const need=extNeed(window.__arExt);
    setExtProblem(need);
    if(need) return;
    if(!allowlist.length){
      setSyncErr('No activity sessions on now or coming up to sync.');
      return;
    }
    const gen=++syncGen.current;
    setSyncBusy(true);
    setSyncProg({i:0,total:allowlist.length});
    // One batch call — extension walks sequentially; progress is coarse
    const res=await extAttendeeSync(allowlist.map(({id,title,start_at,end_at})=>({id,title,start_at,end_at})),(done,total)=>{if(gen===syncGen.current)setSyncProg({i:done,total});});
    if(gen!==syncGen.current) return; // superseded
    setSyncBusy(false);
    setSyncProg(null);
    if(res.error){ setSyncErr(res.error); return; }
    const snaps=Array.isArray(res.snapshots)?res.snapshots:[];
    // Replace entire set for this button press (per-event replace inside)
    let next=[];
    for(const s of snaps) next=mergeSnapshots(next,s);
    setSnapshots(next);
    const sum=snapshotSummary(next);
    const firstErr=(snaps.find(x=>x?.status==='failed'&&x.error)||{}).error;
    if(!snaps.length) setSyncErr('Extension returned no sessions — reload the extension and try again.');
    else if(sum.failed && !sum.ok) setSyncErr('Could not read registers'+(firstErr?` — ${firstErr}`:'')+'. Check Bookwhen is signed in in this browser and try again.');
    else if(sum.failed) setSyncErr(`Synced ${sum.ok} session(s); ${sum.failed} failed.`);
    else setSyncErr('');
  }

  const sum=snapshotSummary(snapshots);
  const lastCap=snapshots.reduce((m,s)=>Math.max(m, Date.parse(s.captured_at||0)||0),0);

  return <section className="panel sess-panel" aria-live="polite">
    <div className="sess-head">
      <div>
        <h3 className="sess-h"><IconClock className="sess-h-ico"/>Sessions now</h3>
        <p className="muted sess-sub">Live Bookwhen schedule</p>
      </div>
      <div className="sess-head-acts">
        <button type="button" className="btn primary sm sess-resync" onClick={reSyncAttendees} disabled={syncBusy||!allowlist.length}
          title="Read names from each session register in Bookwhen via the extension (signed-in browser). Only runs when pressed.">
          <IconUsers/><span>{syncBusy?`Re-syncing${syncProg?` ${syncProg.i||''}/${syncProg.total}`:''}…`:'Re-sync names'}</span>
        </button>
        <button type="button" className="btn ghost sm" onClick={()=>load({manual:true})} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button>
      </div>
    </div>

    {(showingStale||(asOf&&fresh.stale))&&<div className="sess-warn" role="status">
      {showingStale?'Refresh failed — showing the last good list':'List may be out of date'}{asOf?` (updated ${formatHM(asOf)})`:''}
    </div>}

    <div className="sess-att-bar">
      {extProblem&&<div className="ext-need" role="alert">
        <div className="ext-need-txt"><b>{extProblem==='missing'?'Extension not installed':'Extension needs updating'}</b>
          <span>{extProblem==='missing'
            ?'Names come from Bookwhen through the Locals Card Chrome extension on this computer.'
            :`This computer has v${window.__arExt}; names need v${MIN_SYNC_EXT} or newer.`}</span></div>
        <div className="ext-need-acts">
          <ExtDownloadLink className="btn primary sm" label="Download extension" onClick={()=>openExtHelp()}/>
          <button type="button" className="btn ghost sm" onClick={openExtHelp}>How to install</button>
        </div>
      </div>}
      {!extProblem&&window.__arExt&&!extVersionAtLeast(window.__arExt,EXT_LATEST)&&<div className="ext-soft">
        Faster extension v{EXT_LATEST} available (syncs 5 sessions at once). <ExtDownloadLink className="foot-fb ext-soft-link" label="Download" onClick={()=>openExtHelp()}/>
      </div>}
      {syncErr&&<div className="err md-err" role="alert">{syncErr}</div>}
      {sum.ok>0&&<div className="muted sess-att-asof">
        Names synced {lastCap?formatHM(new Date(lastCap).toISOString()):'—'} · {sum.people} name{sum.people===1?'':'s'}
        {sum.failed?` · ${sum.failed} failed`:''}{sum.partial?` · ${sum.partial} incomplete`:''}
      </div>}
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
        <ul className="sess-list">{current.map(s=><SessionRow key={s.id} s={s} nameGroup={attendeesForEvent(snapshots,s.id)} onSearchName={onSearchName}/>)}</ul>
      </>}
      {preview.shown.length>0&&<>
        <div className="sess-label">Coming up</div>
        <ul className="sess-list">{preview.shown.map(s=><SessionRow key={s.id} s={s} nameGroup={attendeesForEvent(snapshots,s.id)} onSearchName={onSearchName}/>)}</ul>
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
