// 🔒 My Courses: private trackers for paid/external courses. Lecture lists live only in this browser
// (and in the user's own Firebase doc when signed in) — never in the public site code.
self.MC = (() => {
  const DEF = [{ id: "rohit-negi", title: "Rohit Negi Course", url: "https://rohittnegi.akamai.net.in/new-courses/3/content?activeTab=Content", items: [] }];
  const all = () => get("dm_courses") || DEF;
  const save = cs => { put("dm_courses", cs); put("dm_courses_at", Date.now()); refreshIds(); if (self.Sync) Sync.push(); };
  const key = (c, it) => `mc:${c.id}:${it.id}`;
  function refreshIds() { all().forEach(c => c.items.forEach(it => videoIds.add(key(c, it)))); } // lectures count as "videos" in stats
  const uid = () => Math.random().toString(36).slice(2, 9);
  function parse(text, old) { // "## Section" lines start a section; every other non-empty line is a lecture
    const byTitle = {}; old.forEach(o => byTitle[(o.section || "") + "|" + o.title] = o.id);
    let sec = ""; const out = [];
    for (let line of text.split("\n")) {
      line = line.trim(); if (!line) continue;
      if (/^#{1,3}\s+/.test(line)) { sec = line.replace(/^#+\s+/, ""); continue; }
      line = line.replace(/^(\d+[.)]\s*|[-*•]\s+)/, "");
      out.push({ id: byTitle[sec + "|" + line] || uid(), title: line, section: sec });
    }
    return out;
  }
  const toText = items => { let s = "", sec = null; items.forEach(it => { if (it.section !== sec) { sec = it.section; if (sec) s += `## ${sec}\n`; } s += it.title + "\n"; }); return s; };

  function render(id) {
    const cs = all(), c = cs.find(x => x.id === id); if (!c) return go("home");
    const n = c.items.length, d = c.items.filter(it => isD(key(c, it))).length, p = pct(d, n), editing = !n || get("dm_mc_edit") === c.id;
    const secs = []; c.items.forEach(it => { let s = secs.find(x => x.name === it.section); if (!s) secs.push(s = { name: it.section, items: [] }); s.items.push(it); });
    const nextUp = c.items.find(it => !isD(key(c, it)));
    $("#view").innerHTML = `
    <div class="top"><div class="panel stat">${ring(p)}<div><div class="big">🔒 ${esc(c.title)}</div>
      <div class="mute">${n} lectures · private tracker — only you can see this list</div><div class="bar"><i style="width:${p}%"></i></div>
      <div class="mute" style="margin-top:6px"><b style="color:var(--green)">${d}</b> done · <b style="color:var(--yellow)">${n - d}</b> remaining${nextUp ? ` · next: <b>${esc(nextUp.title)}</b>` : ""}</div>
      <div class="row" style="margin-top:10px">${c.url ? `<a class="go" href="${esc(c.url)}" target="_blank" rel="noopener">▶ Open course</a>` : ""}<button class="chip" id="mc-edit">${editing ? "Close editor" : "✏️ Edit lectures"}</button></div></div></div></div>
    ${editing ? `<div class="panel mcform">
      <label>Course name<input id="mc-title" value="${esc(c.title)}"></label>
      <label>Course link<input id="mc-url" value="${esc(c.url || "")}" placeholder="https://..."></label>
      <label>Lectures — one per line. Start a line with <code>## </code> to make a section. Paste straight from the course's Content tab.
        <textarea id="mc-items" rows="12" placeholder="## Arrays&#10;Introduction to Arrays&#10;Two Sum&#10;## Strings&#10;Reverse a String">${esc(toText(c.items))}</textarea></label>
      <div class="row"><button class="go" id="mc-save">Save</button><button class="chip" id="mc-del">🗑 Delete course</button><span class="mute sm">Ticks are kept for lectures whose names don't change.</span></div></div>` : ""}
    ${n ? `${filters("Search lectures")}` + secs.map(s => { const rows = s.items.filter(it => keep(key(c, it), it.title)); if (!rows.length) return "";
      const sd = s.items.filter(it => isD(key(c, it))).length;
      return `<div class="topic mc"><div class="mch"><span>${esc(s.name || "Lectures")}</span><span class="tp">${sd}/${s.items.length}</span></div><table><tbody>${rows.map(it => `<tr>${tick(key(c, it), "Mark done")}
        <td class="vt"><span class="idx">${c.items.indexOf(it) + 1}.</span>${esc(it.title)}</td>${c.url ? `<td class="ic">${A(c.url, "Open ↗", "lnk")}</td>` : ""}</tr>`).join("")}</tbody></table></div>`; }).join("") : ""}`;
    $("#mc-edit").onclick = () => { put("dm_mc_edit", editing && n ? "" : c.id); render(id); };
    if (editing) {
      $("#mc-save").onclick = () => { c.title = $("#mc-title").value.trim() || c.title; c.url = $("#mc-url").value.trim(); c.items = parse($("#mc-items").value, c.items); save(cs); put("dm_mc_edit", ""); window.render(); };
      $("#mc-del").onclick = () => { if (confirm(`Delete "${c.title}" and its lecture list?`)) { save(cs.filter(x => x.id !== c.id)); go("home"); } };
    }
  }
  function add() { const t = prompt("Course name (e.g. Striver+ DSA, Udemy Web Dev):"); if (!t || !t.trim()) return;
    const cs = all(), id = t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + uid().slice(0, 3);
    cs.push({ id, title: t.trim(), url: "", items: [] }); save(cs); go("mc:" + id); }
  return { all, render, add, refreshIds, key };
})();
