// Proxies Bookwhen public Events API for reception desk "now / upcoming" sessions.
// Token stays server-side (BOOKWHEN_API_TOKEN). Never returns auth material.
// Does NOT claim a scanned member is booked onto a session — API has no attendee names.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SCHEDULE_URL = "https://atlanticreach.bookwhen.com/schedules/utxdsfe4hutv";
const TZ = "Europe/London";
const PAGE = 20;
const CACHE_MS = 20_000;

type CacheEntry = { at: number; body: unknown };
let cache: CacheEntry | null = null;

function londonParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return parts as Record<string, string>;
}

function ymd(parts: Record<string, string>) {
  return `${parts.year}${parts.month}${parts.day}`;
}

function addLondonDays(ymdStr: string, days: number) {
  // ymdStr = YYYYMMDD in London calendar; shift by days using UTC noon anchor
  const y = +ymdStr.slice(0, 4), m = +ymdStr.slice(4, 6), d = +ymdStr.slice(6, 8);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utc.setUTCDate(utc.getUTCDate() + days);
  const p = londonParts(utc);
  return ymd(p);
}

function mapEvent(ev: { id?: string; attributes?: Record<string, unknown> }) {
  const a = ev.attributes || {};
  return {
    id: ev.id || "",
    title: String(a.title || "Untitled session"),
    start_at: a.start_at ? String(a.start_at) : null,
    end_at: a.end_at ? String(a.end_at) : null,
    tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
    attendee_count: typeof a.attendee_count === "number" ? a.attendee_count : null,
    attendee_limit: typeof a.attendee_limit === "number" ? a.attendee_limit : null,
    all_day: !!a.all_day,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: cors });
  }

  const token = Deno.env.get("BOOKWHEN_API_TOKEN");
  if (!token) {
    return Response.json({
      error: "missing_token",
      message: "Bookwhen API token is not configured on the server.",
      current: [],
      upcoming: [],
      schedule_url: SCHEDULE_URL,
      as_of: new Date().toISOString(),
      admin_deep_link: null,
      admin_deep_link_note: "Open Register uses /events/{id}/attendances from the live event id when data loads.",
    }, { status: 503, headers: cors });
  }

  let manual = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      manual = !!(body && (body.manual || body.bust));
    }
  } catch { /* ignore */ }

  if (!manual && cache && Date.now() - cache.at < CACHE_MS) {
    return Response.json(cache.body, { headers: { ...cors, "Cache-Control": "public, max-age=15" } });
  }

  try {
    const now = new Date();
    const parts = londonParts(now);
    const from = ymd(parts);
    const to = addLondonDays(from, 2); // today + tomorrow (to is non-inclusive of day-after)
    const auth = "Basic " + btoa(token + ":");
    const events: ReturnType<typeof mapEvent>[] = [];
    let url: string | null =
      `https://api.bookwhen.com/v2/events?filter[from]=${from}&filter[to]=${to}&page[limit]=${PAGE}`;

    let pages = 0;
    while (url && pages < 5) {
      pages++;
      const r = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        return Response.json({
          error: "bookwhen_upstream",
          message: `Bookwhen API returned ${r.status}`,
          detail: detail.slice(0, 200),
          current: [],
          upcoming: [],
          schedule_url: SCHEDULE_URL,
          as_of: now.toISOString(),
          admin_deep_link: null,
          admin_deep_link_note: "Open Register uses /events/{id}/attendances from the live event id when data loads.",
        }, { status: 502, headers: cors });
      }
      const j = await r.json();
      for (const ev of j.data || []) events.push(mapEvent(ev));
      url = j.links?.next || null;
    }

    const nowMs = now.getTime();
    const current = [];
    const upcoming = [];
    for (const e of events) {
      if (!e.start_at || !e.end_at) continue;
      const s = Date.parse(e.start_at);
      const en = Date.parse(e.end_at);
      if (Number.isNaN(s) || Number.isNaN(en)) continue;
      if (s <= nowMs && nowMs < en) current.push(e);
      else if (s > nowMs) upcoming.push(e);
    }
    current.sort((a, b) => Date.parse(a.start_at!) - Date.parse(b.start_at!));
    upcoming.sort((a, b) => Date.parse(a.start_at!) - Date.parse(b.start_at!));

    const body = {
      current,
      upcoming: upcoming.slice(0, 12),
      schedule_url: SCHEDULE_URL,
      as_of: now.toISOString(),
      timezone: TZ,
      // Client builds per-event register URLs from live event ids:
      // https://atlanticreach.bookwhen.com/events/{event_id}/attendances
      admin_attendance_path_template: "/events/{event_id}/attendances",
      admin_host: "https://atlanticreach.bookwhen.com",
      public_event_path_template: "/e/{event_id}",
      admin_deep_link: null as string | null,
      admin_deep_link_note:
        "Open Register uses https://atlanticreach.bookwhen.com/events/{id}/attendances from the live event id.",
      disclaimer:
        "Session list is venue schedule only — it does not show whether the scanned member is booked onto a class. Bookwhen public Events API has no cancelled flag; early closes/cancellations appear as the event vanishing or end_at changing on the next fetch.",
    };
    cache = { at: Date.now(), body };
    return Response.json(body, { headers: { ...cors, "Cache-Control": "public, max-age=15" } });
  } catch (e) {
    return Response.json({
      error: "proxy_failed",
      message: e instanceof Error ? e.message : "unknown",
      current: [],
      upcoming: [],
      schedule_url: SCHEDULE_URL,
      as_of: new Date().toISOString(),
      admin_deep_link: null,
      admin_deep_link_note: "Open Register uses /events/{id}/attendances from the live event id when data loads.",
    }, { status: 500, headers: cors });
  }
});
