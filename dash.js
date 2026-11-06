// Dashboard: overall progress, streak + yearly heatmap, daily goal & today's plan, contest calendar, CF/LC profile stats.
const Dash = (() => {
  const day = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const today = () => day(Date.now());
  const goal = () => ({ q: 5, v: 2, sheet: sheets[0] && sheets[0].id, list: lists[0] && lists[0].id, ...(get("dm_goal") || {}) });
  const handles = () => ({ cf: "", lc: "", ...(get("dm_handles") || {}) });
  const allQs = S => S.topics.flatMap(t => t.subs.flatMap(s => s.qs.map(x => ({ ...x, step: t.name }))));

  function activity() { // { "YYYY-MM-DD": {q, v} } from completion timestamps
    const a = {};
    for (const [k, t] of Object.entries(done)) if (t > 1e12) { const d = (a[day(t)] ||= { q: 0, v: 0 }); videoIds.has(k) ? d.v++ : d.q++; }
    return a;
  }
  function streaks(a) {
    const has = d => a[d] && a[d].q + a[d].v > 0, back = (d, n) => day(new Date(d + "T12:00").getTime() - n * 864e5);
    let cur = 0, d = has(today()) ? today() : back(today(), 1);
    while (has(d)) { cur++; d = back(d, 1); }
    const days = Object.keys(a).filter(has).sort(); let best = 0, run = 0, prev = null;
    for (const x of days) { run = prev && back(x, 1) === prev ? run + 1 : 1; best = Math.max(best, run); prev = x; }
    return { cur, best, active: days.length };
  }
  function heatmap(a) {
    const end = new Date(); end.setHours(12, 0, 0, 0); const start = new Date(end.getTime() - 364 * 864e5); start.setDate(start.getDate() - start.getDay());
    const S = 12, G = 3, lvl = n => n === 0 ? "#2d2d2d" : n < 3 ? "#0e4429" : n < 6 ? "#006d32" : n < 10 ? "#26a641" : "#39d353";
    let cells = "", months = "", lastM = -1, w = 0;
    for (let t = start.getTime(); t <= end.getTime(); t += 864e5) {
      const d = new Date(t), dw = d.getDay(); w = Math.floor((t - start.getTime()) / (7 * 864e5)); const k = day(t), n = a[k] ? a[k].q + a[k].v : 0;
      if (dw === 0 && d.getMonth() !== lastM) { lastM = d.getMonth(); months += `<text x="${30 + w * (S + G)}" y="10">${d.toLocaleString("en", { month: "short" })}</text>`; }
      cells += `<rect x="${30 + w * (S + G)}" y="${16 + dw * (S + G)}" width="${S}" height="${S}" rx="2" fill="${lvl(n)}"><title>${k}: ${n ? `${a[k].q} questions, ${a[k].v} videos` : "no activity"}</title></rect>`;
    }
    const W = 30 + (w + 1) * (S + G);
    return `<svg class="heat" viewBox="0 0 ${W} ${16 + 7 * (S + G)}" style="min-width:${W}px">${months}${["Mon", "Wed", "Fri"].map((l, i) => `<text x="0" y="${16 + (i * 2 + 1) * (S + G) + 10}">${l}</text>`).join("")}${cells}</svg>`;
  }

  // ---------- contests ----------
  let contests = null;
  const lcEstimates = () => { const out = [], now = Date.now();
    let w = new Date(); w.setUTCHours(2, 30, 0, 0); w.setUTCDate(w.getUTCDate() + ((7 - w.getUTCDay()) % 7)); if (w < now) w.setUTCDate(w.getUTCDate() + 7);
    out.push({ platform: "LeetCode", name: "Weekly Contest (estimated)", start: +w, duration: 5400, url: "https://leetcode.com/contest/" });
    let b = Date.UTC(2023, 2, 18, 14, 30); while (b < now) b += 14 * 864e5;
    out.push({ platform: "LeetCode", name: "Biweekly Contest (estimated)", start: b, duration: 5400, url: "https://leetcode.com/contest/" });
    return out; };
  async function loadContests() {
    if (contests) return contests;
    let list = await fetch("contests.json").then(r => r.ok ? r.json() : []).catch(() => []);
    try { const j = await (await fetch("https://codeforces.com/api/contest.list?gym=false")).json();
      if (j.status === "OK") list = list.filter(c => c.platform !== "Codeforces").concat(j.result.filter(c => c.phase === "BEFORE").map(c => ({ platform: "Codeforces", name: c.name, start: c.startTimeSeconds * 1000, duration: c.durationSeconds, url: "https://codeforces.com/contests/" + c.id }))); } catch {}
    if (!list.some(c => c.platform === "LeetCode")) list = list.concat(lcEstimates());
    return contests = list.filter(c => c.start + c.duration * 1000 > Date.now()).sort((a, b) => a.start - b.start);
  }
  const PC = { Codeforces: "#3b82f6", LeetCode: "#ffa116", CodeChef: "#b07a4e" };
  const left = t => { const s = Math.max(0, (t - Date.now()) / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return s === 0 ? "live now" : d ? `in ${d}d ${h}h` : h ? `in ${h}h ${m}m` : `in ${m}m`; };
  const gcal = c => { const f = t => new Date(t).toISOString().replace(/[-:]|\.\d{3}/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(c.platform + ": " + c.name)}&dates=${f(c.start)}/${f(c.start + c.duration * 1000)}&details=${encodeURIComponent(c.url)}`; };

  // ---------- profiles ----------
  async function fetchProfiles() {
    const h = handles(), out = { at: Date.now() };
    if (h.cf) try {
      const [info, st] = await Promise.all([fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(h.cf)}`).then(r => r.json()), fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(h.cf)}`).then(r => r.json())]);
      if (info.status !== "OK") throw new Error(info.comment);
      const u = info.result[0], solved = new Set((st.result || []).filter(s => s.verdict === "OK").map(s => `${s.problem.contestId}${s.problem.index}`));
      out.cf = { handle: u.handle, rating: u.rating, max: u.maxRating, rank: u.rank, maxRank: u.maxRank, solved: solved.size, avatar: u.titlePhoto };
    } catch (e) { out.cf = { error: "Codeforces: " + (e.message || "couldn't load") }; }
    if (h.lc) {
      const tries = [async () => { const j = await (await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(h.lc)}/solved`)).json();
          if (j.solvedProblem == null) throw 0; let c = {}; try { c = await (await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(h.lc)}/contest`)).json(); } catch {}
          return { total: j.solvedProblem, easy: j.easySolved, medium: j.mediumSolved, hard: j.hardSolved, rating: c.contestRating && Math.round(c.contestRating) }; },
        async () => { const j = await (await fetch(`https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(h.lc)}`)).json();
          if (j.status !== "success") throw 0; return { total: j.totalSolved, easy: j.easySolved, medium: j.mediumSolved, hard: j.hardSolved }; }];
      for (const t of tries) { try { out.lc = { user: h.lc, ...(await t()) }; break; } catch {} }
      if (!out.lc) out.lc = { error: "LeetCode: couldn't load (public stats services may be down — try again later)" };
    }
    put("dm_prof", out); return out;
  }

  // ---------- render ----------
  function render() {
    const a = activity(), st = streaks(a), t = a[today()] || { q: 0, v: 0 }, g = goal(), h = handles(), prof = get("dm_prof");
    const totQ = sheets.flatMap(allQs), totV = lists.flatMap(l => l.videos);
    const dq = totQ.filter(x => isD(x.id)).length, dv = totV.filter(x => isD(x.id)).length;
    const S = sheets.find(x => x.id === g.sheet), L = lists.find(x => x.id === g.list);
    const nextQ = S ? allQs(S).filter(x => !isD(x.id)).slice(0, Math.max(0, g.q - t.q)) : [];
    const nextV = L ? L.videos.map((v, i) => ({ ...v, i })).filter(v => !isD(v.id)).slice(0, Math.max(0, g.v - t.v)) : [];
    const bar = (d, n, c = "var(--green)") => `<div class="bar"><i style="width:${pct(d, n)}%;background:${c}"></i></div>`;
    const res = (x, d, n, icon) => `<div class="drow" data-go="${esc(x.id)}"><span>${icon} ${esc(x.title)}</span><span class="mute">${d}/${n} · ${pct(d, n)}%</span>${bar(d, n)}</div>`;
    $("#view").innerHTML = `
    <div class="top"><div class="panel" style="flex:1"><div class="big">Welcome back 👋</div><div class="mute">${new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}</div></div></div>
    <div class="dgrid">
      <div class="panel kpi"><span class="mute">Current streak</span><b>🔥 ${st.cur} day${st.cur === 1 ? "" : "s"}</b><small class="mute">Best ${st.best} · ${st.active} active days</small></div>
      <div class="panel kpi"><span class="mute">Questions solved</span><b>${dq}<small class="mute"> / ${totQ.length}</small></b>${bar(dq, totQ.length)}</div>
      <div class="panel kpi"><span class="mute">Videos watched</span><b>${dv}<small class="mute"> / ${totV.length}</small></b>${bar(dv, totV.length, "#5ca7ff")}</div>
      <div class="panel kpi"><span class="mute">Today</span><b>${t.q} Q · ${t.v} V</b><small class="mute">Goal ${g.q} Q · ${g.v} V</small></div>
    </div>
    <div class="panel"><div class="ph"><b>Activity</b><span class="mute">Last 12 months · counts questions & videos you completed</span></div><div class="heatwrap">${heatmap(a)}</div></div>
    <div class="dcols">
      <div class="panel"><div class="ph"><b>🎯 Daily goal</b><span class="mute sm" id="g-saved"></span></div>
        <div class="gform">
          <div class="gnum"><span>Questions / day</span><div><button data-step="q:-1">−</button><b id="g-q">${g.q}</b><button data-step="q:1">+</button></div></div>
          <div class="gnum"><span>Videos / day</span><div><button data-step="v:-1">−</button><b id="g-v">${g.v}</b><button data-step="v:1">+</button></div></div>
          <label>From sheet <select id="g-s">${sheets.map(x => `<option value="${esc(x.id)}" ${x.id === g.sheet ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select></label>
          <label>From course <select id="g-l">${lists.map(x => `<option value="${esc(x.id)}" ${x.id === g.list ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select></label></div>
        <div class="gp"><span>Questions</span><span class="mute">${Math.min(t.q, g.q)}/${g.q}</span></div>${bar(t.q, g.q || 1)}
        <div class="gp"><span>Videos</span><span class="mute">${Math.min(t.v, g.v)}/${g.v}</span></div>${bar(t.v, g.v || 1, "#5ca7ff")}
        <div class="lbl2">Today's plan</div>
        ${!nextQ.length && !nextV.length ? `<div class="done-msg">🎉 Goal complete for today! Anything more is a bonus.</div>` : ""}
        <table class="plan"><tbody>${nextQ.map(x => `<tr>${tick(x.id, "Mark solved")}<td>${x.url ? A(x.url, esc(x.title)) : esc(x.title)}<div class="mute sm">${esc(S.title)} · ${esc(x.step)}</div></td>
          <td class="df" style="color:${(DIFF[(x.difficulty || "").toLowerCase()] || [0, "var(--mute)"])[1]}">${esc(x.difficulty || "")}</td></tr>`).join("")}
          ${nextV.map(v => `<tr>${tick(v.id, "Mark watched")}<td><a class="play" data-pv="${v.i}">▶ ${esc(v.title)}</a><div class="mute sm">${esc(L.title)}${v.duration ? " · " + dur(v.duration) : ""}</div></td><td></td></tr>`).join("")}</tbody></table></div>
      <div class="panel"><div class="ph"><b>📅 Upcoming contests</b><span class="mute" id="c-src"></span></div><div id="c-list" class="mute">Loading…</div></div>
    </div>
    <div class="dcols">
      <div class="panel"><div class="ph"><b>📊 Coding profiles</b><span class="mute">${prof ? "updated " + new Date(prof.at).toLocaleString() : ""}</span></div>
        <div class="row"><input id="p-cf" placeholder="Codeforces handle" value="${esc(h.cf)}"><input id="p-lc" placeholder="LeetCode username" value="${esc(h.lc)}"><button class="go" id="p-go">Load stats</button></div>
        <div id="p-out">${profile(prof)}</div></div>
      <div class="panel"><div class="ph"><b>📚 All resources</b></div>${sheets.map(x => { const q = allQs(x); return res(x, q.filter(y => isD(y.id)).length, q.length, "📋"); }).join("")}
        ${lists.map(x => res(x, x.videos.filter(y => isD(y.id)).length, x.videos.length, "▶")).join("")}</div>
    </div>`;
    $("#view").querySelectorAll(".tick").forEach(b => b.onclick = () => { toggleDone(b.dataset.v); render(); });
    $("#view").querySelectorAll("[data-go]").forEach(el => el.onclick = () => go(el.dataset.go));
    $("#view").querySelectorAll("[data-pv]").forEach(el => el.onclick = () => Player.open(L.videos.map(v => ({ key: v.id, vid: v.id, title: v.title, section: v.section, dur: dur(v.duration) })), +el.dataset.pv, L.title));
    const saveGoal = ng => { if (self.Sync) Sync.settingsTouched(); put("dm_goal", ng); if (self.Sync) Sync.push(); render(); const m = $("#g-saved"); if (m) m.textContent = "Saved ✓"; };
    $("#view").querySelectorAll("[data-step]").forEach(btn => btn.onclick = () => { const [k, d] = btn.dataset.step.split(":"), ng = goal();
      ng[k] = Math.max(0, Math.min(k === "q" ? 50 : 20, ng[k] + +d)); saveGoal(ng); });
    $("#g-s").onchange = e => saveGoal({ ...goal(), sheet: e.target.value });
    $("#g-l").onchange = e => saveGoal({ ...goal(), list: e.target.value });
    $("#p-go").onclick = async () => { if (self.Sync) Sync.settingsTouched(); put("dm_handles", { cf: $("#p-cf").value.trim(), lc: $("#p-lc").value.trim() }); if (self.Sync) Sync.push();
      $("#p-out").innerHTML = `<span class="mute">Loading… (LeetCode can take ~30s)</span>`; $("#p-out").innerHTML = profile(await fetchProfiles()); };
    loadContests().then(cs => { const el = $("#c-list"); if (!el) return;
      el.className = ""; el.innerHTML = cs.slice(0, 12).map(c => `<div class="contest"><span class="pf" style="background:${PC[c.platform] || "#666"}">${esc(c.platform)}</span>
        <div class="cn">${A(c.url, esc(c.name))}<div class="mute sm">${new Date(c.start).toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${Math.round(c.duration / 60)} min</div></div>
        <div class="cl"><b>${left(c.start)}</b>${A(gcal(c), "+ Calendar", "lnk sm")}</div></div>`).join("") || "No upcoming contests found."; });
  }
  function profile(p) {
    if (!p) return `<p class="mute">Enter your usernames to see rating and solved counts.</p>`;
    let h = "";
    if (p.cf) h += p.cf.error ? `<p class="bad">${esc(p.cf.error)}</p>` : `<div class="prof"><img src="${esc(p.cf.avatar)}" alt=""><div><b>${A("https://codeforces.com/profile/" + p.cf.handle, esc(p.cf.handle))}</b> <span class="mute">Codeforces · ${esc(p.cf.rank || "unrated")}</span>
      <div class="pstats"><span><b>${p.cf.rating ?? "—"}</b>rating</span><span><b>${p.cf.max ?? "—"}</b>max (${esc(p.cf.maxRank || "")})</span><span><b>${p.cf.solved}</b>solved</span></div></div></div>`;
    if (p.lc) h += p.lc.error ? `<p class="bad">${esc(p.lc.error)}</p>` : `<div class="prof"><div class="lcav">LC</div><div><b>${A("https://leetcode.com/u/" + p.lc.user, esc(p.lc.user))}</b> <span class="mute">LeetCode</span>
      <div class="pstats"><span><b>${p.lc.total}</b>solved</span><span style="color:#00b8a3"><b>${p.lc.easy}</b>easy</span><span style="color:#ffc01e"><b>${p.lc.medium}</b>medium</span><span style="color:#ff375f"><b>${p.lc.hard}</b>hard</span>${p.lc.rating ? `<span><b>${p.lc.rating}</b>contest rating</span>` : ""}</div></div></div>`;
    return h;
  }
  return { render };
})();
