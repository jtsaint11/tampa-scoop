# Tampa Scoop: Google Sheets → Smartsheet

**Workspace:** [Tampa Scoop](https://app.smartsheet.com/workspaces/5g3qprXxP398HcM8H576Phg922gP3WC7vPXJ6941), ID 4264547688179588

All 9 tabs are now sheets in this workspace. Each sheet has the same columns in the same order as its Google tab, and the first column is the main (primary) column. The row counts below were checked by reading each sheet back after the copy. The Google Sheet was not changed.

| Tab | Link | Sheet ID | Google rows | Smartsheet rows | Match |
|---|---|---|---|---|---|
| Lists | [open](https://app.smartsheet.com/sheets/JgMWH55CmjXF2rcwXGFrVJcmfcqx2CRGFPq6HXR1) | 962440566361988 | 12 | 12 | ✅ |
| Categories | [open](https://app.smartsheet.com/sheets/RjC6F4xR73HffWW5r5vhJ9QM3gxpHGGvjHj92cx1) | 4514636218191748 | 16 | 16 | ✅ |
| Organizers | [open](https://app.smartsheet.com/sheets/6vhp7W63mcx47mVrw4pwC82G6pm93fcVC237Qwj1) | 2475660623957892 | 47 | 47 | ✅ |
| Events | [open](https://app.smartsheet.com/sheets/cqcMwcMVXHvXF7MMXvm5vFmqh8F82wCFJ89qCh71) | 6801895281872772 | 54 | 54 | ✅ |
| Event Submissions | [open](https://app.smartsheet.com/sheets/JFcgJQXgMgFfQ58jM7w9hf3JrpgC5J3gR6v9wM41) | 153543605702532 | 1 | 1 | ✅ |
| Businesses | [open](https://app.smartsheet.com/sheets/4crrCjJFH35pjPH2ChC8Hjh3262Q5Mxwf4JH8pH1) | 3177664438554500 | 0 | 0 | ✅ |
| Quote Requests | [open](https://app.smartsheet.com/sheets/5cV6GFv9mcM4Q583rrPMWGgmQV8j4wcFcjVR4fw1) | 7224434164453252 | 0 | 0 | ✅ |
| Story Queue | [open](https://app.smartsheet.com/sheets/Cc8vj8Q5h6pQ3QvwRxxC7rWxH8mpPx9vh6c5V9W1) | 2546355785650052 | 5 | 5 | ✅ |
| Issues | [open](https://app.smartsheet.com/sheets/rQQjm62v93MjJv8R7QHhrRpgV5j8CQmcMC4CCqH1) | 3037219007975300 | 1 | 1 | ✅ |

## How the columns were set up
- **Dropdowns** use the same choices as in Google. Most of those come from the Lists tab: Status, Source, Source Type, Category, Neighborhood, Engagement Tier, Price Model, Group, Phase, Timing, Contact Preference. Business/Quote Category takes its choices from Categories, and Events/Submissions Organizer from Organizers. Story Queue and Issues keep their own fixed lists.
- **Checkboxes** are used for every Google checkbox, and also for the formula columns that show TRUE/FALSE.
- **Date columns:** Start/End Date, Date Verified, Last Touch, Date Added, Last Verified, Issue Date. Columns that hold a date plus a time (Submitted At, Created/Updated At, etc.) stay as text so the time isn't lost.
- **Formula columns** were copied as their current values. They won't update by themselves until you add the formulas (see below).

## Manual steps for you
1. **Add the formulas as column formulas.** In Smartsheet: right-click the column, choose "Convert to Column Formula", and paste the formula. The API actions I'm allowed to use can't create formulas.
   - Events, Days Until Start: `=IF(ISBLANK([Start Date]@row), "", [Start Date]@row - TODAY())`
   - Events, Is Free: `=IF(CONTAINS("free", [Ticket Price / Free]@row), 1, 0)`
   - Events, Needs 14-Day Check: `=IF(AND([Start Date]@row >= TODAY(), [Start Date]@row - TODAY() <= 14, OR(ISBLANK([Date Verified]@row), TODAY() - [Date Verified]@row > 1)), 1, 0)`
   - Events, Dedupe Key: `=LOWER(Organizer@row + "|" + [Event Name]@row + "|" + [Start Date]@row + "|" + Venue@row)`
   - Organizers, Engagement Tier: `=IF([Events Submitted]@row >= 6, "Power", IF([Events Submitted]@row >= 2, "Active", "New"))`
   - Organizers, Days Since Last Submission: `=IF(ISBLANK([Last Submission]@row), "", TODAY() - [Last Submission]@row)`
   - Organizers, Re-engage: `=IF(AND([Do Not Contact]@row = 0, OR(ISBLANK([Last Submission]@row), TODAY() - [Last Submission]@row >= 30)), 1, 0)`
   - Categories, Ready to Open: `=IF([Business Count]@row >= 20, 1, 0)`
2. **Cross-sheet formulas.** These need a cross-sheet reference, which you have to create in the formula editor first:
   - Categories, Business Count: `=COUNTIF({Businesses Category}, [Category Name]@row)`
   - Organizers, Events Submitted: `=COUNTIF({Submissions Organizer}, Organization@row)`
   - Organizers, Last Submission: `=MAX(COLLECT({Submissions Submitted At}, {Submissions Organizer}, Organization@row))`. This only works once Submitted At is changed to a date column.
   - Event Submissions, Possible Duplicate: compare against the Events Dedupe Key with a `{Events Dedupe Key}` reference.
3. **Slug columns** (Events, Businesses) need text-pattern formulas that Smartsheet doesn't have. They are plain values now: type new ones by hand or have an automation fill them.
4. **Google checks with no Smartsheet equivalent:** "End Date on or after Start Date", unique names and IDs, the 5-digit ZIP check, and the 500-character limit on Job Description. You can redo these with conditional formatting or an automation if you want them.
5. **Dropdowns that pointed at other tabs** (Organizer, Category) are fixed lists now. When you add an organizer or category, also add it to the dropdown, or turn on "restrict to list" only once you're happy with the choices.
6. **Small fix:** on the Lists sheet itself, the "Engagement Tier" column was set up as a dropdown. You can change it to text.
7. **Not created** (as agreed): forms, automations, dashboards. The apps still read from Google Sheets.
