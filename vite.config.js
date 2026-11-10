import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
// Shipped files carry no em dashes (James t255u). Desk copy is clean at source; this only catches vendor
// strings (e.g. a supabase-js debug log line) so the built JS/CSS/HTML is dash-free too.
const noEmDash = { name:'no-em-dash', enforce:'post', generateBundle(_, bundle){
  for (const f of Object.values(bundle)) {
    if (f.type==='chunk') f.code=f.code.replace(/\u2014/g,'-');
    else if (typeof f.source==='string') f.source=f.source.replace(/\u2014/g,'-');
  } } };
export default defineConfig({ base:'/ar-locals-scan/', plugins:[react(), noEmDash], envPrefix:['VITE_','SUPABASE_','DESK_'] });
