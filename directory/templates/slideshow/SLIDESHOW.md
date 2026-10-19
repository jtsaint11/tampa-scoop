# Build your first presentation

This starter turns one Space into one presentation. It includes slide navigation,
speaker notes and a synced display for a second screen. Viktor Spaces handles
sign-in, so you do not need to build a login page or a dashboard.

## 1. Write the slides

Open `presentation/content.ts`. Replace the sample presentation with your title
and slides:

```ts
export const presentation = {
  version: "1",
  title: "Our next release",
  slides: [
    {
      title: "Less setup, more progress",
      body: "Start with the work, not the configuration.",
      notes: ["**Pause** before showing the next slide."],
    },
  ],
};
```

Each slide has a title, body and array of note bullets. Notes support `**bold**`
cues. Keep between 1 and 200 slides, and bump `version` when the content changes.
Create a separate Space for a different presentation.

**Keep this file server-only.** Never import it into a browser component, including
the slide renderer. The server sends slide text and speaker notes separately.
Source notes are workspace-visible: every member who can sign in through the
Space's Viktor OAuth client can start their own session and read them.
`default_access="creator_only"` restricts the hosted URL, not direct OAuth or
Convex access. Display responses omit notes, but this is not a private-note
storage system.

## 2. Give it your style

Edit `presentation/Slide.tsx` for layout and `presentation/slides.css` for fonts,
colors and spacing. The renderer receives `{title, body}` for the current slide,
the presentation title, and its zero-based index and total count. Put non-private
images in `public/`.

The surrounding toolbar has its own Viktor styling in `src/index.css` and
`src/slideshow.css`. You can style the slides without changing those controls.
If you need new slide fields, update the validator in `convex/schema.ts` and the
slide-only response in `convex/presentations.ts` as well.

## 3. Preview your changes

Run `bun run sync:build`, then `bun test`. Use `bun run dev` while editing:
visual changes hot reload; content and notes need `bun run sync` because they
live on the backend. Use `scripts/auth.ts` and `bun run screenshot` for
authenticated screenshots.

Open the Space and sign in with Viktor. It opens the first slide in presenter
view, with notes and controls. This starts an owner-scoped session lasting four hours.
Start a new session after changing content: an existing session keeps its original
content and notes. Renderer and CSS changes are not pinned, so finish visual
edits before a live presentation.

## 4. Present on two screens

Click **Open display** and open that link on the other screen, signed in as the
same user. Advance with the arrow buttons or left/right keys in the controlling
tab. The display follows without receiving speaker notes.

Switching presenter/display view or hiding notes affects only that screen.
Arrow keys work in either view if that tab controls the session. To move control
to another screen, click **Take control** there. Only the session owner can do
this; the previous controller then loses write access and future notes access.
Notes already received cannot be erased from that device.

Refresh keeps the current session and control in the same tab. An independent
visit to the Space starts a separate session instead of joining an existing one,
so share the display link rather than the Space's home URL.

If a screen disconnects, it keeps its last slide until known expiry and catches
up when reconnected. Ending the session or reaching its four-hour limit makes
it unavailable; scheduled cleanup deletes the snapshot.

## What to leave alone

- `src/Presentation.tsx` handles entry, views and commands.
  `convex/presentations.ts` persists sessions and checks owner, controller and
  revision. Neither needs editing for ordinary copy or styling changes.
- Keep `["viktor"]` in `viktor.space.json` for workspace-only sign-in. The shared
  `SpaceSession` boundary handles login, edge handoff and membership rechecks.
  The URL gate alone does not authenticate direct Convex requests.
- Sessions are same-account only, not anonymous audience links or cross-user
  sharing. Preview and production are separate environments.
- Keep `viktor.starter.json`. It stops application-template upgrades from adding
  dashboard/settings files. Automatic upgrades are not supported for this starter;
  port shared platform fixes deliberately.

For sync/security regression testing, `bun run test:e2e` needs an isolated
deployment and two test-account JWTs. It creates and ends sessions, so never run
it against a live talk.
