import re, urllib.request, json
B = "https://bugaddr.github.io/a2z_old_sheet/"
g = lambda u: urllib.request.urlopen(u, timeout=30).read().decode("utf8", "ignore")
h = g(B)
print("REFS", sorted(set(re.findall(r"""["'`]([^"'`\s]+\.(?:json|js|csv))["'`]""", h))), re.findall(r"fetch\(([^)]{0,200})\)", h))
s = h[h.rfind("<script"):]; print("SCRIPT", s[:3000])
for f in set(re.findall(r"""["'`]([^"'`\s]+\.json)["'`]""", h)):
    u = f if f.startswith("http") else B + f.lstrip("./")
    try: t = g(u); print("==", u, len(t), "gfg", t.count("geeksforgeeks")); print(t[:1500])
    except Exception as e: print(u, e)
