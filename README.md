# Tampa Scoop

Code and operating docs for the Tampa Scoop newsletter: three web apps plus the playbooks used to run the newsletter. Written for Grok (the AI operator) and for any developer.

**Operating manual:** start with [`ops/grok-prompt.md`](ops/grok-prompt.md). Everything else in `ops/` is supporting method docs and scripts.

## The apps

| Folder | What it does | Live URL |
|---|---|---|
| `events-calendar/` | Public Tampa events calendar. Shows approved, upcoming events; lets the public submit events for review. | https://tampa-events.pages.dev |
| `directory/` | Public local-business directory with a "request a quote" form. Also hosts Instagram images in `public/assets/ig`. | https://tampa-directory.pages.dev |
| `scoop-desk/` | Private editor's desk (login required). Builds each issue section by section, drafts copy with AI, and creates a **draft** post in beehiiv (never sends). | https://scoop-desk.pages.dev |

**Stack (each app):** Vite + React + TypeScript frontend (`src/`), Convex backend (`convex/`), hosted on Vercel. `bun install` then `bun run dev` locally (needs a Convex deployment).

## Data: Smartsheet is the source of truth

Smartsheet workspace **"Tampa Scoop"** (id `4264547688179588`). Sheet IDs are hard-coded in each app's `convex/sheetsGateway.ts` (`SHEET_IDS`).

| Sheet | ID |
|---|---|
| Lists | 962440566361988 |
| Categories | 4514636218191748 |
| Organizers | 2475660623957892 |
| Events | 6801895281872772 |
| Event Submissions | 153543605702532 |
| Businesses | 3177664438554500 |
| Quote Requests | 7224434164453252 |
| Story Queue | 2546355785650052 |
| Issues | 3037219007975300 |

Rows are read by **column title**, so renaming a column breaks the app that uses it.

### Events calendar
- **Reads `Events`** (`convex/events.ts`): only rows with `Status` = `Approved`, `Cancelled` not ticked, and `Start Date` today or later (America/New_York). Columns used: Event ID, Event Name, Slug, Organizer, Venue, Address, Neighborhood, Neighborhood/ZIP, Start Date, Time, Category, Description, Ticket Price / Free, Is Free, Ticket URL, Image URL. Cached in Convex for **5 minutes**.
- **Writes `Event Submissions`** (`convex/submissions.ts`): adds one row per public submission with `Status` = `Pending Review`. Columns: Event Name, Organizer, Venue, Address, Neighborhood/ZIP, Start Date, End Date, Time, Category, Description, Ticket Price / Free, Ticket URL, Image URL, Source, Status, Date Verified, Featured, Submitter Name, Submitter Email, Submitted At, Review Notes, Submission ID, Accuracy & Rights Confirmed, Marketing Opt-in, Possible Duplicate, Spam Flag, Neighborhood. Rate-limited; nothing is published until a human sets Status=Approved and copies it to Events.

### Directory
- **Reads `Categories` and `Businesses`** (`convex/directory.ts`, `convex/lib/directory.ts`): only businesses with `Status` = `Published`. Columns: Business Name, Slug, Category, Address, Neighborhood, Neighborhood/ZIP, Phone, Website, Instagram, Emergency Claim Source, Status. Empty cells stay empty (nothing invented). Cached **5 minutes**.
- **Writes `Quote Requests`** (`convex/quotes.ts`): one row per quote request. Columns: Request ID, Submitted At, Category, Service ZIP, Timing, Job Description, Name, Email, Phone, Phone Consent, Contact Preference, Terms Accepted, Status, Matched Businesses, Alert Sent At, Approved By, Source, Source Page URL, Notes. Rate-limited per browser/email/site.

### Scoop Desk
- **Reads `Events`** (Status=Approved, upcoming), **`Businesses`** (Status=Published) and **`Categories`** as picks for the issue (`convex/feeds.ts`, 5-minute cache).
- **Reads and writes `Story Queue` and `Issues`** (`convex/sync.ts`, `convex/lib/schema.ts`): keeps a local Convex copy and syncs add/update/delete back to the sheet (cron every 15 min, `convex/crons.ts`; pulls throttled to 2 min).
  - Story Queue columns: Story ID, Issue Date, Issue Type, Tone, Section, Fact Bullets, Source URLs, Reader Action, Known Gaps, Sponsor, Sponsor Name, Sponsor Copy, Sponsor URL, State, Headline, Draft, Word Count, VERIFY Flags, Claim Sources, Editor Notes, Created At, Updated At.
  - Issues columns: Issue ID, Issue Date, Issue Type, Subject, Preview Text, Opening, Story IDs, Event Picks, Business Pick, Checklist, Status, Plain Text, HTML, Exported At, Updated At, Notes, Sections JSON, Subject Options.
- **AI drafting** (`convex/stories.ts`, `convex/sections.ts`): calls the Viktor tool `ai_structured_output`.
- **beehiiv** (`convex/sections.ts`, `convex/lib/sections.ts`): creates a draft post via `POST https://api.beehiiv.com/v2/publications/pub_70361159-9f75-498c-a7a5-88cf427f2cf0/posts`, template `post_template_18dad33c-1ef9-4730-980a-eded3c7e114d`, content sent as `blocks` (not `body_content`).

## Honest note: these apps depend on Viktor

As written, the apps **won't run outside Viktor**:
- Every Smartsheet call (and the Desk's AI and beehiiv calls) goes through Viktor's tool gateway: `convex/viktorTools.ts` → `VIKTOR_SPACES_API_URL` + `/api/viktor-spaces/tools/call`, authenticated with `VIKTOR_SPACES_PROJECT_SECRET`. Tool names: `mcp_pd_smartsheet_get_sheet`, `mcp_pd_smartsheet_add_row_to_sheet`, `mcp_pd_smartsheet_update_row`, `mcp_pd_smartsheet_delete_rows`, `ai_structured_output`, `mcp_pd_beehiiv_proxy_post`.
- Login (Desk) uses Viktor auth/membership.

**As long as Justin keeps his Viktor account, the live sites keep working.** Instagram images scheduled in Buffer through Oct 31 are served from `directory/public/assets/ig` on the live directory site, so keep it up until then.

## Migration guide (to run without Viktor)

1. **Smartsheet direct.** Rewrite `convex/sheetsGateway.ts` in each app to call the Smartsheet REST API with `fetch`, token in env var `SMARTSHEET_TOKEN` (set with `npx convex env set SMARTSHEET_TOKEN ...`, never commit it):
   - read: `GET https://api.smartsheet.com/2.0/sheets/{id}?pageSize=5000`
   - add: `POST https://api.smartsheet.com/2.0/sheets/{id}/rows`
   - update: `PUT https://api.smartsheet.com/2.0/sheets/{id}/rows`
   - delete: `DELETE https://api.smartsheet.com/2.0/sheets/{id}/rows?ids=1,2,3`
   - header `Authorization: Bearer ${process.env.SMARTSHEET_TOKEN}`. Keep the same function signatures (`readSheet`, `addRows`, `updateRows`, `deleteRows`) so nothing else changes. Then delete `convex/viktorTools.ts`.
2. **Remove Viktor auth.** Public apps (events, directory): delete `convex/viktorMembership.ts`, `viktorSpaceAuthConfig.ts`, `viktorSpaceAuthEnv.ts`, `viktorEdgeHandoffAuth.ts`, `spaceSessionAuth.ts`, `ViktorSpacesEmail.ts`, `src/lib/viktor-spaces-access/`, `src/components/ViktorAutoSignIn.tsx`, `SpaceSessionAutoSignIn.tsx`, `src/pages/ViktorOAuthCallbackPage.tsx`, `src/auth/` and their imports/routes, and `viktor.space.json`/`viktor.template.json`. Desk: same removal, but replace with another login (Convex Auth password provider, Clerk, or a simple shared password) since it must stay private.
3. **Desk AI.** Replace the `ai_structured_output` calls in `scoop-desk/convex/stories.ts` and `convex/sections.ts` with another LLM API (OpenAI, Anthropic, xAI/Grok…) using JSON output. Needs its own API key (`LLM_API_KEY` env var) and may cost money.
4. **Desk beehiiv.** Replace `mcp_pd_beehiiv_proxy_post` in `scoop-desk/convex/sections.ts` with a direct `fetch` to beehiiv API v2 (`Authorization: Bearer ${process.env.BEEHIIV_API_KEY}`), same URL/publication/template, keep `blocks` (not `body_content`) and status draft.
5. **Hosting (free options).** Frontend: Vercel, Netlify or Cloudflare Pages (`bun run build`, output `dist/`, set `VITE_CONVEX_URL`). Backend: Convex free tier (`npx convex deploy`), or port the few functions to serverless functions on the same host.

Files to change, per app:
- **events-calendar:** `convex/sheetsGateway.ts`, `convex/viktorTools.ts` (delete), Viktor auth files listed above.
- **directory:** `convex/sheetsGateway.ts`, `convex/viktorTools.ts` (delete), Viktor auth files. Keep `public/assets/ig`.
- **scoop-desk:** `convex/sheetsGateway.ts`, `convex/viktorTools.ts`, `convex/stories.ts`, `convex/sections.ts`, `convex/access.ts` + `convex/lib/access.ts` (membership), Viktor auth files, new login.

## ops/
Operating docs and scripts copied from the Viktor workspace: `grok-prompt.md` (manual), `radar/` (event-finding method, cron prompt, scripts), `issues/` (Scottsdale model, first issue and build scripts), `guides/issue-workflow.md`, `desk/v2/how-to.md`, `smartsheet/migration.md`, `growth/` (share pack, Instagram kit), `directory/seo-options.md`, `beehiiv/home-buttons.md`.

## Secrets
No secrets are in this repo. `.env*` files (except `.env.example`) are excluded. Put tokens in Convex/hosting env vars only.

## Hosting off Viktor (branch `migrate/off-viktor`)
Each app is its own Cloudflare Pages project (root dir = app folder) backed by its own Convex free project.
- Build command: `npx convex deploy --cmd 'bun run build'` · Output: `dist` · Pages env: `CONVEX_DEPLOY_KEY`, `NODE_VERSION=22`.
- Convex env (`npx convex env set`): all apps `SMARTSHEET_TOKEN`; Desk also `BEEHIIV_API_KEY`, `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` (run `npx @convex-dev/auth` once), optional `DESK_ALLOWED_EMAILS`.
- Optional Pages env for cross-links once new URLs exist: `VITE_EVENTS_URL`, `VITE_DIRECTORY_URL`.
- The Desk has no AI drafting: paste finished copy into a section and approve it. beehiiv drafts are created with a direct API call (status draft only).
