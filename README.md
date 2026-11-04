# Atlantic Reach – Locals Card Scan
Honeywell MS7120 acts as a keyboard: scans barcode + Enter into the focused input.
## Setup
1. Apply the schema (one-time):
   - Open https://supabase.com/dashboard/project/qpcqovuzmyxinozypxik/sql/new (signed in as james@atlanticreach.co.uk)
   - Paste the whole of `supabase/migrations/0001_init.sql` → **Run** → expect "Success. No rows returned".
   - Check: Table Editor shows the new tables; Database → Functions shows `lookup_card`, `search_members`, `link_card`.
   - CLI alternative: `npx supabase login` → `npx supabase link --project-ref qpcqovuzmyxinozypxik` (DB password from vault) → `npx supabase db push`.
2. Keys: https://supabase.com/dashboard/project/qpcqovuzmyxinozypxik/settings/api → copy Project URL and `anon` public key.
3. `cp .env.example .env` and fill SUPABASE_URL / SUPABASE_ANON_KEY (never commit .env; never use service_role key in the browser).
4. `npm install && npm run dev` (deploy: `npm run build`, host `dist/` on Vercel/Netlify with the same env vars).
5. Optional Bookwhen typeahead: `supabase functions deploy bookwhen-search --project-ref qpcqovuzmyxinozypxik` and `supabase secrets set BOOKWHEN_API_TOKEN=<token>`. Confirm the customers endpoint/fields against your Bookwhen token; it fails soft to local-only results.
## Security
RLS enabled on all tables with no policies → anon cannot read tables. The desk uses SECURITY DEFINER RPCs only: `lookup_card` (name, end date, status), `search_members` (name typeahead, masked email, max 10), `link_card` (link barcode to member, or create from Bookwhen match/new). Next step: put the desk behind Supabase Auth (a reception login) and grant RPCs to `authenticated` only.
## Unknown card flow
Scan → UNKNOWN → type name → matches from local DB + Bookwhen → click → barcode linked → status shown.

## Staff PIN lock (temporary)
The desk shows a PIN pad before the scan screen. Set `DESK_PIN` in `.env` (see `.env.example`); falls back to `6767` if unset. Unlock lasts for the browser session (sessionStorage); use **🔒 Lock** to re-lock.

**Security note:** the PIN is UI-only and is compiled into the frontend bundle. The Supabase RPCs (`lookup_card`, `link_card`, etc.) remain callable by anyone holding the anon key. Before exposing this on a public URL, replace it with real auth (Supabase Auth staff logins + RLS / RPCs restricted to `authenticated`).
