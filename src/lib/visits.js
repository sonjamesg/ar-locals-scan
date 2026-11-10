/** Attendance policy helpers (Europe/London). Server is source of truth. */
export const VISIT_GAP_MS=3*60*60*1000;
export const VISIT_TZ='Europe/London';

export function londonDateKey(iso,timeZone=VISIT_TZ){
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d); // YYYY-MM-DD
}

/** Client-side mirror of policy for tests/docs - suppressed scans do not move lastCounted. */
export function shouldCountVisit(lastCountedIso, candidateIso, timeZone=VISIT_TZ){
  if(!candidateIso) return {count:false,reason:'missing'};
  if(!lastCountedIso) return {count:true,reason:'first_ever'};
  const last=new Date(lastCountedIso).getTime();
  const cand=new Date(candidateIso).getTime();
  if(Number.isNaN(last)||Number.isNaN(cand)) return {count:false,reason:'invalid'};
  const lastDay=londonDateKey(lastCountedIso,timeZone);
  const candDay=londonDateKey(candidateIso,timeZone);
  if(candDay!==lastDay) return {count:true,reason:'first_today'};
  if(cand-last>=VISIT_GAP_MS) return {count:true,reason:'session'};
  return {count:false,reason:'within_session_window',nextEligibleAt:new Date(last+VISIT_GAP_MS).toISOString()};
}

export function applyVisitAttempt(state,candidateIso){
  // state: {lastCountedIso, visits:[{at}], suppressed:[]}
  const st=state||{lastCountedIso:null,visits:[],suppressed:[]};
  const decision=shouldCountVisit(st.lastCountedIso,candidateIso);
  if(decision.count){
    return {
      ...st,
      lastCountedIso:candidateIso,
      visits:[...st.visits,{at:candidateIso,reason:decision.reason}],
      suppressed:st.suppressed
    };
  }
  return {
    ...st,
    lastCountedIso:st.lastCountedIso, // unchanged
    visits:st.visits,
    suppressed:[...st.suppressed,{at:candidateIso,reason:decision.reason}]
  };
}

export function distinctVisitDays(visits,timeZone=VISIT_TZ){
  const s=new Set();
  for(const v of visits||[]){const k=londonDateKey(v.at||v.visited_at,timeZone);if(k)s.add(k);}
  return s.size;
}

export function formatVisitWhen(iso){
  if(!iso) return '';
  return new Date(iso).toLocaleString('en-GB',{timeZone:VISIT_TZ,day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

/** "6 Nov, 16:55" this year, "6 Nov 2025, 16:55" otherwise (London time). */
export function friendlyVisit(iso, now=new Date()){
  if(!iso) return '';
  const d=new Date(iso);
  const y=v=>new Intl.DateTimeFormat('en-GB',{timeZone:VISIT_TZ,year:'numeric'}).format(v);
  const date=d.toLocaleDateString('en-GB',{timeZone:VISIT_TZ,day:'numeric',month:'short',...(y(d)===y(now)?{}:{year:'numeric'})});
  const time=d.toLocaleTimeString('en-GB',{timeZone:VISIT_TZ,hour:'2-digit',minute:'2-digit'});
  return `${date}, ${time}`;
}

export function currentLondonMonth(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:VISIT_TZ,year:'numeric',month:'numeric'}).formatToParts(new Date());
  const y=+parts.find(p=>p.type==='year').value;
  const m=+parts.find(p=>p.type==='month').value;
  return {year:y,month:m};
}

export function monthLabel(year,month){
  return new Date(Date.UTC(year,month-1,1)).toLocaleString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
}
