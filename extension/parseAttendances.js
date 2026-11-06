/** Parse Bookwhen admin /events/{id}/attendances rendered HTML (register only). */
const strip = s => String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();

export function eventIdFromHref(href){
  const m=/\/events\/(ev-[a-z0-9]+-\d{14})\/attendances/i.exec(href||'');
  return m?m[1]:null;
}

export function looksLoggedOutAttendances(html){
  return /sign[_ -]?in|log[_ -]?in/i.test(html||'') && !/attendances|attendance_marker/i.test(html||'');
}

function headerMap(tableHtml){
  const ths=[...tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>strip(m[1]).toLowerCase());
  const idx={};
  ths.forEach((h,i)=>{
    if(/^booking/.test(h)) idx.booking=i;
    else if(/^attended/.test(h)) idx.attended=i;
    else if(/^name$/.test(h)) idx.name=i;
    else if(/^child$/.test(h)) idx.child=i;
    else if(/^ticket/.test(h)) idx.ticket=i;
    else if(/^paid/.test(h)) idx.paid=i;
  });
  return {headers:ths, idx};
}

function cellTexts(trHtml){
  return [...trHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
}

function bookingIdFromCell(cellHtml){
  const m=/\/bookings\/([a-z0-9]+)/i.exec(cellHtml||'');
  return m?m[1]:null;
}

/** Attended marker: preserve unknown; class "attending" alone is NOT proof of attended. */
export function parseAttendedMarker(cellHtml){
  const raw=String(cellHtml||'');
  const alt=(/alt="([^"]*Attended[^"]*)"/i.exec(raw)||[])[1]||'';
  const a=alt.toLowerCase();
  if(/\byes\b/.test(a)||/\battended:\s*yes\b/.test(a)) return 'yes';
  if(/\bno\b/.test(a)||/\battended:\s*no\b/.test(a)) return 'no';
  if(/\bunknown\b/.test(a)||/\battended:\s*unknown\b/.test(a)) return 'unknown';
  if(/attendance_marker/.test(raw)) return 'unknown';
  return 'unknown';
}

function footerAttendeeCount(html){
  const m=/(\d+)\s+attendees?\b/i.exec(strip(html));
  return m?parseInt(m[1],10):null;
}

/**
 * @returns {{event_id, attendees, row_count, footer_count, incomplete, warnings}}
 * No customer id/email in current register DOM — names only + booking_id (shared across family rows).
 */
export function parseAttendancesHtml(html, href){
  const event_id=eventIdFromHref(href);
  const warnings=[];
  if(!event_id) warnings.push('Could not read event id from register URL');
  if(looksLoggedOutAttendances(html)){
    return {event_id, attendees:[], row_count:0, footer_count:null, incomplete:true, error:'Bookwhen session not signed in — log in to Bookwhen in this browser', warnings};
  }
  const tableM=/<table\b[^>]*>([\s\S]*?)<\/table>/i.exec(html||'');
  if(!tableM){
    return {event_id, attendees:[], row_count:0, footer_count:footerAttendeeCount(html), incomplete:true, error:'No attendee table found on register page', warnings};
  }
  const table=tableM[0];
  const {idx}=headerMap(table);
  if(idx.name==null){
    return {event_id, attendees:[], row_count:0, footer_count:footerAttendeeCount(html), incomplete:true, error:'Register table missing Name column', warnings};
  }
  const bodyM=/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i.exec(table);
  const body=bodyM?bodyM[1]:table;
  const trs=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const attendees=[];
  for(const tr of trs){
    const cells=cellTexts(tr[1]);
    if(!cells.length) continue;
    const name=strip(cells[idx.name]||'');
    if(!name||/^name$/i.test(name)) continue;
    const booking_id=idx.booking!=null?bookingIdFromCell(cells[idx.booking]):null;
    const attended=idx.attended!=null?parseAttendedMarker(cells[idx.attended]):'unknown';
    const child_raw=idx.child!=null?strip(cells[idx.child]):'';
    const ticket=idx.ticket!=null?strip(cells[idx.ticket]):'';
    attendees.push({
      name,
      booking_id,
      attended,
      child: !!child_raw && !/^(no|false|0|-)?$/i.test(child_raw),
      ticket: ticket||null,
      // Explicit: register has no customer links / mailto — identity unverified
      bookwhen_customer_id: null,
      email: null,
      identity:'name_only',
    });
  }
  const footer_count=footerAttendeeCount(html);
  const row_count=attendees.length;
  let incomplete=false;
  if(footer_count!=null && footer_count!==row_count){
    incomplete=true;
    warnings.push(`Row count ${row_count} ≠ footer ${footer_count}`);
  }
  return {event_id, attendees, row_count, footer_count, incomplete, warnings};
}
