# gtfotd — before you go

A morning departure checklist you reach by tapping an NFC tag on your way out the
door. You design a **routine** as a branching flowchart (weather, day of week,
yes/no questions); each morning the app walks that graph and prints the day's
list of things to grab, styled as a restaurant guest check.

The app is called **gtfotd — get the *heck out the door**. Name is settled.

---

## Stack

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**
- **Supabase** for Postgres + Auth (email + password)
- Weather from **Open-Meteo** (free, no API key)
- Styling: plain CSS or Tailwind — your call, but the design tokens below are the
  source of truth either way. Do not introduce a component library (MUI,
  Chakra, shadcn); this design is hand-built and a library will fight it.

---

## Supabase — already provisioned, do not re-create

The database is live, migrated, and verified. **Do not write new schema
migrations without being asked.**

```
Project ref   htctfxlrskdztpirylez
API URL       https://htctfxlrskdztpirylez.supabase.co
Publishable   sb_publishable_ExzCs1Zg-vJatYi0l9wNBg_8-cX3ArR
```

`.env.local` (and the same three in Vercel project settings):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://htctfxlrskdztpirylez.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ExzCs1Zg-vJatYi0l9wNBg_8-cX3ArR
```

The publishable key is *designed* to ship in the browser bundle — it is not a
secret, and RLS is the actual security boundary. The **secret / service_role**
key is a different thing entirely: never put it in this repo, in client code, or
in any `NEXT_PUBLIC_*` variable.

### Schema

```
profiles
  id            uuid  PK -> auth.users(id) ON DELETE CASCADE
  display_name  text
  location_mode text  NOT NULL DEFAULT 'auto'  CHECK IN ('auto','manual')
  manual_place  text
  latitude      double precision
  longitude     double precision
  subway_enabled        boolean NOT NULL DEFAULT false
  subway_show_walk      boolean NOT NULL DEFAULT true
  subway_show_leave_by  boolean NOT NULL DEFAULT true
  subway_stop_id        text     -- lib/subway/stations.json complex id, e.g. "602"
  subway_stop_name      text
  subway_lines          jsonb NOT NULL DEFAULT '[]'  -- [{route,stopId,direction:"N"|"S"}]
  created_at, updated_at  timestamptz

routines
  id         uuid PK DEFAULT gen_random_uuid()
  user_id    uuid NOT NULL -> auth.users(id) ON DELETE CASCADE
  name       text NOT NULL DEFAULT 'My routine'
  graph      jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'
  is_active  boolean NOT NULL DEFAULT true
  created_at, updated_at  timestamptz
  INDEX routines_user_id_idx (user_id)
  UNIQUE INDEX routines_one_active_per_user (user_id) WHERE is_active

daily_state
  user_id      uuid PK -> auth.users(id) ON DELETE CASCADE
  routine_id   uuid -> routines(id) ON DELETE SET NULL
  local_date   date NOT NULL
  generated_at timestamptz NOT NULL DEFAULT now()
  items        jsonb NOT NULL DEFAULT '[]'
  answers      jsonb NOT NULL DEFAULT '{}'
  weather      jsonb
  completed_at timestamptz
  updated_at   timestamptz
```

**Note:** `daily_state` deliberately has no subway column. Train times move
minute to minute, so unlike weather they're never cached in `daily_state` —
the checklist fetches them live from `/api/subway/departures` on a short
interval while the ticket is open.

### Subway (MTA GTFS-Realtime)

- `lib/subway/stations.json` is a static snapshot of MTA's public stations
  dataset (data.ny.gov, resource `39hk-dx4f`), grouped by transfer complex.
  It's app data, not a DB table — `profiles.subway_stop_id` references it by
  convention, not a foreign key. Regenerate by re-fetching that dataset.
- Live arrivals come from MTA's GTFS-Realtime feeds
  (`lib/subway/realtime.ts`), which **require a free MTA developer API key**.
  Sign up at https://api.mta.info/ and set `MTA_API_KEY` in `.env.local` and
  in Vercel project settings — **server-only, never `NEXT_PUBLIC_*`** (it's
  read only by the `/api/subway/departures` route handler, never shipped to
  the browser, unlike the Supabase publishable key).
- `lib/subway/predict.ts` is the pure "what does the ticket print" module —
  same shape as `lib/routine/walk.ts`: no React, no fetch, unit tested
  directly (`lib/subway/predict.test.ts`).

**`routines.graph`**

```jsonc
{
  "nodes": [
    // type: "weather" | "day" | "ask" | "item"
    { "id": "n1", "type": "weather", "label": "Rain likely",
      "config": { /* type-specific */ }, "x": 270, "y": 110 }
  ],
  "edges": [
    // fromBranch: "yes" | "no" | null (null = unconditional, straight off START)
    { "id": "e1", "from": "n1", "fromBranch": "yes", "to": "n2" }
  ]
}
```

**`daily_state.items`** — `[{ "id", "label", "tag", "checked" }]`. `tag` is
inherited from the branch that reached the item (RAIN, GYM, WORK, ALWAYS).

**`daily_state.answers`** — answers to `ask` nodes this run, keyed by node id:
`{ "n3": true }`.

### Rules the schema enforces (don't fight them)

- **One active routine per user.** Inserting a second `is_active = true` row for
  the same user raises `23505 routines_one_active_per_user`. To switch routines,
  deactivate the old one and activate the new one **in a single transaction or
  an RPC** — two sequential updates will transiently violate the index.
- **`profiles` rows are created for you** by an `on_auth_user_created` trigger
  that fires on signup and copies `display_name` from user metadata. Never
  insert into `profiles` from the client — there is deliberately no INSERT
  policy. Pass `display_name` via `options.data` on `signUp`.
- **RLS is on and verified.** Every policy is scoped to `(select auth.uid())`.
  A user cannot read, update, delete, or forge ownership of another user's rows.
  This has been tested with two real users; don't add `service_role` calls to
  work around something that looks like a permissions bug — it's more likely a
  missing session.

### Auth configuration (already set in the dashboard)

- Allow new users to sign up: **ON**
- Confirm email: **OFF**
- Anonymous sign-ins: OFF · Manual linking: OFF

Consequences you must design around:

- Email addresses are **never verified**. Don't write copy promising a
  confirmation email.
- **Password reset does not work yet** — no custom SMTP is configured, and
  Supabase's built-in mail server only delivers to project team members.
  **Do not build a "Forgot password" flow.** If a login form needs one, link to
  a page that says it's coming, or leave it out. Ask before adding it.

---

## Auth implementation — read this, it is easy to get wrong

These APIs changed recently. The patterns below are current as of Sept 2026 and
were checked against Supabase's docs. If you write this from memory you will
probably produce the older, broken version.

1. **The file is `proxy.ts`, not `middleware.ts`.** Next.js renamed Middleware to
   Proxy. Root `proxy.ts` exports `proxy(request)` and delegates to
   `updateSession` in `lib/supabase/proxy.ts`.
2. **Protect pages with `supabase.auth.getClaims()`.** Not `getUser()`, and
   *never* `getSession()` in server code — session cookies can be spoofed and
   `getSession()` doesn't revalidate. `getClaims()` verifies the JWT signature
   against the project's published keys.
3. **Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**, not `..._ANON_KEY`.
4. **`setAll(cookiesToSet, headers)` takes a second argument.** Those are cache
   headers (`Cache-Control`, `Expires`, `Pragma`) that must be applied to the
   response in the Proxy, or a CDN can cache a response and leak one user's
   session to another. Apply them. In Server Components `setAll` can't write, so
   there the call is wrapped in try/catch and the error ignored — the Proxy is
   what actually persists cookies.

`lib/supabase/proxy.ts` — the shape to follow:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // With Fluid compute, never hoist this client into a module-level variable.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
          Object.entries(headers).forEach(([k, v]) =>
            supabaseResponse.headers.set(k, v))
        },
      },
    }
  )

  // Do NOT put code between createServerClient and getClaims().
  // Removing getClaims() causes users to be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  if (!user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Return supabaseResponse as-is. If you build a new response, pass { request }
  // and copy the cookies across, or sessions will break.
  return supabaseResponse
}
```

Also create `lib/supabase/client.ts` (`createBrowserClient`, used in Client
Components — it's already a singleton) and `lib/supabase/server.ts`
(`createServerClient` with `await cookies()`, created fresh per request).

**Nothing here has been exercised over HTTP.** The schema and RLS were verified
directly against Postgres, but no real signup or REST call has ever run. Expect
the first browser round-trip to be where problems surface, and verify it early.

---

## Design system — "guest check"

The look is a restaurant order pad: blue ink on fine grid paper. It's settled;
don't redesign it. Reference mockups exist for every screen listed below.

```
--ink            #1c3a63   ledger blue, all text and borders
--paper          #fdfdfb   card / ticket background
--grid-fine      #e9eff6   9px grid on the ticket
--ground         #dfe4ea   page background behind the ticket
--rule           #dae3ee   row separators
--muted          #6b83a3   secondary text
--muted-light    #93a6be   tertiary text, tags
--band           #eef3f9   tinted caps band on builder nodes
--hairline       #cdd9e7   light borders
--accent         #b4442f   RATIONED: the ALL SET stamp + destructive actions only
```

Type: **Courier Prime** (mono — body and UI) + **Playfair Display italic** (only
for small flourishes: "before you go", "thank you, have a good day"). Both are
**placeholders** — the real pairing is an open question. Put them behind CSS
variables / a single font config so swapping is one file.

**Ticket anatomy** (the checklist screens): perforated top edge → header rule →
three-column meta row (date / weather / check no.) → ruled item rows with a
right-hand tag column → ruled filler to the footer → `ITEMS CHECKED n / n` above
the CTA → italic sign-off. No barcode — it was cut deliberately.

**Builder canvas**: graph paper (9px fine + 45px coarse grid). Square handles,
never round. Orthogonal connectors with square corners. Filled handle = connected
branch; open/outlined handle = branch that grabs nothing. Item leaf nodes have a
**dashed top border** — torn from the pad, since they become ticket rows.
The builder deliberately does **not** use perforated edges, check numbers, or
italic sign-offs; those belong to the ticket only.

Icons: inline SVG, stroke-based, 16/20/24px grid. **Never emoji or dingbats.**

Hit targets on phone screens: 44px minimum.

---

## Screens

**Checklist (phone, 390×844)** — designed, four states:
today's list · all checked (with a rotated "ALL SET" stamp) · no routine yet ·
fetching weather.

**Routine builder (desktop, 1440×900)** — designed: canvas with a left node
palette, a preview drawer (scenario overrides for weather/day/ask + a live
scaled ticket), and a node kit sheet defining node types, states (rest,
selected, connecting, dragging) and handle/line vocabulary.

**Not yet designed — ask before inventing a look:**
- Sign up / sign in
- Routine switcher (several routines, one active)

The builder is **desktop-first** on the assumption you build a routine on a
laptop and only *tap* on a phone. There is no mobile builder design. The
checklist must work well on a phone; the builder does not have to.

---

## Open decision — step node shape

Four variants are drawn in the mockups. **A is the default; build A.**

- **A — Banded rows** (default): caps band, body row, YES row, NO row.
- **B — One line**: half height, type as icon, YES exits right, NO drops down.
- **C — Sentence**: prose with the condition as an inline editable token.
- **D — Split fork**: condition left, YES/NO split drawn as the right third.

B and C change the shape of the whole graph, not just the node. Because the
choice is still open, **isolate node rendering in a single component** (e.g.
`components/builder/StepNode.tsx`) so swapping variants is one file, not a
refactor. Don't scatter node geometry through the canvas code.

---

## Build order

The user asked for the full app. Build it in this order anyway, so that the
untested parts fail early instead of late:

1. Scaffold, Supabase clients, `proxy.ts`, env wiring.
2. Sign up / sign in / sign out. **Checkpoint — stop and confirm with a real
   browser:** create an account, confirm a `profiles` row appears, create a
   second account, confirm it cannot see the first one's data. Nothing below is
   trustworthy until this passes.
3. Routine CRUD against `routines` + the routine switcher.
4. The flowchart builder (drag nodes, connect branches, edit/delete, save/load).
5. Open-Meteo integration driven by `profiles.location_mode`.
6. The graph walker: resolve conditions → produce `items` → write `daily_state`.
7. The checklist screen, check/uncheck, "Done, heading out" reset, and the
   24-hour auto-reset.

**Reset rule:** the day's list regenerates when `completed_at` is non-null, when
`local_date` no longer matches today in the user's timezone, or when
`generated_at` is more than 24h old — whichever comes first.

---

## Conventions

- TypeScript throughout. Generate DB types with
  `supabase gen types typescript --project-id htctfxlrskdztpirylez` and keep them
  checked in.
- Don't commit `.env.local`. Do commit `.env.example`.
- Keep the graph-walking logic in a pure, unit-testable module
  (`lib/routine/walk.ts`) that takes `(graph, conditions, answers)` and returns
  items. It should not import React or Supabase. Test it directly — it's the
  part most likely to harbour real bugs, and the hardest to debug through the UI.
- Prefer server components for reads; client components for the builder canvas.

## Don't

- Don't re-run or rewrite the database migrations.
- Don't add a "Forgot password" flow (no SMTP yet).
- Don't use the service_role key anywhere in this repo.
- Don't add a component library or restyle away from the guest-check system.
- Don't invent designs for the auth screens or routine switcher without asking.
- Don't put emoji in the UI.