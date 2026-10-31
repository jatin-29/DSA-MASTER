const LS = k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
let done = LS("dm_done") || {};           // { "resId|itemKey": true }
let custom = LS("dm_custom") || {};       // { resId: [titles] } user-added items
let vids = LS("dm_vids") || {};           // cached playlist videos
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const save = () => { SS("dm_done", done); SS("dm_custom", custom); SS("dm_vids", vids); };

function itemsOf(r) {
  if (r.type === "playlist") return (vids[r.id] || []).map(v => ({ key: v.id, title: v.title, video: v }));
  const out = [];
  r.sections.forEach(([sec, list]) => list.forEach((t, i) => out.push({ key: sec + "#" + i, title: t, sec })));
  (custom[r.id] || []).forEach((t, i) => out.push({ key: "c#" + i, title: t, sec: "My added problems" }));
  return out;
}
const stats = r => { const it = itemsOf(r), d = it.filter(x => done[r.id + "|" + x.key]).length; return { d, n: it.length, p: it.length ? Math.round(d * 100 / it.length) : 0 }; };

let tab = LS("dm_tab") || "home";
function tabs() {
  $("#tabs").innerHTML = [["home", "Dashboard"], ...RESOURCES.map(r => [r.id, r.title])]
    .map(([id, t]) => `<button data-t="${id}" class="${tab === id ? "on" : ""}">${esc(t)}</button>`).join("");
  $("#tabs").querySelectorAll("button").forEach(b => b.onclick = () => { tab = b.dataset.t; SS("dm_tab", tab); render(); });
}
function render() { tabs(); tab === "home" ? home() : res(RESOURCES.find(r => r.id === tab) || RESOURCES[0]); }

function home() {
  $("#view").innerHTML = `<div class="grid">${RESOURCES.map(r => { const s = stats(r); return `<div class="card"><div class="mute">${r.tag}</div><b>${esc(r.title)}</b>
    <div class="bar"><i style="width:${s.p}%"></i></div><div class="mute">${s.d} / ${s.n || "?"} done · ${s.p}%</div>
    <div class="row"><button data-t="${r.id}">Open</button></div></div>` }).join("")}</div>`;
  $("#view").querySelectorAll("[data-t]").forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
}

function itemRow(r, x) {
  const k = r.id + "|" + x.key, c = done[k] ? "checked" : "";
  if (x.video) {
    const u = `https://www.youtube.com/watch?v=${x.video.id}&list=${r.playlistId}`;
    return `<label class="item ${c ? "done" : ""}"><input type="checkbox" data-k="${esc(k)}" ${c}>
      <img loading="lazy" src="https://i.ytimg.com/vi/${x.video.id}/mqdefault.jpg" alt=""><span><a href="${u}" target="_blank" rel="noopener">${esc(x.title)}</a></span></label>`;
  }
  const q = encodeURIComponent(x.title);
  return `<label class="item ${c ? "done" : ""}"><input type="checkbox" data-k="${esc(k)}" ${c}><span>${esc(x.title)}</span>
    <a class="ext mute" style="margin-left:auto" target="_blank" rel="noopener" href="https://leetcode.com/problemset/?search=${q}">LeetCode ↗</a></label>`;
}

function res(r) {
  const s = stats(r), it = itemsOf(r);
  let h = `<div class="card"><b style="font-size:18px">${esc(r.title)}</b>
    <div class="bar"><i style="width:${s.p}%"></i></div><div class="mute">${s.d} / ${s.n} done · ${s.p}%</div>
    <div class="row">${r.url ? `<a class="ext" href="${r.url}" target="_blank" rel="noopener">Open original ↗</a>` : ""}
    ${r.type === "playlist" ? `<a class="ext" href="https://www.youtube.com/playlist?list=${r.playlistId}" target="_blank" rel="noopener">Open on YouTube ↗</a><button id="reload">Load / refresh videos</button>` : ""}</div></div>`;
  if (r.type === "playlist") {
    h += it.length ? `<div class="card">${it.map(x => itemRow(r, x)).join("")}</div>`
      : `<div class="card" id="pmsg">Loading videos…</div>`;
    h += manualBox(r, "Can't auto-load? Paste video URLs (one per line) or titles:");
  } else {
    const secs = {}; it.forEach(x => (secs[x.sec] = secs[x.sec] || []).push(x));
    h += Object.entries(secs).map(([sec, xs]) => { const d = xs.filter(x => done[r.id + "|" + x.key]).length;
      return `<details class="card" ${LS("dm_open_" + r.id + sec) ? "open" : ""} data-sec="${esc(sec)}"><summary>${esc(sec)} <span class="mute">(${d}/${xs.length})</span></summary>${xs.map(x => itemRow(r, x)).join("")}</details>` }).join("");
    if (!it.length) h += `<div class="card mute">This sheet's question list isn't bundled yet — add problems below (one per line) and tick them off.</div>`;
    h += manualBox(r, "Add problems (one per line):");
  }
  $("#view").innerHTML = h;
  $("#view").querySelectorAll("input[type=checkbox]").forEach(cb => cb.onchange = () => {
    cb.checked ? done[cb.dataset.k] = true : delete done[cb.dataset.k]; save(); render(); });
  $("#view").querySelectorAll("details").forEach(d => d.ontoggle = () => SS("dm_open_" + r.id + d.dataset.sec, d.open));
  const add = $("#addbtn"); add.onclick = () => {
    const lines = $("#addtxt").value.split("\n").map(s => s.trim()).filter(Boolean);
    if (r.type === "playlist") {
      vids[r.id] = (vids[r.id] || []).concat(lines.map((l, i) => { const m = l.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
        return { id: m ? m[1] : "manual" + Date.now() + i, title: m ? "Video " + ((vids[r.id] || []).length + i + 1) : l }; }));
    } else custom[r.id] = (custom[r.id] || []).concat(lines);
    save(); render();
  };
  if (r.type === "playlist") { $("#reload").onclick = () => loadPlaylist(r, true); if (!it.length) loadPlaylist(r); }
}
const manualBox = (r, label) => `<details class="card"><summary>${label}</summary><textarea id="addtxt" rows="4"></textarea><div class="row"><button id="addbtn">Add</button></div></details>`;

// --- Playlist loading: YouTube Data API (if key set) → public Piped/Invidious mirrors ---
const PIPED = ["https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de", "https://api.piped.private.coffee"];
const INV = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de", "https://yewtu.be"];
async function viaKey(pid, key) {
  let out = [], page = "";
  do { const j = await (await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${pid}&key=${key}${page ? "&pageToken=" + page : ""}`)).json();
    if (j.error) throw j.error.message; out.push(...j.items.map(i => ({ id: i.snippet.resourceId.videoId, title: i.snippet.title }))); page = j.nextPageToken;
  } while (page); return out;
}
async function viaPiped(base, pid) {
  let j = await (await fetch(`${base}/playlists/${pid}`)).json(), out = [...j.relatedStreams], np = j.nextpage;
  while (np) { const k = await (await fetch(`${base}/nextpage/playlists/${pid}?nextpage=${encodeURIComponent(np)}`)).json(); out.push(...k.relatedStreams); np = k.nextpage; }
  return out.map(v => ({ id: v.url.split("v=")[1], title: v.title }));
}
async function viaInv(base, pid) {
  let out = [], p = 1, seen = new Set();
  for (; p < 30; p++) { const j = await (await fetch(`${base}/api/v1/playlists/${pid}?page=${p}`)).json();
    const fresh = j.videos.filter(v => !seen.has(v.videoId)); if (!fresh.length) break; fresh.forEach(v => { seen.add(v.videoId); out.push({ id: v.videoId, title: v.title }); }); }
  return out;
}
async function loadPlaylist(r, force) {
  const msg = $("#pmsg"); if (msg) msg.textContent = "Loading videos…";
  const key = LS("dm_key"), tries = [];
  if (key) tries.push(() => viaKey(r.playlistId, key));
  PIPED.forEach(b => tries.push(() => viaPiped(b, r.playlistId)));
  INV.forEach(b => tries.push(() => viaInv(b, r.playlistId)));
  for (const t of tries) { try { const v = await t(); if (v.length) { vids[r.id] = v; save(); if (tab === r.id) render(); return; } } catch (e) {} }
  const m = $("#pmsg"); if (m) m.innerHTML = `Couldn't auto-load this playlist. Add a free <b>YouTube API key</b> (button at top) for reliable loading, or paste video links below.`;
}

$("#key").onclick = () => { const k = prompt("Paste a YouTube Data API v3 key (stored only in this browser):", LS("dm_key") || ""); if (k !== null) { SS("dm_key", k.trim()); render(); } };
$("#exp").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ done, custom, vids })], { type: "application/json" })); a.download = "dsa-master-progress.json"; a.click(); };
$("#imp").onchange = async e => { try { const j = JSON.parse(await e.target.files[0].text()); done = j.done || {}; custom = j.custom || {}; vids = j.vids || {}; save(); render(); } catch { alert("Invalid file"); } };
render();
