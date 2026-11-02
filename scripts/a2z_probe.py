# One-off: inspect bugaddr's a2z_old_sheet (public GitHub Pages) structure.
import re, urllib.request
B = "https://bugaddr.github.io/a2z_old_sheet/"
g = lambda u: urllib.request.urlopen(u, timeout=30).read().decode("utf8", "ignore")
h = g(B); print("size", len(h), "gfg", len(set(re.findall(r"geeksforgeeks\.org/problems/[^\"'\s<]+", h))))
srcs = re.findall(r'(?:src|href)="([^"]+\.(?:js|json))"', h); print("assets", srcs)
for s in srcs:
    u = s if s.startswith("http") else B + s.lstrip("./")
    try: t = g(u)
    except Exception as e: print(u, "ERR", e); continue
    print("==", u, len(t), "gfg", len(set(re.findall(r"geeksforgeeks\.org/problems/[^\"'\s<]+", t))), "fetch", re.findall(r"fetch\(\s*['\"`]([^'\"`]+)", t)[:5])
    i = t.find("geeksforgeeks"); print(t[max(0, i - 800):i + 400])
i = h.find("geeksforgeeks"); print("HTML around:", h[max(0, i - 1200):i + 400] if i >= 0 else h[:1500])
