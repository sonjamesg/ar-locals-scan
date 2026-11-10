import { parseSubscriptions, parseDetail, looksLoggedOut, parseCustomerSearch, searchUrl, LOCALS_PRODUCT } from './parse.js';
import { parseAttendancesHtml, eventIdFromHref, registerReady, looksLoggedOutAttendances } from './parseAttendances.js';

const BW = 'https://atlanticreach.bookwhen.com';
const EVENT_ID_RE = /^ev-[a-z0-9]+-\d{14}$/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Resolve when the tab has finished loading `url` (not the about:blank it started on). Listener is attached BEFORE navigating. */
function navigate(tabId, url, ms = 25000) {
  const target = new URL(url);
  return new Promise((ok, no) => {
    let done = false;
    const finish = (fn, v) => { if (done) return; done = true; clearTimeout(t); chrome.tabs.onUpdated.removeListener(f); fn(v); };
    const onTarget = u => { try { const x = new URL(u || ''); return x.origin === target.origin && x.protocol.startsWith('http'); } catch { return false; } };
    const t = setTimeout(() => finish(no, new Error('Bookwhen took too long')), ms);
    const f = (id, info, tab) => { if (id === tabId && info.status === 'complete' && onTarget(tab?.url)) finish(ok); };
    chrome.tabs.onUpdated.addListener(f);
    chrome.tabs.update(tabId, { url }).catch(e => finish(no, e));
  });
}

async function readPage(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => [location.href, document.documentElement.outerHTML],
  });
  return result;
}

async function grab(tabId, url) {
  await navigate(tabId, url);
  return readPage(tabId);
}

/** Load a register and wait (up to ~8s) for the attendee table / "N attendees" footer to render. */
async function grabRegister(tabId, url) {
  await navigate(tabId, url);
  let page = await readPage(tabId);
  for (let i = 0; i < 16 && !registerReady(page[1]) && !looksLoggedOutAttendances(page[1]); i++) {
    await sleep(500);
    page = await readPage(tabId);
  }
  return page;
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

/** Sequential register reads for desk-allowlisted event ids only. Every requested event gets a result. */
async function syncAttendances(events) {
  const list = Array.isArray(events) ? events : [];
  const out = [];
  const fail = (ev, id, error) => ({
    event_id: id, event_title: ev.title || null, event_start_at: ev.start_at || null, event_end_at: ev.end_at || null,
    status: 'failed', error, attendees: [], incomplete: true, captured_at: new Date().toISOString(),
  });
  let loginError = null;
  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: 'about:blank', active: false });
    for (const raw of list) {
      const ev = raw || {};
      const id = String(ev.id || '').trim();
      if (!EVENT_ID_RE.test(id)) { out.push(fail(ev, id, 'Invalid event id')); continue; }
      if (loginError) { out.push(fail(ev, id, loginError)); continue; }
      try {
        const [href, html] = await grabRegister(tab.id, `${BW}/events/${encodeURIComponent(id)}/attendances`);
        const parsed = parseAttendancesHtml(html, href);
        if (parsed.error && /not signed in/i.test(parsed.error)) { loginError = parsed.error; out.push(fail(ev, id, parsed.error)); continue; }
        const gotId = parsed.event_id || eventIdFromHref(href);
        if (gotId && gotId !== id) { out.push(fail(ev, id, 'Bookwhen opened a different register')); continue; }
        if (!gotId && !/bookwhen\.com/.test(href || '')) { out.push(fail(ev, id, 'Register page did not open (got ' + String(href || '').slice(0, 60) + ')')); continue; }
        out.push({
          event_id: id, event_title: ev.title || null, event_start_at: ev.start_at || null, event_end_at: ev.end_at || null,
          status: parsed.error ? 'failed' : (parsed.incomplete ? 'partial' : 'ok'),
          error: parsed.error || null, warnings: parsed.warnings || [],
          attendees: parsed.attendees || [], row_count: parsed.row_count, footer_count: parsed.footer_count,
          incomplete: !!parsed.incomplete, captured_at: new Date().toISOString(),
        });
      } catch (e) {
        out.push(fail(ev, id, e?.message || String(e)));
      }
    }
  } catch (e) {
    // Tab could not be created — report every remaining event rather than aborting silently
    const msg = 'Could not open Bookwhen tab: ' + (e?.message || e);
    for (const raw of list.slice(out.length)) out.push(fail(raw || {}, String(raw?.id || ''), msg));
  } finally { if (tab) chrome.tabs.remove(tab.id).catch(() => {}); }
  return { snapshots: out, version: chrome.runtime.getManifest().version };
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.type === 'check') {
    check(msg.customerId, msg.email).then(r => reply({ ok: true, ...r }), e => reply({ error: e.message }));
    return true;
  }
  if (msg?.type === 'syncAttendances') {
    syncAttendances(msg.events).then(r => reply({ ok: true, ...r }), e => reply({ error: e.message }));
    return true;
  }
});
