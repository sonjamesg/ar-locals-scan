/** Client-side validation for staff feedback (mirrors DB checks). */
export const FEEDBACK_MAX=2000;
export const AUTHOR_MAX=80;

export function normalizeFeedbackBody(raw){
  const t=String(raw??'').trim();
  if(!t) return {ok:false,error:'Feedback cannot be blank'};
  if(t.length>FEEDBACK_MAX) return {ok:false,error:`Feedback is too long (max ${FEEDBACK_MAX} characters)`};
  return {ok:true,value:t};
}

export function normalizeFeedbackAuthor(raw){
  const t=String(raw??'').trim();
  if(!t) return {ok:true,value:null};
  if(t.length>AUTHOR_MAX) return {ok:false,error:`Name is too long (max ${AUTHOR_MAX} characters)`};
  return {ok:true,value:t};
}

/** Escape plain text for safe React text nodes is automatic; this is for any HTML use. */
export function escapeFeedbackText(s){
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function formatFeedbackWhen(iso){
  if(!iso) return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

export function sortFeedbackNewestFirst(rows){
  return [...(rows||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
}
