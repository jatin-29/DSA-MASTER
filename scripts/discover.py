# One-off: find Codolio's sheet API endpoint by reading the public page and its JS bundles.
import re, urllib.request
get = lambda u: urllib.request.urlopen(u, timeout=30).read().decode("utf8", "ignore")
h = get("https://codolio.com/question-tracker/sheet/strivers-a2z-dsa-sheet")
print("page size", len(h), "next_data", "__NEXT_DATA__" in h)
m = re.search(r'id="__NEXT_DATA__"[^>]*>(.*?)</script>', h, re.S)
if m: print("NEXT_DATA head:", m.group(1)[:1500])
js = sorted(set(re.findall(r'(?:src|href)="(/[^"]+\.js)"', h)))
print(len(js), "scripts")
hits = set()
for j in js:
    try: s = get("https://codolio.com" + j)
    except Exception as e: continue
    for x in re.findall(r'["`\'](https?://[^"`\']*codolio[^"`\']*|/api/[^"`\']*|[^"`\'\s]*question-tracker[^"`\'\s]*)["`\']', s): hits.add(x)
for x in sorted(hits)[:80]: print("API", x)
