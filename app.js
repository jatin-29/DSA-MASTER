const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const get = k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
const dur = s => s ? (s >= 3600 ? Math.floor(s / 3600) + ":" : "") + String(Math.floor(s % 3600 / 60)).padStart(s >= 3600 ? 2 : 1, "0") + ":" + String(s % 60).padStart(2, "0") : "";
let done = get("dm_done") || {}, lists = [], cur = get("dm_tab"), filt = "all", q = "";

function ring(p) {
  const r = 42, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 96 96"><circle cx="48" cy="48" r="${r}" stroke="var(--layer2)"/>
  <circle cx="48" cy="48" r="${r}" stroke="var(--green)" stroke-linecap="round" stroke-dasharray="${c * p / 100} ${c}" transform="rotate(-90 48 48)"/>
  <text x="48" y="54" text-anchor="middle" fill="var(--text)" font-size="18" font-weight="600">${p}%</text></svg>`;
}
function render() {
  const L = lists.find(l => l.id === cur) || lists[0]; cur = L.id;
  $("#tabs").innerHTML = lists.map(l => `<a data-id="${l.id}" class="${l.id === cur ? "on" : ""}">${esc(l.title)}</a>`).join("");
  $("#tabs").querySelectorAll("a").forEach(a => a.onclick = () => { cur = a.dataset.id; put("dm_tab", cur); render(); });
  const n = L.videos.length, d = L.videos.filter(v => done[v.id]).length, p = n ? Math.round(d * 100 / n) : 0;
  const left = L.videos.filter(v => !done[v.id]).reduce((a, v) => a + (v.duration || 0), 0);
  const rows = L.videos.map((v, i) => ({ ...v, i })).filter(v =>
    (filt === "all" || (filt === "done") === !!done[v.id]) && (!q || v.title.toLowerCase().includes(q)));
  $("#view").innerHTML = `
  <div class="top"><div class="panel stat">${ring(p)}<div><div class="big">${esc(L.title)}</div>
    <div class="mute">${esc(L.channel)} · ${n} videos</div><div class="bar"><i style="width:${p}%"></i></div>
    <div class="mute" style="margin-top:6px"><b style="color:var(--green)">${d}</b> completed · <b style="color:var(--yellow)">${n - d}</b> remaining${left ? " · " + dur(left) + " left" : ""}</div></div></div></div>
  <div class="filters"><input id="q" placeholder="Search videos" value="${esc(q)}">
    ${["all", "todo", "done"].map(f => `<button class="chip ${filt === f ? "on" : ""}" data-f="${f}">${{ all: "All", todo: "Pending", done: "Completed" }[f]}</button>`).join("")}</div>
  <table><thead><tr><th>Status</th><th></th><th>Title</th><th>Duration</th></tr></thead><tbody>
  ${rows.map(v => { const u = `https://www.youtube.com/watch?v=${v.id}&list=${L.id}&index=${v.i + 1}`; return `<tr>
    <td class="st"><button class="tick ${done[v.id] ? "on" : ""}" data-v="${v.id}" title="Mark complete">✓</button></td>
    <td style="width:136px"><a href="${u}" target="_blank" rel="noopener"><img class="thumb" loading="lazy" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt=""></a></td>
    <td class="vt"><span class="idx">${v.i + 1}.</span><a href="${u}" target="_blank" rel="noopener">${esc(v.title)}</a></td>
    <td class="dur">${dur(v.duration)}</td></tr>` }).join("") || `<tr><td colspan="4" class="mute">No videos</td></tr>`}
  </tbody></table>`;
  $("#view").querySelectorAll(".tick").forEach(b => b.onclick = () => { done[b.dataset.v] ? delete done[b.dataset.v] : done[b.dataset.v] = 1; put("dm_done", done); render(); });
  $("#view").querySelectorAll(".chip").forEach(b => b.onclick = () => { filt = b.dataset.f; render(); });
  const qi = $("#q"); qi.oninput = () => { q = qi.value.toLowerCase(); render(); const n = $("#q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
}
fetch("videos.json").then(r => r.json()).then(j => { lists = j; render(); })
  .catch(() => $("#view").innerHTML = `<p class="mute">Couldn't load videos.json</p>`);
