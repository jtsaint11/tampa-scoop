# Writing an issue in the Scoop Desk, start to finish

Open the Desk, go to **Issues**, pick the date and click **Open issue builder**. The issue now opens on **Write sections**. The other two tabs (**Stories & picks** and **Checklist & export**) still work as before.

## 1. Write each section

Every issue has seven sections, in this order: Intro, Tampa Snapshot, Together With [Sponsor], Local Business of the Week, Date Spot of the Week, Weekly Events List and The Good Life. Click a chip at the top to jump to one. The bar shows how many of the 7 are approved.

For each section:

1. **Add context** (optional). Tick Story Queue stories and/or paste your own checked notes and links, then click **Save context**. If you skip this, the section uses the stories already in the issue that fit it.
2. **Command** (optional): tell it what you want, like "lead with the patio, mention it's pricey". **Outline** (optional): the beats in order.
3. Click **Write drafts**. In about 10 seconds you get **Deep**, **Punchy** and **Straight** side by side, each with a character count.
4. Under each draft the Desk checks the house rules: no dashes, no Oxford comma, contractions used and the section's length target. Anything that breaks a rule shows in coral. **VERIFY** is highlighted in yellow wherever a fact is missing. Nothing is made up, so fill those in yourself.
5. Click **Approve** on the draft you like. Click **Use this instead** on another draft to switch.
6. The approved copy appears in a green box. Edit it there and click **Save**. **Unapprove** takes it back out.
7. **Rewrite** gives three fresh drafts that follow your current command and outline. **Start over** clears the section. **Copy text** copies it.

Sponsor copy is never rewritten. If a story in the queue is marked as a sponsored placement, the Together With section uses the sponsor's approved copy word for word.

A few marks you'll see in drafts, which the Desk turns into issue #1's styling: `### ` is an item headline, `>> ` is a grey address or status line, `[[FREE PICK]]` is a teal badge, and `[words](link)` is a link. Keep them when you edit.

## 2. Subject line and preview

Once some sections are approved, click **Regenerate** in the Subject line and preview box. You get 5 subject and preview pairs written only from your approved sections. Click **Use this** on one, or type your own. Everything saves on its own and is still there when you come back.

## 3. Get it into beehiiv

The buttons at the top of the page:

- **Copy full issue**: plain text of the whole issue.
- **Copy beehiiv HTML**: the styled issue to paste into beehiiv.
- **Send to beehiiv**: creates a **draft** post in beehiiv. It never sends or schedules anything. Open beehiiv, add your photos (yellow "PHOTO HERE" lines mark the spots), send yourself a test and send it when you're ready.
- **Reopen issue**: puts a finished issue back into draft so you can keep working on it.

Every draft comes out in the same layout and style as issue #1: same section headings and colours, photo spots under each item, the feedback poll spot, and the same sign-off. Only the copy changes from issue to issue.

Every edition also gets a fixed **links block** near the end, just before the sign-off, with **Events Calendar** and **Local Business Directory**. It's in the beehiiv draft, Copy full issue and Copy beehiiv HTML.

## One-time setup: let the Desk create beehiiv drafts

Right now beehiiv asks for approval each time something tries to write a post, so **Send to beehiiv** will show "beehiiv write needs to be set to auto in Viktor integration settings". To fix it once:

1. In Viktor, open **Integrations** and choose **beehiiv**.
2. Find the permission for the **proxy post** action (it's how the Desk creates the post) and set it to **Auto**.
3. Back in the Desk, click **Send to beehiiv** again.

The Desk only ever creates drafts, so even on Auto nothing goes out until you send it from beehiiv.

## Deleting a story

Cut hides a story and you can restore it. Delete (top right of any story, cut ones too) removes it for good: from the Desk, from every issue that used it, and from the Story Queue sheet. If Smartsheet ever holds the row delete for approval, the row is marked Deleted and the Desk deletes it on a later sync. To avoid that, set "Smartsheet: Delete Rows" to Auto in Viktor integration settings.

## Where it's saved

Drafts, approvals and subject lines are saved in the Desk and the approved copy and subject options are also copied to the Issues sheet in Smartsheet (two new columns: Sections JSON and Subject Options).
