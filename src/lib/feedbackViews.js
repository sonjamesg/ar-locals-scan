export const FB_PAGE=50;
export const FB_VIEWS=Object.freeze({compose:'compose',list:'list'});

export function normalizeFbView(v){
  return v===FB_VIEWS.list?FB_VIEWS.list:FB_VIEWS.compose;
}

/** After a successful post, show See feedback CTA and prefer list as next view. */
export function afterPostUi(prev){
  return {...prev,showSeeFeedback:true,suggestedView:FB_VIEWS.list};
}

export function mergeFeedbackPage(existing,page,{append=false}={}){
  const next=append?[...(existing||[]),...(page||[])]:[...(page||[])];
  const seen=new Set();
  const out=[];
  for(const r of next){
    if(!r?.id||seen.has(r.id)) continue;
    seen.add(r.id);out.push(r);
  }
  return out;
}

export function feedbackHasMore(loadedCount,totalCount){
  const total=Number(totalCount);
  if(!Number.isFinite(total)) return false;
  return loadedCount<total;
}
