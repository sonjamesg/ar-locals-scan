# Atlantic Reach – Locals Card Scan
Honeywell MS7120 acts as a keyboard: scans barcode + Enter into the focused input.
## Setup
1. Apply `supabase/migrations/0001_init.sql` in Dashboard → SQL Editor (project qpcqovuzmyxinozypxik).
2. Keys: Dashboard → Project Settings → API → copy Project URL and `anon` public key.
3. `cp .env.example .env` and fill SUPABASE_URL / SUPABASE_ANON_KEY (never commit .env; never use service_role key in the browser).
4. `npm install && npm run dev` (deploy: `npm run build`, host `dist/` on Vercel/Netlify with the same env vars).
5. Optional Bookwhen typeahead: `supabase functions deploy bookwhen-search --project-ref qpcqovuzmyxinozypxik` and `supabase secrets set BOOKWHEN_API_TOKEN=<token>`. Confirm the customers endpoint/fields against your Bookwhen token; it fails soft to local-only results.
## Security
RLS enabled on all tables with no policies → anon cannot read tables. The desk uses SECURITY DEFINER RPCs only: `lookup_card` (name, end date, status), `search_members` (name typeahead, masked email, max 10), `link_card` (link barcode to member, or create from Bookwhen match/new). Next step: put the desk behind Supabase Auth (a reception login) and grant RPCs to `authenticated` only.
## Unknown card flow
Scan → UNKNOWN → type name → matches from local DB + Bookwhen → click → barcode linked → status shown.
