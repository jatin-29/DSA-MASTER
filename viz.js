// Visualizer: ready-made algorithm dry-runs + AI (Mistral) dry-run of any problem.
// Every algorithm yields "frames": { line, note, vars, array?, grid?, stack? } rendered by one player.
const V = (() => {
  const C = { active: "#ffa116", found: "#2cbb5d", visited: "#3b5bdb", path: "#ae3ec9", bad: "#ff375f", dim: "#3a3a3a" };
  const nums = s => s.split(/[\s,]+/).filter(Boolean).map(Number);
  const gridOf = s => s.trim().split(/\n|;/).map(r => r.trim().split(/[\s,]*/).filter(Boolean));
  const snap = o => JSON.parse(JSON.stringify(o));

  const ALGOS = {
    "binary-search": {
      name: "Binary Search", inputs: [["Sorted array", "1 3 5 7 9 11 13 15"], ["Target", "11"]],
      code: ["lo = 0, hi = n - 1", "while lo <= hi:", "  mid = (lo + hi) / 2", "  if a[mid] == target: return mid", "  if a[mid] < target: lo = mid + 1", "  else: hi = mid - 1", "return -1"],
      run([a, t]) { a = nums(a); t = +t; const F = [], f = (line, note, lo, hi, mid, hl = {}) => {
          for (let i = 0; i < a.length; i++) if (i < lo || i > hi) hl[i] ??= "dim";
          F.push({ line, note, vars: { lo, hi, mid, target: t }, array: { values: a, hl, ptr: { lo, hi, ...(mid >= 0 ? { mid } : {}) } } }); };
        let lo = 0, hi = a.length - 1; f(0, "Search space is the whole array", lo, hi, -1);
        while (lo <= hi) { const m = (lo + hi) >> 1; f(2, `mid = ${m}, a[mid] = ${a[m]}`, lo, hi, m, { [m]: "active" });
          if (a[m] === t) { f(3, `Found ${t} at index ${m} 🎉`, lo, hi, m, { [m]: "found" }); return F; }
          if (a[m] < t) { lo = m + 1; f(4, `${a[m]} < ${t} → discard left half`, lo, hi, -1); } else { hi = m - 1; f(5, `${a[m]} > ${t} → discard right half`, lo, hi, -1); } }
        f(6, "Not found", lo, hi, -1); return F; } },
    "two-pointers": {
      name: "Two Sum (sorted, two pointers)", inputs: [["Sorted array", "1 2 4 6 8 11 15"], ["Target", "14"]],
      code: ["i = 0, j = n - 1", "while i < j:", "  s = a[i] + a[j]", "  if s == target: return (i, j)", "  if s < target: i++", "  else: j--"],
      run([a, t]) { a = nums(a); t = +t; const F = []; let i = 0, j = a.length - 1;
        const f = (line, note, hl = {}) => F.push({ line, note, vars: { i, j, sum: a[i] + a[j], target: t }, array: { values: a, hl: { [i]: "active", [j]: "active", ...hl }, ptr: { i, j } } });
        f(0, "Start pointers at both ends");
        while (i < j) { const s = a[i] + a[j]; f(2, `a[i] + a[j] = ${a[i]} + ${a[j]} = ${s}`);
          if (s === t) { f(3, "Pair found 🎉", { [i]: "found", [j]: "found" }); return F; }
          if (s < t) { i++; f(4, "Sum too small → move i right"); } else { j--; f(5, "Sum too big → move j left"); } }
        f(1, "No pair"); return F; } },
    "sliding-window": {
      name: "Max Sum Subarray of size K", inputs: [["Array", "2 1 5 1 3 2 9 1"], ["K", "3"]],
      code: ["sum = a[0..k-1], best = sum", "for r = k .. n-1:", "  sum += a[r] - a[r-k]", "  best = max(best, sum)", "return best"],
      run([a, k]) { a = nums(a); k = +k; const F = []; let s = 0, best, bl = 0;
        const win = (l, r, x = {}) => { const h = {}; for (let q = l; q <= r; q++) h[q] = "active"; return { ...h, ...x }; };
        for (let q = 0; q < k; q++) s += a[q]; best = s;
        F.push({ line: 0, note: `First window sum = ${s}`, vars: { sum: s, best }, array: { values: a, hl: win(0, k - 1), ptr: { L: 0, R: k - 1 } } });
        for (let r = k; r < a.length; r++) { s += a[r] - a[r - k];
          F.push({ line: 2, note: `Slide: +${a[r]} −${a[r - k]} → sum = ${s}`, vars: { sum: s, best }, array: { values: a, hl: win(r - k + 1, r, { [r - k]: "bad" }), ptr: { L: r - k + 1, R: r } } });
          if (s > best) { best = s; bl = r - k + 1; F.push({ line: 3, note: `New best = ${best}`, vars: { sum: s, best }, array: { values: a, hl: win(bl, r, Object.fromEntries([...Array(k)].map((_, z) => [bl + z, "found"]))), ptr: { L: bl, R: r } } }); } }
        F.push({ line: 4, note: `Answer = ${best}`, vars: { best }, array: { values: a, hl: Object.fromEntries([...Array(k)].map((_, z) => [bl + z, "found"])), ptr: {} } }); return F; } },
    "bubble-sort": {
      name: "Bubble Sort", inputs: [["Array", "5 1 4 2 8 3"]],
      code: ["for i = 0 .. n-1:", "  for j = 0 .. n-i-2:", "    if a[j] > a[j+1]:", "      swap(a[j], a[j+1])"],
      run([a]) { a = nums(a); const F = [], n = a.length; const sorted = i => Object.fromEntries([...Array(i)].map((_, z) => [n - 1 - z, "found"]));
        for (let i = 0; i < n; i++) for (let j = 0; j < n - i - 1; j++) {
          F.push({ line: 2, note: `Compare ${a[j]} and ${a[j + 1]}`, vars: { i, j }, array: { values: [...a], hl: { ...sorted(i), [j]: "active", [j + 1]: "active" }, ptr: { j } } });
          if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; F.push({ line: 3, note: "Swap", vars: { i, j }, array: { values: [...a], hl: { ...sorted(i), [j]: "bad", [j + 1]: "bad" }, ptr: { j } } }); } }
        F.push({ line: 0, note: "Sorted 🎉", vars: {}, array: { values: a, hl: sorted(n), ptr: {} } }); return F; } },
    "grid-bfs": {
      name: "BFS Shortest Path (grid)", inputs: [["Grid (S start, E end, # wall, . open — one row per line)", "S..#....\n.#.#.##.\n.#...#..\n.####.#.\n......#E"]],
      code: ["queue = [S], seen = {S}", "while queue:", "  cell = queue.pop_front()", "  if cell == E: return dist", "  for each neighbour nb:", "    if open and not seen: push nb"],
      run([g]) { const G = gridOf(g), R = G.length, Cn = G[0].length, F = []; let s, e;
        G.forEach((row, r) => row.forEach((c, k) => { if (c === "S") s = [r, k]; if (c === "E") e = [r, k]; }));
        const hl = {}, par = {}, key = (r, c) => r + "," + c; G.forEach((row, r) => row.forEach((c, k) => { if (c === "#") hl[key(r, k)] = "dim"; }));
        const q = [[...s, 0]]; const seen = new Set([key(...s)]);
        const f = (line, note, extra = {}) => F.push({ line, note, vars: { queue: q.length }, grid: { cells: G, hl: { ...hl, ...extra } }, stack: q.slice(0, 8).map(([r, c]) => `(${r},${c})`) });
        f(0, "Start BFS from S");
        while (q.length) { const [r, c, d] = q.shift(); hl[key(r, c)] = "visited"; f(2, `Visit (${r},${c}) at distance ${d}`, { [key(r, c)]: "active" });
          if (r === e[0] && c === e[1]) { let k = key(r, c); const p = {}; while (k) { p[k] = "path"; k = par[k]; } f(3, `Reached E in ${d} steps 🎉`, p); return F; }
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nr = r + dr, nc = c + dc, k = key(nr, nc);
            if (nr >= 0 && nc >= 0 && nr < R && nc < Cn && G[nr][nc] !== "#" && !seen.has(k)) { seen.add(k); par[k] = key(r, c); q.push([nr, nc, d + 1]); hl[k] = "active"; } }
          f(5, "Push unvisited neighbours"); }
        f(1, "E is unreachable"); return F; } },
    "word-search": {
      name: "Word Search (DFS + backtracking)", inputs: [["Board (one row per line)", "ABCE\nSFCS\nADEE"], ["Word", "ABCCED"]],
      code: ["for each cell: if dfs(cell, 0): return true", "dfs(r, c, i):", "  if i == len(word): return true", "  if out of bounds or board[r][c] != word[i]: return false", "  mark (r, c) visited", "  try 4 directions with i + 1", "  unmark (backtrack)"],
      run([b, w]) { const G = gridOf(b), R = G.length, Cn = G[0].length, F = [], path = [], key = (r, c) => r + "," + c;
        const f = (line, note, extra = {}) => F.push({ line, note, vars: { word: w, matched: w.slice(0, path.length) }, grid: { cells: G, hl: { ...Object.fromEntries(path.map(p => [p, "path"])), ...extra } }, stack: path.map(p => `(${p})`) });
        const dfs = (r, c, i) => { if (i === w.length) return true;
          if (r < 0 || c < 0 || r >= R || c >= Cn || path.includes(key(r, c))) return false;
          if (G[r][c] !== w[i]) { f(3, `(${r},${c}) = '${G[r][c]}' ≠ '${w[i]}'`, { [key(r, c)]: "bad" }); return false; }
          path.push(key(r, c)); f(4, `Match '${w[i]}' at (${r},${c})`, { [key(r, c)]: "active" });
          for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) if (dfs(r + dr, c + dc, i + 1)) return true;
          path.pop(); f(6, `Backtrack from (${r},${c})`, { [key(r, c)]: "bad" }); return false; };
        for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) { f(0, `Try starting at (${r},${c})`, { [key(r, c)]: "active" });
          if (dfs(r, c, 0)) { f(2, `Found "${w}" 🎉`, Object.fromEntries(path.map(p => [p, "found"]))); return F; } if (F.length > 1500) return F; }
        f(0, `"${w}" not found`); return F; } },
    "n-queens": {
      name: "N-Queens (backtracking)", inputs: [["N", "5"]],
      code: ["solve(row):", "  if row == n: found!", "  for col in 0..n-1:", "    if safe(row, col):", "      place queen", "      solve(row + 1)", "      remove queen (backtrack)"],
      run([n]) { n = Math.min(+n || 4, 8); const F = [], Q = [], key = (r, c) => r + "," + c;
        const board = () => [...Array(n)].map((_, r) => [...Array(n)].map((_, c) => Q[r] === c ? "♛" : ""));
        const base = () => { const h = {}; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((r + c) % 2) h[key(r, c)] = "dim"; return h; };
        const f = (line, note, extra = {}) => F.push({ line, note, vars: { row: Q.length, n }, grid: { cells: board(), hl: { ...base(), ...extra } }, stack: Q.map((c, r) => `r${r}→c${c}`) });
        const safe = (r, c) => Q.every((qc, qr) => qc !== c && Math.abs(qc - c) !== r - qr);
        const go = r => { if (r === n) { f(1, "All queens placed 🎉", Object.fromEntries(Q.map((c, r) => [key(r, c), "found"]))); return true; }
          for (let c = 0; c < n; c++) { if (!safe(r, c)) { f(3, `(${r},${c}) is attacked`, { [key(r, c)]: "bad" }); continue; }
            Q.push(c); f(4, `Place queen at (${r},${c})`, { [key(r, c)]: "active" }); if (go(r + 1)) return true;
            Q.pop(); f(6, `Backtrack: remove (${r},${c})`, { [key(r, c)]: "bad" }); } return false; };
        f(0, `Place ${n} queens`); go(0); return F; } },
  };

  // ---------- AI dry run (Mistral, key kept in this browser only) ----------
  const SYS = `You are a DSA dry-run engine. Given a problem/code and input, simulate it step by step and return ONLY JSON:
{"title":str,"code":[str lines of concise pseudocode],"frames":[{"line":int index into code,"note":short explanation,"vars":{name:value},
"array":{"values":[...],"hl":{"index":"active|found|visited|path|bad|dim"},"ptr":{"name":index}} (optional),
"grid":{"cells":[[...]],"hl":{"r,c":"active|found|visited|path|bad|dim"}} (optional),
"stack":[str] (optional: stack/queue/recursion contents)}]}
Use array for 1D data, grid for 2D/matrix/boards/DP tables, stack for stacks/queues/call stacks. 8–60 frames. Every frame must be a full snapshot. Be exact.`;
  async function ai(problem, input) {
    const key = get("dm_mistral"); if (!key) throw new Error("Add your Mistral API key first (button above).");
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model: get("dm_mistral_model") || "mistral-large-latest", response_format: { type: "json_object" }, temperature: 0.1,
        messages: [{ role: "system", content: SYS }, { role: "user", content: `Problem / code:\n${problem}\n\nInput:\n${input || "(choose a small illustrative input)"}` }] }) });
    if (!r.ok) throw new Error(`Mistral error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = JSON.parse((await r.json()).choices[0].message.content);
    if (!Array.isArray(j.frames) || !j.frames.length) throw new Error("AI returned no frames, try again.");
    return j;
  }

  // ---------- player ----------
  let P = { frames: [], code: [], i: 0, timer: null, speed: +(get("dm_speed") || 700) };
  function drawArray(a) {
    const max = Math.max(1, ...a.values.map(v => Math.abs(+v) || 0)), ptrs = {};
    Object.entries(a.ptr || {}).forEach(([k, v]) => (ptrs[v] = ptrs[v] || []).push(k));
    return `<div class="vz-arr">${a.values.map((v, i) => { const c = C[(a.hl || {})[i]];
      return `<div class="vz-cell"><div class="vz-bar" style="height:${20 + 110 * (Math.abs(+v) || 0) / max}px;${c ? `background:${c}` : ""}">${esc(v)}</div><div class="vz-idx">${i}</div><div class="vz-ptr">${(ptrs[i] || []).map(esc).join(" ")}</div></div>`; }).join("")}</div>`;
  }
  function drawGrid(g) {
    return `<div class="vz-grid" style="grid-template-columns:repeat(${(g.cells[0] || []).length},minmax(28px,48px))">${g.cells.map((row, r) => row.map((v, c) => {
      const col = C[(g.hl || {})[r + "," + c]]; return `<div class="vz-g" style="${col ? `background:${col}` : ""}">${esc(v)}</div>`; }).join("")).join("")}</div>`;
  }
  function show() {
    const f = P.frames[P.i]; if (!f) return;
    $("#vz-stage").innerHTML = (f.array ? drawArray(f.array) : "") + (f.grid ? drawGrid(f.grid) : "") +
      (f.stack && f.stack.length ? `<div class="vz-stack"><span class="mute">Stack / Queue</span>${f.stack.map(s => `<span>${esc(s)}</span>`).join("")}</div>` : "");
    $("#vz-note").textContent = f.note || "";
    $("#vz-vars").innerHTML = Object.entries(f.vars || {}).map(([k, v]) => `<span><b>${esc(k)}</b> = ${esc(typeof v === "object" ? JSON.stringify(v) : v)}</span>`).join("");
    $("#vz-code").innerHTML = P.code.map((l, n) => `<div class="${n === f.line ? "on" : ""}"><span>${n + 1}</span>${esc(l)}</div>`).join("");
    $("#vz-step").textContent = `Step ${P.i + 1} / ${P.frames.length}`; $("#vz-seek").max = P.frames.length - 1; $("#vz-seek").value = P.i;
    $("#vz-play").textContent = P.timer ? "⏸ Pause" : "▶ Play";
  }
  const stop = () => { clearInterval(P.timer); P.timer = null; };
  function play() { if (P.timer) { stop(); return show(); } if (P.i >= P.frames.length - 1) P.i = 0;
    P.timer = setInterval(() => { if (P.i >= P.frames.length - 1) stop(); else P.i++; show(); }, P.speed); show(); }
  function load(frames, code) { stop(); P.frames = frames; P.code = code; P.i = 0; $("#vz-player").hidden = false; show(); }

  function render() {
    const sel = get("dm_viz") || "word-search", A = ALGOS[sel];
    $("#view").innerHTML = `
    <div class="top"><div class="panel" style="flex:1"><div class="big">Dry Run Visualizer</div>
      <div class="mute">Pick a ready-made algorithm, or let AI dry-run any problem. Step through every move.</div></div></div>
    <div class="vz-tabs"><button class="chip ${sel !== "ai" ? "on" : ""}" data-m="ready">Ready-made</button><button class="chip ${sel === "ai" ? "on" : ""}" data-m="ai">✨ AI dry run (any problem)</button></div>
    ${sel === "ai" ? `<div class="panel vz-form">
      <div class="row"><button class="chip" id="vz-key">${get("dm_mistral") ? "🔑 Mistral key saved — change" : "🔑 Add Mistral API key"}</button>
        <span class="mute">Key stays in this browser only. Get one at console.mistral.ai</span></div>
      <label>Problem statement or your code</label><textarea id="vz-prob" rows="7" placeholder="e.g. Trapping Rain Water, or paste your C++/Java/Python solution">${esc(get("dm_ai_prob") || "")}</textarea>
      <label>Input</label><input id="vz-in" placeholder="e.g. height = [0,1,0,2,1,0,1,3,2,1,2,1]" value="${esc(get("dm_ai_in") || "")}">
      <div class="row"><button class="go" id="vz-run">Dry run with AI</button><span class="mute" id="vz-msg"></span></div></div>`
    : `<div class="panel vz-form"><div class="vz-algos">${Object.entries(ALGOS).map(([k, a]) => `<button class="chip ${k === sel ? "on" : ""}" data-a="${k}">${esc(a.name)}</button>`).join("")}</div>
      ${A.inputs.map(([l, d], n) => `<label>${esc(l)}</label>${d.includes("\n") ? `<textarea class="vz-i" rows="${d.split("\n").length}">${esc(d)}</textarea>` : `<input class="vz-i" value="${esc(d)}">`}`).join("")}
      <div class="row"><button class="go" id="vz-run">Visualize</button><span class="mute" id="vz-msg"></span></div></div>`}
    <div id="vz-player" hidden><div class="vz-main"><div class="panel vz-left"><div id="vz-stage"></div><div id="vz-note" class="vz-note"></div><div id="vz-vars" class="vz-vars"></div></div>
      <div class="panel vz-codebox"><div id="vz-code" class="vz-code"></div></div></div>
      <div class="panel vz-ctrl"><button class="chip" id="vz-first">⏮</button><button class="chip" id="vz-prev">◀</button><button class="go" id="vz-play">▶ Play</button>
        <button class="chip" id="vz-next">▶</button><button class="chip" id="vz-last">⏭</button><input type="range" id="vz-seek" min="0" value="0">
        <span id="vz-step" class="mute"></span><label class="mute">Speed <select id="vz-speed">${[[1200, "0.5x"], [700, "1x"], [350, "2x"], [150, "4x"]].map(([v, l]) => `<option value="${v}" ${+v === P.speed ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
      <div class="vz-legend">${[["active", "current"], ["found", "answer"], ["visited", "visited"], ["path", "path"], ["bad", "rejected"]].map(([k, l]) => `<span><i style="background:${C[k]}"></i>${l}</span>`).join("")}</div></div>`;
    $("#view").querySelectorAll("[data-m]").forEach(b => b.onclick = () => { stop(); put("dm_viz", b.dataset.m === "ai" ? "ai" : "word-search"); render(); });
    $("#view").querySelectorAll("[data-a]").forEach(b => b.onclick = () => { stop(); put("dm_viz", b.dataset.a); render(); });
    const msg = t => $("#vz-msg").textContent = t;
    $("#vz-run").onclick = async () => {
      if (sel !== "ai") { try { load(A.run([...document.querySelectorAll(".vz-i")].map(x => x.value)), A.code); msg(""); play(); } catch (e) { msg("Check your input: " + e.message); } return; }
      const p = $("#vz-prob").value.trim(), inp = $("#vz-in").value.trim(); put("dm_ai_prob", p); put("dm_ai_in", inp);
      if (!p) return msg("Write a problem or paste code first.");
      msg("AI is dry-running… (10–30s)"); $("#vz-run").disabled = true;
      try { const j = await ai(p, inp); load(j.frames, j.code || []); msg(j.title || ""); play(); } catch (e) { msg(e.message); }
      $("#vz-run").disabled = false; };
    if (sel === "ai") $("#vz-key").onclick = () => { const k = prompt("Paste your Mistral API key (saved only in this browser). Leave empty to remove:", get("dm_mistral") || ""); if (k !== null) { k.trim() ? put("dm_mistral", k.trim()) : localStorage.removeItem("dm_mistral"); render(); } };
    $("#vz-play").onclick = play;
    $("#vz-prev").onclick = () => { stop(); P.i = Math.max(0, P.i - 1); show(); }; $("#vz-next").onclick = () => { stop(); P.i = Math.min(P.frames.length - 1, P.i + 1); show(); };
    $("#vz-first").onclick = () => { stop(); P.i = 0; show(); }; $("#vz-last").onclick = () => { stop(); P.i = P.frames.length - 1; show(); };
    $("#vz-seek").oninput = e => { stop(); P.i = +e.target.value; show(); };
    $("#vz-speed").onchange = e => { P.speed = +e.target.value; put("dm_speed", P.speed); if (P.timer) { stop(); play(); } };
    if (P.frames.length) { $("#vz-player").hidden = false; show(); }
  }
  return { render, stop, ALGOS };
})();
