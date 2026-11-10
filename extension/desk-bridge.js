// Runs on the desk page. Bridges window.postMessage <-> extension background.
const ann = () => window.postMessage({ type: 'AR_EXT_READY', version: chrome.runtime.getManifest().version }, location.origin);
ann(); window.addEventListener('DOMContentLoaded', ann);
window.addEventListener('message', e => {
  if (e.source !== window || !e.data) return;
  if (e.data.type === 'AR_EXT_PING') return ann();
  if (e.data.type === 'AR_CHECK') {
    const { reqId, customerId, email } = e.data;
    chrome.runtime.sendMessage({ type: 'check', customerId, email }, res => {
      const err = chrome.runtime.lastError;
      window.postMessage({ type: 'AR_CHECK_RESULT', reqId, ...(err ? { error: err.message } : res) }, location.origin);
    });
    return;
  }
  if (e.data.type === 'AR_ATTENDEE_SYNC') {
    const { reqId, events } = e.data;
    chrome.runtime.sendMessage({ type: 'syncAttendances', events, reqId }, res => {
      const err = chrome.runtime.lastError;
      window.postMessage({ type: 'AR_ATTENDEE_SYNC_RESULT', reqId, ...(err ? { error: err.message } : res) }, location.origin);
    });
  }
});

// Live progress from the background pool (v1.2.2+)
chrome.runtime.onMessage.addListener(m => {
  if (m?.type === 'syncProgress') window.postMessage({ type: 'AR_ATTENDEE_SYNC_PROGRESS', reqId: m.reqId, done: m.done, total: m.total }, location.origin);
});
