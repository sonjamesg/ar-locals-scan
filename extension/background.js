import { parseSubscriptions, parseDetail, looksLoggedOut, parseCustomerSearch, searchUrl, LOCALS_PRODUCT } from './parse.js';
const BW = 'https://atlanticreach.bookwhen.com';
const wait = (tabId, ms = 20000) => new Promise((ok, no) => {
  const t = setTimeout(() => { chrome.tabs.onUpdated.removeListener(f); no(new Error('Bookwhen took too long')); }, ms);
  const f = (id, info) => { if (id === tabId && info.status === 'complete') { clearTimeout(t); chrome.tabs.onUpdated.removeListener(f); ok(); } };
  chrome.tabs.onUpdated.addListener(f);
});
async function grab(tabId, url) {
  await chrome.tabs.update(tabId, { url }); await wait(tabId);
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: () => [location.href, document.documentElement.outerHTML] });
  return result;
}
async function check(customerId, email) {
  const hasId = /^[a-z0-9]+$/i.test(customerId || '');
  if (!hasId && !/@/.test(email || '')) throw new Error('No Bookwhen customer ID or email');
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
  try {
    if (!hasId) {
      const [, sh] = await grab(tab.id, searchUrl(BW, email.trim().toLowerCase()));
      if (looksLoggedOut(sh)) throw new Error('Bookwhen session not signed in — log in to Bookwhen in this browser');
      const r = parseCustomerSearch(sh, email);
      if (r.error) throw new Error(r.error);
      customerId = r.id;
    }
    const [href, html] = await grab(tab.id, `${BW}/customers/${customerId}/subscriptions`);
    if (!href.includes(`/customers/${customerId}`) || looksLoggedOut(html)) throw new Error('Bookwhen session not signed in — log in to Bookwhen in this browser');
    const subs = parseSubscriptions(html);
    if (!subs.length) return { customer_id: customerId, status: 'NONE', lcl: null, renews_at: null, renews_text: null, sub_id: null };
    let best = null;
    for (const s of subs.slice(0, 3)) {
      const [, d] = await grab(tab.id, `${BW}/memberships/${LOCALS_PRODUCT}/subscriptions/${s}`);
      const p = { ...parseDetail(d), sub_id: s };
      if (!best || p.status === 'ACTIVE') best = p;
      if (p.status === 'ACTIVE') break;
    }
    return { ...best, customer_id: customerId };
  } finally { chrome.tabs.remove(tab.id).catch(() => {}); }
}
chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.type !== 'check') return;
  check(msg.customerId, msg.email).then(r => reply({ ok: true, ...r }), e => reply({ error: e.message }));
  return true;
});
