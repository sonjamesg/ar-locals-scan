// Check user: scrape Bookwhen admin pages server-side for Locals membership status.
// Needs secret BOOKWHEN_SESSION = full Cookie header from a signed-in Leisure Team browser session
//   supabase secrets set BOOKWHEN_SESSION='_bookwhen_session=...; ...' --project-ref qpcqovuzmyxinozypxik
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseSubscriptions, parseDetail } from "./parse.js";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const BASE = "https://atlanticreach.bookwhen.com";
const j = (b: unknown, s = 200) => Response.json(b, { status: s, headers: cors });
async function page(path: string, cookie: string) {
  const r = await fetch(BASE + path, { redirect: "manual", headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0 AR-Locals-Desk", Accept: "text/html" } });
  if (r.status >= 300 && r.status < 400) { const loc = r.headers.get("location") || ""; if (/sign|login|session/i.test(loc)) throw new Error("SESSION"); throw new Error("redirect " + loc); }
  if (r.status === 401 || r.status === 403) throw new Error("SESSION");
  if (!r.ok) throw new Error("Bookwhen HTTP " + r.status);
  const h = await r.text(); if (/name="password"|type="password"/i.test(h)) throw new Error("SESSION");
  return h;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { member_id } = await req.json().catch(() => ({}));
  if (!member_id) return j({ error: "member_id required" }, 400);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: m } = await db.from("members").select("id,bookwhen_customer_id").eq("id", member_id).maybeSingle();
  if (!m) return j({ error: "member not found" }, 404);
  if (!m.bookwhen_customer_id) return j({ error: "No Bookwhen customer ID — use Open in Bookwhen" }, 422);
  const cookie = Deno.env.get("BOOKWHEN_SESSION");
  if (!cookie) return j({ error: "Bookwhen session needed", code: "SESSION" }, 503);
  try {
    const subs = parseSubscriptions(await page(`/customers/${encodeURIComponent(m.bookwhen_customer_id)}/subscriptions`, cookie));
    let res: any = { status: "NONE", lcl: null, renews_at: null, renews_text: null };
    for (const id of subs) { const d = parseDetail(await page(`/memberships/rnxp8pcbzpii/subscriptions/${id}`, cookie)); d.sub_id = id; if (!res.sub_id || d.status === "ACTIVE") res = d; if (d.status === "ACTIVE") break; }
    const row = { bw_status: res.status, bw_lcl: res.lcl, bw_renews_at: res.renews_at, bw_renews_text: res.renews_text, bw_sub_id: res.sub_id ?? null, bw_checked_at: new Date().toISOString() };
    await db.from("members").update(row).eq("id", member_id);
    return j(row);
  } catch (e) {
    const s = String((e as Error).message);
    return s === "SESSION" ? j({ error: "Bookwhen session needed (expired)", code: "SESSION" }, 503) : j({ error: s }, 502);
  }
});
