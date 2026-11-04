import {createClient} from '@supabase/supabase-js';
export const sb=createClient(import.meta.env.SUPABASE_URL||'http://localhost',import.meta.env.SUPABASE_ANON_KEY||'anon');
export const daysLeft=d=>Math.ceil((new Date(d)-new Date())/864e5);
export const left=d=>{const n=daysLeft(d);return n<0?`Expired ${-n} day${n===-1?'':'s'} ago`:n>60?`${Math.floor(n/30)} months left`:`${n} day${n===1?'':'s'} left`;};
export const fmt=d=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
