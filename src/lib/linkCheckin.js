/** Scan-desk card link attendance helpers (server is source of truth). */
export const LINK_CHECKIN_RPC='link_card_from_scan';
export const PLAIN_LINK_RPC='link_card';

/** Only the reception Scan unlinked→confirm flow should count a visit. */
export function shouldUseLinkCheckin(context){
  return context==='scan_desk';
}

export function visitFromLinkRow(row){
  if(!row) return null;
  return {
    recorded:!!row.recorded,
    suppressed:!!row.suppressed,
    reason:row.reason,
    visit_id:row.visit_id,
    visited_at:row.visited_at,
    last_counted_at:row.last_counted_at,
    visits_today:row.visits_today,
    next_eligible_at:row.next_eligible_at,
  };
}

export function linkSuccessMessage(memberLabel, visit){
  if(visit?.recorded) return `Card linked to ${memberLabel} · visit recorded`;
  return `Card linked to ${memberLabel}`;
}
