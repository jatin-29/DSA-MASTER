# Extracts practice-problem links from each video's YouTube description -> problems.json
# { videoId: [{title, url, platform}] }. Descriptions are cached in ~/.dsa-cache (actions/cache) between runs.
import json, os, re, sys, time
from concurrent.futures import ThreadPoolExecutor
import urllib.request, urllib.parse
KEY = os.environ.get("YT_API_KEY", "").strip()

CACHE = os.path.expanduser("~/.dsa-cache/desc.json")
os.makedirs(os.path.dirname(CACHE), exist_ok=True)
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
ids = []
for f in ("videos.json", "data/extra.json"):
    if not os.path.exists(f): continue
    d = json.load(open(f)); lists = d if isinstance(d, list) else d.get("lists", [])
    ids += [v["id"] for l in lists for v in l["videos"]]
todo = [i for i in dict.fromkeys(ids) if i not in cache]
print(f"descriptions: {len(ids)} videos, {len(cache)} cached, fetching {len(todo)}")

# Official YouTube Data API v3 (videos.list, 50 ids per call, 1 quota unit each).
if not KEY:
    print("YT_API_KEY secret not set - skipping description fetch")
    todo = []
for i in range(0, len(todo), 50):
    chunk = todo[i:i + 50]
    try:
        url = "https://www.googleapis.com/youtube/v3/videos?" + urllib.parse.urlencode({"part": "snippet", "id": ",".join(chunk), "key": KEY, "maxResults": 50})
        for it in json.load(urllib.request.urlopen(url, timeout=30)).get("items", []):
            cache[it["id"]] = it["snippet"].get("description", "")
    except Exception as e:
        print("YouTube API error:", getattr(e, "code", ""), str(e)[:200], file=sys.stderr); break
json.dump(cache, open(CACHE, "w"))

SITES = [("leetcode.com/problems", "LeetCode"), ("geeksforgeeks.org/problems", "GFG"), ("geeksforgeeks.org", "GFG"), ("codeforces.com", "Codeforces"),
         ("naukri.com/code360", "Code360"), ("codingninjas.com", "Code360"), ("hackerrank.com", "HackerRank"), ("interviewbit.com", "InterviewBit"),
         ("takeuforward.org", "TUF"), ("codechef.com", "CodeChef"), ("atcoder.jp", "AtCoder"), ("spoj.com", "SPOJ"), ("cses.fi", "CSES")]
URL = re.compile(r"https?://[^\s<>()\"']+")
def problems(text):
    out, seen = [], set()
    for line in text.splitlines():
        for u in URL.findall(line):
            u = u.rstrip(".,;)")
            plat = next((p for s, p in SITES if s in u), None)
            if not plat or u in seen: continue
            seen.add(u)
            label = re.sub(r"\s+", " ", URL.sub("", line)).strip(" :-–—|•*>#\t")
            generic = re.fullmatch(r"(?i)(gfg|geeks ?for ?geeks|leetcode|lc|code ?studio|code360|problem|question|practice|solve|link|here|q\d*)( ?(link|problem|question|\d+))*", label or "")
            if not label or len(label) < 3 or generic:
                m = re.search(r"/problems?/([^/?#]+)", u); slug = m.group(1) if m else (u.rstrip("/").split("/")[-1] or u)
                label = re.sub(r"\d+$", "", slug).replace("-", " ").replace("_", " ").strip().title()
            out.append({"title": label[:120], "url": u, "platform": plat})
    return out
res = {vid: p for vid in dict.fromkeys(ids) if vid in cache and (p := problems(cache[vid]))}
json.dump(res, open("problems.json", "w"), ensure_ascii=False)
print(f"videos with problem links: {len(res)} / {len(ids)}, total links: {sum(map(len, res.values()))}")
