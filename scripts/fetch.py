# Fetches playlist metadata with yt-dlp and writes videos.json
import json, subprocess, sys
out = []
for pid in [l.strip() for l in open("scripts/playlists.txt") if l.strip()]:
    r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", f"https://www.youtube.com/playlist?list={pid}"], capture_output=True, text=True)
    if r.returncode:
        print(r.stderr, file=sys.stderr); continue
    d = json.loads(r.stdout)
    out.append({"id": pid, "title": d.get("title"), "channel": d.get("channel") or d.get("uploader"),
                "videos": [{"id": e["id"], "title": e.get("title"), "duration": e.get("duration")} for e in d["entries"] if e and e.get("title") not in ("[Private video]", "[Deleted video]")]})
    print(pid, d.get("title"), len(out[-1]["videos"]))
if not out: sys.exit("no playlists fetched")
json.dump(out, open("videos.json", "w"), ensure_ascii=False)
