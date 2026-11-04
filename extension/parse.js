// Pure parsers for Bookwhen admin HTML (shared by edge fn + node test).
export const LOCALS_PRODUCT = 'rnxp8pcbzpii';
const strip = s => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export const looksLoggedOut = h => /sign[_ -]?in|log[_ -]?in/i.test(h) && !/\/customers\/|\/memberships\//.test(h);
export function parseSubscriptions(html) {
  const ids = [...html.matchAll(new RegExp(`/memberships/${LOCALS_PRODUCT}/subscriptions/([a-z0-9]+)`, 'g'))].map(m => m[1]);
  return [...new Set(ids)];
}
const MON = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
export function parseBwDate(s) {
  const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(s || ''); if (!m) return null;
  const mo = MON[m[2].toLowerCase()]; if (mo == null) return null;
  return `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
export function parseDetail(html) {
  const lcl = (/<h2[^>]*>\s*(LCL\s*\d+)\s*<\/h2>/i.exec(html) || /\b(LCL\d+)\b/.exec(html) || [])[1] || null;
  const st = /<span[^>]*class="[^"]*\bstatus\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(html);
  const status = st ? strip(st[1]).toUpperCase() : null;
  const rn = /Renews at:?\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i.exec(html) || /Renews at:?([\s\S]{0,120}?)<\/(?:td|dd|p|div)>/i.exec(html);
  const renews_text = rn ? strip(rn[1]) : null;
  const em = /href="mailto:([^"]+)"/i.exec(html);
  return { status, lcl: lcl && lcl.replace(/\s+/g, ''), renews_text, renews_at: parseBwDate(renews_text), email: em ? em[1] : null };
}
export const LOCALS_GROUP = '2qx0sob92cv9';
export const searchUrl = (bw, t) => `${bw}/customers/list?filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=&filter_items%5Bcustomer_group%5D%5Bselected_groups%5D%5B%5D=${LOCALS_GROUP}&order=last_seen&reverse=0&search_text=${encodeURIComponent(t)}`;
// Find the customer id for an email in a Bookwhen customers/list page. Returns {id} or {error}.
export function parseCustomerSearch(html, email) {
  const e = (email || '').trim().toLowerCase();
  const re = /\/customers\/([a-z0-9]+)(?=["\/?#])/gi;
  const SKIP = new Set(['list', 'new', 'export', 'import', 'search', 'groups']);
  const hits = []; let m;
  while ((m = re.exec(html))) { const id = m[1]; if (SKIP.has(id.toLowerCase())) continue; hits.push({ id, at: m.index }); }
  const ids = [...new Set(hits.map(h => h.id))];
  if (!ids.length) return { error: 'No Bookwhen customer found for that email' };
  if (ids.length === 1) return { id: ids[0] };
  // Prefer the id whose row contains the exact email: look at the <tr>/block around each link.
  const low = html.toLowerCase(); const exact = new Set();
  for (const h of hits) {
    const s = Math.max(low.lastIndexOf('<tr', h.at), h.at - 1500), en = low.indexOf('</tr>', h.at);
    const chunk = low.slice(s, en > 0 && en - h.at < 3000 ? en : h.at + 1500);
    if (e && chunk.includes(e)) exact.add(h.id);
  }
  if (exact.size >= 1) return { id: [...exact][0] };
  return { id: ids[0] };
}
