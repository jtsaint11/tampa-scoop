import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { chromium } from "playwright";
import { api } from "../convex/_generated/api";

// Use isolated test accounts and deployment. This test creates and ends sessions.
const url = process.env.VITE_CONVEX_URL!;
const ownerToken = process.env.SLIDESHOW_TEST_OWNER_TOKEN!;
const otherToken = process.env.SLIDESHOW_TEST_OTHER_TOKEN!;
assert(
  url && ownerToken && otherToken,
  "Set Convex URL and two test-account JWTs",
);
const owner = new ConvexHttpClient(url);
const other = new ConvexHttpClient(url);
const anonymous = new ConvexHttpClient(url);
owner.setAuth(ownerToken);
other.setAuth(otherToken);
const controller = crypto.randomUUID();
const sessionId = await owner.mutation(api.presentations.start, {
  controller,
});
const args = { sessionId, controller, revision: 0, action: "next" as const };
await assert.rejects(
  anonymous.mutation(api.presentations.start, { controller }),
);
await assert.rejects(anonymous.mutation(api.presentations.control, args));
assert.equal(
  await other.query(api.presentations.read, { sessionId, mode: "display" }),
  null,
);
await assert.rejects(other.mutation(api.presentations.control, args));
await assert.rejects(
  owner.mutation(api.presentations.control, { ...args, controller: "wrong" }),
);
const slideOnly = await owner.query(api.presentations.read, {
  sessionId,
  controller,
  mode: "display",
});
assert.equal(slideOnly?.notes, null);
assert(!JSON.stringify(slideOnly).includes("Open**"));
assert(
  (
    await owner.query(api.presentations.read, {
      sessionId,
      controller,
      mode: "present",
    })
  )?.notes,
);
await owner.mutation(api.presentations.control, args);
await assert.rejects(owner.mutation(api.presentations.control, args));
await owner.mutation(api.presentations.control, {
  ...args,
  revision: 1,
  action: "previous",
});
await owner.mutation(api.presentations.control, {
  ...args,
  revision: 2,
  action: "previous",
});
assert.equal(
  (await owner.query(api.presentations.read, { sessionId, mode: "display" }))
    ?.revision,
  2,
);
const concurrent = await Promise.allSettled([
  owner.mutation(api.presentations.control, { ...args, revision: 2 }),
  owner.mutation(api.presentations.control, { ...args, revision: 2 }),
]);
assert.equal(
  concurrent.filter(result => result.status === "fulfilled").length,
  1,
);
await owner.mutation(api.presentations.control, {
  ...args,
  revision: 3,
  action: "end",
});
assert.equal(
  await owner.query(api.presentations.read, { sessionId, mode: "display" }),
  null,
);
await assert.rejects(
  owner.mutation(api.presentations.control, { ...args, revision: 2 }),
);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  headless: true,
});
const appUrl = process.env.APP_URL ?? "http://localhost:4173";
const contexts = await Promise.all([0, 1].map(() => browser.newContext()));
for (const context of contexts) {
  await context.addInitScript(
    ({ token, key }) => localStorage.setItem(key, token),
    {
      token: ownerToken,
      key: `__convexAuthJWT_${url.replace(/[^a-zA-Z0-9]/g, "")}`,
    },
  );
  if (process.env.SLIDESHOW_TEST_REFRESH_TOKEN) {
    await context.addInitScript(
      ({ token, key }) => localStorage.setItem(key, token),
      {
        token: process.env.SLIDESHOW_TEST_REFRESH_TOKEN,
        key: `__convexAuthRefreshToken_${url.replace(/[^a-zA-Z0-9]/g, "")}`,
      },
    );
  }
}
try {
  const presenter = await contexts[0].newPage();
  const display = await contexts[1].newPage();
  const blocked = await contexts[0].newPage();
  await blocked.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "slideshow:storage-check") throw new Error("Storage blocked");
      return original.call(this, key, value);
    };
    Object.assign(window, {
      restoreStorage: () => (Storage.prototype.setItem = original),
    });
  });
  await blocked.goto(appUrl);
  await blocked
    .getByRole("alert")
    .filter({ hasText: "Storage blocked" })
    .waitFor();
  await blocked.evaluate(() => (window as any).restoreStorage());
  await blocked.getByRole("button", { name: "Retry", exact: true }).click();
  await blocked.waitForURL("**/dashboard?session=*&mode=present");
  await blocked.getByRole("button", { name: "End", exact: true }).click();
  await blocked
    .getByRole("heading", { name: "Presentation unavailable" })
    .waitFor();
  await blocked.close();
  let starts = 0;
  presenter.on("websocket", socket => {
    socket.on("framesent", ({ payload }) => {
      const message = JSON.parse(payload.toString());
      if (
        message.type === "Mutation" &&
        message.udfPath === "presentations:start"
      )
        starts++;
    });
  });
  await presenter.goto(appUrl);
  await presenter.waitForURL("**/dashboard?session=*&mode=present");
  assert.equal(
    await presenter
      .getByRole("button", { name: "Present", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await presenter
      .getByRole("heading", { name: "Make your point", exact: true })
      .count(),
    0,
  );
  const link = presenter.getByRole("link", { name: "Open display" });
  await link.waitFor();
  const initialUrl = presenter.url();
  await presenter.reload();
  await link.waitFor();
  assert.equal(presenter.url(), initialUrl);
  assert(
    await presenter
      .getByRole("button", { name: "Next", exact: true })
      .isEnabled(),
  );
  assert.equal(
    starts,
    1,
    "StrictMode and refresh must not create extra sessions",
  );
  const independent = await contexts[0].newPage();
  await independent.goto(`${appUrl}/dashboard`);
  await independent.waitForURL("**/dashboard?session=*&mode=present");
  assert.notEqual(
    new URL(independent.url()).searchParams.get("session"),
    new URL(initialUrl).searchParams.get("session"),
  );
  await independent.getByRole("button", { name: "End", exact: true }).click();
  await independent
    .getByRole("heading", { name: "Presentation unavailable" })
    .waitFor();
  await independent.close();
  const displayUrl = await link.getAttribute("href");
  const resume = await contexts[0].newPage();
  await resume.goto(presenter.url());
  await resume.evaluate(() => {
    sessionStorage.setItem(
      "viktor-spaces:oauth-return",
      location.pathname + location.search,
    );
  });
  await resume.goto(`${appUrl}/auth/callback`);
  await resume.waitForURL(presenter.url());
  await resume.getByRole("heading", { name: "One idea at a time" }).waitFor();
  assert(
    await resume
      .getByRole("button", { name: "Take control", exact: true })
      .isVisible(),
  );
  await resume.close();
  await display.goto(`${appUrl}${displayUrl}`);
  await display.getByRole("heading", { name: "One idea at a time" }).waitFor();
  assert.equal(await display.locator(".slideshow-notes").count(), 0);
  await presenter
    .getByRole("button", { name: "Next slide", exact: true })
    .click();
  await display.getByRole("heading", { name: "Show what changes" }).waitFor();
  await presenter.keyboard.press("n");
  assert.equal(await presenter.locator(".slideshow-notes").count(), 0);
  await presenter.keyboard.press("ArrowLeft");
  await display.getByRole("heading", { name: "One idea at a time" }).waitFor();
  await contexts[1].setOffline(true);
  await presenter.getByRole("button", { name: "Next", exact: true }).click();
  await presenter.getByRole("heading", { name: "Show what changes" }).waitFor();
  assert.equal(
    await display.getByRole("heading", { name: "One idea at a time" }).count(),
    1,
  );
  await contexts[1].setOffline(false);
  await display.getByRole("heading", { name: "Show what changes" }).waitFor();
  await presenter.reload();
  await presenter.getByRole("button", { name: "Next", exact: true }).click();
  await display.getByRole("heading", { name: "Leave a next step" }).waitFor();
  assert(
    await presenter
      .getByRole("button", { name: "Next", exact: true })
      .isDisabled(),
  );
  await display.keyboard.press("ArrowLeft");
  assert.equal(
    await display.getByRole("heading", { name: "Leave a next step" }).count(),
    1,
  );
  const activeId = new URL(presenter.url()).searchParams.get("session")!;
  const previousController = await presenter.evaluate(
    id => sessionStorage.getItem(`slideshow:${id}`)!,
    activeId,
  );
  const before = await owner.query(api.presentations.read, {
    sessionId: activeId,
    mode: "display",
  });
  assert(before);
  const takeover = {
    sessionId: activeId,
    controller: crypto.randomUUID(),
    revision: before.revision,
  };
  await assert.rejects(
    anonymous.mutation(api.presentations.takeControl, takeover),
  );
  await assert.rejects(other.mutation(api.presentations.takeControl, takeover));
  await display
    .getByRole("button", { name: "Take control", exact: true })
    .click();
  await display.getByText("You control").waitFor();
  await presenter
    .getByRole("button", { name: "Take control", exact: true })
    .waitFor();
  assert.equal(await presenter.locator(".slideshow-notes").count(), 0);
  await display.keyboard.press("ArrowLeft");
  await presenter.getByRole("heading", { name: "Show what changes" }).waitFor();
  const after = await owner.query(api.presentations.read, {
    sessionId: activeId,
    mode: "display",
  });
  assert(after);
  await assert.rejects(
    owner.mutation(api.presentations.control, {
      sessionId: activeId,
      controller: previousController,
      revision: after.revision,
      action: "next",
    }),
  );
  assert.equal(
    (
      await owner.query(api.presentations.read, {
        sessionId: activeId,
        controller: previousController,
        mode: "present",
      })
    )?.notes,
    null,
  );
  const displayController = await display.evaluate(
    id => sessionStorage.getItem(`slideshow:${id}`)!,
    activeId,
  );
  const displayPayload = await owner.query(api.presentations.read, {
    sessionId: activeId,
    controller: displayController,
    mode: "display",
  });
  assert.equal(displayPayload?.notes, null);
  assert.equal(displayPayload?.canControl, true);
  await display.keyboard.press("ArrowRight");
  await presenter.getByRole("heading", { name: "Leave a next step" }).waitFor();
  await presenter.keyboard.press("ArrowLeft");
  assert.equal(
    (
      await owner.query(api.presentations.read, {
        sessionId: activeId,
        mode: "display",
      })
    )?.slide,
    2,
  );
  await display.getByRole("button", { name: "Presenter view" }).click();
  await display.getByRole("button", { name: "Previous", exact: true }).click();
  await presenter.getByRole("heading", { name: "Show what changes" }).waitFor();
  await display.getByRole("button", { name: "Display view" }).click();
  await display.locator(".slideshow-display-controls").waitFor();
  assert.equal(await display.locator(".slideshow-notes").count(), 0);
  await display.keyboard.press("ArrowRight");
  await presenter.getByRole("heading", { name: "Leave a next step" }).waitFor();
  await presenter
    .getByRole("button", { name: "Take control", exact: true })
    .click();
  await display.getByText("Following presenter").waitFor();
  await presenter.setViewportSize({ width: 390, height: 844 });
  assert(
    await presenter.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await presenter
    .getByRole("button", { name: "Previous", exact: true })
    .click();
  await display.getByRole("heading", { name: "Show what changes" }).waitFor();
  const touch = await presenter.context().newCDPSession(presenter);
  const bounds = await presenter
    .getByRole("button", { name: "Next slide", exact: true })
    .boundingBox();
  assert(bounds);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: bounds.x + 20, y: bounds.y + 20 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await display.getByRole("heading", { name: "Leave a next step" }).waitFor();
  await presenter.getByRole("button", { name: "End", exact: true }).click();
  await display
    .getByRole("heading", { name: "Presentation unavailable" })
    .waitFor();
  console.log(
    "PASS: auth, display notes exclusion even with control, both-view arrows, owner takeover/revocation, bounds, revisions, two browsers, reconnect, refresh, end, mobile",
  );
} finally {
  await browser.close();
}
