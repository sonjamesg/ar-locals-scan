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

## Bookwhen email sync (pending)
Gmail label **Bookwhen** (james@atlanticreach.co.uk) sync is scaffolded but **not yet parsing**: waiting on sample new-membership and cancellation emails.
- `members.pending_card` — new member awaiting a physical card (shown on **Pending cards** tab; cleared automatically when a card is linked, or via `mark_card_issued`).
- `members.cancelled_at` + `mark_member_cancelled(p_member_id)` — sets bw_status CANCELLED.
- `bookwhen_email_log` — dedupe log keyed by Gmail message id.

## Bookwhen email sync (Gmail → DB)
A Grok Bot routine polls james@atlanticreach.co.uk, label **Bookwhen**, for new messages, then:
1. Parses subject/body with `scripts/parse-bookwhen-email.mjs` (`parseBookwhen(subject, body)`).
   - NEW: subject contains `Membership started: LOCALS CARD` → email after the final dash (fallback `Booking contact:`), name from `Registration - <name> - Membership`.
   - CANCELLED: stub (subject has `cancel` + LOCALS CARD). Check it against a real cancel email before relying on it.
   - Anything else → skipped.
2. Calls `select ingest_bookwhen_email(gmail_message_id, kind, email, first, last, notes)` (service role only).
   It's idempotent per message id (`bookwhen_email_log`). For a new member it inserts with `pending_card=true`, `bw_status=ACTIVE`. For an existing member it reactivates them. A cancel sets `CANCELLED`.
New members appear in the **Pending cards** tab until a card is linked.

## Autonomous Bookwhen email sync (no Grok Bot required)

Runs entirely on Supabase:
- **Cron** (`pg_cron`, migration `0012_bookwhen_cron.sql`) calls Edge Function `bookwhen-gmail-sync` every 10 minutes.
- The function reads Gmail label **Bookwhen** (james@atlanticreach.co.uk) via the Gmail API, searching `subject:"LOCALS CARD"` from the last 3 days.
- **Only Locals card mail is processed**: subject must contain `LOCALS CARD` *and* either `Membership started: LOCALS CARD` (→ new member, `pending_card=true`, ACTIVE) or a cancel (→ `CANCELLED`). All other Bookwhen mail is ignored.
- Each message is recorded in `bookwhen_email_log` via `ingest_bookwhen_email`, so re-runs never duplicate. Existing members (matched by email) are updated, not duplicated.

### One-time setup (James)
1. Google Cloud Console → create an OAuth client (Desktop/Web), enable the Gmail API.
2. Get a refresh token for james@atlanticreach.co.uk with scope `https://www.googleapis.com/auth/gmail.readonly` (e.g. via https://developers.google.com/oauthplayground using your own client ID/secret). Set the OAuth consent screen to **In production** (or Internal for Workspace) so the token doesn't expire after 7 days.
3. Supabase → Project Settings → Edge Functions → Secrets, add:
   `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` (optional `GMAIL_LABEL`, default `Bookwhen`).

That's it — it then runs forever on Supabase. Check logs in Supabase → Edge Functions → bookwhen-gmail-sync.

### Alternative: forwarding webhook
Set secret `SYNC_SECRET`, then any inbound-email service (Cloudflare Email Workers, etc.) can POST `{"message_id","subject"}` with header `x-sync-secret` to
`https://qpcqovuzmyxinozypxik.supabase.co/functions/v1/bookwhen-gmail-sync`. Same Locals-only filter applies.

## Bookwhen → Locals email sync (forward-first)

Only two email types are ever sent: **Membership started: LOCALS CARD** (→ Pending cards) and **LOCALS CARD cancel** (→ CANCELLED). The Edge Function `bookwhen-gmail-sync` re-checks this (Locals-only guard) and dedups via `bookwhen_email_log`. No Grok Bot / routines involved.

**Endpoint:** `POST https://qpcqovuzmyxinozypxik.supabase.co/functions/v1/bookwhen-gmail-sync`
Secret: header `x-sync-secret: <SYNC_SECRET>` (or `?secret=` for webhook services without headers). Accepts JSON `{subject, message_id}`, AgentMail/Postmark/Mailgun/SendGrid inbound payloads, or raw RFC822. `SYNC_SECRET` lives in Supabase Vault (`vault.secrets`, read via service-role-only `get_sync_secret()`); an Edge Function env secret of the same name overrides it. Read it in SQL editor: `select public.get_sync_secret();`

### Setup (once, ~5 min)
1. **Gmail filters** (james@): create two filters, action *Apply label `Locals-Sync`* (+ "also apply to matching conversations"):
   - Subject: `"Membership started: LOCALS CARD"`
   - Subject: `"LOCALS CARD" cancel`  (optionally add From: Bookwhen's sender address)
2. **Relay** – script.google.com → New project (signed in as james@) → paste `scripts/gmail-forward.gs` → Project settings → Script properties: `SYNC_SECRET` = value from step above → run `install` once and approve. It runs every 5 min inside Google; nothing else to maintain.
   - Alternative: if you use an inbound-email service with webhooks (AgentMail, Postmark, Mailgun), set the filter to *Forward to* that address and point its webhook at the endpoint with `?secret=`.

### Optional: direct Gmail API polling
Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` (and `GMAIL_LABEL`) as Edge Function secrets; the pg_cron call then polls Gmail. Without them the cron call is a no-op.

After updates, if the installed PWA looks stale: Lock→unlock or close and reopen the app (service worker cache is versioned in public/sw.js).
