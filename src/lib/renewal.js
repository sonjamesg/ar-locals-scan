/** Member detail renewal tile: Bookwhen renewal date first, else stored end date. */
const DAY=864e5;
const day=s=>{if(!s)return null;const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));if(m)return Date.UTC(+m[1],+m[2]-1,+m[3]);const t=Date.parse(s);return isNaN(t)?null:t;};
export function fmtDay(s){const t=day(s);return t==null?'':new Date(t).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});}
export function relDays(n){
  if(n===0)return 'today';
  const a=Math.abs(n);
  const unit=a<45?[a,'day']:a<548?[Math.round(a/30.44),'month']:[Math.round(a/365.25),'year'];
  const txt=`${unit[0]} ${unit[1]}${unit[0]===1?'':'s'}`;
  return n>0?`in ${txt}`:`${txt} ago`;
}
/**
 * @returns {null|{source:'bookwhen'|'ends', date, label, rel, days, tone:'ok'|'soon'|'expired', endsDiffers, endsLabel}}
 */
export function renewalInfo(h, now=Date.now()){
  const src=h?.bw_renews_at?'bookwhen':(h?.membership_ends_at?'ends':null);
  if(!src)return null;
  const iso=src==='bookwhen'?h.bw_renews_at:h.membership_ends_at;
  const t=day(iso); if(t==null)return null;
  const today=day(new Date(now).toISOString());
  const days=Math.round((t-today)/DAY);
  const tone=days<0?'expired':days<=30?'soon':'ok';
  const endsDiffers=src==='bookwhen'&&!!h.membership_ends_at&&day(h.membership_ends_at)!==t;
  return {
    source:src, date:iso, days, tone,
    label:(days<0?(src==='bookwhen'?'Renewal was ':'Ended '):(src==='bookwhen'?'Renews ':'Valid until '))+fmtDay(iso),
    rel:relDays(days), endsDiffers,
    endsLabel:endsDiffers?'Card valid until '+fmtDay(h.membership_ends_at):null,
  };
}
