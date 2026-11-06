const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const get = k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
// done[key] = completion timestamp (>0) or -timestamp when un-ticked (kept so devices can merge).
const isD = k => (done[k] || 0) > 0;
let videoIds = new Set();
let PROBS = {};
function toggleDone(k) { const now = Date.now(); done[k] = isD(k) ? -now : now; put("dm_done", done); if (self.Sync) Sync.push(); if (self.Ach && done[k] > 0) Ach.check(); }
const dur = s => s ? (s >= 3600 ? Math.floor(s / 3600) + ":" : "") + String(Math.floor(s % 3600 / 60)).padStart(s >= 3600 ? 2 : 1, "0") + ":" + String(s % 60).padStart(2, "0") : "";
const DIFF = { basic: ["Basic", "#8a8a8a"], easy: ["Easy", "#00b8a3"], medium: ["Medium", "#ffc01e"], hard: ["Hard", "#ff375f"] };
let done = get("dm_done") || {}, openT = get("dm_open") || {}, sheets = [], lists = [], cur = get("dm_tab"), filt = "all", q = "";

function ring(p) {
  const r = 42, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 96 96"><circle cx="48" cy="48" r="${r}" stroke="var(--layer2)"/>
  <circle cx="48" cy="48" r="${r}" stroke="var(--green)" stroke-linecap="round" stroke-dasharray="${c * p / 100} ${c}" transform="rotate(-90 48 48)"/>
  <text x="48" y="54" text-anchor="middle" fill="var(--text)" font-size="18" font-weight="600">${p}%</text></svg>`;
}
const pct = (d, n) => n ? Math.round(d * 100 / n) : 0;
const filters = ph => `<div class="filters"><input id="q" placeholder="${ph}" value="${esc(q)}">
  ${["all", "todo", "done"].map(f => `<button class="chip ${filt === f ? "on" : ""}" data-f="${f}">${{ all: "All", todo: "Pending", done: "Completed" }[f]}</button>`).join("")}</div>`;
const go = id => { cur = id; put("dm_tab", cur); q = ""; filt = "all"; render(); scrollTo(0, 0); };
const keep = (id, title) => (filt === "all" || (filt === "done") === isD(id)) && (!q || String(title).toLowerCase().includes(q));
const tick = (id, t) => `<td class="st"><button class="tick ${isD(id) ? "on" : ""}" data-v="${esc(id)}" title="${t}">✓</button></td>`;
const A = (u, inner, cls = "") => `<a ${cls ? `class="${cls}"` : ""} href="${esc(u)}" target="_blank" rel="noopener">${inner}</a>`;

function render() {
  const all = [{ id: "viz", title: "Visualizer" }, ...sheets, ...lists, { id: "home", title: "Dashboard" }, { id: "ach", title: "Achievements" }];
  if (!all.find(x => x.id === cur)) cur = "home";
  const prog = items => { const n = items.length, d = items.filter(x => isD(x.id)).length; return n ? `<small>${pct(d, n)}%</small>` : ""; };
  const link = (l, icon, items) => `<a data-id="${esc(l.id)}" class="${l.id === cur ? "on" : ""}"><span class="ico">${icon}</span><span class="lbl">${esc(l.title)}</span>${items ? prog(items) : ""}</a>`;
  $("#tabs").innerHTML = `<div id="sync-box"></div><div class="grp">Home</div>${link({ id: "home", title: "Dashboard" }, "🏠")}${link({ id: "ach", title: "Achievements" }, "🏆")}<div class="grp">Tools</div>${link(all[0], "⚡")}
    ${sheets.length ? `<div class="grp">DSA Sheets</div>` + sheets.map(s => link(s, "📋", s.topics.flatMap(t => t.subs.flatMap(x => x.qs)))).join("") : ""}
    ${lists.length ? `<div class="grp">Video Courses</div>` + lists.map(l => link(l, "▶", l.videos)).join("") : ""}`;
  $("#tabs").querySelectorAll("a").forEach(a => a.onclick = () => { cur = a.dataset.id; put("dm_tab", cur); q = ""; filt = "all"; document.body.classList.remove("open"); render(); scrollTo(0, 0); });
  if (self.Sync) Sync.paint();
  V.stop(); if (cur === "viz") return V.render();
  if (cur === "home") return Dash.render();
  if (cur === "ach") return Ach.render();
  const S = sheets.find(x => x.id === cur);
  S ? renderSheet(S) : renderPlaylist(lists.find(l => l.id === cur));
  const qi = $("#q");
  qi.oninput = () => { q = qi.value.toLowerCase(); render(); const n = $("#q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  $("#view").querySelectorAll(".chip").forEach(b => b.onclick = () => { filt = b.dataset.f; render(); });
  $("#view").querySelectorAll(".tick").forEach(b => b.onclick = () => { toggleDone(b.dataset.v); render(); });
  if (S) $("#view").querySelectorAll("[data-q]").forEach(a => a.onclick = () => {
    const qs = S.topics.flatMap(t => t.subs.flatMap(s => s.qs.map(x => ({ ...x, section: t.name })))).filter(x => Player.ytId(x.video));
    Player.open(qs.map(x => ({ key: x.id, vid: Player.ytId(x.video), start: Player.ytStart(x.video), title: x.title, section: x.section })), qs.findIndex(x => x.id === a.dataset.q), S.title); });
  else $("#view").querySelectorAll("[data-p]").forEach(a => a.onclick = () => { const L = lists.find(l => l.id === cur);
    Player.open(L.videos.map(v => ({ key: v.id, vid: v.id, title: v.title, section: v.section, dur: dur(v.duration) })), +a.dataset.p, L.title); });
  $("#view").querySelectorAll("details.topic").forEach(el => el.ontoggle = () => { if (q || filt !== "all") return; openT[el.dataset.k] = el.open; put("dm_open", openT); });
}

function renderSheet(S) {
  const qs = S.topics.flatMap(t => t.subs.flatMap(s => s.qs)), n = qs.length, d = qs.filter(x => isD(x.id)).length, p = pct(d, n);
  const by = k => { const a = qs.filter(x => (x.difficulty || "").toLowerCase() === k); return [a.filter(x => isD(x.id)).length, a.length]; };
  let h = `<div class="top"><div class="panel stat">${ring(p)}<div><div class="big">${esc(S.title)}</div>
    <div class="mute">${n} problems · ${S.topics.length} steps${S.link ? " · " + A(S.link, "Original ↗", "lnk") : ""}</div>
    <div class="bar"><i style="width:${p}%"></i></div><div class="mute" style="margin-top:6px"><b style="color:var(--green)">${d}</b> solved · <b style="color:var(--yellow)">${n - d}</b> remaining</div></div></div>
    <div class="panel diffs">${Object.entries(DIFF).map(([k, [l, c]]) => { const [a, b] = by(k); return `<div class="dpill"><span style="color:${c}">${l}</span><b>${a}<span class="mute">/${b}</span></b></div>`; }).join("")}</div></div>
    ${filters("Search problems")}`;
  const filtering = q || filt !== "all";
  S.topics.forEach((t, ti) => {
    const tq = t.subs.flatMap(s => s.qs), td = tq.filter(x => isD(x.id)).length, key = S.id + ":" + ti;
    const body = t.subs.map(s => {
      const rows = s.qs.filter(x => keep(x.id, x.title)); if (!rows.length) return "";
      return `${s.name ? `<div class="sub">${esc(s.name)}</div>` : ""}<table><tbody>${rows.map(x => {
        const [l, c] = DIFF[(x.difficulty || "").toLowerCase()] || ["—", "var(--mute)"];
        return `<tr>${tick(x.id, "Mark solved")}<td class="vt">${x.url ? A(x.url, esc(x.title)) : esc(x.title)}${x.tags && x.tags.length ? `<div class="tags">${x.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}</td>
          <td class="df" style="color:${c}">${l}</td><td class="ic lk">${x.url ? A(x.url, esc(x.platform === "tuf" ? "TUF" : x.platform || "Solve"), "lnk") : ""}${x.links ? [["gfg", "GFG"], ["lc", "LeetCode"], ["cs", "Ninjas"]].filter(([k]) => x.links[k] && !(x.url || "").includes(x.links[k].split("/")[2])).map(([k, l]) => A(x.links[k], l, "lnk " + k)).join("") : ""}</td>
          <td class="ic">${x.video && Player.ytId(x.video) ? `<a class="yt play" data-q="${esc(x.id)}" title="Watch here">▶</a>` : x.video ? A(x.video, "▶", "yt") : ""}</td></tr>`; }).join("")}</tbody></table>`; }).join("");
    if (filtering && !body) return;
    h += `<details class="topic" data-k="${esc(key)}" ${filtering || openT[key] ? "open" : ""}><summary><span>${esc(t.name)}</span>
      <span class="tp"><span class="bar sm"><i style="width:${pct(td, tq.length)}%"></i></span>${td}/${tq.length}</span></summary>${body}</details>`;
  });
  $("#view").innerHTML = h;
}

function renderPlaylist(L) {
  const n = L.videos.length, d = L.videos.filter(v => isD(v.id)).length, p = pct(d, n);
  const left = L.videos.filter(v => !isD(v.id)).reduce((a, v) => a + (v.duration || 0), 0);
  const rows = L.videos.map((v, i) => ({ ...v, i })).filter(v => keep(v.id, v.title));
  $("#view").innerHTML = `
  <div class="top"><div class="panel stat">${ring(p)}<div><div class="big">${esc(L.title)}</div>
    <div class="mute">${esc(L.channel)} · ${n} videos</div><div class="bar"><i style="width:${p}%"></i></div>
    <div class="mute" style="margin-top:6px"><b style="color:var(--green)">${d}</b> completed · <b style="color:var(--yellow)">${n - d}</b> remaining${left ? " · " + dur(left) + " left" : ""}</div></div></div></div>
  ${filters("Search videos")}
  <table><thead><tr><th>Status</th><th></th><th>Title</th><th>Duration</th></tr></thead><tbody>
  ${rows.map(v => `<tr>${tick(v.id, "Mark complete")}
    <td style="width:136px"><a class="play" data-p="${v.i}"><img class="thumb" loading="lazy" src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt=""><span class="pbtn">▶</span></a></td>
    <td class="vt"><span class="idx">${v.i + 1}.</span><a class="play" data-p="${v.i}">${esc(v.title)}</a>${v.section ? `<div class="mute" style="font-size:12px">${esc(v.section)}</div>` : ""}</td><td class="dur">${PROBS[v.id] ? `<span class="pchip" title="Practice problems in this video">📝 ${PROBS[v.id].length}</span>` : ""}${dur(v.duration)}</td></tr>`).join("") || `<tr><td colspan="4" class="mute">No videos</td></tr>`}
  </tbody></table>`;
}

const load = f => fetch(f).then(r => r.ok ? r.json() : []).catch(() => []);
Promise.all([load("sheets.json"), load("videos.json"), load("data/extra.json"), load("problems.json")]).then(([s, v, x, pr]) => {
  PROBS = Array.isArray(pr) ? {} : pr;
  sheets = [...s, ...(x.sheets || [])]; lists = [...v, ...(x.lists || [])];
  videoIds = new Set(lists.flatMap(l => l.videos.map(v => v.id)));
  render();
});

$("#menu").onclick = () => document.body.classList.toggle("open");
