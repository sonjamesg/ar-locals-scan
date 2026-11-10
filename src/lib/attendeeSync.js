/** Attendee register sync helpers (session-local). Name-only rows are unverified. */
import {adminAttendanceUrl,isValidEventId,filterActivitySessions} from './sessions.js';

export const ATTENDEE_SYNC_TIMEOUT_MS=45_000;
/** Lowest extension version whose register parser handles the live Bookwhen markup. */
export const MIN_SYNC_EXT='1.2.1';
export function extVersionAtLeast(v, min){
  const a=String(v||'').split('.').map(n=>parseInt(n,10)||0), b=String(min).split('.').map(n=>parseInt(n,10)||0);
  for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}
  return true;
}
export const ATTENDEE_SYNC_GAP_MS=600;

/** Events to open registers for: all On now + currently shown Coming up. */
export function syncEventAllowlist(current, shownUpcoming){
  const out=[]; const seen=new Set();
  for(const s of filterActivitySessions([...(current||[]),...(shownUpcoming||[])])){
    const id=typeof s==='string'?s:s?.id;
    if(!isValidEventId(id)||seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title:(typeof s==='object'&&s?.title)||id,
      start_at:(typeof s==='object'&&s?.start_at)||null,
      end_at:(typeof s==='object'&&s?.end_at)||null,
      register_url:adminAttendanceUrl(id),
    });
  }
  return out;
}

export function assertAllowlistedIds(requested, allowlist){
  const ok=new Set((allowlist||[]).map(e=>e.id));
  const bad=(requested||[]).filter(id=>!ok.has(id));
  if(bad.length) throw new Error('Event id not on current desk allowlist');
  return (requested||[]).filter(id=>ok.has(id));
}

/** Replace snapshots by event id — never append duplicates. */
export function mergeSnapshots(prev, nextSnap){
  const map=new Map();
  for(const s of prev||[]) if(s?.event_id) map.set(s.event_id,s);
  if(nextSnap?.event_id) map.set(nextSnap.event_id, nextSnap);
  return [...map.values()];
}

export function flattenAttendees(snapshots){
  const rows=[];
  for(const snap of snapshots||[]){
    if(!snap||snap.status==='failed') continue;
    for(const a of snap.attendees||[]){
      rows.push({
        ...a,
        event_id:snap.event_id,
        event_title:snap.event_title||snap.event_id,
        event_start_at:snap.event_start_at||null,
        captured_at:snap.captured_at,
        snapshot_status:snap.status,
        incomplete:!!snap.incomplete,
      });
    }
  }
  return rows;
}

/** One session's snapshot. Missing means not synced — not an empty verified register. */
export function attendeesForEvent(snapshots, eventId){
  const snap=(snapshots||[]).find(s=>s?.event_id===eventId)||null;
  if(!snap) return {snapshot:null, attendees:[], failed:false, captured_at:null, incomplete:false, error:null, synced:false};
  const failed=snap.status==='failed';
  return {
    snapshot:snap,
    attendees:failed?[]:(snap.attendees||[]),
    failed,
    captured_at:snap.captured_at||null,
    incomplete:!!(snap.incomplete||snap.status==='partial'),
    error:failed?(snap.error||null):null,
    synced:true,
  };
}

/** Split a display name into first/last for Search Users prefill only — not identity proof. */
export function searchQueryFromAttendeeName(name){
  const n=String(name||'').replace(/\s+/g,' ').trim();
  return n.length>=2?n:'';
}

export function snapshotSummary(snapshots){
  const list=snapshots||[];
  let ok=0, failed=0, partial=0, people=0;
  for(const s of list){
    if(s.status==='ok') ok++;
    else if(s.status==='partial'){ partial++; ok++; }
    else if(s.status==='failed') failed++;
    people+=(s.attendees||[]).length;
  }
  return {events:list.length, ok, failed, partial, people};
}

/**
 * Classify a Bookwhen register Ticket cell for the names list.
 * "LOCALS CARD Child - £5.00" → {kind:'locals', label:'Locals Card', detail:'Child · £5.00'}
 * "LEISURE PASS Open Swim"    → {kind:'leisure', label:'Leisure Pass', detail:'Open Swim'}
 */
export function ticketInfo(ticket){
  const raw=String(ticket||'').replace(/\s+/g,' ').trim();
  if(!raw) return null;
  const tidy=s=>s.replace(/^[\s\-–—:·]+|[\s\-–—:·]+$/g,'').replace(/\s+[-–—]\s+(?=£|\d)/g,' · ').trim();
  const title=s=>s.replace(/\b([A-Z])([A-Z]+)\b/g,(m,a,b)=>a+b.toLowerCase());
  let m;
  if((m=/^locals?\s*card\b(.*)$/i.exec(raw))) return {kind:'locals',label:'Locals Card',detail:title(tidy(m[1]))||null,raw};
  if((m=/^leisure\s*pass\b(.*)$/i.exec(raw))) return {kind:'leisure',label:'Leisure Pass',detail:title(tidy(m[1]))||null,raw};
  return {kind:'other',label:title(tidy(raw)),detail:null,raw};
}
