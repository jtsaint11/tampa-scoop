import html, re, sys
sys.path.insert(0, '.')
from issue_data import *

def wc(s): return len(re.findall(r"[A-Za-z0-9$][\w$.,'’:/–-]*", s))
RANGES = {"Deep": (100, 140), "Punchy": (45, 70), "Straight": (30, 55)}
counts = []
def count(item, text):
    n = wc(text); lo, hi = RANGES[item['tone']]
    counts.append((item.get('id'), item['tone'], n, f"{lo}-{hi}", "ok" if lo <= n <= hi else ("over" if n > hi else "under")))

# ---------------- plain text ----------------
T = []
T += OPENING
T.append("")
T.append("TAMPA SNAPSHOT")
for s in SNAPSHOT:
    T.append(""); T.append(s['headline'])
    T += s['paras']
    T.append(f"{s['link'][0]}: {s['link'][1]}")
    count(s, " ".join(s['paras']))
T.append(""); T.append("QUICK HITS")
for q in QUICK_HITS:
    T.append(f"- {q['lead']} {q['text']} {q['link'][0]}: {q['link'][1]}")
    count(q, q['text'])
for f in FOOD:
    T.append(""); T.append(f['section']); T.append(f['headline']); T.append(f['kicker'])
    T += f['paras']; T.append(f"{f['link'][0]}: {f['link'][1]}")
    count(f, " ".join(f['paras']))
T.append(""); T.append("THIS WEEK ON THE CALENDAR")
T.append("Picked from our Tampa events calendar.")
for day, evs in EVENTS:
    T.append(""); T.append(day)
    for e in evs:
        line = f"{e['emoji']} {e['name']} | {e['venue']} | {e['time']} | {e['price']}"
        if e['pick']: line = f"[{e['pick']}] " + line
        T.append(line)
        if e['why']: T.append(f"   {e['why']}")
        T.append(f"   {e['url']}")
T.append(""); T.append(f"Full calendar: {CALENDAR_URL}")
T.append(""); T.append("DEVELOPMENT WATCH")
for d in DEVELOPMENT:
    T.append(""); T.append(d['headline']); T.append(f"Status: {d['status']}.")
    T += d['paras']; T.append(f"{d['link'][0]}: {d['link'][1]}")
    count(d, " ".join(d['paras']))
T.append(""); T.append("SHARE FEEDBACK")
T.append(POLL[0] + " (add as a beehiiv poll: " + " / ".join(POLL[1]) + ")")
T.append(""); T += CLOSE
T.append("Know an event, opening, or neighborhood change? Send it here.")
T.append(f"Submit an event: {CALENDAR_URL}")
T.append(f"Suggest a business: {DIRECTORY_URL}")
T.append("Forward this to one Tampa friend who always asks what's happening.")
T.append("")
T.append("Nothing in this issue is sponsored.")
PLAIN = "\n".join(T)

# ---------------- HTML (beehiiv custom HTML block; inline styles only) ----------------
E = html.escape
C_TXT = "#1f2933"; C_MUTED = "#52606d"; C_ACCENT = "#0b6e99"
P = f'style="margin:0 0 14px 0;font-family:Georgia,\'Times New Roman\',serif;font-size:17px;line-height:1.55;color:{C_TXT};"'
H3 = f'style="margin:32px 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:2px;color:{C_ACCENT};text-transform:uppercase;"'
H4 = f'style="margin:20px 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:{C_TXT};"'
SMALL = f'style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:{C_MUTED};"'
A = f'style="color:{C_ACCENT};text-decoration:underline;"'
HR = '<hr style="border:none;border-top:1px solid #e4e7eb;margin:28px 0;">'
def img_slot(desc): return f'<!-- IMAGE SLOT: {E(desc)}. Add your own or a licensed photo in beehiiv, with credit. -->'
def para(t): return f'<p {P}>{E(t)}</p>'
def link_p(text, url): return f'<p {P}><a href="{E(url)}" {A}>{E(text)} →</a></p>'
def mark_verify(s): return re.sub(r'(VERIFY: [^|]+?)$', r'<span style="background:#fff3bf;">\1</span>', s)

H = ['<div style="max-width:640px;margin:0 auto;">']
for i, o in enumerate(OPENING):
    H.append(para(o) if i else f'<p {P}><strong>{E(o.split(".")[0])}.</strong>{E(o[len(o.split(".")[0])+1:])}</p>')
H.append(HR); H.append(f'<h3 {H3}>Tampa Snapshot</h3>')
imgs = {"rays": "Tropicana Field or Rays fans (team/AP licensed photo)", "dengue": "mosquito-control helicopter or 'Dump standing water' graphic", "theatre": "Tampa Theatre marquee or auditorium", "vote": "'Vote' sign at a Hillsborough early-voting site"}
for s in SNAPSHOT:
    H.append(f'<h4 {H4}>{E(s["headline"])}</h4>'); H.append(img_slot(imgs[s['id']]))
    H += [para(p) for p in s['paras']]; H.append(link_p(*s['link']))
H.append(f'<h3 {H3}>Quick hits</h3>')
H.append('<ul style="margin:0 0 14px 20px;padding:0;">')
for q in QUICK_HITS:
    H.append(f'<li {P}><strong>{E(q["lead"])}</strong> {E(q["text"])} <a href="{E(q["link"][1])}" {A}>{E(q["link"][0])}</a></li>')
H.append('</ul>')
for f in FOOD:
    H.append(HR); H.append(f'<h3 {H3}>{E(f["section"])}</h3>'); H.append(f'<h4 {H4}>{E(f["headline"])}</h4>')
    H.append(f'<p {SMALL}>{E(f["kicker"])}</p>'); H.append(img_slot(f"{f['headline']} dining room or food (ask the restaurant for a press photo)"))
    H += [para(p) for p in f['paras']]; H.append(link_p(*f['link']))
H.append(HR); H.append(f'<h3 {H3}>This week on the calendar</h3>')
H.append(f'<p {SMALL}>Picked from our Tampa events calendar.</p>')
for day, evs in EVENTS:
    H.append(f'<p style="margin:18px 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:{C_TXT};">{E(day)}</p>')
    for e in evs:
        tag = f'<span style="display:inline-block;background:{C_ACCENT};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-right:6px;">{E(e["pick"])}</span>' if e['pick'] else ''
        price = mark_verify(E(e['price']))
        line = f'<p {P}>{tag}{e["emoji"]} <a href="{E(e["url"])}" {A}>{E(e["name"])}</a> | {E(e["venue"])} | {E(e["time"])} | {price}'
        if e['why']: line += f'<br><span style="color:{C_MUTED};font-size:15px;">{E(e["why"])}</span>'
        H.append(line + '</p>')
H.append(f'<p {P}>For the full list, check out our <a href="{CALENDAR_URL}" {A}>Tampa events calendar</a>.</p>')
H.append(HR); H.append(f'<h3 {H3}>Development watch</h3>')
for d in DEVELOPMENT:
    H.append(f'<h4 {H4}>{E(d["headline"])}</h4>'); H.append(f'<p {SMALL}><strong>Status:</strong> {E(d["status"])}.</p>')
    H += [para(p) for p in d['paras']]; H.append(link_p(*d['link']))
H.append(HR); H.append(f'<h3 {H3}>Share feedback</h3>')
H.append(f'<!-- POLL SLOT: add a beehiiv poll here. Question: "{E(POLL[0])}" Options: {E(" / ".join(POLL[1]))} -->')
H.append(para(POLL[0] + " Add the beehiiv poll here."))
H.append(HR)
H += [para(c) for c in CLOSE]
H.append(para("Know an event, opening, or neighborhood change? Send it here."))
H.append(f'<p {P}>📅 <a href="{CALENDAR_URL}" {A}>Submit an event</a><br>🏪 <a href="{DIRECTORY_URL}" {A}>Suggest a business</a></p>')
H.append(para("Forward this to one Tampa friend who always asks what's happening."))
H.append(f'<p {SMALL}><em>Nothing in this issue is sponsored.</em></p>')
H.append('</div>')
HTML = "\n".join(H)
# the poll placeholder paragraph should not ship as visible text; keep only the comment
HTML = HTML.replace(para(POLL[0] + " Add the beehiiv poll here."), "")

open('../issue-01.html', 'w').write("<!-- The Tampa Scoop, issue #1, Tue 2026-10-13. Paste into a beehiiv Custom HTML block (or use as reference). Subject and preview go in beehiiv's email settings. -->\n" + HTML + "\n")
open('plain.txt', 'w').write(PLAIN)
open('counts.txt', 'w').write("\n".join("\t".join(map(str, c)) for c in counts))
print(PLAIN); print(); [print(c) for c in counts]
print('VERIFY in plain:', PLAIN.count('VERIFY'), 'html:', HTML.count('VERIFY'), 'words total:', wc(PLAIN))
