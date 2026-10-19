"""Render a radar JSON file into a clean, Gmail-safe HTML email.

Usage: uv run python render_email.py <radar.json> [out.html]
Input JSON shape (see radar/daily/2026-10-14.json for a full example):
{
  "date_label": "Wed Oct 14",
  "next_issue": "Thu Oct 15 · Weekend planner",
  "issue_date": "2026-10-15",   (ISO date of the next issue; used in each card's Desk intake block)
  "intro": "One short sentence.",
  "groups": [ {"title": "...", "subtitle": "...", "items": [
      {"title": "...", "when": "...", "where": "...", "price": "...",
       "why": "...", "section": "Events", "tone": "Punchy", "score": 76,
       "url": "https://...", "verify": "optional caveat", "update": false,
       "facts": ["optional: verified fact lines for the Desk intake block"]}
  ]} ],
  "calendar": [ {"name": "...", "when": "...", "where": "...", "url": "..."} ],
  "dropped": "comma-separated list"
}
"""
import datetime
import html
import json
import re
import sys

TEAL, CORAL, GOLD, SAND, INK = "#0F5C6E", "#EE6C4D", "#F7B538", "#FFF6EA", "#1D2B33"
MUTED, LINE = "#5B6B73", "#E8DCCB"
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"


def e(s):
    return html.escape(str(s or ""))


def score_badge(score):
    color = CORAL if score >= 70 else (TEAL if score >= 60 else MUTED)
    return (f'<span style="display:inline-block;min-width:34px;text-align:center;padding:4px 8px;'
            f'border-radius:14px;background:{color};color:#fff;font-weight:700;font-size:13px;">{score}</span>')


def chip(text, bg, fg):
    return (f'<span style="display:inline-block;padding:2px 9px;margin:0 4px 4px 0;border-radius:10px;'
            f'background:{bg};color:{fg};font-size:11px;font-weight:600;letter-spacing:.3px;">{e(text)}</span>')


DESK_SECTIONS = {"events": "Events", "food": "Food", "development": "Development",
                 "sponsor": "Sponsor", "snapshot": "Snapshot"}
ACTIONS = {"Events": "go", "Food": "go"}


def issue_date_of(d):
    if d.get("issue_date"):
        return d["issue_date"]
    m = re.match(r"\w{3} (\w{3}) (\d{1,2})", d.get("next_issue", ""))
    if not m:
        return ""
    today = datetime.date.today()
    for y in (today.year, today.year + 1):
        try:
            dt = datetime.datetime.strptime(f"{m.group(1)} {m.group(2)} {y}", "%b %d %Y").date()
        except ValueError:
            return ""
        if dt >= today - datetime.timedelta(days=7):
            return dt.isoformat()
    return ""


def intake_block(it, issue_date):
    """Paste-ready block for the Scoop Desk's 'Paste an intake block' box."""
    section = DESK_SECTIONS.get(str(it.get("section", "")).lower(), "Snapshot")
    facts = it.get("facts") or [it.get("title")] + [x for x in (it.get("when"), it.get("where"), it.get("price")) if x]
    lines = [f"ISSUE DATE: {issue_date}", f"SECTION: {section}", f"TONE: {it.get('tone') or 'Punchy'}",
             "FACT BULLETS:", *[str(f) for f in facts if f], "SOURCE URLS:", it.get("url", ""),
             f"READER ACTION: {ACTIONS.get(section, 'learn')}"]
    if it.get("verify"):
        lines.append(f"KNOWN GAPS: {it['verify']}")
    lines.append("SPONSOR: no")
    return "\n".join(lines)


def item_card(n, it, issue_date=""):
    facts = " &nbsp;·&nbsp; ".join(e(x) for x in (it.get("when"), it.get("where"), it.get("price")) if x)
    chips = chip(it.get("section", ""), "#E3F0F2", TEAL) + chip(it.get("tone", ""), "#FDEBD3", "#9A5B00")
    if it.get("update"):
        chips += chip("Update on a used story", "#FBE1DA", "#A33B22")
    verify = (f'<div style="margin-top:6px;font-size:12px;color:#A33B22;">⚠ Check before printing: {e(it["verify"])}</div>'
              if it.get("verify") else "")
    return f"""
<tr><td style="padding:0 0 12px 0;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid {LINE};border-radius:12px;">
  <tr><td style="padding:14px 16px;">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:top;font-size:16px;font-weight:700;color:{INK};line-height:1.35;">
      <span style="color:{CORAL};">{n}.</span> {e(it['title'])}</td>
    <td style="vertical-align:top;text-align:right;width:52px;">{score_badge(it.get('score', 0))}</td>
   </tr></table>
   {f'<div style="margin-top:4px;font-size:13px;color:{MUTED};">{facts}</div>' if facts else ''}
   <div style="margin-top:8px;font-size:14px;color:{INK};line-height:1.45;"><b>Why it works:</b> {e(it.get('why'))}</div>
   {verify}
   <div style="margin-top:10px;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:{MUTED};">Copy into Scoop Desk</div>
   <div style="margin-top:4px;padding:8px 10px;background:#F6F3EE;border:1px solid {LINE};border-radius:8px;font-family:Menlo,Consolas,monospace;font-size:11.5px;line-height:1.45;color:{INK};white-space:pre-wrap;word-break:break-word;">{e(intake_block(it, issue_date))}</div>
   <div style="margin-top:10px;">{chips}
     <a href="{e(it.get('url'))}" style="float:right;font-size:13px;font-weight:600;color:{TEAL};text-decoration:none;">Read source &rarr;</a></div>
  </td></tr>
 </table>
</td></tr>"""


def group_block(g, start, issue_date=""):
    rows = "".join(item_card(start + i, it, issue_date) for i, it in enumerate(g["items"]))
    sub = f'<div style="font-size:13px;color:{MUTED};margin-top:2px;">{e(g.get("subtitle"))}</div>' if g.get("subtitle") else ""
    return f"""
<tr><td style="padding:18px 0 10px 0;">
  <div style="font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:{TEAL};
       border-left:4px solid {GOLD};padding-left:10px;">{e(g['title'])}</div>{sub}
</td></tr>{rows}""", start + len(g["items"])


def calendar_block(cal):
    if not cal:
        return ""
    rows = "".join(f"""
   <tr><td style="padding:8px 0;border-top:1px solid {LINE};font-size:14px;color:{INK};">
     <a href="{e(c.get('url'))}" style="color:{INK};font-weight:600;text-decoration:none;">{e(c['name'])}</a>
     <div style="font-size:12px;color:{MUTED};">{e(' · '.join(x for x in (c.get('when'), c.get('where')) if x))}</div>
   </td></tr>""" for c in cal)
    return f"""
<tr><td style="padding:18px 0 0 0;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px dashed {TEAL};border-radius:12px;">
  <tr><td style="padding:14px 16px;">
   <div style="font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:{TEAL};">📅 Add to the events calendar</div>
   <div style="font-size:12px;color:{MUTED};margin:2px 0 6px;">Real events that aren't in your Events sheet yet</div>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
  </td></tr></table>
</td></tr>"""


def render(d):
    body, n = "", 1
    idate = issue_date_of(d)
    for g in d["groups"]:
        block, n = group_block(g, n, idate)
        body += block
    dropped = (f'<tr><td style="padding:18px 0 0 0;font-size:12px;color:{MUTED};line-height:1.5;">'
               f'<b>Skipped (already covered):</b> {e(d["dropped"])}</td></tr>') if d.get("dropped") else ""
    return f"""<!doctype html><html><body style="margin:0;padding:0;background:{SAND};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SAND};font-family:{FONT};">
<tr><td align="center" style="padding:20px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
 <tr><td style="background:{TEAL};border-radius:14px 14px 0 0;padding:22px 22px 18px;">
   <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:{GOLD};text-transform:uppercase;">The Tampa Scoop · Story Radar</div>
   <div style="font-size:24px;font-weight:800;color:#fff;margin-top:4px;">{e(d['date_label'])}</div>
 </td></tr>
 <tr><td style="background:{CORAL};padding:10px 22px;border-radius:0 0 14px 14px;color:#fff;font-size:14px;font-weight:600;">
   Next issue: {e(d['next_issue'])}</td></tr>
 <tr><td style="padding:16px 2px 0;font-size:15px;color:{INK};line-height:1.5;">{e(d.get('intro'))}
   <div style="font-size:12px;color:{MUTED};margin-top:6px;">Score = how much Tampa readers will care (0-100).
   {score_badge(70)} must-run &nbsp; {score_badge(60)} strong &nbsp; {score_badge(50)} filler</div></td></tr>
 {body}{calendar_block(d.get('calendar'))}{dropped}
 <tr><td style="padding:22px 0 6px;text-align:center;font-size:12px;color:{MUTED};">
   To use a story: copy its grey block, then in the Scoop Desk go to Story queue &rarr; Add to the queue &rarr; Paste an intake block &rarr; Fill the form.</td></tr>
</table></td></tr></table></body></html>"""


def main():
    d = json.load(open(sys.argv[1]))
    out = render(d)
    if len(sys.argv) > 2:
        open(sys.argv[2], "w").write(out)
    else:
        print(out)


if __name__ == "__main__":
    main()
