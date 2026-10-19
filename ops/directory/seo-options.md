# Getting every Tampa business its own Google page

**Verdict:** It can be done on the platform you already have, for no extra money. The approach is the same one Scottsdale Scoop uses: whenever the site is published, it also writes out a ready-made page for every business and category.

## What Google sees today
- **Tampa directory:** every address, including /sitemap.xml and /robots.txt, returns the same blank page titled "Tampa Business Directory". Google has nothing to index beyond the homepage.
- **Scottsdale Scoop** (I checked it on 19 Oct 2026 by downloading pages the way Google does): it lists 1,411 addresses in its sitemap. A business page such as "AC by J" comes back with its own title ("AC by J | Scottsdale HVAC | Scottsdale Scoop"), its own description, and structured business data (business type, address, rating). It has a proper robots.txt that points Google to the sitemap. It runs on the same hosting company as your directory (Vercel).

## Recommended: build every page ahead of time when the site is published
**How it works:** each time the directory is published, a small step reads the Businesses sheet in Smartsheet and writes out a finished page for every business and every category. Each page gets its own title, description and Google business data. The same step writes the sitemap and robots.txt. Visitors still get the interactive directory. Google gets full content as soon as it arrives, on your main directory address.

**Why this option:**
- Your host already serves real files before it falls back to the app. I tested this: the site's icon file comes back as a real image, while an address that doesn't exist gets the app page. So the ready-made pages and the sitemap will be served as they are.
- Everything stays on your directory address, which is what Google credits.
- Smartsheet stays the only source of truth. Nothing gets copied by hand.
- It's the same setup that's working for Scottsdale.

**Cost:** no money, and no paid tools or services. Publishing uses a small amount of Viktor credits. To keep Google in step with Smartsheet, the site needs republishing when listings change. A weekly (or daily) automatic republish costs a few credits each run. Nothing here needs a paid plan.

**What you need to do:**
1. Fill the Businesses sheet. It's empty right now, so there's nothing to publish yet.
2. Confirm the directory should be public and visible to search engines. Google can't index a site that sits behind a login.
3. Optional but recommended: put the directory on your own address, e.g. directory.yourdomain.com. That means adding two DNS records once, and it's free on the platform side. You only pay for a domain if you don't already own one.
4. Once it's live, submit the sitemap in Google Search Console. It's free and takes about 5 minutes.

**What it takes to build:** about half a day of Viktor work:
- the page-writing step
- the sitemap and robots.txt
- page titles and descriptions
- a test publish on the preview site to confirm Google sees each page before anything goes live

**Upkeep:** an automatic republish on a schedule. New or edited listings show up after the next run.

## Health checks (free)
A small scheduled check, for example every morning, loads the homepage, the sitemap, robots.txt and a few business pages. It confirms each one returns a working page with the right title and business data. It only messages you if something breaks. Because it's a plain script, it uses close to no credits.

## The other options, in short
| Option | Works here? | Google sees it on your address? | Verdict |
|---|---|---|---|
| Server builds each page on request (the database's web endpoint) | Yes | **No.** Pages would live on a technical database address, not your directory, so Google would credit the wrong site | Not recommended |
| Separate static site of published pages, rebuilt on a schedule | Yes | **No.** It would sit on a different address (the workspace's pages site), and the main address would stay blank | Possible, but splits your site in two |
| Page titles changed only by the app after it loads | Yes | Weakly. Google has to run the app to see anything, does it late and unreliably, and other search engines and link previews see nothing. There's also no real sitemap | Not enough on its own |
| Your own domain | Yes, free | Yes | A good addition to the recommended option, not a replacement |

## What's still uncertain
- I didn't publish anything, so a test on the preview site still needs to confirm that addresses like /business/some-name return their own page. Hosting works this way in general, but it hasn't been proven on your site yet.
- Google decides on its own when, and how much, to index. Being crawlable is necessary, but it doesn't guarantee rankings.
