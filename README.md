# Zola — Critical Care Referral Coordination

Production MVP: clinician referral creation, consent checkpoint, hospital accept/decline,
family confirmation, and transport handover, tracked as a single auditable state machine.

## Project structure

```
app/
  page.tsx                    Landing page
  dashboard/page.tsx           Operations dashboard (live referral queue)
  referrals/new/page.tsx       Create referral + consent checkpoint
  referrals/[id]/page.tsx      Referral detail, timeline, and actions
  api/
    hospitals/route.ts               GET  list hospitals
    referrals/route.ts               GET list, POST create
    referrals/[id]/route.ts          GET one referral
    referrals/[id]/events/route.ts   GET audit trail
    referrals/[id]/consent/route.ts  PATCH consent checkpoint
    referrals/[id]/send/route.ts     POST broadcast to hospitals
    referrals/[id]/accept/route.ts   POST hospital accepts
    referrals/[id]/decline/route.ts  POST hospital declines
    referrals/[id]/family-confirmation/route.ts   POST next-of-kin consent
    referrals/[id]/ambulance/route.ts    POST ambulance arranged
    referrals/[id]/en-route/route.ts     POST patient en route
    referrals/[id]/received/route.ts     POST patient received
    referrals/[id]/close/route.ts        POST case closed
components/       Shell (nav), StatusBadge
lib/
  types.ts                    Shared domain types
  demo-data.ts                Fallback data shown before Supabase is connected
  referral-state-machine.ts   Allowed status transitions
  transition-referral.ts      Shared transition + audit-log helper
  supabase/client.ts          Browser client (anon key)
  supabase/server.ts          Server-only client (service role key), used only in app/api
supabase/schema.sql           Run once in the Supabase SQL editor
```

The frontend (`app/*/page.tsx`) never talks to Supabase directly. It calls your own
`/api/*` routes, which use the service role key server-side. The browser only ever sees
the anon key, which is read-only under the row-level-security policies in `schema.sql`.

## 1. Set up Supabase

1. In your Supabase project, open **SQL Editor → New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the five tables from the data model
   (hospitals, users, referral_cases, referral_events, family_confirmations) and seeds
   three starter hospitals.
2. Go to **Project Settings → API** and copy three values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this one secret — never put it in frontend code)
3. You will paste these into `.env.local` (locally) and into Vercel's environment
   variables (for the live deployment). You do **not** need the raw Postgres connection
   string for this app.
4. Since a database password was shared earlier in this conversation, reset it now:
   **Project Settings → Database → Reset database password.**

## 2. Run it locally

```bash
cp .env.local.example .env.local
# edit .env.local and paste your three Supabase values
npm install
npm run dev
```

Open http://localhost:3000. Until `.env.local` has real values, the dashboard and
referral pages show clearly-labelled demo data instead of failing.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Zola MVP"
git branch -M main
git remote add origin https://github.com/<your-username>/zola.git
git push -u origin main
```

`.gitignore` already excludes `.env.local`, so your keys never reach GitHub.

## 4. Deploy on Vercel

1. Go to vercel.com → **Add New → Project** → import your `zola` GitHub repo.
2. Vercel auto-detects Next.js. Before clicking Deploy, open the **Environment
   Variables** tab and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   Apply each to Production, Preview, and Development.
3. Click **Deploy**. You get a live `*.vercel.app` URL.
4. Every `git push` to `main` redeploys automatically. To use your own domain, go to
   **Project → Settings → Domains** and add it.

## Referral lifecycle

```
draft → consent_pending → ready_to_send → searching → hospital_accepted
  → family_confirmed → ambulance_arranged → patient_en_route → patient_received → closed
```

A decline from `searching` returns the case to `ready_to_send` so it can be re-broadcast.
Every transition writes a row to `referral_events`, which is what the timeline on the
referral detail page reads from.

## What's intentionally out of scope for this MVP

- **Authentication / roles.** The API routes don't yet check who is calling them. Before
  onboarding real hospitals, add Supabase Auth and enforce the role rules from the spec
  (only `hospital_staff` at the targeted facility can accept/decline, etc.) inside each
  route handler.
- **SMS notifications.** The architecture proposal calls for an SMS gateway at each
  milestone; wire that into the transition routes once a provider is chosen.
- **Financing.** Phase 2 per the roadmap.
