import {IconAlert} from './Icons.jsx';
export const boardName=r=>[r.first_name,r.last_name].map(x=>(x||'').trim()).filter(Boolean).join(' ');
export function FlagChip({flag,compact}){if(!flag||flag.severity==='none')return null;
  return <span className={'vis-flag vis-flag-'+flag.severity} title={flag.reasons.map(r=>r.text).join('\n')}><IconAlert width={13} height={13}/>{compact?'Worth checking':'Possible card sharing'}</span>;}

