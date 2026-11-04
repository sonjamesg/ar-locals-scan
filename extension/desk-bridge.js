// Runs on the desk page. Bridges window.postMessage <-> extension background.
const ann = () => window.postMessage({ type: 'AR_EXT_READY', version: chrome.runtime.getManifest().version }, location.origin);
ann(); window.addEventListener('DOMContentLoaded', ann);
window.addEventListener('message', e => {
  if (e.source !== window || !e.data) return;
  if (e.data.type === 'AR_EXT_PING') return ann();
  if (e.data.type !== 'AR_CHECK') return;
  const { reqId, customerId } = e.data;
  chrome.runtime.sendMessage({ type: 'check', customerId }, res => {
    const err = chrome.runtime.lastError;
    window.postMessage({ type: 'AR_CHECK_RESULT', reqId, ...(err ? { error: err.message } : res) }, location.origin);
  });
});
