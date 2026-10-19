# Single source for issue #1 content. build_issue.py renders plain text, HTML and the .md file from it.
SUBJECT = "Rays Game 2 tonight + Rreal Tacos opens today"
PREVIEW = "Plus: Tampa Theatre turns 100, dengue spraying this week and when early voting starts"

OPENING = [
    "Good morning, Tampa. You're reading The Tampa Scoop, your shortcut to what's new, fun and worth knowing around town. Every issue: hand-picked events, new spots and the local news that actually changes your week.",
    "This is issue #1, so thanks for being here from the very start. Today: the Rays try to even the ALCS, a buzzy taco spot opens downtown, Tampa Theatre turns 100, and what this week's dengue spraying means for your neighborhood.",
    "Let's dive in.",
]

# each story: id, headline, tone, kicker(optional line under headline), paragraphs (list), link (text, url) placed after copy
SNAPSHOT = [
    dict(id="rays", tone="Punchy", headline="Rays Host ALCS Game 2 Tonight",
         paras=["The Rays are back at Tropicana Field tonight for ALCS Game 2 against Cleveland: 8 p.m. on TBS, truTV and HBO Max; Freddy Peralta starts. The Guardians took Monday's Game 1, 7-3, on a late comeback.",
                "Games 3 and 4 are in Cleveland Thursday and Friday at 6 p.m. Games 6 and 7, if needed, are back at the Trop Oct. 19–20. Old City Hall is lit Rays blue tonight."],
         link=("Game 2 details on MLB.com", "https://www.mlb.com/news/guardians-vs-rays-alcs-game-2-starting-lineups-and-pitching-matchup")),
    dict(id="dengue", tone="Deep", headline="Dengue Spraying Ramps Up This Week",
         paras=["Hillsborough is the center of Florida's dengue outbreak, with 259 of the 296 cases reported statewide, according to Bay News 9. Health officials call it the largest dengue outbreak in any state since the 1940s.",
                "Through Oct. 16, expect low-flying helicopters over Bloomingdale, Palm River, East Tampa and East Lake. They're treating standing water with Bti, a naturally occurring bacterium the county says doesn't harm people, pets, fish or birds. The county's local state of emergency runs through Oct. 15.",
                "Why it matters: the mosquito that spreads dengue can breed in water as small as a bottle cap, so much of the fix is in your own yard. Dump or cover standing water, wear repellent, and if you're a county Solid Waste customer you can drop off up to 12 old tires a year for free."],
         link=("This week's treatment areas (Hillsborough County)", "https://hcfl.gov/newsroom/2026/10/11/daytime-mosquito-treatment-by-air-this-week-in-bloomingdale-palm-river-east-tampa-and-east-lake")),
    dict(id="theatre", tone="Punchy", headline="Tampa Theatre Turns 100 This Week",
         paras=["Tampa Theatre's centennial week marks the end of a restoration that started in March to bring the 1926 movie palace back to its 1920s glory.",
                "Tonight it's The Wizard of Oz at 7 p.m. ($13). Wednesday is A Night at the Opera (1935), also 7 p.m. and $13. Thursday's 100th birthday party, with the Mighty Wurlitzer scoring the 1924 silent comedy Sherlock Jr., is sold out."],
         link=("See the centennial lineup", "https://www.tampatheatre.org/")),
    dict(id="vote", tone="Straight", headline="Early Voting Starts Monday",
         paras=["Early voting in Hillsborough runs Oct. 19 through Nov. 1, and vote-by-mail ballots are already going out. The ballot includes County Commission races and Amendment 3, which would raise the homestead exemption on non-school property taxes from $50,000 to $150,000 in 2027 and $250,000 in 2028."],
         link=("Axios' 3-minute Hillsborough voting guide", "https://www.axios.com/local/tampa-bay/2026/10/08/3-minute-voting-guide-hillsborough-s-midterm-election")),
]

QUICK_HITS = [
    dict(id="scam", tone="Straight", lead="Utility scam alert:",
         text="The City says callers posing as City of Tampa Utilities, sometimes spoofing the Utilities Call Center number, are demanding immediate payment by phone. Hang up and call (813) 274-8811, or check your balance at utilities.tampa.gov.",
         link=("City notice", "https://www.tampa.gov/news/2026-10/city-tampa-utilities-warns-customers-bill-payment-scam-196311")),
    dict(id="kbar", tone="Straight", lead="New park for New Tampa:",
         text="The City is planning a 56-acre park at K-Bar Ranch and wants input. The kickoff meeting is Thursday, Oct. 15, 6:30–7:30 p.m., at Cross Creek Park & Recreation Center, 19019 Basset Creek Drive.",
         link=("Details", "https://www.tampa.gov/news/2026-10/new-park-coming-new-tampas-k-bar-ranch-196366")),
]

FOOD = [
    dict(id="rreal", tone="Punchy", section="NEW SPOT TO TRY", headline="Rreal Tacos Opens Downtown Today", kicker="808 N. Franklin St.",
         paras=["Atlanta-born Rreal Tacos opens to the public today in the former Haiku space downtown. Expect street tacos on handmade tortillas, plus birria, quesadillas, bowls and a serious margarita program (any drink comes as a pitcher).",
                "Two tacos with rice and beans run $10, and there's a full kids menu. Hours are 11 a.m. to midnight daily (11 p.m. Sundays). That's So Tampa suggests a reservation this week."],
         link=("Read more at That's So Tampa", "https://thatssotampa.com/rreal-tacos-tampa-mexican-restaurant/")),
    dict(id="vmodern", tone="Punchy", section="DATE SPOT OF THE WEEK", headline="V Modern Italian", kicker="Rome Collective, North Hyde Park",
         paras=["A new date-night contender in North Hyde Park. Michelin-starred chef Stefano Ciotti collaborated on the menu: antipasti, fresh pastas, oven-fired pizzas and wood-fired mains, with a cocktail and wine program built for lingering.",
                "It fills a 7,400-square-foot space in the new Rome Collective development and stays open late on weekends (until 1 a.m. Fridays and Saturdays). Reservations are on OpenTable. Been already? Hit reply and tell us how it was."],
         link=("Hours and details (Creative Loafing)", "https://www.cltampa.com/food-drink/v-modern-italian-led-by-michelin-starred-chef-opens-in-north-hyde-park/")),
]

# Events tab rows only (Status=Approved, Oct 13-20)
EVENTS = [
    ("Wednesday, Oct. 14", [
        dict(emoji="💼", name="2026 Tampa Bay EDC Annual Meeting", venue="Straz Center for the Performing Arts", time="4–8 PM", price="$175–$1,200",
             url="https://www.eventbrite.com/e/2026-tampa-bay-edc-annual-meeting-tickets-1993929000315", pick=None, why=None),
    ]),
    ("Friday, Oct. 16", [
        dict(emoji="🤝", name="8th Annual Tampa Bay Business Expo", venue="Hotel Flor Tampa Downtown", time="9 AM–7 PM", price="Free 3–7 PM",
             url="https://www.eventbrite.com/e/8th-annual-tampa-bay-business-expo-free-3pm-7pm-2000-attendees-tickets-1992775364760", pick="FREE PICK",
             why="Organizers list 100 vendors and 20+ speakers, and it's free to walk in from 3 to 7 PM."),
    ]),
    ("Saturday, Oct. 17", [
        dict(emoji="🎃", name="HorsePower for Kids 20th Annual Fall Festival", venue="8005 Racetrack Rd.", time="11 AM–5 PM", price="Tickets sold at the gate, VERIFY: admission price",
             url="https://www.eventbrite.com/e/20th-annual-fall-festival-tickets-sold-at-gate-tickets-2002959309212", pick="FAMILY PICK",
             why="Pumpkin patch, farm animals, pony and train rides. Paid parking."),
        dict(emoji="🍺", name="Yuengling Draft Haus & Kitchen Oktoberfest", venue="11109 N. 30th St.", time="5–10 PM", price="Free",
             url="https://www.eventbrite.com/e/yuengling-draft-haus-kitchen-oktoberfest-tickets-2001623153735", pick="DATE NIGHT PICK",
             why="The Bearded Brothers play at 6 PM, plus stein-holding contests and prizes."),
        dict(emoji="🍽️", name="Radiant Hands Annual Dinner 2026", venue="Embassy Suites by Hilton Tampa USF Near Busch Gardens", time="5–8:30 PM", price="$65, ages 12+",
             url="https://www.eventbrite.com/e/radiant-hands-annual-dinner-2026-tickets-1998803498069", pick=None, why=None),
    ]),
]
CALENDAR_URL = "https://tampa-events-justin-s-team.viktor.space"
DIRECTORY_URL = "https://tampa-directory-justin-s-team.viktor.space"

DEVELOPMENT = [
    dict(id="soho", tone="Deep", headline="SoHo Stormwater Fight Heads to Court", status="Approved by City Council (4-3, September). Now challenged in court",
         paras=["Bern's Steak House and other South Howard Avenue property owners have filed two class-action lawsuits to halt the city's SoHo stormwater project. The plan runs 6,500 feet of box culverts under South Howard to carry floodwater from Palma Ceia Pines and Parkland Estates into Hillsborough Bay. Work is expected to take more than three years.",
                "One suit says the culvert goes beyond the city's legal right to use the street. The other says the scope and cost changed without proper notice: 2023 bond documents estimated $76 million, while the first phase alone is priced at about $100 million. Why it matters: it's a fix for chronic flooding that means years of disruption in one of Tampa's busiest business districts."],
         link=("WUSF's full story", "https://www.wusf.org/courts-law/2026-10-12/berns-soho-property-owners-sue-tampa-massive-stormwater-project")),
    dict(id="raysbonds", tone="Straight", headline="Rays Stadium Bonds Up Thursday", status="On Thursday's City Council agenda (Item 90)",
         paras=["City Council's Thursday, Oct. 15 session (9 a.m.) includes a vote to authorize up to $80 million in non-ad valorem revenue bonds for the city's Rays stadium contribution and start the required court validation. A city memo says actually issuing debt would need a later council vote."],
         link=("The Tampa Monitor's breakdown", "https://tampamonitor.com/news/rays-bonds-property-taxes-cant-repay/")),
    dict(id="pendry", tone="Straight", headline="Pendry Tampa Tops Out", status="Under construction, opening next year",
         paras=["Pendry Tampa wrapped vertical construction last week at 38 stories: 218 hotel rooms, 190 condos and ground-floor dining off the Riverwalk. Condos start at $1.7 million, and more than 80% are sold, according to a news release cited by Axios."],
         link=("Photos from inside (Axios)", "https://www.axios.com/local/tampa-bay/2026/10/13/pendry-tampa-luxury-high-rise-vertical-construction")),
]

POLL = ("What do you want more of in The Tampa Scoop?", ["New restaurants and bars", "Things to do this weekend", "Neighborhood and development news"])

CLOSE = [
    "That's the Scoop for today. Thanks for reading issue #1.",
]
