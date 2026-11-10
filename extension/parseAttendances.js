/** Parse Bookwhen admin /events/{id}/attendances rendered HTML (register only). */
// Tag matcher that respects quoted attribute values — Bookwhen headers carry
// data-action="click->table-sorter#sort", whose raw '>' broke the old /<[^>]*>/ strip.
const TAG_RE=/<(?:"[^"]*"|'[^']*'|[^'">])*>/g;
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ','#39':"'"};
const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>{
  if(/^#x/i.test(e))return String.fromCodePoint(parseInt(e.slice(2),16));
  if(/^#/.test(e))return String.fromCodePoint(parseInt(e.slice(1),10));
  return ENT[e.toLowerCase()]??m;});
const strip=s=>decode(String(s||'').replace(/<svg\b[\s\S]*?<\/svg>/gi,' ').replace(TAG_RE,' ')).replace(/\s+/g,' ').trim();

export function eventIdFromHref(href){
  const m=/\/events\/(ev-[a-z0-9]+-\d{14})\/attendances/i.exec(href||'');
  return m?m[1]:null;
}

export function looksLoggedOutAttendances(html){
  const h=html||'';
  if(/attendance_sheet|tri_state_radio_buttons|\battendances\b/i.test(h)) return false;
  return /sign[_ -]?in|log[_ -]?in|password/i.test(h);
}

/** Header index by Bookwhen class (booking_ref/full_name/attended_status) then by text. */
export function headerMap(tableHtml){
  const thead=(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i.exec(tableHtml)||[])[1]||tableHtml;
  const ths=[...thead.matchAll(/<th\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/th>/gi)];
  const idx={}; const headers=[];
  ths.forEach((m,i)=>{
    const cls=((/class\s*=\s*"([^"]*)"/i.exec(m[1])||[])[1]||'').toLowerCase();
    const h=strip(m[2]).toLowerCase(); headers.push(h);
    if(idx.booking==null&&(/\bbooking_ref\b/.test(cls)||/^booking/.test(h))) idx.booking=i;
    else if(idx.attended==null&&(/\battended_status\b/.test(cls)||/^attended/.test(h))) idx.attended=i;
    else if(idx.name==null&&(/\bfull_name\b/.test(cls)||/^(full )?name$/.test(h))) idx.name=i;
    else if(idx.child==null&&/^child$/.test(h)) idx.child=i;
    else if(idx.ticket==null&&/^ticket/.test(h)) idx.ticket=i;
    else if(idx.paid==null&&/^paid/.test(h)) idx.paid=i;
  });
  return {headers, idx};
}

function cellTexts(trHtml){
  return [...trHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
}

function bookingIdFromCell(cellHtml){
  const m=/\/bookings\/([a-z0-9]+)/i.exec(cellHtml||'');
  return m?m[1]:null;
}

/** Attended marker (display only): checked tri-state radio, else legacy alt text, else unknown. */
export function parseAttendedMarker(cellHtml){
  const raw=String(cellHtml||'');
  for(const m of raw.matchAll(/<input\b[^>]*>/gi)){
    if(/\bchecked\b/i.test(m[0])){const v=(/value\s*=\s*"(yes|no|unknown)"/i.exec(m[0])||[])[1];if(v)return v.toLowerCase();}
  }
  const a=((/alt="([^"]*Attended[^"]*)"/i.exec(raw)||[])[1]||'').toLowerCase();
  if(/\byes\b/.test(a)) return 'yes';
  if(/\bno\b/.test(a)) return 'no';
  return 'unknown';
}

function footerAttendeeCount(html){
  const m=/(\d+)\s+attendees?\b/i.exec(strip(html));
  return m?parseInt(m[1],10):null;
}

/** Pick the register table: class attendance_sheet, else first table whose header has a Name column. */
function findRegisterTable(html){
  const tables=[...String(html||'').matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
  return tables.find(t=>/^<table\b[^>]*\battendance_sheet\b/i.test(t))
    || tables.find(t=>headerMap(t).idx.name!=null)
    || null;
}

/** Signals the register finished rendering (used by the extension's wait loop). */
export function registerReady(html){
  return !!findRegisterTable(html) || /\b\d+\s+attendees?\b/i.test(strip(html)) || /no attendees|no bookings/i.test(html||'');
}

/**
 * @returns {{event_id, attendees, row_count, footer_count, incomplete, warnings, error?}}
 * No customer id/email in the register DOM — names only + booking_id (shared across family rows).
 */
export function parseAttendancesHtml(html, href){
  const event_id=eventIdFromHref(href);
  const warnings=[];
  if(!event_id) warnings.push('Could not read event id from register URL');
  if(looksLoggedOutAttendances(html)){
    return {event_id, attendees:[], row_count:0, footer_count:null, incomplete:true, error:'Bookwhen session not signed in — log in to Bookwhen in this browser', warnings};
  }
  const footer_count=footerAttendeeCount(html);
  const table=findRegisterTable(html);
  if(!table){
    if(footer_count===0||/no attendees|no bookings/i.test(html||'')) return {event_id, attendees:[], row_count:0, footer_count:0, incomplete:false, warnings};
    return {event_id, attendees:[], row_count:0, footer_count, incomplete:true, error:'No attendee table found on register page', warnings};
  }
  const {idx}=headerMap(table);
  if(idx.name==null){
    return {event_id, attendees:[], row_count:0, footer_count, incomplete:true, error:'Register table missing Name column', warnings};
  }
  const bodyM=/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i.exec(table);
  const body=bodyM?bodyM[1]:table.replace(/<thead\b[\s\S]*?<\/thead>/i,'').replace(/<tfoot\b[\s\S]*?<\/tfoot>/i,'');
  const attendees=[];
  for(const tr of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=cellTexts(tr[1]);
    if(!cells.length) continue;
    const name=strip(cells[idx.name]||'');
    if(!name||/^name$/i.test(name)) continue;
    const child_raw=idx.child!=null?strip(cells[idx.child]):'';
    const ticket=idx.ticket!=null?strip(cells[idx.ticket]):'';
    attendees.push({
      name,
      booking_id: idx.booking!=null?bookingIdFromCell(cells[idx.booking]):null,
      attended: idx.attended!=null?parseAttendedMarker(cells[idx.attended]):'unknown',
      child: !!child_raw && !/^(no|false|0|-)?$/i.test(child_raw),
      ticket: ticket||null,
      // Register has no customer links / mailto — identity unverified
      bookwhen_customer_id: null,
      email: null,
      identity:'name_only',
    });
  }
  const row_count=attendees.length;
  let incomplete=false;
  if(footer_count!=null && footer_count!==row_count){
    incomplete=true;
    warnings.push(`Row count ${row_count} ≠ footer ${footer_count}`);
  }
  return {event_id, attendees, row_count, footer_count, incomplete, warnings};
}
