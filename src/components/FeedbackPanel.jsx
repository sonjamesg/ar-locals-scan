import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {sb} from '../lib.js';
import {normalizeFeedbackBody,normalizeFeedbackAuthor,FEEDBACK_MAX,AUTHOR_MAX} from '../lib/feedback.js';
import {shouldAutofocusNote} from '../lib/feedbackFocus.js';

/** Compact Write-note modal only. List lives on the Feedback page. */
export default function FeedbackPanel({open,onClose,onSeeAll}){
  const[body,setBody]=useState('');
  const[author,setAuthor]=useState('');
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const[okMsg,setOkMsg]=useState('');
  const[posted,setPosted]=useState(false);
  const ta=useRef(null);
  const openRef=useRef(false);
  const onCloseRef=useRef(onClose);onCloseRef.current=onClose;

  useEffect(()=>{
    if(!open){openRef.current=false;return;}
    const justOpened=shouldAutofocusNote(openRef.current,true);
    openRef.current=true;
    if(justOpened){
      setOkMsg('');setErr('');setPosted(false);
      const t=setTimeout(()=>ta.current?.focus(),50);
      return()=>clearTimeout(t);
    }
  },[open]);

  useEffect(()=>{
    if(!open) return;
    const prev=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKey=e=>{if(e.key==='Escape'){e.preventDefault();onCloseRef.current?.();}};
    window.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('keydown',onKey);document.body.style.overflow=prev;};
  },[open]);

  if(!open) return null;

  async function submit(e){
    e?.preventDefault();
    if(busy) return;
    const b=normalizeFeedbackBody(body);
    const a=normalizeFeedbackAuthor(author);
    if(!b.ok){setErr(b.error);return;}
    if(!a.ok){setErr(a.error);return;}
    setBusy(true);setErr('');setOkMsg('');
    const{error}=await sb.rpc('add_staff_feedback',{p_body:b.value,p_author:a.value});
    setBusy(false);
    if(error){setErr(error.message);return;}
    setBody('');setAuthor('');
    setOkMsg('Submitted');
    setPosted(true);
  }

  function seeAll(){
    onClose?.();
    onSeeAll?.();
  }

  return createPortal(
    <div className="fb-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget) onClose();}}>
      <div className="fb-modal fb-modal-compose" role="dialog" aria-modal="true" aria-labelledby="fb-title">
        <div className="fb-head">
          <div>
            <div className="fb-tag"><span className="pin-led"/>Staff notes</div>
            <h2 id="fb-title">Write a note</h2>
            <p className="fb-sub">Shared with all unlocked reception desks. Write issues and suggestions for James here.</p>
          </div>
          <button type="button" className="btn ghost fb-close" onClick={onClose} aria-label="Close feedback">✕</button>
        </div>
        <form className="fb-compose" onSubmit={submit}>
          <label className="fb-label">Note<textarea ref={ta} className="fb-ta" value={body} maxLength={FEEDBACK_MAX} rows={4} placeholder="Scanner stuck / card wouldn’t link / idea…" onChange={e=>{setBody(e.target.value);setErr('');setOkMsg('');setPosted(false);}} disabled={busy}/></label>
          <div className="fb-compose-row">
            <label className="fb-label slim">Your name <span className="muted">(optional)</span><input className="fb-name" value={author} maxLength={AUTHOR_MAX} placeholder="e.g. Sam" onChange={e=>setAuthor(e.target.value)} disabled={busy}/></label>
            <button type="submit" className="btn primary lg" disabled={busy||!body.trim()}>{busy?'Saving…':'Submit'}</button>
          </div>
          <div className="fb-count">{body.trim().length}/{FEEDBACK_MAX}</div>
        </form>
        <div className="fb-status" aria-live="polite">
          {err&&<div className="err md-err">{err}</div>}
          {okMsg&&!err&&<div className="ok fb-ok fb-ok-row">{okMsg}{posted&&<button type="button" className="btn primary sm fb-see" onClick={seeAll}>See feedback</button>}</div>}
        </div>
        <div className="fb-list-foot">
          <button type="button" className="btn ghost" onClick={seeAll}>See all feedback</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
