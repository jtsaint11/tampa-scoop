import sys; sys.path.insert(0,'.')
from issue_data import *
plain=open('plain.txt').read()
counts=[l.split('\t') for l in open('counts.txt').read().splitlines()]
D="2026-10-13"
def block(tone, section, facts, urls, action, gaps):
    return "```\nISSUE DATE: %s   |   TONE: %s\nSECTION: %s\nFACT BULLETS:\n%s\nSOURCE URLS:\n%s\nREADER ACTION: %s\nKNOWN GAPS: %s\nSPONSOR: no\n```" % (D,tone,section,"\n".join(facts),"\n".join(urls),action,gaps)
B=[]
B.append(("Rays host ALCS Game 2 tonight", block("Punchy","Snapshot",[
 "ALCS Game 2, Guardians at Rays, Tuesday Oct. 13, 8 p.m. ET at Tropicana Field",
 "TV: TBS, truTV and HBO Max",
 "Freddy Peralta starts for the Rays",
 "Guardians won Game 1 on Monday, 7-3, a come-from-behind win",
 "Games 3 and 4 at Cleveland's Progressive Field, Thu Oct. 15 and Fri Oct. 16, 6 p.m. ET",
 "Games 6 and 7 (if necessary) at Tropicana Field, Mon Oct. 19 (5 p.m.) and Tue Oct. 20 (8 p.m.)",
 "Tampa's Old City Hall is illuminated in blue tonight for the Rays"],
 ["https://www.mlb.com/news/guardians-vs-rays-alcs-game-2-starting-lineups-and-pitching-matchup",
  "https://www.mlb.com/news/guardians-win-alcs-game-1-2026",
  "https://www.nbcsports.com/mlb/news/how-to-watch-guardians-vs-rays-in-2026-mlb-alcs-schedule-tv-stream-info-preview-everything-to-know",
  "https://www.tampa.gov/news/2026-10/cheering-tampa-bay-rays-196381"],"go","none")))
B.append(("Dengue spraying ramps up", block("Deep","Snapshot",[
 "Statewide 296 dengue cases reported; Hillsborough County accounts for 259 (Bay News 9, Oct. 11-12)",
 "Health officials say it is the largest dengue outbreak in any state since the 1940s",
 "Helicopters treat for mosquito larvae Oct. 12-16 in Bloomingdale, Palm River, East Tampa and East Lake",
 "Treatment uses liquid Bti, a naturally occurring bacterium; county says it does not harm people, pets, fish, birds or beneficial insects",
 "Hillsborough's local state of emergency for dengue extends to Oct. 15",
 "City emergency planner: larvae can form in a bottle cap of water",
 "Residents: dump or cover standing water; use repellent (DEET, Picaridin, IR3535, oil of lemon eucalyptus)",
 "County Solid Waste customers can dispose of up to 12 tires a year at no cost"],
 ["https://baynews9.com/fl/tampa/news/2026/10/12/tampa-bay-dengue-outbreak-prompts-expanded-mosquito-spraying-after-heavy-rains",
  "https://hcfl.gov/newsroom/2026/10/11/daytime-mosquito-treatment-by-air-this-week-in-bloomingdale-palm-river-east-tampa-and-east-lake",
  "https://hcfl.gov/newsroom/2026/10/08/dengue-fever-prompts-hillsborough-county-to-extend-state-of-local-emergency",
  "https://hcfl.gov/newsroom/2026/10/12/hillsborough-county-treating-for-mosquitoes-by-air-monday-night-oct-12"],"learn","none")))
B.append(("Tampa Theatre turns 100", block("Punchy","Snapshot",[
 "Tampa Theatre built in 1926",
 "Centennial parties mark the end of a restoration that started in March to bring it back to its 1920s glory",
 "The Wizard of Oz, Tuesday Oct. 13, 7 p.m., $13",
 "A Night at the Opera (1935), Wednesday Oct. 14, 7 p.m., $13",
 "100th Birthday Party with Sherlock Jr. (1924) scored on the Wurlitzer, Thursday Oct. 15, 7 p.m., sold out"],
 ["https://www.cltampa.com/news/tampa-bays-best-things-to-do-october-8-15-including-the-tampa-theatre-reopening-kickoff/",
  "https://www.tampatheatre.org/"],"go","none")))
B.append(("Early voting starts Monday", block("Straight","Snapshot",[
 "Hillsborough early voting runs Oct. 19 to Nov. 1",
 "Vote-by-mail ballots are already being sent",
 "County Commission races on the ballot (Districts 1, 3, 5, 7)",
 "Amendment 3 would raise the homestead exemption for non-school taxes from $50,000 to $150,000 in 2027 and $250,000 in 2028",
 "Mayor Jane Castor urged residents to be informed about Amendment 3's impact on services"],
 ["https://www.axios.com/local/tampa-bay/2026/10/08/3-minute-voting-guide-hillsborough-s-midterm-election",
  "https://www.wfla.com/news/hillsborough-county/tampa-mayor-discusses-new-park-for-k-bar-ranch-community/amp/"],"learn","early voting site list link")))
B.append(("Utility scam alert (quick hit)", block("Straight","Snapshot",[
 "City of Tampa Utilities reports callers impersonating city employees demanding immediate payment by phone",
 "Calls may spoof the Utilities Call Center number",
 "Hang up and call the Utilities Call Center at (813) 274-8811, or check balances at utilities.tampa.gov"],
 ["https://www.tampa.gov/news/2026-10/city-tampa-utilities-warns-customers-bill-payment-scam-196311"],"avoid","none")))
B.append(("K-Bar Ranch park meeting (quick hit)", block("Straight","Snapshot",[
 "City is planning a 56-acre park at K-Bar Ranch in New Tampa",
 "K-Bar Park Project Launch Meeting: Thursday Oct. 15, 6:30-7:30 p.m.",
 "Cross Creek Park & Recreation Center, 19019 Basset Creek Drive"],
 ["https://www.tampa.gov/news/2026-10/new-park-coming-new-tampas-k-bar-ranch-196366"],"go","none")))
B.append(("Rreal Tacos opens today", block("Punchy","Food",[
 "Rreal Tacos opens to the public Tuesday Oct. 13",
 "808 N Franklin St., former Haiku location, Downtown Tampa",
 "Hours 11 a.m.-midnight daily, 11 p.m. Sundays",
 "Street tacos on handmade tortillas; birria, quesadillas, burritos, bowls",
 "Any drink available as a pitcher",
 "Two tacos with rice and beans for $10; full kids menu",
 "Atlanta-born; Tampa is its 13th location; St. Pete location planned for 2027",
 "That's So Tampa suggests a reservation this week"],
 ["https://thatssotampa.com/rreal-tacos-tampa-mexican-restaurant/"],"go","none")))
B.append(("V Modern Italian (date spot)", block("Punchy","Food",[
 "V Modern Italian at Rome Collective, North Hyde Park; 7,400 sq ft",
 "Reservations started Thursday Oct. 8 on OpenTable",
 "Michelin-starred Chef Stefano Ciotti collaborated on the menu",
 "Antipasti, fresh pastas, oven-fired pizzas, wood-fired mains; craft cocktail and wine program",
 "Hours: Mon-Wed 4-11 p.m., Thu 4 p.m.-midnight, Fri 4 p.m.-1 a.m., Sat 3 p.m.-1 a.m., Sun 3-11 p.m."],
 ["https://www.cltampa.com/food-drink/v-modern-italian-led-by-michelin-starred-chef-opens-in-north-hyde-park/",
  "https://thatssotampa.com/v-modern-italian-tampa-hyde-park/"],"book","address (CL: 1701 W North A St; That's So Tampa gives Rome Collective as 202 N. Rome Ave)")))
B.append(("SoHo stormwater lawsuits", block("Deep","Development",[
 "Bern's Steak House and other South Howard Ave. property owners filed two class-action lawsuits to halt the city's stormwater project",
 "City Council voted 4-3 in September to approve construction",
 "Box culverts, 6,500 feet, carry stormwater from Palma Ceia Pines and Parkland Estates into Hillsborough Bay",
 "Project expected to take more than three years",
 "Suit 1: culvert extends beyond the city's legal rights to use the street",
 "Suit 2: scope and cost changed without required notice; 2023 bond documents estimated $76 million; first phase priced at about $100 million",
 "Status words: approved (construction, by council); lawsuits filed"],
 ["https://www.wusf.org/courts-law/2026-10-12/berns-soho-property-owners-sue-tampa-massive-stormwater-project",
  "https://www.fox13news.com/news/berns-steak-house-sues-tampa-over-100m-south-howard-flood-project"],"learn","next court date")))
B.append(("Rays stadium bonds vote", block("Straight","Development",[
 "Tampa City Council regular session Thursday Oct. 15, 9 a.m.",
 "Item 90 authorizes up to $80 million in non-ad valorem revenue bonds for the city's Rays ballpark contribution",
 "It starts the court validation the agreement requires",
 "Deputy CFO memo: subsequent City Council approval would be required to issue any debt",
 "Council approved the funding agreement 4-3 in August"],
 ["https://tampamonitor.com/news/rays-bonds-property-taxes-cant-repay/",
  "https://tampamonitor.com/tampa-city-council/preview/10-15-26-rays-bonds-peregrine-charter/"],"learn","none")))
B.append(("Pendry Tampa tops out", block("Straight","Development",[
 "Pendry Tampa wrapped vertical construction last week",
 "38 stories; 218 hotel rooms; 190 condos; ground-floor dining off the Riverwalk",
 "Opens next year",
 "Residences start at $1.7 million; more than 80% sold, per a news release"],
 ["https://www.axios.com/local/tampa-bay/2026/10/13/pendry-tampa-luxury-high-rise-vertical-construction"],"learn","none")))

md=[]
md.append("# The Tampa Scoop: Issue #1 (Tuesday, Oct 13, 2026)\n")
md.append("Ready to paste into beehiiv. Structure and voice follow The Scottsdale Scoop (see `/work/bots/tampa-newsletter/issues/scottsdale-model.md`). Everything in it comes from a page that was opened. Sources are listed with each item and in the intake blocks below. Nothing has been sent.\n")
md.append("Files: HTML body → `/work/bots/tampa-newsletter/issues/2026-10-13/issue-01.html` · Ranked ideas → `ideas-ranked.md` (same folder)\n")
md.append("## Subject\n**%s**\n" % SUBJECT)
md.append("## Preview text\n%s\n" % PREVIEW)
md.append("## Full plain text\n```text\n%s\n```\n" % plain)
md.append("## VERIFY flags left: 1\n1. **HorsePower for Kids Fall Festival: admission price.** The Events tab says \"Free\", but the Eventbrite page says tickets are bought at the gate (and parking is paid). Call or check https://www.eventbrite.com/e/20th-annual-fall-festival-tickets-sold-at-gate-tickets-2002959309212, type in the price, and fix the tab's \"Ticket Price / Free\" and \"Is Free\" fields. If you can't confirm it, replace the VERIFY with \"Tickets sold at the gate.\"\n")
md.append("""## Check before you send (takes about 10 minutes)
1. **Send time vs. the Rays game.** The copy assumes it goes out before first pitch (8 p.m.). If it goes after, change the Rays item to the Game 2 result.
2. **Rreal Tacos "opens today".** Quick look at their Instagram or site to confirm the doors opened as planned.
3. **V Modern Italian.** Copy says it's taking reservations on OpenTable. Confirm the OpenTable page works. The address is deliberately left out because two sources give different ones (1701 W North A St vs. Rome Collective at 202 N. Rome Ave).
4. **Tampa Theatre.** Confirm the Oct. 13 and Oct. 14 screenings are still on sale at tampatheatre.org (Creative Loafing listed them at $13).
5. **Dengue numbers** come from Bay News 9 (Oct. 11–12). If the Florida Department of Health's weekly report has come out with a new count, update "259 of the 296".
6. **Images.** The model issue uses one photo per item. HTML comments mark each `IMAGE SLOT`. Use your own photos or ones you have rights to (team, venue or restaurant press photos), with credit. No images were added for you.
7. **Poll.** Add the beehiiv poll where the `POLL SLOT` comment is: "What do you want more of in The Tampa Scoop?" with 3 options.
8. **beehiiv footer.** Physical mailing address and unsubscribe link must be there (playbook checklist).
9. **Brand name.** "The Tampa Scoop" is still the working title (per the playbook). Change it in the opening if you've picked a name.
10. **Run the playbook's 12-point checklist**, send a test to your phone and click every link.

**Not included on purpose:** no Local Business of the Week (nothing is Published in the directory yet) · no sponsor · no Wildcard event pick (the Events tab has nothing else Approved for Oct. 13–20) · the "A Different World" sleepover was left out because its Eventbrite page gives two different start times.

**For Thursday's issue (weekend planner):** add **Art Fair Tampa** (Oct. 15–18, Tampa Convention Center, free) and **Clearwater Jazz Holiday** (Oct. 15–18, Coachman Park) to the Events tab as Approved. Then they can be picked. Bucs vs. Steelers is Sunday at 1 p.m. at Raymond James.
""")
md.append("## Word counts vs. Desk tone ranges\n| Story | Tone | Words | Range | |\n|---|---|---|---|---|\n" + "\n".join("| %s | %s | %s | %s | %s |" % tuple(c) for c in counts) + "\n")
md.append("## Desk intake blocks (one per story used)\nPaste any block into **Story queue → Add to the queue → Paste an intake block**. Event picks aren't included because the Desk pulls them straight from the Events tab.\n")
for t,b in B:
    md.append("### %s\n%s\n" % (t,b))
open('../issue-01.md','w').write("\n".join(md))
print('ok', len(B))
