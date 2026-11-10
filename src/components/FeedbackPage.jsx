import {useEffect,useRef,useState} from 'react';
import {noDash} from '../lib/noDash.js';
import {sb} from '../lib.js';
import {Confirm} from './Members.jsx';
import {normalizeFeedbackBody,normalizeFeedbackAuthor,formatFeedbackWhen,sortFeedbackNewestFirst,FEEDBACK_MAX,AUTHOR_MAX} from '../lib/feedback.js';
import {FB_PAGE,mergeFeedbackPage,feedbackHasMore} from '../lib/feedbackViews.js';
import {IconArrowLeft,IconFeedback} from './Icons.jsx';

export default function FeedbackPage({onBack,onWrite}){
  const[rows,setRows]=useState(null);
  const[total,setTotal]=useState(0);
  const[err,setErr]=useState('');
  const[okMsg,setOkMsg]=useState('');
  const[busy,setBusy]=useState(false);
  const[loadingMore,setLoadingMore]=useState(false);
  const[editId,setEditId]=useState(null);
  const[editBody,setEditBody]=useState('');
  const[editAuthor,setEditAuthor]=useState('');
  const[del,setDel]=useState(null);
  const heading=useRef(null);

  const loadPage=async({offset=0,append=false}={})=>{
    setErr('');
    if(append) setLoadingMore(true); else setRows(null);
    const{data,error}=await sb.rpc('list_staff_feedback',{p_limit:FB_PAGE,p_offset:offset});
    if(append) setLoadingMore(false);
    if(error){setErr(error.message);if(!append) setRows([]);return;}
    const page=data||[];
    setTotal(Number(page[0]?.total_count||0));
    setRows(rs=>sortFeedbackNewestFirst(mergeFeedbackPage(append?rs:[],page,{append})));
  };

  useEffect(()=>{
    loadPage({offset:0,append:false});
    const t=setTimeout(()=>heading.current?.focus?.(),50);
    return()=>clearTimeout(t);
  },[]);

  async function saveEdit(){
    if(busy||!editId) return;
    const b=normalizeFeedbackBody(editBody);
    const a=normalizeFeedbackAuthor(editAuthor);
    if(!b.ok){setErr(b.error);return;}
    if(!a.ok){setErr(a.error);return;}
    setBusy(true);setErr('');
    const{data,error}=await sb.rpc('update_staff_feedback',{p_id:editId,p_body:b.value,p_author:a.value});
    setBusy(false);
    if(error){setErr(error.message);return;}
    const row=Array.isArray(data)?data[0]:data;
    setEditId(null);
    setOkMsg('Updated');
    setRows(rs=>(rs||[]).map(x=>x.id===row.id?{...x,...row}:x));
  }

  async function confirmDelete(){
    if(busy||!del) return;
    setBusy(true);setErr('');
    const{error}=await sb.rpc('delete_staff_feedback',{p_id:del.id});
    setBusy(false);
    if(error){setErr(error.message);setDel(null);return;}
    setRows(rs=>(rs||[]).filter(x=>x.id!==del.id));
    setTotal(t=>Math.max(0,Number(t||0)-1));
    if(editId===del.id) setEditId(null);
    setDel(null);
    setOkMsg('Deleted');
  }

  const hasMore=feedbackHasMore((rows||[]).length,total);

  return <section className="panel fb-page">
    <div className="fb-page-head">
      <div>
        <button type="button" className="btn-back fb-back" onClick={onBack}><IconArrowLeft/><span>Back</span></button>
        <h2 className="fb-page-title" tabIndex={-1} ref={heading}><IconFeedback className="fb-page-ico"/>Feedback <span className="fb-page-count">{total?`(${total})`:''}</span></h2>
        <p className="muted fb-page-sub">Every staff note from reception, newest first. Edit or delete as needed.</p>
      </div>
      <button type="button" className="btn primary lg" onClick={onWrite}>Write a note</button>
    </div>
    <div className="fb-status" aria-live="polite">
      {err&&<div className="err md-err">{noDash(err)}</div>}
      {okMsg&&!err&&<div className="ok fb-ok">{okMsg}</div>}
    </div>
    <div className="fb-page-list">
      {rows===null&&<div className="muted fb-empty">Loading…</div>}
      {rows&&!rows.length&&<div className="muted fb-empty">No notes yet. Be the first. Use Write a note.</div>}
      <ul className="fb-list fb-list-page">
        {(rows||[]).map(r=><li key={r.id} className="fb-item">
          {editId===r.id?<>
            <textarea className="fb-ta" value={editBody} maxLength={FEEDBACK_MAX} rows={4} onChange={e=>setEditBody(e.target.value)} disabled={busy}/>
            <div className="fb-compose-row">
              <input className="fb-name" value={editAuthor} maxLength={AUTHOR_MAX} placeholder="Name (optional)" onChange={e=>setEditAuthor(e.target.value)} disabled={busy}/>
              <button type="button" className="btn primary" onClick={saveEdit} disabled={busy}>Save</button>
              <button type="button" className="btn ghost" onClick={()=>setEditId(null)} disabled={busy}>Cancel</button>
            </div>
          </>:<>
            <div className="fb-body">{r.body}</div>
            <div className="fb-meta">
              <span>{formatFeedbackWhen(r.created_at)}{r.updated_at&&r.updated_at!==r.created_at?' · edited':''}</span>
              {r.author_label&&<span className="fb-author">{r.author_label}</span>}
              <span className="fb-actions">
                <button type="button" className="btn ghost sm" onClick={()=>{setEditId(r.id);setEditBody(r.body);setEditAuthor(r.author_label||'');setErr('');setOkMsg('');}}>Edit</button>
                <button type="button" className="btn ghost sm" onClick={()=>setDel(r)}>Delete</button>
              </span>
            </div>
          </>}
        </li>)}
      </ul>
      {hasMore&&<div className="fb-more"><button type="button" className="btn ghost" disabled={loadingMore} onClick={()=>loadPage({offset:(rows||[]).length,append:true})}>{loadingMore?'Loading…':'Load more'}</button></div>}
    </div>
    {del&&<Confirm title="Delete this note?" busy={busy} onNo={()=>setDel(null)} onYes={confirmDelete}>
      <p>Delete this staff note? This can’t be undone.</p>
      <blockquote className="fb-quote">{del.body}</blockquote>
    </Confirm>}
  </section>;
}
