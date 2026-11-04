// Google Apps Script relay for james@atlanticreach.co.uk (script.google.com, same account).
// Gmail filter labels ONLY Locals start/cancel mail "Locals-Sync"; this posts each subject to the
// Supabase Edge Function every 5 min and removes the label. Set Script Property SYNC_SECRET first.
const URL_ = 'https://qpcqovuzmyxinozypxik.supabase.co/functions/v1/bookwhen-gmail-sync';
function relayLocals() {
  const secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
  const label = GmailApp.getUserLabelByName('Locals-Sync'); if (!label || !secret) return;
  for (const t of label.getThreads(0, 50)) {
    let ok = true;
    for (const m of t.getMessages()) {
      const r = UrlFetchApp.fetch(URL_, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { 'x-sync-secret': secret }, payload: JSON.stringify({ message_id: m.getId(), subject: m.getSubject() }) });
      if (r.getResponseCode() !== 200) ok = false;
    }
    if (ok) t.removeLabel(label);
  }
}
function install() { ScriptApp.newTrigger('relayLocals').timeBased().everyMinutes(5).create(); }
