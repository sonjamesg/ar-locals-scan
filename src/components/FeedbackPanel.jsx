import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {sb} from '../lib.js';
import {Confirm} from './Members.jsx';
import {normalizeFeedbackBody,normalizeFeedbackAuthor,formatFeedbackWhen,sortFeedbackNewestFirst,FEEDBACK_MAX,AUTHOR_MAX} from '../lib/feedback.js';

export default function FeedbackPanel({open,onClose}){
  const[rows,setRows]=useState(null);
  const[err,setErr]=useState('');
  const[okMsg,setOkMsg]=useState('');
  const[body,setBody]=useState('');
  const[author,setAuthor]=useState('');
  const[busy,setBusy]=useState(false);
  const[editId,setEditId]=useState(null);
  const[editBody,setEditBody]=useState('');
  const[editAuthor,setEditAuthor]=useState('');
  const[del,setDel]=useState(null);
  const ta=useRef(null);

  const load=async()=>{
    setErr('');
    const{data,error}=await sb.rpc('list_staff_feedback');
    if(error){setErr(error.message);setRows([]);return;}
    setRows(sortFeedbackNewestFirst(data||[]));
  };

  useEffect(()=>{
    if(!open) return;
    setOkMsg('');setErr('');setEditId(null);setDel(null);
    load();
    const prev=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const t=setTimeout(()=>ta.current?.focus(),50);
    const onKey=e=>{if(e.key==='Escape'&&!del){e.preventDefault();onClose();}};
    window.addEventListener('keydown',onKey);
    return()=>{clearTimeout(t);window.removeEventListener('keydown',onKey);document.body.style.overflow=prev;};
  },[open,del,onClose]);

  if(!open) return null;

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
    setRows(rs=>sortFeedbackNewestFirst([row,...(rs||[]).filter(x=>x.id!==row.id)]));
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
    setRows(rs=>(rs||[]).map(x=>x.id===row.id?row:x));
  }

  async function confirmDelete(){
    if(busy||!del) return;
    setBusy(true);setErr('');
    const{error}=await sb.rpc('delete_staff_feedback',{p_id:del.id});
    setBusy(false);
    if(error){setErr(error.message);setDel(null);return;}
    setRows(rs=>(rs||[]).filter(x=>x.id!==del.id));
    if(editId===del.id) setEditId(null);
    setDel(null);
    setOkMsg('Deleted');
  }

  return createPortal(
    <div className="fb-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget) onClose();}}>
      <div className="fb-modal" role="dialog" aria-modal="true" aria-labelledby="fb-title">
        <div className="fb-head">
          <div>
            <div className="fb-tag"><span className="pin-led"/>Staff notes</div>
            <h2 id="fb-title">Desk feedback</h2>
            <p className="fb-sub">Shared with all unlocked reception desks. Anyone on the desk can edit or delete — write issues and suggestions for James here.</p>
          </div>
          <button type="button" className="btn ghost fb-close" onClick={onClose} aria-label="Close feedback">✕</button>
        </div>

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
          {okMsg&&!err&&<div className="ok fb-ok">{okMsg}</div>}
        </div>

        <div className="fb-list-wrap">
          <div className="fb-list-h">Recent notes</div>
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
        </div>

        {del&&<Confirm title="Delete this note?" busy={busy} onNo={()=>setDel(null)} onYes={confirmDelete}>
          <p>Delete this staff note? This can’t be undone.</p>
          <blockquote className="fb-quote">{del.body}</blockquote>
        </Confirm>}
      </div>
    </div>,
    document.body
  );
}
