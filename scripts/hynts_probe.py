# One-off: inspect hynts pages (plain request) to learn their structure.
import re, json, urllib.request
URLS = ["https://hynts.in/preparation/dsa-sheets/rohit-negi-dsa-sheet/", "https://hynts.in/preparation/system-design-sheet/",
        "https://hynts.in/preparation/sql-sheet/", "https://hynts.in/preparation/dbms-playlists/love-babbar-dbms-playlist/",
        "https://hynts.in/preparation/os-playlists/love-babbar-os-playlist/",
        "https://hynts.in/preparation/system-design-playlists/engineering-digest-system-design-playlist/"]
for u in URLS:
    print("=====", u)
    try: h = urllib.request.urlopen(u, timeout=30).read().decode("utf8", "ignore")
    except Exception as e: print("ERR", e); continue
    print("size", len(h), "| title", (re.search(r"<title>(.*?)</title>", h, re.S) or [None, ""])[1][:120])
    print("next_data", "__NEXT_DATA__" in h, "| self.__next_f", h.count("self.__next_f.push"))
    print("playlists", sorted(set(re.findall(r"list=([A-Za-z0-9_-]{16,})", h)))[:5])
    print("yt videos", len(set(re.findall(r"(?:watch\?v=|youtu\.be/|embed/|vi/)([A-Za-z0-9_-]{11})", h))))
    print("leetcode", len(set(re.findall(r"leetcode\.com/problems/[a-z0-9-]+", h))), "| gfg", len(set(re.findall(r"geeksforgeeks\.org/[^\"'\s]+", h))))
    print("apis", sorted(set(re.findall(r"https?://[a-zA-Z0-9.-]*/api/[^\"'\s<>]*", h)))[:10])
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", h, flags=re.S); t = [l.strip() for l in re.sub(r"<[^>]+>", "\n", t).split("\n") if l.strip()]
    print("TEXT", " | ".join(t[:150])[:2500])
    m = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', h, re.S)
    if m: s = max(m, key=len); print("NEXTF longest", len(s), s[:1500])
