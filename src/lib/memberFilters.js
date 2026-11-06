/** Pure helpers for All members status + card-link filters. */
export const MONTH=30*864e5;
export const isNew=r=>!!r.joined_at&&Date.now()-new Date(r.joined_at).getTime()<MONTH;
export const isCancelled=r=>!!r.cancelled_at||r.bw_status==='CANCELLED';
/** Linked = currently has an active card association (card_barcode from list_members). */
export const isLinked=r=>!!(r&&r.card_barcode);
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
  if(sf==='active') return !isCancelled(r)&&r.bw_status==='ACTIVE';
  return true;
}
export function matchCard(r,cf){
  if(cf==='all'||!cf) return true;
  if(cf==='linked') return isLinked(r);
  if(cf==='unlinked') return !isLinked(r);
  return true;
}
export function matchQuery(r,q){
  const ql=(q||'').trim().toLowerCase();
  if(!ql) return true;
  return [r.first_name,r.last_name,r.email,r.bw_lcl,r.card_barcode].join(' ').toLowerCase().includes(ql);
}
/** Filter full member list (not a page slice). Counts should use this same predicate. */
export function filterMembers(rows,{status='all',card='all',q=''}={}){
  return (rows||[]).filter(r=>matchStatus(r,status)&&matchCard(r,card)&&matchQuery(r,q));
}
