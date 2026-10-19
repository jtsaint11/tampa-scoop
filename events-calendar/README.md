# Convex + Vite + React + Tailwind Starter

A production-ready full-stack web app template. Base UI supplies headless interaction components. Small helpers in `src/ui/` share semantics and interaction setup; `src/components/controlStyles.ts` shares the starter's button and input styles. Evolve these app styles, tokens, and `DESIGN.md` for each project.

`init_app_project(template="application")` keeps this application scaffold (the default).
`template="slideshow"` materializes a standalone presentation from `templates/slideshow/`,
plus an explicit allowlist of platform auth and build files. It includes no app shell.
Author slides and notes in `presentation/`; see the generated `SLIDESHOW.md`.

> **Viktor Spaces projects**: Your project is already configured with Convex, auth, and email. Skip to [Adding New Variables](#adding-new-variables) if you need to add integrations.
>
> **Before building UI, read `DESIGN.md`** — the app's design-system manifest.

## Stack

- **Convex** — Real-time backend & database
- **Convex Auth** — Email/password authentication
- **Vite** — Lightning-fast dev server & build
- **React 19** — UI framework
- **Tailwind CSS v4** — CSS-native utility styling with theming
- **Base UI** (`@base-ui/react`) — Headless, accessible components (dialog, menu, switch, select, …) you style yourself; one tree-shaken package
- **react-hook-form + zod** — Form state & validation
- **Biome** — Fast linter & formatter (replaces ESLint + Prettier)
- **TypeScript** — Full type safety
- **Bun** — Fast package manager & runtime

**Convex includes**: real-time subscriptions, ACID transactions, file storage, full-text & vector search, scheduled functions, HTTP endpoints, and automatic caching. See [Convex docs](https://docs.convex.dev/) for details.

## Quick Start

Your project is already set up. To start developing:

```bash
# Start Convex backend (watches for changes)
bunx convex dev

# In another terminal, start frontend
bun run dev
```

### For Agents / CI (No Background Terminals)

If you can't run background processes, use these one-shot commands:

```bash
# Push Convex functions once (no watching)
bun run sync

# Push Convex + build frontend in one command (most important one)
bun run sync:build

# Fetch recent backend logs afterwards (exits after 5s)
bun run logs:fetch
```

The `sync` command uses `convex dev --once` which pushes your functions and exits immediately. Use `bun run logs:fetch` to get recent backend logs (console.log, errors, function executions) — it fetches logs and exits after 5 seconds.

### Running E2E Tests

To run Playwright e2e tests after building:

```bash
# 1. Build the app
bun run sync:build

# 2. Run your test (starts preview server automatically)
bun run test scripts/demo-test.ts

# Or run multiple tests
bun run test scripts/test-feature1.ts scripts/test-feature2.ts
```

The `test` command handles the Vite server lifecycle automatically:
1. Starts `vite preview` (serves built frontend files on port 4173)
2. Waits for server to be ready
3. Runs your test with `APP_URL` set correctly
4. Stops the Vite server when done

Note: The Convex backend is always running in the cloud after running the sync command — only the frontend server needs to be started locally.

Your app is automatically built and deployed when you use the deploy tool.

### Taking Screenshots

```bash
# After building
bun run sync:build

# Screenshot the landing page (default)
bun run screenshot

# Screenshot a specific page with custom filename
bun run screenshot /dashboard dashboard.png
bun run screenshot /settings settings.png
```

The `screenshot` command also starts the Vite preview server automatically.

### Design Review

After building UI (and after `bun run sync:build`), generate review artifacts:

```bash
bun run design:review                # default: /, /dashboard, /settings
bun run design:review / /pricing     # explicit routes
```

Writes to `tmp/design-review/latest/`: full-page screenshots of every route at mobile/tablet/desktop/desktop-dark, a stitched `contact-sheet.png`, and `report.md`/`report.json` with deterministic checks — horizontal overflow, axe WCAG A/AA violations (serious/critical block), console errors, hardcoded hex colors outside `src/index.css`, and a warning while typography is still the neutral baseline. Exits non-zero on blocking issues.

The checks are the floor, not the goal: **look at the contact sheet** and judge it against `DESIGN.md` — direction carried on every screen, both themes coherent, nothing generic.

### Troubleshooting

**WebSocket errors with `convex env`**: If you see connection errors, read `.env.local` directly:
```bash
grep VITE_CONVEX_URL .env.local
```

## Scripts

| Command                            | Description                                    |
| ---------------------------------- | ---------------------------------------------- |
| `bun run dev`                      | Start Vite dev server                          |
| `bun run build`                    | Build for production                           |
| `bun run sync`                     | Push Convex functions once (no watching)       |
| `bun run sync:build`               | Push Convex + build frontend in one command    |
| `bun run test <file>`              | Run e2e test (starts server, runs test, stops) |
| `bun run logs`                     | Tail Convex backend logs (streaming)           |
| `bun run logs:fetch`               | Fetch recent logs and exit (agent-friendly)    |
| `bun run check`                    | Lint + format check with Biome                 |
| `bun run format`                   | Format & fix with Biome                        |
| `bun run lint`                     | Lint only with Biome                           |
| `bun run typecheck`                | Type check with TypeScript (no emit)           |
| `bun run screenshot [path] [name]` | Take screenshot of a page                      |
| `bun run design:review [routes…]`  | Render key routes at 4 viewports → contact sheet + checks |
| `bun run test:auth`                | Set up test user authentication                |
| `bun run test:demo`                | Run demo test with test user                   |

## Project Structure

```
├── DESIGN.md            # Design-system manifest — read before building UI
├── convex/              # Backend
│   ├── auth.ts          # Auth config & currentUser query
│   ├── users.ts         # User mutations (deleteAccount)
│   ├── http.ts          # HTTP routes
│   └── schema.ts        # Database schema
├── src/
│   ├── ui/              # Small, almost headless helpers (Button, Card, Menu, …)
│   ├── components/
│   │   ├── controlStyles.ts # Shared starter styles — customize once for the app
│   │   ├── AppLayout.tsx     # Authenticated pages layout (with sidebar)
│   │   ├── AppSidebar.tsx    # Sidebar navigation for authenticated users
│   │   ├── Header.tsx        # Public pages header
│   │   ├── PublicLayout.tsx  # Public pages layout (landing, login, signup)
│   │   ├── ProtectedRoute.tsx # Auth guard with loading skeleton
│   │   ├── ViktorAutoSignIn.tsx # Gated arrivals: stored session → edge hand-off → OAuth
│   │   ├── SignIn.tsx        # Sign in form
│   │   ├── SignUp.tsx        # Sign up form
│   │   └── Toaster.tsx       # Themed toast notifications (Sonner)
│   ├── auth/            # Route strategies, OAuth return detection, edge hand-off cookie
│   ├── pages/           # Page components
│   ├── contexts/        # ThemeContext (with system preference support)
│   ├── hooks/           # use-mobile, usePersistFn, useComposition
│   ├── lib/             # cn() utility
│   ├── App.tsx          # Main app with routes & providers
│   └── index.css        # Design tokens (colors + typography CSS variables)
├── biome.json           # Biome config (linting + formatting)
└── package.json
```

**Path alias**: Use `@/` for clean imports:

```tsx
import { Button, Card, Dialog } from "@/ui";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
```

## Customizing This Starter

This template is designed to be easily customized. Here's how to make it your own:

### 1. Adjust the Design (CSS Variables)

All colors, spacing, and visual tokens are defined in `src/index.css`. Change these to match your brand:

```css
:root {
  /* Primary colors */
  --primary: var(--color-slate-900);     /* Main action color (dark, modern) */
  --primary-foreground: var(--color-white);

  /* Semantic colors */
  --success: var(--color-emerald-600);
  --warning: var(--color-amber-500);
  --info: var(--color-cyan-500);

  /* Chart/accent colors (for stats, icons, highlights) */
  --chart-1: var(--color-teal-500);
  --chart-2: var(--color-orange-500);
  --chart-3: var(--color-cyan-500);
  --chart-4: var(--color-rose-500);
  --chart-5: var(--color-lime-500);

  /* Sidebar */
  --sidebar-width: 16rem;

  --radius: 0.625rem;                    /* Border radius */
  /* ... other tokens */
}
```

Changes here automatically apply to all pages and components.

### 2. Customize Shared Layouts

The project uses shared layout components for consistency:

| Component      | Purpose                                          | Location                          |
| -------------- | ------------------------------------------------ | --------------------------------- |
| `Header`       | Navigation header for public pages               | `src/components/Header.tsx`       |
| `PublicLayout` | Layout for public pages (landing, login, signup) | `src/components/PublicLayout.tsx` |
| `AppLayout`    | Layout for authenticated pages (with sidebar)    | `src/components/AppLayout.tsx`    |
| `AppSidebar`   | Sidebar navigation for authenticated users       | `src/components/AppSidebar.tsx`   |

**Navigation patterns:**
- **Public pages** use `PublicLayout` with a top header
- **Authenticated pages** use `AppLayout` with a fixed sidebar
- On mobile, the sidebar becomes a slide-out drawer (Base UI Dialog)

**To change the app name** — update `APP_NAME` in these files:
- `src/lib/constants.ts` — used by `Header.tsx` and `AppSidebar.tsx`
- `convex/constants.ts` — used by email templates in `ViktorSpacesEmail.ts`
- `index.html` — the `<title>` tag (static HTML, must be updated manually)

### 3. Remove Unused Pages

Delete pages you don't need from `src/pages/` and remove their routes from `src/App.tsx`:

```tsx
// src/App.tsx — remove routes you don't need
<Route path="/settings" element={<SettingsPage />} />
```

### 4. Design Your Pages

Read `DESIGN.md` first — it is the design-system manifest. Design pages using:

- **Small `src/ui/` primitives** — reuse semantics, focus states, and Base UI composition. They leave palette, dimensions, border, radius, and shadow to the app.
- **Shared app styles** — customize `src/components/controlStyles.ts` once for repeated buttons and inputs; e.g. `<Button className={controlStyles.primaryButton}>Save</Button>`. Use `cn()` for overrides. Share repeated patterns to save generation and editing tokens; keep new abstractions small and driven by actual use.
- **Base UI for new behavior** — when you need a select, tooltip, popover, tabs, etc., import the part from `@base-ui/react/<component>`, compose it where needed and style it from the app tokens (see "Pulling more headless components" in `DESIGN.md`).
- **Tailwind utilities** — for layout and page-specific styling; share repeated app patterns in `src/components/`
- **CSS variables** — colors and fonts automatically match your theme

## Features

### 🎨 Theming

Full light/dark mode support with OKLCH colors and system preference detection:

```tsx
import { useTheme } from "@/contexts/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable) return null;
  return <button onClick={toggleTheme}>{theme}</button>;
}
```

**Theme options in `App.tsx`:**
```tsx
// Use system preference (default)
<ThemeProvider defaultTheme="system" switchable>

// Force light or dark
<ThemeProvider defaultTheme="light" switchable>
<ThemeProvider defaultTheme="dark" switchable>

// Follow system, no toggle
<ThemeProvider defaultTheme="system" switchable={false}>
```

**Priority:** User's saved preference (localStorage) → System preference → Fallback

Customize colors in `src/index.css`:
- `--primary`, `--secondary`, `--accent`, `--destructive`
- `--success`, `--warning`, `--info` (semantic colors)
- `--chart-1` through `--chart-5` (accent colors for stats, icons)
- `--background`, `--foreground`, `--muted`, `--card`
- `--sidebar-*` (sidebar-specific colors)
- `--radius` for border radius

### 🧱 Built-in Features

- **Design system baseline** — `DESIGN.md` manifest, tokens in `src/index.css` (colors + typography), and optional, almost headless `src/ui/` helpers
- **Base UI** — the whole `@base-ui/react` package is installed (tree-shaken); import any of its ~35 headless components on demand
- **Responsive hook** — `useIsMobile()` returns true when viewport < 768px
- **Toast notifications** — `toast.success("Saved!")` / `toast.error("Failed")` via Sonner
- **Error boundary** — app-level error catching

### 🛠️ Utility Hooks

| Hook                      | Purpose                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useIsMobile()`           | Returns `true` when viewport < 768px. Reactive to window resize.                                                                                      |
| `usePersistFn(fn)`        | Returns a stable function reference that always calls the latest `fn`. Like `useCallback` but never stale.                                            |
| `useComposition(options)` | Handles IME composition for CJK language input. Blocks Enter/Escape during character composition to prevent accidental form submits or dialog closes. |

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { usePersistFn } from "@/hooks/usePersistFn";
import { useComposition } from "@/hooks/useComposition";
```

## Environment Variables

Your project comes **pre-configured** with all required environment variables. You only need to add new ones when integrating additional services.

### What's Already Set Up

**Local file** (`.env.local`) — already exists, don't modify:
- `CONVEX_DEPLOY_KEY` — Authenticates CLI with your deployment
- `VITE_CONVEX_URL` — Frontend connects to your Convex backend

**Convex deployment** — already configured:
- `AUTH_PRIVATE_KEY` — For Convex Auth JWT signing
- `SITE_URL` — Your app's URL for auth redirects
- `VIKTOR_SPACES_*` — Email sending configuration
- `VIKTOR_SPACES_AUTH_JWT_DURATION_MS` — optional. Lifetime of the Convex Auth JWT in
  milliseconds; defaults to 7 days (`convex/viktorSpaceAuthEnv.ts`). A member returning
  within that window is authenticated by the WebSocket handshake alone instead of a refresh
  round trip; the trade-off is that a sign-out elsewhere reaches an already-open tab only
  when its JWT expires. Must not exceed the 30-day session.

**Deploy build only** — set by Viktor when it builds your app, not in `.env.local`:
- `VITE_VIKTOR_SPACES_ENVIRONMENT` — `preview` or `production`. A preview build shows the
  "Viktor Space preview" badge in the bottom-right corner, which warns visitors not to put real
  information into a preview.

### Adding New Variables

When integrating a new service (e.g., OpenAI, Stripe):

```bash
# Set on Convex deployment (takes effect immediately)
bunx convex env set OPENAI_API_KEY "sk-..."
bunx convex env set STRIPE_SECRET_KEY "sk_live_..."
```

Then use in your Convex functions:

```ts
const apiKey = process.env.OPENAI_API_KEY;
```

**Note**: Runtime vars must be set via CLI — they are NOT read from `.env.local`.

### CLI Commands

```bash
# List all env vars on deployment
bunx convex env list

# Set a variable (takes effect immediately, no redeploy needed)
bunx convex env set API_KEY "your-api-key"

# Get a specific variable
bunx convex env get API_KEY

# Remove a variable
bunx convex env remove API_KEY
```

### Adding New Integrations

When your code needs a new API key:

1. **Set on Convex deployment** (takes effect immediately):
   ```bash
   bunx convex env set OPENAI_API_KEY "sk-..."
   ```

2. **Use in your Convex functions**:
   ```ts
   const apiKey = process.env.OPENAI_API_KEY;
   ```

No redeploy needed — env var changes take effect immediately.

## Deploy Descriptor (`viktor.space.json`)

`viktor.space.json` at the project root is the single source of truth for platform-level deploy configuration. The Viktor deploy pipeline reads and validates it on every deploy.

```json
{
  "version": 1,
  "auth": {
    "mode": "authenticated",
    "providers": ["email_password"]
  }
}
```

### `auth.mode`

Controls whether this app has user accounts. It says nothing about who can reach the deployed URL — that (gating) is enforced by the Viktor platform in front of the app and configured outside this project.

| Value | Meaning |
| --- | --- |
| `"public"` | No user accounts; no sign-up/sign-in routes |
| `"authenticated"` | Convex Auth accounts using the providers declared in `auth.providers` |

For authenticated apps, `auth.providers` may be `["email_password"]`, `["viktor"]`, or both. If omitted, the deploy pipeline defaults to both providers.

Notes:

- Changes take effect on the **next deploy**, per environment.
- An invalid or unparseable descriptor falls back to the platform default (with a warning in the deploy logs) — it never blocks a deploy.
- Do not delete this file or put secrets in it.

### Generated Manifest (`__viktor_meta.json`)

On every deploy the pipeline stamps a **public** manifest into the build output, served at `https://<app-url>/__viktor_meta.json`:

```json
{
  "version": 1,
  "auth_mode": "authenticated",
  "auth_providers": ["email_password"],
  "environment": "production",
  "space_id": "…",
  "deployed_at": "2026-06-11T10:00:00+00:00"
}
```

It records the *effective* config the deployment was actually built with (the Viktor dashboard reads it to display the app's auth mode). It is generated — never create or edit it by hand, and don't place files at that path in `public/`. The SPA rewrite in `vercel.json` deliberately excludes it so it's always served as JSON.

## Protecting Convex Functions

Authentication is enforced inside each Convex function, not by `auth.mode`, a
frontend route guard, or the Viktor edge access gate. In authenticated Spaces,
define app-facing functions with `authenticatedQuery`,
`authenticatedMutation`, and `authenticatedAction` from `convex/functions.ts`.
They reject anonymous calls to the public Convex API and add the verified
Convex Auth user ID to `ctx.userId`.

Use raw `query`, `mutation`, and `action` builders only for deliberately public
endpoints. Use `internalQuery`, `internalMutation`, and `internalAction` for
server-only work. Authentication identifies the caller; every function must
still verify that `ctx.userId` may access or modify the requested record.

## Reading the Current User in the Frontend

### `auth.mode: authenticated` — use the Convex query

Every signed-in user has a Convex Auth session and a row in the `users` table, whether they signed in with email + password or with "Sign in with Viktor":

```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const user = useQuery(api.auth.currentUser);
```

### `auth.mode: public`

There is no user.

## Auth Flows

This starter includes complete email/password authentication with OTP verification, plus one-click "Sign in with Viktor" for members of the Viktor workspace that owns the app.

### Sign in with Viktor

The login and signup pages render a "Sign in with Viktor" button (`src/components/ViktorSignInSection.tsx`) whenever the Viktor OAuth client config is present. Clicking it runs a standard OAuth round trip against the Viktor platform via Convex Auth's `signIn("viktor", ...)`:

```
1. User clicks "Sign in with Viktor"
2. Redirects through Viktor's OAuth server (members of the owning
   workspace with a live Viktor session complete this invisibly)
3. Account is created automatically on first sign-in (linked by email to
   an existing password account if one exists)
4. Back in the app, signed in — the stored Convex Auth session keeps them
   signed in on future visits
```

People outside the owning workspace are denied by the Viktor server (no code is ever issued) and land back on the login page with a hint to use email and password.

The provider is registered in `convex/viktorSpaceAuthConfig.ts` from the deployment env (`VIKTOR_AUTH_CLIENT_ID`, `VIKTOR_AUTH_RESOURCE_ID`, `VIKTOR_AUTH_BASE_URL`); the OAuth config itself lives in `src/lib/viktor-spaces-access/authjs.ts`. Don't hand-roll OAuth code — Convex Auth handles redirects, PKCE, state, and the code exchange. The companion `viktor_edge_handoff` provider (`convex/viktorEdgeHandoffAuth.ts`, registered alongside) signs members who arrive through the Viktor edge gate into the same accounts without the round trip — see the auto sign-in section below.

### Automatic sign-in intent param (`?viktor_sign_in=auto`)

Links to this app may carry `?viktor_sign_in=auto` (Viktor appends it to links it shares with workspace members, and the Viktor edge gate appends it when it lets a verified member through). `src/components/ViktorAutoSignIn.tsx` honors it without a button click, cheapest path first:

1. **A stored session exists** — the visitor is taken straight into the app.
2. **The edge gate handed over a sign-in token** — when a member reaches the app through the Viktor edge gate, the gate has just verified them with Viktor and puts a short-lived, single-use Viktor space session token in a host-only cookie (`__Host-viktor_space_handoff`). `src/auth/edgeHandoff.ts` reads and clears it at module load, and the `viktor_edge_handoff` Convex Auth provider (`convex/viktorEdgeHandoffAuth.ts`) trades it for the app's own session with **one server-side call** (`POST /api/viktor-auth/session`, which validates and then revokes the token). No navigation, no second OAuth round trip; the visitor lands on the page they opened (deep links included). It signs into the same account "Sign in with Viktor" would.
3. **Otherwise** — the "Sign in with Viktor" OAuth round trip starts automatically, invisible for workspace members with a live Viktor session. It fires at most once per page load, never while a recent attempt is in flight, and the return leg's URL never carries the param, so a denial ends on the login page with the failure message (`?viktor_sign_in=failed`) instead of retrying.

The param is spent on arrival: `src/auth/autoSignInIntent.ts` reads it once at module load and removes it from the address bar (`history.replaceState`), the same way `edgeHandoff.ts` consumes its cookie. Whichever path above runs — or none, because Viktor sign-in is not configured or an attempt is already in flight — the URL the visitor reloads, bookmarks or copies no longer asks for a sign-in. That module is imported for its side effect from `src/auth/AuthStrategyRoutes.tsx`, in the entry chunk, so it runs before the router mounts: React Router only listens for `popstate`, so a strip from a lazy auth chunk would come too late for `useLocation` and the embed bridge, which would keep mirroring the spent param to the dashboard. Keep that import where it is.

While any of this is in progress the page shows a neutral "Signing you in..." screen instead of the login form, so a gated arrival never sees a sign-in page flash. That includes the moment right after the hand-off exchange resolves: the client holds the new tokens, but `useConvexAuth` only reports the session once the server has confirmed them, and the route guard would treat the visitor as anonymous until then. The overlay stays up and the navigation to the opened page waits for the confirmed session (bounded by the same grace timer as the session restore). The param and the cookie are generated by Viktor — the app never appends or sets them itself.

### Sign Up Flow

```
1. User enters name + email + password
2. Clicks "Sign Up" → OTP code sent to email
3. User enters 6-digit code
4. Account created + signed in
```

### Sign In Flow

```
1. User enters email + password
2. Clicks "Sign In" → Authenticated
```

### Password Reset Flow

```
1. Click "Forgot password?"
2. Enter email → Reset code sent
3. Enter code → Set new password
4. Signed in with new password
```

### E2E Test Login

`runTest()` signs the browser in automatically before your test runs. It uses a
short-lived Viktor space session that the backend mints and the app exchanges
for a Convex Auth session through the `space_session` provider. There is no test
credential and no login form to drive, so it works the same way for every auth
provider config. The session is revoked when the test finishes.

`runTest()` for e2e tests signs in automatically:

```ts
import { runTest } from "./scripts/auth";

runTest("My Feature Test", async helper => {
  const { page } = helper;
  // Already authenticated, starts on /
  await helper.goto("/dashboard");
  await page.waitForTimeout(1500);  // Wait for Convex to sync
  await page.click("button");
  await page.waitForTimeout(1500);
  await helper.screenshot("my-feature.png");
}).catch(() => process.exit(1));
```

**Tip**: Add short waits (1-2 seconds) between steps. Convex real-time updates and page loads can take a moment, which often causes flaky tests without delays.

On failure, you'll see error screenshots, page content, console logs, and backend logs automatically.

### Customizing Auth

Email templates are in `convex/ViktorSpacesEmail.ts`.

### Internal Apps (Domain Restriction)

For internal apps, YOU HAVE TO restrict signups to the user's company Slack email domain. Extract the allowed domain from the user's Slack email address (do not assume email address by other context. you have to get the list of all email addresses to find all the dmoans from them by listing all the users in the company Slack workspace via your tool) and modify `convex/ViktorSpacesEmail.ts`:

```ts
const ALLOWED_DOMAINS = ["yourcompany.com"]; // Use your Slack workspace email domains

export const ViktorSpacesEmail: EmailConfig = {
  async sendVerificationRequest({ identifier: email }) {
    const domain = email.split("@")[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      throw new Error("Only company email addresses are allowed");
    }
    // ... rest of the email sending logic
  },
  // ...
};
```

This check runs before the OTP email is sent, so unauthorized domains are rejected immediately during signup.

## HTTP Endpoints

Create API routes in `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Webhook endpoint
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();

    // Call a mutation to process the webhook
    try {
      await ctx.runMutation(internal.payments.handleWebhook, {
        event: body
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: message }, { status: 500 });
    }

    return new Response("OK", { status: 200 });
  }),
});

// Public API endpoint
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return Response.json({ status: "ok" });
  }),
});

export default http;
```

**Note**: Paths are exact (no wildcards). Endpoint URL: `https://your-deployment.convex.site/webhooks/stripe`

An error that escapes an `httpAction` reaches the caller as a bare 500 (production redacts the message to `Server Error`), so a script or cron posting to the route cannot report what went wrong. Catch errors from `ctx.runMutation` / `ctx.runQuery` and return them the conventional way, as above: the HTTP status says whether the call succeeded, and a failure body is `{ "error": "<message>" }`. A route that stores data is also bound by the Convex Cheatsheet's "Per-Function Limits": a payload that grows with the dataset goes through several bounded mutation calls, not one.

## Viktor Tools Integration

This template includes `convex/viktorTools.ts` which lets your app call Viktor's SDK functions (AI search, image generation, etc.) from Convex actions.

### Using the Included Tools

```tsx
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function SearchComponent() {
  const search = useAction(api.viktorTools.quickAiSearch);

  const handleSearch = async () => {
    const result = await search({ query: "What is the capital of France?" });
    console.log(result); // Returns the AI summary directly as a string
  };
}
```

### Adding More Tools

To add a new tool, first test it to see the response shape, then create a typed wrapper in `convex/viktorTools.ts`. Any tool from the SDK is available to be added. If you need new functionality, pls check the SDK what is available there. It has tons of usefull stuff like ai structured output, search api, image generation, etc.

These wrappers spend the app's project secret against the Viktor tool gateway, so define them with `authenticatedAction` — never the raw `action` builder — or an anonymous caller of the public Convex API can run your tools and integrations for free.

```ts
import { authenticatedAction } from "./functions";

export const generateImage = authenticatedAction({
  args: { prompt: v.string() },
  returns: v.string(),
  handler: async (_ctx, { prompt }) => {
    const result = await callTool<{ response_text: string }>("text2im", { prompt });
    return result.response_text;
  },
});
```

## 🎨 Design Guide

### Design Principles

When generating frontend UI, avoid generic patterns that lack visual distinction:

- **Avoid generic full-page centered layouts** — prefer asymmetric/sidebar/grid structures for landing pages and dashboards
- **Match navigation to app type** — use sidebar patterns for internal tools/dashboards, but design custom navigation (top nav, contextual nav) for public-facing apps (forums, communities, e-commerce)
- **Make creative design decisions** — when requirements are vague, choose specific color palettes, typography, and layout approaches
- **Prioritize visual diversity** — combine different design systems (e.g., one color scheme + different typography + another layout principle)
- **Landing pages** — prefer asymmetric layouts, specific color values (not just "blue"), and textured backgrounds over flat colors
- **Dashboards** — use defined spacing systems, soft shadows over borders, and accent colors for hierarchy

### UI & Styling

- **Evolve the design system first** — update `DESIGN.md` and the tokens in `src/index.css` (fonts, palette, radius) before styling pages; surface styles read these semantic tokens
- **Use Base UI for behavior** — dialogs, menus, switches, selects, tooltips, popovers: import from `@base-ui/react/<component>`, style every part with Tailwind (state via `data-open`, `data-highlighted`, `data-checked`; animation via `data-starting-style` / `data-ending-style`)
- **Build forms with react-hook-form + zod** for anything beyond a couple of fields; simple forms can use plain `FormData`
- **Preserve design tokens** — keep the `@layer base` rules in `src/index.css`. Utilities like `border-border` and `font-sans` depend on them
- **Consistent design language** — use spacing, radius, shadows, and typography via tokens. Share app patterns in `src/components/`; keep `src/ui/` focused on reusable primitives
- **Accessibility and responsiveness** — keep visible focus rings and ensure keyboard reachability; design mobile-first with thoughtful breakpoints
- **Theming** — choose dark/light theme in `ThemeProvider`, then manage color palette with CSS variables in `src/index.css`
- **Micro-interactions and empty states** — add motion, empty states, and icons tastefully to improve quality without distraction
- **Placeholder UI elements** — when adding placeholders for not-yet-implemented features, show toast on click ("Feature coming soon")

### Customized Defaults

This template customizes some Tailwind defaults for simplified usage:

| Customization              | Behavior                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.container`               | Auto-centered with responsive padding (see `index.css`). Use directly without `mx-auto`/`px-*`. For custom widths, use `max-w-*` with `mx-auto px-4` |
| `.flex`                    | Has `min-width: 0` and `min-height: 0` by default                                                                                                    |


## Convex Cheatsheet

**Queries** = read data (cached, reactive, real-time). **Mutations** = write data (transactional, atomic). **Actions** = side effects (external APIs, no direct DB access).

Quick reference for common gotchas:

### Function Syntax

**Always include `returns` validator** (use `v.null()` for void functions):

```ts
import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./functions";

export const getMyProfile = authenticatedQuery({
  args: {},
  returns: v.union(
    v.object({ name: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async ctx => {
    const user = await ctx.db.get(ctx.userId);
    return user ? { name: user.name } : null;
  },
});

export const removeMyImage = authenticatedMutation({
  args: {},
  returns: v.null(), // Required even when returning nothing
  handler: async ctx => {
    await ctx.db.patch(ctx.userId, {
      imageId: undefined,
      image: undefined,
    });
    return null;
  },
});
```

### Public vs Internal Functions

```ts
// Authenticated public endpoints (preferred for authenticated Spaces)
import {
  authenticatedQuery,
  authenticatedMutation,
  authenticatedAction,
} from "./functions";

// Deliberately public endpoints (callable without signing in)
import { query, mutation, action } from "./_generated/server";

// Internal (only callable from other Convex functions)
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
```

### Calling Functions

```ts
import { api, internal } from "./_generated/api";

// From mutation/action:
await ctx.runQuery(api.users.get, { id });        // public query
await ctx.runQuery(internal.users.getInternal, { id }); // internal query
await ctx.runMutation(internal.users.update, { id, name });

// Same-file calls need type annotation:
const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
```

### Queries

```ts
// ❌ Don't use filter()
const users = await ctx.db.query("users").filter(q => q.eq(q.field("email"), email));

// ✅ Use withIndex() (define index in schema first)
const users = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email));

// ❌ No .delete() on queries
await ctx.db.query("users").delete();

// ✅ Collect and delete individually
const users = await ctx.db.query("users").collect();
for (const user of users) {
  await ctx.db.delete(user._id);
}

// Get single document
const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).unique();
```

### Per-Function Limits

Convex enforces hard limits on every single query or mutation execution and on every document ([full list](https://docs.convex.dev/production/state/limits)). Hitting one throws with no partial success, and a function whose reads or writes grow with the dataset will hit one eventually even though it works on the first day.

| Limit (per query/mutation execution) | Value |
| --- | --- |
| `ctx.db.get` + `ctx.db.query` calls | 4,096 |
| Documents scanned | 32,000 |
| Data read / data written | 16 MiB each |
| Documents written | 16,000 |
| Function arguments / return value | 16 MiB |
| User code execution time | 1 second |

| Limit (per document, and per nested object) | Value |
| --- | --- |
| Size | 1 MiB |
| Fields | 1,024 |
| Array elements | 8,192 |

Size functions for the data the app will hold, not the sample it starts with:

- Keep one row per document; never keep a map or array keyed by an unbounded set (all users, all days) in one document.
- A batch write (import, sync, ingest route) goes through mutations of a bounded number of rows each (a few hundred at most), driven by an action or by the caller; a final small mutation switches readers over so a partially written batch is never visible.
- Loops that call `.get()` / `.unique()` per row, or `.collect()` over a whole table, are for tables whose size does not grow with usage; otherwise read an index range with `.paginate()` or `.take(n)`, and keep the totals a page needs in a summary document that the writing mutation updates.

### Schema

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  })
    .index("by_email", ["email"])           // Name = "by_" + field names
    .index("by_role_and_name", ["role", "name"]), // Multi-field index
});
```

**Note**: Every document automatically has `_id` and `_creationTime` fields. Don't define these in your schema. Also, `_creationTime` is auto-appended to all indexes — don't include it explicitly or you'll get an error.

### Actions

```ts
// Actions can't access ctx.db directly
export const sendEmail = internalAction({
  args: { userId: v.id("users"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // ❌ ctx.db.get(args.userId) - doesn't work in actions

    // ✅ Call a query to get data
    const user = await ctx.runQuery(internal.users.get, { id: args.userId });

    await fetch("https://api.email.com/send", { ... });
    return null;
  },
});
```

### Types

```ts
import { Id, Doc } from "./_generated/dataModel";

// Typed IDs
function getUser(userId: Id<"users">) { ... }

// Full document type
function formatUser(user: Doc<"users">) { ... }

// Record with ID keys
const cache: Record<Id<"users">, string> = {};
```

### Validators Reference

| Type     | Validator                          | Example               |
| -------- | ---------------------------------- | --------------------- |
| String   | `v.string()`                       | `"hello"`             |
| Number   | `v.number()`                       | `42`, `3.14`          |
| Boolean  | `v.boolean()`                      | `true`                |
| Null     | `v.null()`                         | `null`                |
| ID       | `v.id("tableName")`                | `"jh7..."`            |
| Array    | `v.array(v.string())`              | `["a", "b"]`          |
| Object   | `v.object({ name: v.string() })`   | `{ name: "Jo" }`      |
| Optional | `v.optional(v.string())`           | `undefined` or `"hi"` |
| Union    | `v.union(v.string(), v.null())`    | `"hi"` or `null`      |
| Literal  | `v.literal("admin")`               | `"admin"`             |
| Record   | `v.record(v.string(), v.number())` | `{ a: 1, b: 2 }`      |

## Design review

Use the shared `frontend_design` skill for the design process; this template uses Base UI for behavior, small almost headless helpers in `src/ui/`, tokens in `src/index.css`, and per-app decisions in `DESIGN.md`. Shared app styles avoid repeating long class lists; customize them to suit the app's direction.

After UI changes, run `bun run sync:build`, then `bun run design:review`. The review renders key routes at mobile, tablet, desktop, and desktop-dark sizes into `tmp/design-review/latest/`. It produces contact sheets, a grayscale sheet, display-type specimen crops, and checks for overflow, contrast, console errors, hardcoded colors, and unchanged baseline typography. Fix blocking issues and rerun. Inspect the screenshots against `DESIGN.md` and each type specimen at full size; automated checks cannot judge the design direction.
