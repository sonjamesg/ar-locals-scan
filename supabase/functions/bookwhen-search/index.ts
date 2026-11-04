// Edge function: name typeahead against Bookwhen. Token stays server-side.
// Set secret: supabase secrets set BOOKWHEN_API_TOKEN=... --project-ref qpcqovuzmyxinozypxik
// NOTE: Bookwhen's public v2 API is limited; endpoint below must be confirmed against your
// token's permissions (customers/passes). Returns [] on failure so local search still works.
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { q } = await req.json().catch(() => ({ q: "" }));
  if (!q || q.trim().length < 2) return Response.json([], { headers: cors });
  try {
    const auth = "Basic " + btoa(Deno.env.get("BOOKWHEN_API_TOKEN") + ":");
    const r = await fetch(`https://api.bookwhen.com/v2/customers?filter[name]=${encodeURIComponent(q)}`, { headers: { Authorization: auth } });
    if (!r.ok) return Response.json([], { headers: cors });
    const j = await r.json();
    const out = (j.data ?? []).slice(0, 10).map((c: any) => ({
      bookwhen_customer_id: c.id,
      first_name: c.attributes?.first_name ?? "", last_name: c.attributes?.last_name ?? "",
      email: c.attributes?.email ?? null, membership_ends_at: c.attributes?.pass_expires_at ?? null,
    }));
    return Response.json(out, { headers: cors });
  } catch { return Response.json([], { headers: cors }); }
});
