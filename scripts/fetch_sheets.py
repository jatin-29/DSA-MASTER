# Fetches sheet data from Codolio's public sheet API and saves raw JSON; logs its structure.
import json, sys, urllib.request
SHEETS = {"a2z": "strivers-a2z-dsa-sheet"}
def show(o, d=0, k="root"):
    if d > 4: return
    if isinstance(o, dict):
        print("  " * d + f"{k}: dict {list(o)[:15]}")
        for kk, v in list(o.items())[:15]: show(v, d + 1, kk)
    elif isinstance(o, list):
        print("  " * d + f"{k}: list[{len(o)}]")
        if o: show(o[0], d + 1, k + "[0]")
for key, slug in SHEETS.items():
    url = f"https://node.codolio.com/api/question-tracker/v2/sheet/get-sheet-data-by-slug/{slug}"
    try:
        data = json.load(urllib.request.urlopen(url, timeout=30))
    except Exception as e:
        print(key, "FAILED", e, file=sys.stderr); continue
    json.dump(data, open(f"sheet-{key}.json", "w"), ensure_ascii=False)
    show(data)
    print("SAMPLE", json.dumps(data, ensure_ascii=False)[:2500])
