/** Bookwhen desk sessions helpers (Europe/London). Live API rows only - never a fixed timetable. */
export const SESSION_TZ='Europe/London';
/** Verified public schedule (unsigned marketing redirects elsewhere; this is the staff schedule host path). */
export const PUBLIC_SCHEDULE_URL='https://atlanticreach.bookwhen.com/schedules/utxdsfe4hutv';
export const ADMIN_HOST='https://atlanticreach.bookwhen.com';
export const PUBLIC_EVENT_HOST='https://bookwhen.com/atlanticreach';

/** Bookwhen event ids look like ev-srg2i-20261106140000 */
export function isValidEventId(id){
  return typeof id==='string' && /^ev-[a-z0-9]+-\d{14}$/i.test(id.trim());
}

/** Locals card Registration desk event - not an activity class. Exact title only. */
export function isRegistrationSession(session){
  const title=String(session?.title??session??'').replace(/\s+/g,' ').trim();
  return title.toLowerCase()==='registration';
}

/** Drop Registration from live schedule lists (display + sync targets). */
export function filterActivitySessions(list){
  return (list||[]).filter(s=>!isRegistrationSession(s));
}


export function classifySession(session, now=new Date()){
  const s=Date.parse(session?.start_at||'');
  const e=Date.parse(session?.end_at||'');
  if(Number.isNaN(s)||Number.isNaN(e)) return 'unknown';
  const n=now.getTime();
  if(s<=n && n<e) return 'current';
  if(s>n) return 'upcoming';
  return 'past';
}

export function partitionSessions(list, now=new Date()){
  const current=[], upcoming=[];
  for(const s of list||[]){
    const k=classifySession(s,now);
    if(k==='current') current.push(s);
    else if(k==='upcoming') upcoming.push(s);
  }
  const byStart=(a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at);
  current.sort(byStart); upcoming.sort(byStart);
  return {current, upcoming};
}

/**
 * Replace local list with the latest successful API payload.
 * Events missing from the new payload disappear (early close / cancelled / removed).
 * Edited times come from new start_at/end_at on the same id.
 */
export function reconcileSessions(prevList, nextList){
  const next=Array.isArray(nextList)?nextList:[];
  // Full replace keyed by current response - no merging stale rows
  const byId=new Map();
  for(const s of next){
    if(!s?.id) continue;
    byId.set(s.id,{...s});
  }
  return [...byId.values()];
}

export function formatSessionWhen(iso, opts={}){
  if(!iso) return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB',{
    timeZone:SESSION_TZ,
    weekday:opts.weekday?'short':undefined,
    day:'numeric', month:'short',
    hour:'2-digit', minute:'2-digit',
  });
}

export function formatSessionRange(startAt, endAt){
  if(!startAt||!endAt) return '';
  const a=formatSessionWhen(startAt,{weekday:true});
  const b=new Date(endAt).toLocaleTimeString('en-GB',{timeZone:SESSION_TZ,hour:'2-digit',minute:'2-digit'});
  return `${a} - ${b}`;
}

/** "09:45" - synced-at label without seconds. */
export function formatHM(iso){
  if(!iso) return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB',{timeZone:SESSION_TZ,hour:'2-digit',minute:'2-digit'});
}

export function formatAsOf(iso){
  if(!iso) return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB',{timeZone:SESSION_TZ,hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

export function capacityLabel(count, limit){
  if(typeof count!=='number') return null;
  if(typeof limit==='number' && limit>0) return `${count}/${limit}`;
  return `${count} booked`;
}

/** Verified admin register/attendance URL from the live event id only. */
export function adminAttendanceUrl(eventId){
  if(!isValidEventId(eventId)) return null;
  return `${ADMIN_HOST}/events/${encodeURIComponent(eventId.trim())}/attendances`;
}

/** Verified public event page from the live event id. */
export function publicEventUrl(eventId){
  if(!isValidEventId(eventId)) return null;
  return `${PUBLIC_EVENT_HOST}/e/${encodeURIComponent(eventId.trim())}`;
}

/** Prefer verified per-event admin register link; else public event; else schedule. Never hardcode a stale slug. */
export function sessionOpenUrl(session, meta={}){
  const id=session?.id;
  const admin=adminAttendanceUrl(id);
  if(admin) return admin;
  const pub=publicEventUrl(id);
  if(pub) return pub;
  return meta.schedule_url || PUBLIC_SCHEDULE_URL;
}

export function sessionLinkLabel(session){
  if(isValidEventId(session?.id)) return 'Open register';
  return 'Open schedule';
}

/** Freshness: age of as_of vs now. */
export function sessionFreshness(asOfIso, now=new Date(), staleAfterMs=3*60*1000){
  if(!asOfIso) return {kind:'unknown', ageMs:null, stale:true};
  const t=Date.parse(asOfIso);
  if(Number.isNaN(t)) return {kind:'unknown', ageMs:null, stale:true};
  const ageMs=now.getTime()-t;
  if(ageMs>staleAfterMs) return {kind:'stale', ageMs, stale:true};
  return {kind:'fresh', ageMs, stale:false};
}

/** Compact upcoming list: show first `limit` unless expanded. */
export function visibleUpcoming(upcoming, {limit=3, expanded=false}={}){
  const list=Array.isArray(upcoming)?upcoming:[];
  const lim=Math.max(0, Number(limit)||0);
  if(expanded || list.length<=lim){
    return {shown:list, hidden:0, truncated:false, total:list.length};
  }
  return {shown:list.slice(0,lim), hidden:list.length-lim, truncated:true, total:list.length};
}

