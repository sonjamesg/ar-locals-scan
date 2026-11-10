/** Scan result presentation - colours encode eligibility, not mere recognition. */
export const STATUS_TONES=Object.freeze({
  valid:'valid',      // green - known AND valid/active
  expired:'expired',  // red - expired / cancelled / invalid
  lost:'lost',        // red - blocked lost card
  unknown:'unknown',  // orange - not linked yet
  idle:'idle',
});

const META={
  valid:{tone:'valid',label:'Valid member',hint:'Recognised and membership is active'},
  expired:{tone:'expired',label:'Expired',hint:'Membership ended or cancelled. Renew before entry'},
  lost:{tone:'lost',label:'Card reported lost',hint:'Do not accept this card. Issue a replacement'},
  unknown:{tone:'unknown',label:'Card not linked',hint:'Find the member below and link this barcode'},
  idle:{tone:'idle',label:'Ready to scan',hint:'Point the barcode scanner at a Locals card'},
};

/** Map API status to a presentation tone. Lost is never green. */
export function statusTone(status){
  if(status==='valid') return STATUS_TONES.valid;
  if(status==='expired'||status==='cancelled'||status==='invalid') return STATUS_TONES.expired;
  if(status==='lost') return STATUS_TONES.lost;
  if(!status) return STATUS_TONES.idle;
  return STATUS_TONES.unknown;
}

export function statusMeta(status){
  const tone=statusTone(status);
  return {tone,...META[tone]};
}

export function isLinkableStatus(status){
  return statusTone(status)===STATUS_TONES.unknown;
}
