"""Convert a styled issue HTML (issue-01.html format) into native beehiiv `blocks`
so every paragraph, heading and photo slot is editable in the beehiiv editor."""
import json, re, sys
from bs4 import BeautifulSoup, NavigableString, Comment

TEAL, GRAY, INK = "#0b6e99", "#52606d", "#1f2933"

def color_of(tag):
    m = re.search(r"(?<![-\w])color:\s*(#[0-9a-fA-F]{3,6})", tag.get("style", "") or "")
    return m.group(1) if m else None

def runs(node, sty=(), link=None, col=None, hl=None):
    out = []
    for ch in node.children:
        if isinstance(ch, Comment):
            continue
        if isinstance(ch, NavigableString):
            t = str(ch).replace("\n", " ")
            if t:
                r = {"text": t}
                if sty: r["styling"] = list(dict.fromkeys(sty))
                if link: r["link"] = {"href": link, "target": "_blank"}
                if col: r["text_color"] = col
                if hl: r["highlight_color"] = hl
                out.append(r)
            continue
        n = ch.name
        if n == "br":
            out.append({"__br__": True}); continue
        s, l, c, h = list(sty), link, col, hl
        if n in ("strong", "b"): s.append("bold")
        if n in ("em", "i"): s.append("italic")
        if n == "a": l = ch.get("href")
        if n == "span":
            st = ch.get("style", "") or ""
            bg = re.search(r"background:\s*(#[0-9a-fA-F]{3,6})", st)
            if bg and bg.group(1).lower() == "#fff3bf":
                h = "#fff3bf"; s.append("bold")
            elif bg:  # badge like FREE PICK
                h = bg.group(1); c = "#ffffff"; s.append("bold")
                out += runs(ch, s, l, c, h); out.append({"text": " "}); continue
            elif color_of(ch): c = color_of(ch)
        out += runs(ch, s, l, c, h)
    return out

def split_br(rs):
    parts, cur = [], []
    for r in rs:
        if r.get("__br__"): parts.append(cur); cur = []
        else: cur.append(r)
    parts.append(cur)
    clean = []
    for p in parts:
        while p and not p[0]["text"].strip(): p = p[1:]
        if p: p[0] = {**p[0], "text": p[0]["text"].lstrip()}
        if p and p[-1]["text"].strip() == "": p = p[:-1]
        if p: clean.append(p)
    return clean

def para(rs, align=None):
    b = {"type": "paragraph", "formattedText": rs}
    if align: b["textAlignment"] = align
    return b

def slot(text, kind="📷 PHOTO HERE"):
    return para([{"text": f"{kind} ", "styling": ["bold"], "highlight_color": "#fff3bf"},
                 {"text": f"— {text} Click here, type / and pick Image, then delete this line.", "text_color": GRAY, "styling": ["italic"]}])

def convert(html):
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find("div") or soup
    blocks = []
    for el in root.children:
        if isinstance(el, Comment):
            c = str(el).strip()
            if c.startswith("IMAGE SLOT:"):
                d = c.split(":", 1)[1].split(". Add your own")[0].strip()
                blocks.append(slot(BeautifulSoup(d, "html.parser").get_text() + "."))
            elif c.startswith("POLL SLOT:"):
                d = BeautifulSoup(c.split(":", 1)[1], "html.parser").get_text().strip()
                d = d.replace("add a beehiiv poll here. ", "")
                blocks.append(para([{"text": "📊 POLL HERE ", "styling": ["bold"], "highlight_color": "#fff3bf"},
                                    {"text": f"— {d} Click here, type / and pick Poll, then delete this line.", "text_color": GRAY, "styling": ["italic"]}]))
            continue
        if isinstance(el, NavigableString):
            continue
        n = el.name
        if n == "hr":
            blocks.append({"type": "content_break"})
        elif n == "h3":
            blocks.append({"type": "heading", "level": "2", "formattedText": [{"text": el.get_text().strip().upper(), "text_color": TEAL, "styling": ["bold"]}]})
        elif n == "h4":
            blocks.append({"type": "heading", "level": "3", "text": el.get_text().strip()})
        elif n == "ul":
            items = [{"formattedText": [r for r in runs(li) if not r.get("__br__")]} for li in el.find_all("li")]
            blocks.append({"type": "list", "listType": "unordered", "items": items})
        elif n == "p":
            st = el.get("style", "") or ""
            col = color_of(el)
            rs = runs(el)
            if "font-size:14px" in st and col == GRAY:  # meta/address line or day label
                rs = [{**r, "text_color": r.get("text_color", GRAY), "styling": list(dict.fromkeys(r.get("styling", []) + ["bold"]))} for r in rs if not r.get("__br__")]
            if "font-weight:bold" in st:
                rs = [{**r, "styling": list(dict.fromkeys(r.get("styling", []) + ["bold"]))} for r in rs if not r.get("__br__")]
            for part in split_br(rs):
                blocks.append(para(part))
    return blocks

if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    b = convert(open(src).read())
    json.dump(b, open(dst, "w"), ensure_ascii=False, indent=1)
    print(len(b), "blocks")
