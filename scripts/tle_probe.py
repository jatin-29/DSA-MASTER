# One-off: inspect the public TLE Eliminators CP sheet page (plain request).
import re, urllib.request
g = lambda u: urllib.request.urlopen(u, timeout=30).read().decode("utf8", "ignore")
try: h = g("https://www.tle-eliminators.com/cp-sheet")
except Exception as e: print("ERR", e); raise SystemExit
print("size", len(h), "next_data", "__NEXT_DATA__" in h, "nextf", h.count("self.__next_f"), "cf", len(set(re.findall(r"codeforces\.com/[a-z]+/(?:problem/)?\d+/[A-Z]\d?", h))))
m = re.search(r'id="__NEXT_DATA__"[^>]*>(.*?)</script>', h, re.S)
if m: print("ND", m.group(1)[:2000])
js = sorted(set(re.findall(r'src="(/[^"]+\.js)"', h)))
hits = set()
for j in js:
    try: s = g("https://www.tle-eliminators.com" + j)
    except Exception: continue
    hits |= set(re.findall(r'["`\'](https?://[^"`\'\s]*(?:api|sheet)[^"`\'\s]*|/api/[^"`\'\s]*)["`\']', s))
for x in sorted(hits)[:60]: print("API", x)
t = re.sub(r"<script.*?</script>|<style.*?</style>", "", h, flags=re.S); t = [l.strip() for l in re.sub(r"<[^>]+>", "\n", t).split("\n") if l.strip()]
print("TEXT", " | ".join(t[:120])[:2000])
