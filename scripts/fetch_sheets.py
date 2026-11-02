# Fetches sheets from Codolio's public sheet API and writes a normalized sheets.json.
import json, sys, urllib.request, urllib.parse
SHEETS = ["strivers-a2z-dsa-sheet"]
API = "https://node.codolio.com/api/question-tracker/v2/sheet/get-sheet-data-by-slug/"
get = lambda u: json.load(urllib.request.urlopen(u, timeout=30))

def all_mappings(slug):
    first = get(API + slug)["data"]
    maps, seen, cur = list(first["mappings"]), {m["_id"] for m in first["mappings"]}, first["pagination"].get("nextCursor")
    param = None
    while cur and first["pagination"].get("hasNextPage", True):
        got = None
        for p in ([param] if param else ["cursor", "nextCursor", "after"]):
            d = get(API + slug + "?" + urllib.parse.urlencode({p: cur}))["data"]
            new = [m for m in d["mappings"] if m["_id"] not in seen]
            if new: param, got = p, d; break
        if not got: print("pagination stopped; cursor param unknown", file=sys.stderr); break
        new = [m for m in got["mappings"] if m["_id"] not in seen]
        maps += new; seen |= {m["_id"] for m in new}
        cur = got["pagination"].get("nextCursor") if got["pagination"].get("hasNextPage") else None
    return first["sheet"], maps

# Extra GFG / LeetCode / Coding Ninjas links for A2Z from bugaddr/a2z_old_sheet (matched by question title).
import re
norm = lambda t: re.sub(r"[^a-z0-9]", "", (t or "").lower())
EXTRA = {}
try:
    for st in get("https://bugaddr.github.io/a2z_old_sheet/a2z.json"):
        for ss in st.get("sub_steps") or []:
            for t in ss.get("topics") or []:
                l = {k: t.get(k + "_link") for k in ("gfg", "lc", "cs") if t.get(k + "_link")}
                if l: EXTRA.setdefault(norm(t.get("question_title")), l)
    print("a2z_old_sheet entries with links:", len(EXTRA))
except Exception as e: print("a2z_old_sheet FAILED", e, file=sys.stderr)

out = []
for slug in SHEETS:
    try: sheet, maps = all_mappings(slug)
    except Exception as e: print(slug, "FAILED", e, file=sys.stderr); continue
    cfg = sheet.get("config") or {}
    tord, sord = cfg.get("topicOrder") or [], cfg.get("subTopicOrder") or {}
    topics = {}
    for m in maps:
        q = m.get("questionId") or {}
        topics.setdefault(m.get("topic") or "Other", {}).setdefault(m.get("subTopic") or "", []).append({
            "id": m["_id"], "title": m.get("title") or q.get("name"), "url": q.get("problemUrl"),
            "platform": q.get("platform"), "difficulty": q.get("difficulty"), "video": m.get("resource"), "rank": m.get("rank") or 0,
            "links": EXTRA.get(norm(m.get("title"))) or EXTRA.get(norm(q.get("name"))) if slug == "strivers-a2z-dsa-sheet" else None})
    idx = lambda order, k: order.index(k) if k in order else 10**6
    T = []
    for t in sorted(topics, key=lambda k: idx(tord, k)):
        subs = topics[t]
        T.append({"name": t, "subs": [{"name": s, "qs": sorted(subs[s], key=lambda x: x["rank"])} for s in sorted(subs, key=lambda k: idx(sord.get(t, []), k))]})
    out.append({"id": slug, "title": sheet.get("name"), "link": sheet.get("link"), "topics": T})
    print(slug, sheet.get("name"), len(maps), "questions,", len(T), "topics")
    qs = [q for t in T for s in t["subs"] for q in s["qs"]]
    print("matched extra links:", sum(1 for q in qs if q.get("links")), "/", len(qs), "| with gfg:", sum(1 for q in qs if (q.get("links") or {}).get("gfg")))
json.dump(out, open("sheets.json", "w"), ensure_ascii=False)
