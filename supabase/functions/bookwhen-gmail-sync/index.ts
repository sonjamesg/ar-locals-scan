// Autonomous Bookwhen -> Locals sync. Runs on Supabase cron; no Grok Bot needed.
// Only Locals card emails are processed: "Membership started: LOCALS CARD" or a cancel of LOCALS CARD.
import { createClient } from "npm:@supabase/supabase-js@2";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export function classify(subject: string): "new" | "cancelled" | null {
  const s = subject.toUpperCase();
  if (!s.includes("LOCALS CARD")) return null;
  if (/MEMBERSHIP STARTED:\s*LOCALS CARD/.test(s)) return "new";
  if (/CANCEL/.test(s)) return "cancelled";
  return null;
}
export function parseSubject(subject: string) {
  const parts = subject.split(" - ").map((p) => p.trim());
  const email = (subject.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || []).pop()?.toLowerCase() || null;
  const ref = subject.match(/Ref:\s*(\w+)/i)?.[1] || null;
  const i = parts.findIndex((p) => /membership/i.test(p));
  const name = i > 0 ? parts[i - 1] : "";
  const [first, ...rest] = name.split(/\s+/);
  return { email, ref, first: first || "", last: rest.join(" ") };
}
async function token() {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({
    client_id: Deno.env.get("GMAIL_CLIENT_ID")!, client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!,
    refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN")!, grant_type: "refresh_token" }) });
  const j = await r.json(); if (!j.access_token) throw new Error("gmail auth failed: " + JSON.stringify(j)); return j.access_token;
}
async function ingest(id: string, subject: string) {
  const kind = classify(subject); if (!kind) return { id, skipped: true };
  const p = parseSubject(subject); if (!p.email) return { id, skipped: "no email" };
  const { data, error } = await sb.rpc("ingest_bookwhen_email", { p_message_id: id, p_kind: kind, p_email: p.email,
    p_first: p.first, p_last: p.last, p_notes: subject.slice(0, 300) });
  return { id, kind, email: p.email, result: data, error: error?.message };
}
Deno.serve(async (req) => {
  const secret = Deno.env.get("SYNC_SECRET") || (await sb.rpc("get_sync_secret")).data;
  const url = new URL(req.url);
  const ct = req.headers.get("content-type") || "";
  let body: any = {};
  if (req.method === "POST") {
    if (ct.includes("json")) body = await req.json().catch(() => ({}));
    else if (ct.includes("form")) body = Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
    else { const raw = await req.text(); body = { subject: raw.match(/^Subject:\s*(.+)$/mi)?.[1], message_id: raw.match(/^Message-ID:\s*(.+)$/mi)?.[1] }; }
  }
  // Forward/inbound mode: AgentMail ({message:{subject,message_id}}), Postmark (Subject/MessageID),
  // Mailgun/SendGrid form (subject, Message-Id), plain JSON {subject} or raw RFC822. Secret via x-sync-secret header or ?secret=
  const m = body.message || body.data || body;
  const subj = m.subject || m.Subject || body.subject;
  if (subj || url.searchParams.has("secret") || req.headers.get("x-sync-secret")) {
    const given = req.headers.get("x-sync-secret") || url.searchParams.get("secret");
    if (!secret || given !== secret) return new Response("forbidden", { status: 403 });
    if (!subj) return Response.json({ skipped: "no subject" });
    const id = m.message_id || m.MessageID || m["Message-Id"] || body["Message-Id"] || crypto.randomUUID();
    return Response.json(await ingest(String(id), String(subj).replace(/^\s*((fwd?|fw):\s*)+/i, "")));
  }
  if (!Deno.env.get("GMAIL_REFRESH_TOKEN")) return Response.json({ skipped: "gmail polling not configured (forward mode)" });
  const at = await token();
  const label = Deno.env.get("GMAIL_LABEL") || "Bookwhen";
  const q = `label:${label} subject:"LOCALS CARD" newer_than:${body.days || 3}d`;
  const list = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${at}` } })).json();
  const out = [];
  for (const m of list.messages || []) {
    const msg = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject`,
      { headers: { Authorization: `Bearer ${at}` } })).json();
    const subject = msg.payload?.headers?.find((h: any) => h.name === "Subject")?.value || "";
    out.push(await ingest(m.id, subject));
  }
  return Response.json({ checked: out.length, out });
});
