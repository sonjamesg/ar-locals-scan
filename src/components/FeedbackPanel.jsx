import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {sb} from '../lib.js';
import {Confirm} from './Members.jsx';
import {normalizeFeedbackBody,normalizeFeedbackAuthor,formatFeedbackWhen,sortFeedbackNewestFirst,FEEDBACK_MAX,AUTHOR_MAX} from '../lib/feedback.js';
import {shouldAutofocusNote} from '../lib/feedbackFocus.js';
import {FB_PAGE,FB_VIEWS,normalizeFbView,mergeFeedbackPage,feedbackHasMore} from '../lib/feedbackViews.js';

export default function FeedbackPanel({open,onClose}){ // open: null | 'compose' | 'list'
  const[view,setView]=useState(FB_VIEWS.compose);
  const[rows,setRows]=useState(null);
  const[total,setTotal]=useState(0);
  const[err,setErr]=useState('');
  const[okMsg,setOkMsg]=useState('');
  const[body,setBody]=useState('');
  const[author,setAuthor]=useState('');
  const[busy,setBusy]=useState(false);
  const[loadingMore,setLoadingMore]=useState(false);
  const[editId,setEditId]=useState(null);
  const[editBody,setEditBody]=useState('');
  const[editAuthor,setEditAuthor]=useState('');
  const[del,setDel]=useState(null);
  const[posted,setPosted]=useState(false);
  const ta=useRef(null);
  const listTop=useRef(null);

  const loadPage=async({offset=0,append=false}={})=>{
    setErr('');
    if(append) setLoadingMore(true); else if(!append) setRows(null);
    const{data,error}=await sb.rpc('list_staff_feedback',{p_limit:FB_PAGE,p_offset:offset});
    if(append) setLoadingMore(false);
    if(error){setErr(error.message);if(!append) setRows([]);return;}
    const page=data||[];
    setTotal(Number(page[0]?.total_count||0));
    setRows(rs=>sortFeedbackNewestFirst(mergeFeedbackPage(append?rs:[],page,{append})));
  };

  const openRef=useRef(false);
  const delRef=useRef(del);delRef.current=del;
  const onCloseRef=useRef(onClose);onCloseRef.current=onClose;

  useEffect(()=>{
    const isOpen=!!open;
    if(!isOpen){openRef.current=false;return;}
    const v=normalizeFbView(open);
    const justOpened=shouldAutofocusNote(openRef.current,true);
    openRef.current=true;
    setView(v);
    if(justOpened){
      setOkMsg('');setErr('');setEditId(null);setDel(null);setPosted(false);
      loadPage({offset:0,append:false});
      if(v===FB_VIEWS.compose){
        const t=setTimeout(()=>ta.current?.focus(),50);
        return()=>clearTimeout(t);
      }
    }
  },[open]);

  useEffect(()=>{
    if(!open) return;
    const prev=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKey=e=>{if(e.key==='Escape'&&!delRef.current){e.preventDefault();onCloseRef.current?.();}};
    window.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('keydown',onKey);document.body.style.overflow=prev;};
  },[open]);

  useEffect(()=>{
    if(!open||view!==FB_VIEWS.list) return;
    listTop.current?.focus?.();
  },[open,view]);

  if(!open) return null; // open is view mode string

  async function submit(e){
    e?.preventDefault();
    if(busy) return;
    const b=normalizeFeedbackBody(body);
    const a=normalizeFeedbackAuthor(author);
    if(!b.ok){setErr(b.error);return;}
    if(!a.ok){setErr(a.error);return;}
    setBusy(true);setErr('');setOkMsg('');
    const{data,error}=await sb.rpc('add_staff_feedback',{p_body:b.value,p_author:a.value});
    setBusy(false);
    if(error){setErr(error.message);return;}
    const row=Array.isArray(data)?data[0]:data;
    setBody('');setAuthor('');
    setOkMsg('Submitted');
    setPosted(true);
    setRows(rs=>sortFeedbackNewestFirst(mergeFeedbackPage([row],rs||[],{append:true})));
    setTotal(t=>Number(t||0)+1);
  }

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

  function goList(){setView(FB_VIEWS.list);setEditId(null);setOkMsg('');}
  function goCompose(){setView(FB_VIEWS.compose);setEditId(null);setTimeout(()=>ta.current?.focus(),50);}

  const hasMore=feedbackHasMore((rows||[]).length,total);
  const isList=view===FB_VIEWS.list;

  const listBlock=<div className={'fb-list-wrap'+(isList?' fb-list-wrap-full':'')}>
    <div className="fb-list-h" tabIndex={-1} ref={listTop}>{isList?`All feedback (${total||(rows||[]).length})`:'Recent notes'}</div>
    {rows===null&&<div className="muted fb-empty">Loading…</div>}
    {rows&&!rows.length&&<div className="muted fb-empty">No notes yet — be the first.</div>}
    <ul className="fb-list">
      {(rows||[]).map(r=><li key={r.id} className="fb-item">
        {editId===r.id?<>
          <textarea className="fb-ta" value={editBody} maxLength={FEEDBACK_MAX} rows={3} onChange={e=>setEditBody(e.target.value)} disabled={busy}/>
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
  </div>;

  return createPortal(
    <div className="fb-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget) onClose();}}>
      <div className="fb-modal" role="dialog" aria-modal="true" aria-labelledby="fb-title">
        <div className="fb-head">
          <div>
            <div className="fb-tag"><span className="pin-led"/>Staff notes</div>
            <h2 id="fb-title">{isList?'All feedback':'Desk feedback'}</h2>
            <p className="fb-sub">{isList
              ?'Every note from reception desks, newest first. Edit or delete as needed, or write a new note.'
              :'Shared with all unlocked reception desks. Anyone on the desk can edit or delete — write issues and suggestions for James here.'}</p>
          </div>
          <button type="button" className="btn ghost fb-close" onClick={onClose} aria-label="Close feedback">✕</button>
        </div>

        <div className="fb-nav" role="tablist" aria-label="Feedback views">
          <button type="button" role="tab" aria-selected={!isList} className={'btn '+(isList?'ghost':'primary')} onClick={goCompose}>Write a note</button>
          <button type="button" role="tab" aria-selected={isList} className={'btn '+(!isList?'ghost':'primary')} onClick={goList}>See feedback{total?` (${total})`:''}</button>
        </div>

        {!isList&&<>
          <form className="fb-compose" onSubmit={submit}>
            <label className="fb-label">Note<textarea ref={ta} className="fb-ta" value={body} maxLength={FEEDBACK_MAX} rows={3} placeholder="Scanner stuck / card wouldn’t link / idea…" onChange={e=>{setBody(e.target.value);setErr('');setOkMsg('');}} disabled={busy}/></label>
            <div className="fb-compose-row">
              <label className="fb-label slim">Your name <span className="muted">(optional)</span><input className="fb-name" value={author} maxLength={AUTHOR_MAX} placeholder="e.g. Sam" onChange={e=>setAuthor(e.target.value)} disabled={busy}/></label>
              <button type="submit" className="btn primary lg" disabled={busy||!body.trim()}>{busy?'Saving…':'Submit'}</button>
            </div>
            <div className="fb-count">{body.trim().length}/{FEEDBACK_MAX}</div>
          </form>
          <div className="fb-status" aria-live="polite">
            {err&&<div className="err md-err">{err}</div>}
            {okMsg&&!err&&<div className="ok fb-ok fb-ok-row">{okMsg}{posted&&<button type="button" className="btn primary sm fb-see" onClick={goList}>See feedback</button>}</div>}
          </div>
          {listBlock}
        </>}

        {isList&&<>
          <div className="fb-status" aria-live="polite">
            {err&&<div className="err md-err">{err}</div>}
            {okMsg&&!err&&<div className="ok fb-ok">{okMsg}</div>}
          </div>
          {listBlock}
          <div className="fb-list-foot">
            <button type="button" className="btn primary" onClick={goCompose}>Write a note</button>
          </div>
        </>}

        {del&&<Confirm title="Delete this note?" busy={busy} onNo={()=>setDel(null)} onYes={confirmDelete}>
          <p>Delete this staff note? This can’t be undone.</p>
          <blockquote className="fb-quote">{del.body}</blockquote>
        </Confirm>}
      </div>
    </div>,
    document.body
  );
}
