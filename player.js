// Distraction-free in-site video player (YouTube IFrame API, privacy-enhanced domain).
const Player = (() => {
  let Q = [], i = 0, yt = null, ctx = "", apiReady = null;
  const ytId = u => { const m = String(u || "").match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m && m[1]; };
  const ytStart = u => { const m = String(u || "").match(/[?&#]t=(?:(\d+)h)?(?:(\d+)m)?(\d+)s?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
  const api = () => apiReady || (apiReady = new Promise(res => {
    if (window.YT && YT.Player) return res();
    window.onYouTubeIframeAPIReady = res;
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
  }));
  function shell() {
    if ($("#pl")) return;
    document.body.insertAdjacentHTML("beforeend", `<div id="pl" hidden><div class="pl-top"><button id="pl-x" title="Close (Esc)">✕</button><div class="pl-ctx" id="pl-ctx"></div></div>
      <div class="pl-main"><div class="pl-left"><div class="pl-frame"><div id="pl-yt"></div></div>
        <div class="pl-bar"><div><div class="pl-title" id="pl-title"></div><div class="mute" id="pl-sub"></div></div>
          <div class="pl-btns"><button id="pl-prev">◀ Prev</button><button id="pl-done"></button><button id="pl-next" class="pri">Next ▶</button></div></div>
        <label class="pl-auto mute"><input type="checkbox" id="pl-autonext"> Auto-play next & mark complete when a video ends</label></div>
      <div class="pl-list" id="pl-list"></div></div></div>`);
    $("#pl-x").onclick = close; $("#pl-prev").onclick = () => go(i - 1); $("#pl-next").onclick = () => go(i + 1);
    $("#pl-done").onclick = () => { toggle(Q[i].key); paint(); };
    const an = $("#pl-autonext"); an.checked = get("dm_autonext") !== false; an.onchange = () => put("dm_autonext", an.checked);
    document.addEventListener("keydown", e => { if ($("#pl").hidden || /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === "Escape") close(); if (e.key === "n" || e.key === "N") go(i + 1); if (e.key === "p" || e.key === "P") go(i - 1); });
  }
  const toggle = k => toggleDone(k);
  function paint() {
    const v = Q[i], d = isD(v.key);
    $("#pl-ctx").textContent = ctx; $("#pl-title").textContent = v.title; $("#pl-sub").textContent = `${i + 1} / ${Q.length}${v.section ? " · " + v.section : ""}`;
    $("#pl-done").textContent = d ? "✓ Completed" : "Mark complete"; $("#pl-done").className = d ? "ok" : "";
    $("#pl-prev").disabled = i === 0; $("#pl-next").disabled = i === Q.length - 1;
    $("#pl-list").innerHTML = Q.map((x, n) => `<div class="pl-item ${n === i ? "on" : ""} ${isD(x.key) ? "dn" : ""}" data-n="${n}">
      <img loading="lazy" src="https://i.ytimg.com/vi/${esc(x.vid)}/mqdefault.jpg" alt=""><div><span>${isD(x.key) ? "✓ " : ""}${n + 1}. ${esc(x.title)}</span>${x.dur ? `<small class="mute">${esc(x.dur)}</small>` : ""}</div></div>`).join("");
    $("#pl-list").querySelectorAll(".pl-item").forEach(el => el.onclick = () => go(+el.dataset.n));
    const on = $("#pl-list .on"); if (on) on.scrollIntoView({ block: "nearest" });
  }
  async function go(n) {
    if (n < 0 || n >= Q.length) return; i = n; paint();
    await api(); const v = Q[i], vars = { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, start: v.start || 0 };
    if (yt && yt.loadVideoById) return yt.loadVideoById({ videoId: v.vid, startSeconds: v.start || 0 });
    yt = new YT.Player("pl-yt", { host: "https://www.youtube-nocookie.com", videoId: v.vid, playerVars: vars,
      events: { onStateChange: e => { if (e.data === YT.PlayerState.ENDED && $("#pl-autonext").checked) {
        if (!isD(Q[i].key)) toggle(Q[i].key); i < Q.length - 1 ? go(i + 1) : paint(); } } } });
  }
  function open(queue, start, title) {
    Q = queue.filter(x => x.vid); if (!Q.length) return; shell(); ctx = title || "";
    const k = queue[start] && queue[start].key; i = Math.max(0, Q.findIndex(x => x.key === k));
    $("#pl").hidden = false; document.body.classList.add("noscroll"); go(i);
  }
  function close() { if (yt && yt.stopVideo) yt.stopVideo(); $("#pl").hidden = true; document.body.classList.remove("noscroll"); render(); }
  return { open, ytId, ytStart };
})();
