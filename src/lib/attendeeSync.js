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
  for(const s of prev||[]) if(s?.event_id) map.set(s.event_id,namesOnly(s));
  if(nextSnap?.event_id) map.set(nextSnap.event_id, namesOnly(nextSnap));
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

/** Bookwhen ticket choice is trust-based (anyone can pick "LOCALS CARD"), so the desk keeps names only. */
const TICKET_KEYS=['ticket','ticket_type','ticket_name','price'];
export function namesOnly(snap){if(!snap||!Array.isArray(snap.attendees))return snap;
  return {...snap,attendees:snap.attendees.map(a=>{if(!a||typeof a!=='object')return a;const o={...a};for(const k of TICKET_KEYS)delete o[k];return o;})};}

/** Version of the extension zip published at ./ar-locals-extension.zip (keep in sync with extension/manifest.json). */
export const EXT_LATEST='1.2.2';
export const EXT_ZIP_PATH='ar-locals-extension.zip';
export const CHROME_EXT_ADDRESS='chrome://extensions';
/** 'missing' | 'outdated' | null for the Re-sync names requirement. */
export function extNeed(version, min=MIN_SYNC_EXT){
  if(!version) return 'missing';
  return extVersionAtLeast(version,min)?null:'outdated';
}

/** Check user / batch check work with any released extension (AR_CHECK has existed since v1.0). */
export const MIN_CHECK_EXT='1.0.0';
/** Chromium desktop browser that can load the unpacked extension (Chrome, Edge, Brave…). */
export function isChromiumUA(ua){ua=ua||'';if(/Firefox|FxiOS|CriOS|EdgiOS/i.test(ua))return false;if(/Android|iPhone|iPad|Mobile/i.test(ua))return false;return /Chrome\/|Chromium\//.test(ua);}
/** 'browser' | 'missing' | 'outdated' | null — what blocks an extension action. */
export function extBlock(version,min,ua){if(!version&&ua!==undefined&&!isChromiumUA(ua))return 'browser';return extNeed(version,min);}
/** Wording for the red warning (pure so it can be tested). */
export function extWarnText(kind,action,min){
  if(kind==='browser')return {title:'Chrome extension needed',body:`${action} needs the Locals Card Chrome extension, which only works in Google Chrome on a computer. Open the desk in Chrome, then install the extension.`};
  if(kind==='outdated')return {title:'Update the Chrome extension',body:`Update the Chrome extension (v${min} or newer) to use ${action}.`};
  return {title:'Chrome extension needed',body:`Install the Locals Card Chrome extension first to use ${action}.`};
}
