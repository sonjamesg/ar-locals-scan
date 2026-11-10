import {SHARING_RULES,SEVERITY_ORDER} from './visitRules.js';
export const TZ='Europe/London';
const partsFmt=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'});
const WD={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
/** London calendar parts for an instant. */
export function londonParts(iso){const d=new Date(iso);if(Number.isNaN(d.getTime()))return null;
  const p=Object.fromEntries(partsFmt.formatToParts(d).map(x=>[x.type,x.value]));
  const day=`${p.year}-${p.month}-${p.day}`;const wd=WD[p.weekday];
  return {day,month:`${p.year}-${p.month}`,hour:Number(p.hour)%24,minute:Number(p.minute),weekday:wd,week:weekKey(day,wd),ms:d.getTime()};}
/** Monday (YYYY-MM-DD) of the London week containing `day`. */
export function weekKey(day,wd){const [y,m,d]=day.split('-').map(Number);const t=Date.UTC(y,m-1,d)-wd*864e5;return new Date(t).toISOString().slice(0,10);}
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);const i=s.length>>1;return s.length%2?s[i]:(s[i-1]+s[i])/2;};
const hm=p=>String(p.hour).padStart(2,'0')+':'+String(p.minute).padStart(2,'0');
const dayLabel=day=>{const[y,m,d]=day.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)).toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'});};

/** Per-member stats from a list of visits ({visited_at, source}). */
export function memberStats(visits,now=new Date()){
  const vs=(visits||[]).map(v=>({...v,p:londonParts(v.visited_at)})).filter(v=>v.p).sort((a,b)=>a.p.ms-b.p.ms);
  const nowP=londonParts(now.toISOString());
  const days=new Set(vs.map(v=>v.p.day));const month=vs.filter(v=>v.p.month===nowP.month);
  const byWeek=new Map(),byMonth=new Map(),byDay=new Map();const hours=Array(24).fill(0),weekdays=Array(7).fill(0);
  for(const v of vs){byWeek.set(v.p.week,(byWeek.get(v.p.week)||0)+1);byMonth.set(v.p.month,(byMonth.get(v.p.month)||0)+1);
    (byDay.get(v.p.day)||byDay.set(v.p.day,[]).get(v.p.day)).push(v);hours[v.p.hour]++;weekdays[v.p.weekday]++;}
  return {total:vs.length,days:days.size,monthVisits:month.length,monthDays:new Set(month.map(v=>v.p.day)).size,
    first:vs[0]?.visited_at||null,last:vs[vs.length-1]?.visited_at||null,byWeek,byMonth,byDay,hours,weekdays,visits:vs};
}
/** Last `n` Monday-week buckets ending with the current week, oldest first. */
export function weekSeries(byWeek,n=12,now=new Date()){const p=londonParts(now.toISOString());const out=[];let t=Date.parse(p.week+'T00:00:00Z');
  for(let i=n-1;i>=0;i--){const k=new Date(t-i*7*864e5).toISOString().slice(0,10);out.push({key:k,label:new Date(k+'T00:00:00Z').toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'}),value:byWeek.get(k)||0});}return out;}
export function monthSeries(byMonth,n=6,now=new Date()){const p=londonParts(now.toISOString());let[y,m]=p.month.split('-').map(Number);const out=[];
  for(let i=0;i<n;i++){const k=`${y}-${String(m).padStart(2,'0')}`;out.unshift({key:k,label:new Date(Date.UTC(y,m-1,1)).toLocaleDateString('en-GB',{timeZone:'UTC',month:'short'}),value:byMonth.get(k)||0});m--;if(!m){m=12;y--;}}return out;}

/** Median weekly check-ins across members who visited at least once in that week. */
export function boardWeekNorm(allStats){const a=[];for(const s of allStats)for(const v of s.byWeek.values())a.push(v);return median(a);}

/**
 * Cautious card-sharing hints for one member. Returns {severity:'none'|'check'|'high', reasons:[{severity,code,text}]}.
 * `visits` may include raw scans (if ever stored); counted visits alone can still trip the same-day, hours and volume checks.
 */
export function sharingFlags(stats,{norm=0,rules=SHARING_RULES}={}){
  const R=rules,reasons=[];const add=(severity,code,text)=>reasons.push({severity,code,text});
  const vs=stats.visits||[];
  // 1) close-together scans (raw data only)
  for(let i=1;i<vs.length;i++){const gap=(vs[i].p.ms-vs[i-1].p.ms)/6e4;
    if(vs[i].p.day===vs[i-1].p.day&&gap>=R.closeScanMinMinutes&&gap<=R.closeScanMaxMinutes)
      add('check','close',`Two scans ${Math.round(gap)} min apart on ${dayLabel(vs[i].p.day)} (${hm(vs[i-1].p)} and ${hm(vs[i].p)}). Could be two people on one card.`);}
  // 2) several counted check-ins on one day
  for(const [day,list] of stats.byDay){if(list.length<R.sameDayCheck)continue;
    const spanH=(list[list.length-1].p.ms-list[0].p.ms)/36e5;const times=list.map(v=>hm(v.p)).join(', ');
    const sev=list.length>=R.sameDayHigh||spanH>=R.sameDayFarApartHours?(list.length>=R.sameDayHigh?'high':'check'):'check';
    add(sev,'sameday',`${list.length} check-ins on ${dayLabel(day)} (${times})${spanH>=R.sameDayFarApartHours?`, ${Math.round(spanH)} hours apart`:''}. Could be a return visit, or someone else using the card.`);}
  // 3) outside opening hours
  const odd=vs.filter(v=>v.p.hour<R.openHour||v.p.hour>=R.closeHour);
  if(odd.length)add('check','hours',`${odd.length} check-in${odd.length===1?'':'s'} outside usual opening hours (${String(R.openHour).padStart(2,'0')}:00 to ${String(R.closeHour).padStart(2,'0')}:00), e.g. ${dayLabel(odd[0].p.day)} ${hm(odd[0].p)}.`);
  // 4) very busy weeks
  const weeks=[...stats.byWeek.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
  for(const [wk,n] of weeks){if(n>=R.weekHigh)add('high','week',`${n} check-ins in the week of ${dayLabel(wk)}. Much more than one person usually visits.`);
    else if(n>=R.weekCheck)add('check','week',`${n} check-ins in the week of ${dayLabel(wk)}. Busier than most members.`);}
  // 5) sudden jump vs their own average
  for(let i=R.spikeMinHistoryWeeks;i<weeks.length;i++){const prev=weeks.slice(0,i).map(w=>w[1]);const avg=prev.reduce((a,b)=>a+b,0)/prev.length;const [wk,n]=weeks[i];
    if(n>=R.spikeMinVisits&&n>=avg*R.spikeFactor)add('check','spike',`${n} check-ins in the week of ${dayLabel(wk)}, about ${Math.round(n/Math.max(avg,0.1))} times their usual week.`);}
  // 6) far above the board norm
  if(norm>0){const top=weeks.reduce((a,w)=>w[1]>a[1]?w:a,['',0]);
    if(top[1]>=R.normMinVisits&&top[1]>=norm*R.normFactor&&!reasons.some(r=>r.code==='week'&&r.text.includes(dayLabel(top[0]))))
      add('check','norm',`${top[1]} check-ins in the week of ${dayLabel(top[0])}. A typical member week here is ${norm}.`);}
  const severity=reasons.reduce((a,r)=>SEVERITY_ORDER[r.severity]>SEVERITY_ORDER[a]?r.severity:a,'none');
  reasons.sort((a,b)=>SEVERITY_ORDER[b.severity]-SEVERITY_ORDER[a.severity]);
  return {severity,reasons};
}
/** Group raw visits by member id. */
export function groupByMember(rows){const m=new Map();for(const r of rows||[])(m.get(r.member_id)||m.set(r.member_id,[]).get(r.member_id)).push(r);return m;}
