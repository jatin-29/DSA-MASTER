// Achievements: weekly report + LeetCode-style tiered badges (computed from completion timestamps).
self.Ach = (() => {
  const DAY = 864e5, dkey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const monday = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  let wk = 0; // 0 = this week, -1 = last week, ...

  function index() { // key -> item info
    const m = {};
    sheets.forEach(S => S.topics.forEach(t => t.subs.forEach(s => s.qs.forEach(q => m[q.id] = { type: "q", title: q.title, diff: (q.difficulty || "").toLowerCase(), res: S.title, sheet: S.id, step: t.name }))));
    lists.forEach(L => L.videos.forEach(v => m[v.id] = { type: "v", title: v.title, res: L.title, dur: v.duration || 0 }));
    if (self.MC) MC.all().forEach(c => c.items.forEach(it => m[MC.key(c, it)] = { type: "v", title: it.title, res: c.title }));
    return m;
  }
  const events = idx => Object.entries(done).filter(([, t]) => t > 1e12).map(([k, t]) => ({ k, t, ...(idx[k] || { type: k.startsWith("p:") ? "q" : "q", title: k, res: "Video practice" }) })).sort((a, b) => a.t - b.t);

  // ---------- badges ----------
  const TIER = { bronze: ["#e0a36b", "#8a4f24"], silver: ["#e8ecf3", "#7d8aa3"], gold: ["#ffe27a", "#c48a0b"], diamond: ["#b9f3ff", "#3b82f6"], legend: ["#ffb3f0", "#9b2cf5"] };
  function stats(idx, ev) {
    const days = {}; ev.forEach(e => { const d = (days[dkey(e.t)] ||= { q: 0, v: 0 }); d[e.type]++; });
    const g = { q: 5, v: 2, ...(get("dm_goal") || {}) }, ds = Object.keys(days).sort();
    let best = 0, run = 0, prev = null; for (const x of ds) { run = prev && dkey(new Date(x + "T12:00").getTime() - DAY) === prev ? run + 1 : 1; best = Math.max(best, run); prev = x; }
    const weekends = new Set(); ds.forEach(x => { const d = new Date(x + "T12:00"); if (d.getDay() === 6 && days[dkey(d.getTime() + DAY)]) weekends.add(x); });
    const hrs = ev.map(e => new Date(e.t).getHours());
    const maxDay = Math.max(0, ...Object.values(days).map(d => d.q));
    const stepsDone = sheets.flatMap(S => S.topics).filter(t => { const q = t.subs.flatMap(s => s.qs); return q.length && q.every(x => isD(x.id)); }).length;
    const sheetsDone = sheets.filter(S => { const q = S.topics.flatMap(t => t.subs.flatMap(s => s.qs)); return q.length && q.every(x => isD(x.id)); }).length;
    const coursesDone = lists.filter(L => L.videos.length && L.videos.every(v => isD(v.id))).length;
    return { q: ev.filter(e => e.type === "q").length, v: ev.filter(e => e.type === "v").length, hard: ev.filter(e => e.diff === "hard").length, medium: ev.filter(e => e.diff === "medium").length,
      best, active: ds.length, goal: ds.filter(x => days[x].q >= g.q && days[x].v >= g.v && g.q + g.v > 0).length, weekends: weekends.size,
      owl: hrs.filter(h => h < 4).length, early: hrs.filter(h => h >= 5 && h < 7).length, maxDay, stepsDone, sheetsDone, coursesDone,
      hours: Math.round(ev.filter(e => e.type === "v").reduce((a, e) => a + (e.dur || 0), 0) / 3600) };
  }
  const B = [ // id, name, icon, stat, tiers[[need, tier]], description
    ["streak", "On Fire", "🔥", "best", [[3, "bronze"], [7, "silver"], [30, "gold"], [100, "diamond"], [365, "legend"]], n => `Keep a ${n}-day streak`],
    ["solver", "Problem Solver", "⚔️", "q", [[1, "bronze"], [50, "silver"], [150, "gold"], [400, "diamond"], [1000, "legend"]], n => `Solve ${n} question${n > 1 ? "s" : ""}`],
    ["hard", "Hard Hitter", "💀", "hard", [[1, "bronze"], [10, "silver"], [50, "gold"], [100, "diamond"]], n => `Solve ${n} Hard question${n > 1 ? "s" : ""}`],
    ["medium", "Middle Path", "🧭", "medium", [[10, "bronze"], [50, "silver"], [150, "gold"]], n => `Solve ${n} Medium questions`],
    ["watcher", "Binge Learner", "🎬", "v", [[1, "bronze"], [25, "silver"], [100, "gold"], [250, "diamond"]], n => `Watch ${n} video${n > 1 ? "s" : ""}`],
    ["hours", "Deep Focus", "⏱️", "hours", [[5, "bronze"], [25, "silver"], [100, "gold"]], n => `Watch ${n} hours of lectures`],
    ["goal", "Goal Getter", "🎯", "goal", [[1, "bronze"], [7, "silver"], [30, "gold"], [100, "diamond"]], n => `Hit your daily goal on ${n} day${n > 1 ? "s" : ""}`],
    ["active", "Consistent", "📆", "active", [[10, "bronze"], [50, "silver"], [150, "gold"], [300, "diamond"]], n => `Be active on ${n} days`],
    ["sprint", "Sprinter", "⚡", "maxDay", [[10, "bronze"], [20, "silver"], [40, "gold"]], n => `Solve ${n} questions in one day`],
    ["step", "Step Master", "🧱", "stepsDone", [[1, "bronze"], [5, "silver"], [15, "gold"]], n => `Finish ${n} complete step${n > 1 ? "s" : ""}/topic${n > 1 ? "s" : ""}`],
    ["sheet", "Sheet Conqueror", "👑", "sheetsDone", [[1, "gold"], [2, "diamond"], [3, "legend"]], n => `Finish ${n} entire sheet${n > 1 ? "s" : ""}`],
    ["course", "Course Complete", "🎓", "coursesDone", [[1, "silver"], [3, "gold"], [5, "diamond"]], n => `Finish ${n} full course${n > 1 ? "s" : ""}`],
    ["weekend", "Weekend Warrior", "🛡️", "weekends", [[1, "bronze"], [4, "silver"], [12, "gold"]], n => `Study on both Sat & Sun, ${n} weekend${n > 1 ? "s" : ""}`],
    ["owl", "Night Owl", "🦉", "owl", [[1, "bronze"], [25, "silver"]], n => `Complete ${n} item${n > 1 ? "s" : ""} after midnight`],
    ["early", "Early Bird", "🌅", "early", [[1, "bronze"], [25, "silver"]], n => `Complete ${n} item${n > 1 ? "s" : ""} between 5–7 AM`],
  ];
  function evaluate() {
    const idx = index(), ev = events(idx), st = stats(idx, ev), earned = get("dm_badges") || {}, fresh = [];
    const list = B.map(([id, name, icon, k, tiers, desc]) => {
      const val = st[k] || 0, lvl = tiers.filter(([n]) => val >= n).length;
      for (let i = 0; i < lvl; i++) { const key = id + ":" + i; if (!earned[key]) { earned[key] = Date.now(); fresh.push({ name, icon, tier: tiers[i][1], desc: desc(tiers[i][0]) }); } }
      return { id, name, icon, val, lvl, tiers, desc, next: tiers[lvl] };
    });
    if (fresh.length) { put("dm_badges", earned); if (self.Sync) Sync.push(); }
    return { list, earned, st, fresh, idx, ev };
  }
  const medal = (icon, tier, size = 88, locked = false) => { const [a, b] = TIER[tier] || ["#555", "#333"], id = "g" + Math.random().toString(36).slice(2, 8);
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="medal ${locked ? "locked" : ""}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <polygon points="50,3 91,26 91,74 50,97 9,74 9,26" fill="url(#${id})"/><polygon points="50,13 82,31 82,69 50,87 18,69 18,31" fill="#1b1b1b" opacity=".82"/>
      <polygon points="50,13 82,31 82,69 50,87 18,69 18,31" fill="none" stroke="${a}" stroke-opacity=".6" stroke-width="1.5"/>
      <text x="50" y="60" text-anchor="middle" font-size="30">${icon}</text></svg>`; };

  function toast(items) {
    items.slice(0, 3).forEach((b, n) => setTimeout(() => {
      const el = document.createElement("div"); el.className = "btoast";
      el.innerHTML = `${medal(b.icon, b.tier, 64)}<div><small>Badge unlocked · ${b.tier}</small><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`;
      document.body.appendChild(el); setTimeout(() => el.classList.add("show"), 30); setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 500); }, 4500);
    }, n * 900));
  }
  function check() { const r = evaluate(); if (r.fresh.length) toast(r.fresh); }

  // ---------- weekly report ----------
  function week(ev, offset) {
    const s = monday(Date.now()) + offset * 7 * DAY, e = s + 7 * DAY, w = ev.filter(x => x.t >= s && x.t < e);
    const days = [...Array(7)].map((_, i) => { const t = s + i * DAY, k = dkey(t + DAY / 2), its = w.filter(x => dkey(x.t) === k); return { t, q: its.filter(x => x.type === "q").length, v: its.filter(x => x.type === "v").length }; });
    const res = {}; w.forEach(x => res[x.res] = (res[x.res] || 0) + 1);
    return { s, e, w, days, q: w.filter(x => x.type === "q").length, v: w.filter(x => x.type === "v").length, active: days.filter(d => d.q + d.v).length,
      diff: ["easy", "medium", "hard"].map(k => w.filter(x => x.diff === k).length), mins: Math.round(w.filter(x => x.type === "v").reduce((a, x) => a + (x.dur || 0), 0) / 60),
      top: Object.entries(res).sort((a, b) => b[1] - a[1]).slice(0, 4) };
  }
  const delta = (a, b) => b === 0 ? (a ? `<span class="up">new</span>` : `<span class="mute">—</span>`) : a === b ? `<span class="mute">same</span>` : a > b ? `<span class="up">▲ ${Math.round((a - b) * 100 / b)}%</span>` : `<span class="down">▼ ${Math.round((b - a) * 100 / b)}%</span>`;
  function chart(days) {
    const max = Math.max(4, ...days.map(d => d.q + d.v)), H = 140, W = 44;
    return `<svg class="wchart" viewBox="0 0 ${7 * W + 10} ${H + 34}">${days.map((d, i) => { const x = 10 + i * W, hq = d.q / max * H, hv = d.v / max * H, today = dkey(d.t + DAY / 2) === dkey(Date.now());
      return `<g><rect x="${x}" y="0" width="28" height="${H}" rx="5" fill="#2a2a2a"/><rect x="${x}" y="${H - hq}" width="28" height="${hq}" rx="5" fill="var(--green)"><title>${d.q} questions</title></rect>
        <rect x="${x}" y="${H - hq - hv}" width="28" height="${hv}" rx="5" fill="#5ca7ff"><title>${d.v} videos</title></rect>
        ${d.q + d.v ? `<text x="${x + 14}" y="${H - hq - hv - 5}" text-anchor="middle" class="wv">${d.q + d.v}</text>` : ""}
        <text x="${x + 14}" y="${H + 18}" text-anchor="middle" class="${today ? "wt" : "wl"}">${new Date(d.t).toLocaleDateString("en", { weekday: "short" })}</text></g>`; }).join("")}</svg>`;
  }

  function render() {
    const { list, earned, st, ev } = evaluate(), cur = week(ev, wk), prev = week(ev, wk - 1);
    const fmt = t => new Date(t).toLocaleDateString("en", { day: "numeric", month: "short" });
    const bestDay = cur.days.reduce((a, d) => d.q + d.v > a.q + a.v ? d : a, cur.days[0]);
    const nEarned = list.reduce((a, b) => a + b.lvl, 0), nAll = list.reduce((a, b) => a + b.tiers.length, 0);
    const recap = `📊 My DSA week (${fmt(cur.s)} – ${fmt(cur.e - DAY)}): ${cur.q} questions, ${cur.v} videos, ${cur.active}/7 active days, best streak ${st.best} 🔥 — via DSA Master`;
    $("#view").innerHTML = `
    <div class="top"><div class="panel" style="flex:1"><div class="big">🏆 Achievements</div><div class="mute">Weekly report and badges — earned from everything you tick.</div></div></div>
    <div class="panel"><div class="ph"><b>📈 Weekly report</b><div class="row"><button class="chip" id="w-prev">◀</button><span class="mute">${wk === 0 ? "This week" : wk === -1 ? "Last week" : `${-wk} weeks ago`} · ${fmt(cur.s)} – ${fmt(cur.e - DAY)}</span><button class="chip" id="w-next" ${wk >= 0 ? "disabled" : ""}>▶</button></div></div>
      <div class="wgrid">
        <div class="wk"><span class="mute">Questions</span><b>${cur.q}</b>${delta(cur.q, prev.q)}</div>
        <div class="wk"><span class="mute">Videos</span><b>${cur.v}</b>${delta(cur.v, prev.v)}</div>
        <div class="wk"><span class="mute">Active days</span><b>${cur.active}<small>/7</small></b>${delta(cur.active, prev.active)}</div>
        <div class="wk"><span class="mute">Watch time</span><b>${cur.mins >= 60 ? Math.floor(cur.mins / 60) + "h " + (cur.mins % 60) + "m" : cur.mins + "m"}</b>${delta(cur.mins, prev.mins)}</div>
      </div>
      <div class="wbody"><div>${chart(cur.days)}<div class="vz-legend"><span><i style="background:var(--green)"></i>questions</span><span><i style="background:#5ca7ff"></i>videos</span></div></div>
        <div class="wside">
          <div class="lbl2">Difficulty</div>${["Easy", "Medium", "Hard"].map((l, i) => `<div class="gp"><span style="color:${DIFF[l.toLowerCase()][1]}">${l}</span><b>${cur.diff[i]}</b></div>`).join("")}
          <div class="lbl2">Top resources</div>${cur.top.map(([r, n]) => `<div class="gp"><span>${esc(r)}</span><b>${n}</b></div>`).join("") || `<span class="mute">Nothing yet this week</span>`}
          ${cur.q + cur.v ? `<div class="lbl2">Best day</div><div>${new Date(bestDay.t).toLocaleDateString("en", { weekday: "long" })} — ${bestDay.q + bestDay.v} items</div>` : ""}
          <button class="chip" id="w-copy" style="margin-top:14px">📋 Copy weekly recap</button></div></div></div>
    <div class="panel"><div class="ph"><b>🎖️ Badges</b><span class="mute">${nEarned} / ${nAll} unlocked</span></div>
      <div class="bgrid">${list.map(b => { const tier = b.lvl ? b.tiers[b.lvl - 1][1] : b.tiers[0][1], nx = b.next, when = b.lvl ? earned[b.id + ":" + (b.lvl - 1)] : 0;
        return `<div class="badge ${b.lvl ? "" : "off"}">${medal(b.icon, tier, 88, !b.lvl)}<b>${esc(b.name)}</b>
          <div class="pips">${b.tiers.map(([, t], i) => `<i style="background:${i < b.lvl ? TIER[t][1] : "#333"}" title="${t}"></i>`).join("")}</div>
          <small class="mute">${b.lvl ? `${tier[0].toUpperCase() + tier.slice(1)}${when ? " · " + fmt(when) : ""}` : "Locked"}</small>
          ${nx ? `<div class="bnext"><span>${esc(b.desc(nx[0]))}</span><div class="bar"><i style="width:${Math.min(100, b.val * 100 / nx[0])}%;background:${TIER[nx[1]][1]}"></i></div><small class="mute">${Math.min(b.val, nx[0])} / ${nx[0]}</small></div>` : `<div class="bnext"><span class="up">Max tier reached 🎉</span></div>`}</div>`; }).join("")}</div></div>`;
    $("#w-prev").onclick = () => { wk--; render(); }; $("#w-next").onclick = () => { if (wk < 0) { wk++; render(); } };
    $("#w-copy").onclick = () => navigator.clipboard.writeText(recap).then(() => $("#w-copy").textContent = "✓ Copied", () => prompt("Copy this:", recap));
  }
  function strip() { // small row of latest badges for the dashboard
    const { list, earned } = evaluate(), got = list.filter(b => b.lvl).map(b => ({ ...b, tier: b.tiers[b.lvl - 1][1], at: earned[b.id + ":" + (b.lvl - 1)] || 0 })).sort((a, b) => b.at - a.at).slice(0, 6);
    return got.length ? got.map(b => `<span class="mini" title="${esc(b.name)} · ${b.tier}">${medal(b.icon, b.tier, 44)}</span>`).join("") : `<span class="mute">Tick your first question to earn a badge.</span>`;
  }
  return { render, check, strip };
})();
