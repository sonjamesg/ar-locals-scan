/** Bookwhen desk sessions helpers (Europe/London display). */
export const SESSION_TZ='Europe/London';
export const PUBLIC_SCHEDULE_URL='https://bookwhen.com/atlanticreach';

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
  return `${a} – ${b}`;
}

export function capacityLabel(count, limit){
  if(typeof count!=='number') return null;
  if(typeof limit==='number' && limit>0) return `${count}/${limit}`;
  return `${count} booked`;
}

/** Prefer verified admin deep link; otherwise honest public schedule. */
export function sessionOpenUrl(session, meta={}){
  if(meta.admin_deep_link && typeof meta.admin_deep_link==='string'){
    // Placeholder for parent-supplied pattern; do not invent paths here.
    return meta.admin_deep_link.replace('{id}', encodeURIComponent(session?.id||''));
  }
  return meta.schedule_url || PUBLIC_SCHEDULE_URL;
}

export function sessionLinkLabel(meta={}){
  return meta.admin_deep_link ? 'Open in Bookwhen admin' : 'Open Bookwhen schedule';
}
