import {smartSearch,scoreMember} from './smartSearch.js';
/** Pure helpers for All members status + card-link filters. */
export const MONTH=30*864e5;
export const isNew=r=>!!r.joined_at&&Date.now()-new Date(r.joined_at).getTime()<MONTH;
export const isCancelled=r=>!!r.cancelled_at||r.bw_status==='CANCELLED';
/**
 * Unchecked = no successful Bookwhen subscription check yet.
 * A successful "Check user" (save_bw_check) that finds the Locals subscription stores bw_lcl and/or
 * bw_renews_at; one that finds none stores a non-ACTIVE status (e.g. NONE) - both count as checked.
 * Purchase-email members get bw_status='ACTIVE' (they paid) but no LCL/renewal → still unchecked.
 * (Older ingests also stamped bw_checked_at at ingest; that is not a real check, so it is ignored here.)
 */
export const isUnchecked=r=>!!r&&!isCancelled(r)&&!r.bw_lcl&&!r.bw_renews_at&&(!r.bw_status||r.bw_status==='ACTIVE'||!r.bw_checked_at);
/** Paid via the Bookwhen purchase-email ingest, not yet checked: ACTIVE + Unchecked tag. */
export const isPurchaseUnchecked=r=>isUnchecked(r)&&r.bw_status==='ACTIVE';
export const isActiveChecked=r=>!!r&&!isCancelled(r)&&r.bw_status==='ACTIVE';
/** Usable linked card = non-empty barcode and not marked lost. Pending/ACTIVE alone is not linked. */
export const isLinked=r=>!!(r&&String(r.card_barcode||'').trim())&&!r.lost_card_at;
/** List-row badge: Card linked / Card unlinked from real barcode (not membership status). */
export function cardLinkStatus(r){
  if(isLinked(r)) return {linked:true, label:'Card linked', tone:'ok'};
  if(r&&r.pending_card&&!r.cancelled_at) return {linked:false, pending:true, label:'Card pending', tone:'warn'};
  return {linked:false, label:'Card unlinked', tone:'warn'};
}
export function cardCounts(rows){
  const list=rows||[];
  let linked=0;
  for(const r of list) if(isLinked(r)) linked++;
  return{total:list.length,linked,unlinked:list.length-linked};
}
export function matchStatus(r,sf){
  if(sf==='all'||!sf) return true;
  if(sf==='new') return isNew(r);
  if(sf==='cancelled') return isCancelled(r);
  if(sf==='active') return isActiveChecked(r);
  if(sf==='unchecked') return isUnchecked(r);
  return true;
}
export function matchCard(r,cf){
  if(cf==='all'||!cf) return true;
  if(cf==='linked') return isLinked(r);
  if(cf==='unlinked') return !isLinked(r);
  return true;
}
/** Single-row check (all query words present, forgiving). */
export function matchQuery(r,q){
  const ql=(q||'').trim();
  if(ql.length<2) return true;
  const s=scoreMember(r,ql);
  return !!s&&!s.partial;
}
/** Filter full member list (not a page slice). Counts should use this same predicate. */
export function filterMembers(rows,{status='all',card='all',q=''}={}){
  const base=(rows||[]).filter(r=>matchStatus(r,status)&&matchCard(r,card));
  if(String(q||'').trim().length<2) return base;
  // Ranked forgiving search; partial (some words) matches follow full ones.
  return smartSearch(base,q,{limit:Infinity});
}
