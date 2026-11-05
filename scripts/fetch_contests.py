# Upcoming contests (Codeforces, LeetCode, CodeChef) -> contests.json. Each source is optional.
import json, sys, time, urllib.request
def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **(headers or {})})
    return json.load(urllib.request.urlopen(req, timeout=30))
out, now = [], time.time() * 1000
try:
    out += [{"platform": "Codeforces", "name": c["name"], "start": c["startTimeSeconds"] * 1000, "duration": c["durationSeconds"], "url": f"https://codeforces.com/contests/{c['id']}"}
            for c in get("https://codeforces.com/api/contest.list?gym=false")["result"] if c["phase"] == "BEFORE"]
except Exception as e: print("codeforces FAILED", e, file=sys.stderr)
try:
    j = get("https://leetcode.com/graphql", json.dumps({"query": "{ upcomingContests { title titleSlug startTime duration } }"}).encode(), {"Referer": "https://leetcode.com/contest/"})
    out += [{"platform": "LeetCode", "name": c["title"], "start": c["startTime"] * 1000, "duration": c["duration"], "url": f"https://leetcode.com/contest/{c['titleSlug']}"} for c in j["data"]["upcomingContests"]]
except Exception as e: print("leetcode FAILED", e, file=sys.stderr)
try:
    j = get("https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all")
    from datetime import datetime
    for c in j.get("future_contests", []):
        st = datetime.fromisoformat(c["contest_start_date_iso"]).timestamp() * 1000
        out.append({"platform": "CodeChef", "name": c["contest_name"], "start": st, "duration": int(c["contest_duration"]) * 60, "url": f"https://www.codechef.com/{c['contest_code']}"})
except Exception as e: print("codechef FAILED", e, file=sys.stderr)
out.sort(key=lambda c: c["start"])
json.dump(out, open("contests.json", "w"))
for p in ("Codeforces", "LeetCode", "CodeChef"): print(p, sum(c["platform"] == p for c in out), "upcoming")
