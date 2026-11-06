import { parseSubscriptions, parseDetail, looksLoggedOut, parseCustomerSearch, searchUrl, LOCALS_PRODUCT } from './parse.js';
import { parseAttendancesHtml, eventIdFromHref } from './parseAttendances.js';

const BW = 'https://atlanticreach.bookwhen.com';
const EVENT_ID_RE = /^ev-[a-z0-9]+-\d{14}$/i;

const wait = (tabId, ms = 20000) => new Promise((ok, no) => {
  const t = setTimeout(() => { chrome.tabs.onUpdated.removeListener(f); no(new Error('Bookwhen took too long')); }, ms);
  const f = (id, info) => { if (id === tabId && info.status === 'complete') { clearTimeout(t); chrome.tabs.onUpdated.removeListener(f); ok(); } };
  chrome.tabs.onUpdated.addListener(f);
});

async function grab(tabId, url) {
  await chrome.tabs.update(tabId, { url }); await wait(tabId);
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => [location.href, document.documentElement.outerHTML],
  });
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

/** Sequential register reads for desk-allowlisted event ids only. */
async function syncAttendances(events, signal) {
  const list = Array.isArray(events) ? events : [];
  const out = [];
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
  try {
    for (let i = 0; i < list.length; i++) {
      if (signal?.aborted) throw new Error('Cancelled');
      const ev = list[i] || {};
      const id = String(ev.id || '').trim();
      if (!EVENT_ID_RE.test(id)) {
        out.push({ event_id: id, status: 'failed', error: 'Invalid event id', attendees: [], incomplete: true, captured_at: new Date().toISOString() });
        continue;
      }
      const url = `${BW}/events/${encodeURIComponent(id)}/attendances`;
      try {
        const [href, html] = await grab(tab.id, url);
        if (signal?.aborted) throw new Error('Cancelled');
        const parsed = parseAttendancesHtml(html, href);
        if (parsed.error && /not signed in/i.test(parsed.error)) {
          out.push({
            event_id: id, event_title: ev.title || null, event_start_at: ev.start_at || null,
            status: 'failed', error: parsed.error, attendees: [], incomplete: true,
            captured_at: new Date().toISOString(),
          });
          break; // login required — stop batch
        }
        const gotId = parsed.event_id || eventIdFromHref(href) || id;
        if (gotId !== id) {
          out.push({
            event_id: id, event_title: ev.title || null, event_start_at: ev.start_at || null,
            status: 'failed', error: 'Register URL did not match requested event id', attendees: [], incomplete: true,
            captured_at: new Date().toISOString(),
          });
          continue;
        }
        const status = parsed.error ? 'failed' : (parsed.incomplete ? 'partial' : 'ok');
        out.push({
          event_id: id,
          event_title: ev.title || null,
          event_start_at: ev.start_at || null,
          event_end_at: ev.end_at || null,
          status,
          error: parsed.error || null,
          warnings: parsed.warnings || [],
          attendees: parsed.attendees || [],
          row_count: parsed.row_count,
          footer_count: parsed.footer_count,
          incomplete: !!parsed.incomplete,
          captured_at: new Date().toISOString(),
        });
      } catch (e) {
        if (String(e.message || e) === 'Cancelled') throw e;
        out.push({
          event_id: id, event_title: ev.title || null, event_start_at: ev.start_at || null,
          status: 'failed', error: e.message || String(e), attendees: [], incomplete: true,
          captured_at: new Date().toISOString(),
        });
      }
    }
  } finally { chrome.tabs.remove(tab.id).catch(() => {}); }
  return { snapshots: out };
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.type === 'check') {
    check(msg.customerId, msg.email).then(r => reply({ ok: true, ...r }), e => reply({ error: e.message }));
    return true;
  }
  if (msg?.type === 'syncAttendances') {
    const ac = { aborted: false };
    // cancel via separate message not wired mid-flight in MV3 easily; desk timeout handles UX
    syncAttendances(msg.events, ac).then(r => reply({ ok: true, ...r }), e => reply({ error: e.message }));
    return true;
  }
});
