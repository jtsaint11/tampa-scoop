# Tampa Scoop story radar: the repeatable method

What it does: before each issue it finds what's happening in Tampa (and the wider Bay where it matters), scores every candidate 0–100 on how much Tampa readers will care, and hands back a ranked table plus Desk intake blocks for the top picks. First run: issue #1, 2026-10-13 (`/work/bots/tampa-newsletter/issues/2026-10-13/ideas-ranked.md`).

**Yardstick:** The Scottsdale Scoop, the model Justin is copying (`/work/bots/tampa-newsletter/issues/scottsdale-model.md`). Across its six issues, the Snapshot leads with **new places, food openings, fun/free/family things to do, and visible change to places readers know** (Costco, a $70M lakefront redo). It never leads with crime or partisan politics. Civic stories only make the cut when they change what readers do this week.

---

## 1. Windows by issue type
| Issue | News window | Events window | Lead with |
|---|---|---|---|
| Tuesday (news + week setup) | previous 7 days | issue day → +7 days (Events tab: start date issue day … +7) | the week's biggest local story, openings, civic dates that need action |
| Thursday (weekend planner) | previous 3 days | Fri–Sun of that week | free/family/date-night events, festivals, games |
| Saturday (food + next week) | previous 5 days | next Mon–Sun | openings, food events, "Good Life"-style fun reads |

Drop anything published before the news window unless there's a new development (status change, vote, opening date) inside it.

## 2. Sources (check every run)
**News**
| Source | URL | Notes |
|---|---|---|
| Tampa Bay Times | https://www.tampabay.com/news/tampa/ | Mostly paywalled. Use it to spot stories, then cite the open primary source |
| Axios Tampa Bay | https://www.axios.com/local/tampa-bay | Blocks plain fetch. Read via `https://r.jina.ai/<url>` |
| Creative Loafing Tampa | https://www.cltampa.com/ (weekly "best things to do", "live music", "food & drink events" lists) | Read via r.jina.ai |
| WFLA | https://www.wfla.com/news/hillsborough-county/ | Some pages need r.jina.ai |
| FOX 13 | https://www.fox13news.com/tag/us/fl/hillsborough-county | |
| ABC Action News (WFTS) | https://www.tampabay28.com/news/region-hillsborough | |
| Bay News 9 | https://baynews9.com/fl/tampa | |
| WUSF | https://www.wusf.org/local-state | |
| Tampa Bay Business Journal | https://www.bizjournals.com/tampabay/news/ | Paywall. Use headline/lede only, confirm elsewhere |
| That's So Tampa | https://thatssotampa.com/ | Best for openings |
| The Tampa Monitor | https://tampamonitor.com/ | City Council agenda previews (CC BY-NC-ND) |
| Florida Politics | https://floridapolitics.com/ (Hillsborough tags) | County Commission detail |
| St. Pete Rising / I Love the Burg | https://stpeterising.com/ · https://ilovetheburg.com/ | St. Pete development & events |
| Osprey Observer / Brandon Buzz | https://www.ospreyobserver.com/ · https://thebrandonbuzz.beehiiv.com/ | Brandon/Riverview |
| r/tampa | https://www.reddit.com/r/tampa/top/?t=week | Buzz check. Never a source of facts |

**Official / primary**
| Source | URL |
|---|---|
| City of Tampa news | https://www.tampa.gov/news |
| Hillsborough County newsroom | https://hcfl.gov/newsroom |
| City Council agendas | https://tampamonitor.com/tampa-city-council/ (preview) · https://www.tampa.gov/city-council |
| Hillsborough Supervisor of Elections | https://www.votehillsborough.gov/ (blocks plain fetch, so try r.jina.ai) |
| FDOT District 7 lane closures | https://www.fdottampabay.com/news |
| Team sites | https://www.mlb.com/rays · https://www.buccaneers.com/schedule/ · https://www.nhl.com/lightning |

**Events (discovery only; picks come from the Events tab)**
| Source | URL |
|---|---|
| **Events sheet (the only source for event picks)** | Smartsheet workspace "Tampa Scoop", sheet `Events` (id 6801895281872772), Status = Approved, Start Date in window, Cancelled not checked |
| Visit Tampa Bay | https://www.visittampabay.com/events/ |
| Tampa Downtown Partnership | https://www.tampasdowntown.com/events/ |
| Eventbrite Tampa | https://www.eventbrite.com/d/fl--tampa/events--this-weekend/ |
| Creative Loafing calendar | https://community.cltampa.com/tampa/EventSearch?narrowByDate=This+Weekend |
| Tampa Theatre / Straz / Armature Works / Sparkman Wharf | venue sites |

Anything good found outside the Events tab goes in the ranked list as **"add to Events tab"**. Justin approves it there before it can be a pick.

## 3. Search queries (web_search, `detail="detailed"`; replace {date}, {month} {year}, {weekend})
News
- `Tampa Bay Times top local news this week {month} {year}`
- `Axios Tampa Bay {date}` · `Axios Tampa Bay news {month} {year}`
- `Tampa news {month} {year} city council vote` · `Hillsborough County commission news {month} {year}`
- `City of Tampa news release {month} {year}` · `Hillsborough County newsroom {month} {year}`
- `WFLA Tampa news {date}` · `FOX 13 Tampa news {month} {year}` · `Bay News 9 Tampa news {month} {year}` · `ABC Action News Tampa {month} {year}`
- `Tampa Bay Business Journal news {month} {year}`
- `Tampa development project approved {month} {year}` · `St. Pete news this week {month} {year} Pinellas` · `Brandon Riverview news {month} {year}`
- `Tampa traffic road closure {month} {year} I-275` · `reddit r/tampa this week {month} {year}`
- Sports: `Rays|Buccaneers|Lightning next game {date}` (+ playoff schedule queries in season)
Food
- `Tampa restaurant openings {month} {year}` · `Tampa new restaurant opened {month} {year} Seminole Heights Hyde Park` · `Creative Loafing Tampa food drink events {month}`
Events (discovery)
- `Creative Loafing Tampa things to do this week {month} {year}` · `Tampa events this weekend {weekend}` · `Visit Tampa Bay events {month} {year}` · `Tampa Downtown Partnership events {month} {year}` · `Eventbrite Tampa events {weekend}` · `Ybor City events {month} {year}`
Follow-ups: for every promising hit, search its specifics (dates, venue, price) and **open the primary page**.

## 4. Scoring rubric (0–100)
| Factor | Points | 0 | middle | top |
|---|---|---|---|---|
| **Reach**: share of Tampa readers it touches | 25 | one niche group | one neighborhood or big interest group (5–15) | most of the city/region (20–25) |
| **This week**: timely and actionable now | 20 | no date / stale | happening within 2 weeks (8–14) | today–7 days, with a clear action (go, book, avoid, vote) (15–20) |
| **Scoop fit**: what the model leads with | 20 | crime, partisan fights, process with no reader action (0–6) | civic/useful service (7–13) | new opening, fun/free/family thing, visible change to a familiar place (14–20) |
| **Buzz**: multi-outlet coverage + social | 15 | one source | 2–3 outlets (6–10) | 4+ outlets or trending on r/tampa / TV (11–15) |
| **Local**: names a Tampa street/neighborhood | 10 | statewide/national | Tampa Bay generally, or St. Pete/Clearwater (4–7) | a Tampa address or neighborhood (8–10) |
| **Novelty**: new to most readers | 10 | covered for weeks | update to a known story (4–7) | first time readers hear it (8–10) |

**Tie-breaks:** higher Reach wins, then Scoop fit.
**Hard filters (score doesn't matter):** drop if (a) no primary or reputable page can be opened, (b) it's outside the window with no new development, (c) it's an event not in the Events tab being proposed as a pick, or (d) it's a single auto-generated source (e.g. a development tracker). Hold those until confirmed.

**Section and tone mapping:** openings/food → Food (Punchy). Big civic/health/development with a "why" → Snapshot or Development (Deep). Dates/deadlines/scams/closures → Snapshot or Quick hits (Straight). Development keeps the source's status words exactly ("proposed", "approved", "under construction", "open").

**Issue assembly from the ranking (Tuesday):** Snapshot = the top 3–4 non-food, non-development items in rank order. Food = top 1–2 food items (one can be "Date spot of the week"). Development watch = top 2–3 development/civic-money items. Quick hits = useful Straight items scoring 55+ that didn't make the Snapshot. Events list = all Approved Events-tab rows in the window, with Free / Family / Date night / Wildcard tags on up to 4. Subject = headline of the #1 item + "+" the best opening or event.

## 5. Step by step: rerun for any issue date
1. **Set dates.** Issue date D (America/New_York) and type (Tue/Thu/Sat), plus the windows from section 1. Make the folder `/work/bots/tampa-newsletter/issues/D/` with `research/search`, `research/pages`, `build`.
2. **Read the Events sheet** (read-only, Smartsheet): `pd_smartsheet_get_sheet("6801895281872772")`, rows in `json.loads(r["content"])["rows"][i]["cellsByName"]` (checkboxes are true/false, dates YYYY-MM-DD). Filter Status=Approved, Start Date in window, Cancelled not true. Save to `research/events-sheet.json`. Never write to Smartsheet; the old Google Sheet is a frozen backup, do not read it.
3. **Recheck each candidate event** by opening its Ticket URL (Eventbrite etc.). Compare date, time, venue, price with the tab. Any mismatch → VERIFY in copy + a note to fix the tab.
4. **Run the searches** in section 3 (8 in parallel; `python3 radar/scripts/web_search_batch.py queries.txt`. Edit the OUT path at the top of the script first. It saves each result to `research/search/*.md`).
5. **List candidates** (aim for 25–35) from the search results and the official newsrooms. Drop stale ones.
6. **Open the primary page** for every candidate you'd consider for the top 20. Save the text to `research/pages/` (`radar/scripts/fetch_pages.py urls.txt` = curl + BeautifulSoup. For blocked sites (Axios, CL, Florida Politics, TBBJ, WFLA) use `radar/scripts/fetch_pages_reader.py`, which goes through `https://r.jina.ai/<url>`). Facts come only from these pages.
7. **Score** each candidate with section 4. Write `ideas-ranked.md`: a table with score breakdown, one-line why, section + tone, use (✅ / 🗓 / ✖) and primary URL. Then the Events-tab picks and the dropped list.
8. **Draft** (if building the issue): put content in `build/issue_data.py` and render with `build/build_issue.py` + `build/build_md.py` (copy from the 2026-10-13 folder). Check word counts against the tones (Deep 100–140, Punchy 45–70, Straight 30–55). Snapshot items may run to ~90 words in the Scottsdale style, but the Desk meter will flag anything over the range.
9. **VERIFY pass:** every number, date, time, price, address and status must appear on an opened page. Anything conflicting or missing → `VERIFY: [field]` in the copy and listed at the top of the checks. Count the flags.
10. **Output for Justin:** `ideas-ranked.md`, `issue-NN.md` (subject, preview, plain text, VERIFY list, pre-send checks, Desk intake blocks), `issue-NN.html`. Nothing is sent and the sheet isn't touched. Justin sends in beehiiv.

## 6. Automation notes (for the recurring radar)
- Schedule: run at 6:30 a.m. ET on the day *before* each issue (Mon/Wed/Fri), so ideas are in before the Desk's 5 p.m. intake deadline. Justin still has to pick the delivery time and place (state.md: radartime / radarwhere).
- Output of the automated run: steps 1–7 only (ranked table + intake blocks for the top 8). Drafting stays in the Scoop Desk.
- Guardrails: read-only on the sheet. No sends except the agreed delivery message. Log every opened URL. If fewer than 10 candidates pass the hard filters, say so instead of padding the list.
