/**
 * Forgiving member search used by Search Users, All members and session-name clicks.
 * - lowercase, strip accents, drop apostrophes (holme's == holmes)
 * - hyphens, dots, underscores, digits, @ act as separators
 * - every query word is looked for in names AND inside the email local part with
 *   separators removed, so "james graham" finds jamesgraham123@… and
 *   "kennedyholmes" finds "Kennedy-Holmes"
 * - members matching all words rank first; others matching some words follow as partial
 */
const APOS=/['’‘`´ʼ]/g;
const FILLER=new Set(['and','the','mr','mrs','ms','miss','mx','dr','of']);
export const SEARCH_LIMIT=25;

const deaccent=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
/** Words: letters only, separators → space. */
export const normWords=s=>deaccent(s).toLowerCase().replace(APOS,'').replace(/[^a-z]+/g,' ').trim();
/** Letters only, nothing between them. */
export const compact=s=>normWords(s).replace(/ /g,'');
/** Letters + digits (LCL numbers, barcodes). */
const alnum=s=>deaccent(s).toLowerCase().replace(/[^a-z0-9]+/g,'');

/** Query → token variant lists. Possessive "'s" handled both ways (Holmes's → holmes; Holme's → holmes). */
export function queryTokens(q){
  const raw=deaccent(q).toLowerCase();
  const local=raw.includes('@')?raw.split('@')[0]:raw;
  const out=[];
  for(const part of local.split(/[^a-z'’‘`´ʼ]+/)){
    const plain=part.replace(APOS,'');
    if(plain.length<2||FILLER.has(plain)) continue;
    const v=new Set([plain]);
    const poss=part.replace(/['’‘`´ʼ]s$/,'');
    if(poss!==part){const p=poss.replace(APOS,'');if(p.length>=2)v.add(p);}
    if(/ss$/.test(plain)&&plain.length>3) v.add(plain.slice(0,-1)); // holmes’s typed without apostrophe
    out.push([...v]);
  }
  return out;
}

function prep(r){
  const first=normWords(r.first_name), last=normWords(r.last_name);
  const email=String(r.email||'').trim().toLowerCase();
  const local=email.split('@')[0]||'';
  const words=[first,last,normWords(local)].join(' ').split(' ').filter(Boolean);
  return {
    words,
    nameC:compact(`${r.first_name||''} ${r.last_name||''}`),
    localC:compact(local),
    hay:compact(`${r.first_name||''} ${r.last_name||''}`)+' '+compact(local),
    email,
    ids:[alnum(r.bw_lcl),alnum(r.card_barcode)].filter(Boolean),
  };
}

/** Score one member; null when nothing matched. */
export function scoreMember(r,q,toks=queryTokens(q)){
  const p=prep(r);
  const qTrim=String(q||'').trim().toLowerCase();
  const qa=alnum(q);
  // Exact identifiers first (email, LCL, barcode)
  if(qTrim.includes('@')&&p.email){
    if(p.email===qTrim) return {tier:0,score:1000,matched:toks.length,total:toks.length,partial:false};
    if(p.email.includes(qTrim)) return {tier:1,score:900,matched:toks.length,total:toks.length,partial:false};
  }
  if(qa.length>=3&&/\d/.test(qa)){
    for(const id of p.ids){
      if(id===qa||id==='lcl'+qa||id.replace(/^lcl/,'')===qa) return {tier:0,score:990,matched:1,total:1,partial:false};
      if(id.includes(qa)) return {tier:1,score:880,matched:1,total:1,partial:false};
    }
  }
  if(!toks.length) return null;
  let matched=0, wordStart=0;
  for(const vs of toks){
    let hit=false, ws=false;
    for(const t of vs){
      if(p.hay.includes(t)){hit=true; if(p.words.some(w=>w.startsWith(t))) ws=true;}
    }
    if(hit){matched++; if(ws) wordStart++;}
  }
  if(!matched) return null;
  const all=matched===toks.length;
  const qc=toks.map(v=>v[0]).join('');
  const exact=all&&(p.nameC===qc||p.localC===qc||toks.every(v=>v.some(t=>p.words.includes(t)))&&p.words.length===toks.length);
  const together=all&&(p.nameC.includes(qc)||p.localC.includes(qc));
  const tier=exact?0:all?1:2;
  const score=(exact?500:0)+(together?100:0)+matched*20+wordStart*5-(p.words.length*0.1);
  return {tier,score,matched,total:toks.length,partial:!all};
}

const sortName=r=>(compact(r.first_name)+compact(r.last_name)||String(r.email||'')).toLowerCase();

/**
 * Rank rows for a query. Returns [{...row,_partial,_matched,_total}], full matches first.
 * Partial matches (some words) only shown for multi-word queries.
 */
export function smartSearch(rows,q,{limit=SEARCH_LIMIT}={}){
  const text=String(q||'').trim();
  if(text.length<2) return [];
  const toks=queryTokens(text);
  const out=[];
  for(const r of rows||[]){
    const s=scoreMember(r,text,toks);
    if(!s) continue;
    if(s.partial&&s.total<2) continue;
    out.push({r,s});
  }
  out.sort((a,b)=>a.s.tier-b.s.tier||b.s.score-a.s.score||sortName(a.r).localeCompare(sortName(b.r)));
  return out.slice(0,limit).map(({r,s})=>({...r,_partial:s.partial,_matched:s.matched,_total:s.total}));
}
