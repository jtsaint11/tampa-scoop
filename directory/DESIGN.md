# Design System

This file is the manifest for this app's design system. It is the source of
truth for visual decisions: read it before building UI, and keep it updated
as the system evolves. The template ships a deliberately neutral baseline —
**it is a starting point, not a look**. Every app should evolve it into its
own design system before shipping product UI.

## Status

Gulf Coast editorial, shared with the sister events calendar (tampa-events) so both read as one brand: Fraunces display over Manrope body, warm sand paper, bay-ink text, bay-teal primary, sunset-coral accent reserved for the "list your business" and quote-request paths. Signature: the three-band sunset stripe. Directory-specific: category tiles with teal icon chips, Claimed (teal) and Featured (coral) badges. Light-only.

When you customize, replace the checklist above with a short statement of the
app's design direction, e.g. "Editorial and calm: Fraunces display over
Inter body, warm paper background, single burgundy accent, hairline borders,
minimal shadows."

## Workspace brand

This file is **app-scoped**. If the Viktor workspace keeps a brand spec at
`/work/brand/DESIGN.md` (tokens for the company's colors, typography, voice,
plus binaries in `/work/brand/assets/`), treat it as the upstream source when
this app should look like the company: derive the app tokens from the brand
tokens, use the exact brand assets, and record the derivation below. Internal
tools may deliberately diverge — note that too. Never edit the workspace brand
spec from inside an app.

## References

Ideate before deciding: name 2–3 real products or sites this audience already
trusts for this kind of interface, extract concrete attributes from each
(palette temperature, type pairing, density, layout structure, one signature
element worth adapting), and record them here. Anchors are for attribute
extraction, never for copying a screen.

| Reference | What it does well | Attributes borrowed |
| --- | --- | --- |
| _none yet_ | | |

## Design decisions

Record the app's decisions here as you make them:

| Decision | Value |
| --- | --- |
| Site vs app surfaces | _e.g. `/` + `/pricing` are site pages (expressive); everything behind login is app (restrained)_ |
| Direction | _neutral baseline_ |
| Display font (`--font-display`) | system stack |
| Body font (`--font-body`) | system stack |
| Contrast pattern | _e.g. saturation: neutral field + one vivid accent_ |
| Palette idea | _slate neutrals, no accent committed_ |
| Radius / shadow language | `0.625rem`, soft shadows |
| Signature element | _none yet — pick one memorable thing_ |

## Where the system lives

| Layer | Location | Rule |
| --- | --- | --- |
| Tokens | `src/index.css` | All colors, fonts, radii live here as CSS variables. Never hardcode palette values (`text-white`, hex codes) in components — always go through semantic tokens (`bg-primary`, `text-muted-foreground`, …). |
| Primitives | `src/ui/` | Small, almost headless helpers for semantics, focus/disabled states, and Base UI composition. Keep helpers that save repeated code; direct Base UI imports are also valid. |
| Shared app styles | `src/components/controlStyles.ts` | Reusable button and input styles for the starter. Customize them once for the app; use `cn()` for local overrides. |
| Behavior | `@base-ui/react` | Headless, accessible components (dialog, menu, switch, and ~35 more). Unstyled by design: you own every pixel. |

## Customizing the system

1. **Typography** (highest leverage): `bun add @fontsource-variable/<family>`,
   import it in `src/main.tsx` (e.g. `import "@fontsource-variable/fraunces";`),
   then set `--font-display` / `--font-body` in `src/index.css`. Distinct
   display and body families give the app a voice immediately.
2. **Color**: pick a contrast pattern first (value, saturation, cold–warm,
   or complementary), build the lightness ladder, then place hue — all
   neutrals on one temperature, soft colors (borders, tints) re-derived from
   the ladder rather than opacity-faded. Then edit the token values in
   `:root` and `.dark` in `src/index.css`. Change the *values*, keep the
   *names* — everything downstream reads the semantic tokens.
3. **Shape and depth**: choose radius, border, shadow, and spacing using the
   tokens. Shared app styles keep repeated controls consistent; surfaces own layout.
4. **Reuse with restraint**: save generation and editing tokens by sharing
   repeated markup, interaction setup, and styles behind small APIs. Keep the
   starter's core small; add app-specific patterns as needed, with styling and
   composition open to change.

## Pulling more headless components on demand

The starter helpers are optional. For interactions such as selects, tooltips,
menus, tabs, accordions, comboboxes, sliders, or toasts:

1. All of Base UI is already installed — one package, tree-shaken. Import the
   part: `import { Select } from "@base-ui/react/select";`
2. Read the component's docs for anatomy and data attributes:
   `https://base-ui.com/react/components/<name>` (each page has a
   "View as Markdown" link — fetch
   `https://base-ui.com/react/components/<name>.md` for the raw version).
   Style states via data attributes: `data-open`, `data-highlighted`,
   `data-checked`, and animate with `data-starting-style` /
   `data-ending-style`.
3. Compose the parts where they are used, with styles from the app tokens.
   Extract a local wrapper only when repetition makes it useful; preserve
   access to Base UI's parts.
4. If Base UI doesn't cover the need, prefer other headless libraries
   (styleable, accessible) over pre-styled component kits — the app's look
   must come from this design system, not from a library's defaults.

## Non-negotiables

- Semantic tokens only in components; raw palette values live in
  `src/index.css` alone.
- Both themes: check every change in light and dark mode.
- Keep focus states visible and keyboard interaction working (Base UI gives
  you this — don't hand-roll popups from divs).
- Responsive from the start; verify mobile and desktop.

## Validating

After UI changes, run `bun run design:review` (see README). It renders the key
routes at four viewports into `tmp/design-review/latest/` — a contact sheet
(plus a grayscale variant) and deterministic checks (overflow, WCAG contrast,
console errors, token discipline). Fix blocking issues, then judge the contact
sheet against this file: does every screen carry the direction recorded above,
and does hierarchy still read on `contact-sheet-gray.png` with color removed?
