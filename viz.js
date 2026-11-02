// Dry Run Lab: paste a GitHub / LeetCode / Codeforces / GFG link (or code), AI (Mistral, key stays in this browser)
// returns a step-by-step trace that is animated here. Traces are saved locally.
const V = (() => {
  const COL = { active: "#ffb020", found: "#2ee59d", visited: "#4f7cff", path: "#c06bff", bad: "#ff4d6d", dim: "#1c2340" };
  const PROV = {
    mistral: { name: "Mistral", keyUrl: "console.mistral.ai", models: ["mistral-large-latest", "mistral-medium-latest", "codestral-latest", "mistral-small-latest"] },
    groq: { name: "Groq", keyUrl: "console.groq.com/keys", models: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "moonshotai/kimi-k2-instruct", "openai/gpt-oss-20b"] },
    gemini: { name: "Gemini", keyUrl: "aistudio.google.com/apikey", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"] },
  };
  const prov = () => PROV[get("dm_prov")] ? get("dm_prov") : "mistral";
  const keyOf = p => get("dm_key_" + p) || (p === "mistral" ? get("dm_mistral") : null);
  const modelOf = p => PROV[p].models.includes(get("dm_model_" + p)) ? get("dm_model_" + p) : PROV[p].models[0];
  let P = { t: null, i: 0, timer: null, speed: 900 }, view = "new";
  const traces = () => get("dm_traces") || [];

  // ---------- link → problem context ----------
  async function context(link) {
    const u = link.trim(); if (!u) return "";
    let m;
    if ((m = u.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)/))) {
      const raw = `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
      const r = await fetch(raw); if (!r.ok) throw new Error("Couldn't read that GitHub file (is the repo public?)");
      return `Source code from GitHub (${u}):\n${(await r.text()).slice(0, 12000)}`;
    }
    if (u.includes("raw.githubusercontent.com") || u.includes("gist.githubusercontent.com")) { const r = await fetch(u); return `Source code:\n${(await r.text()).slice(0, 12000)}`; }
    if ((m = u.match(/leetcode\.com\/problems\/([a-z0-9-]+)/))) return `LeetCode problem "${m[1].replace(/-/g, " ")}" (${u}). Use the well-known statement and a standard optimal solution.`;
    if ((m = u.match(/codeforces\.com\/(?:problemset\/problem|contest)\/(\d+)\/(?:problem\/)?([A-Z]\d?)/i))) return `Codeforces problem ${m[1]}${m[2].toUpperCase()} (${u}). Use its known statement and an accepted solution.`;
    if ((m = u.match(/geeksforgeeks\.org\/(?:problems|[a-z-]+)\/([a-z0-9-]+)/))) return `GeeksforGeeks problem "${m[1].replace(/-\d+$/, "").replace(/-/g, " ")}" (${u}). Use the well-known statement and a standard solution.`;
    return `Problem link: ${u}`;
  }

  const SYS = `You are a DSA dry-run engine for Indian students. Simulate the solution EXACTLY on the input and return ONLY JSON:
{"title":str,"difficulty":"Easy|Medium|Hard","pattern":str,"explanation":"2-3 lines in simple Hinglish (Hindi in Roman script) explaining the question",
"input":"the exact input traced","language":"cpp|java|python","code":[every line of the full solution code, keep original code if given],
"frames":[{"line":1-based line number in code,"note":"short Hinglish note of what just happened","vars":{"name":value},
"structs":[ one or more of:
 {"type":"array","name":str,"values":[..],"hl":{"index":"active|found|visited|path|bad|dim"},"ptr":{"ptrName":index}},
 {"type":"grid","name":str,"cells":[[..]],"hl":{"r,c":"active|found|visited|path|bad|dim"}},
 {"type":"stack"|"queue","name":str,"items":[..bottom/front first]},
 {"type":"map","name":str,"entries":{"key":value}},
 {"type":"tree","name":str,"nodes":[level-order values, null for missing],"hl":{"index":"color"}},
 {"type":"list","name":str,"values":[..],"hl":{"index":"color"},"ptr":{"ptrName":index}},
 {"type":"calls","name":"recursion","items":["f(0,0)",...]} ]}]}
Rules: 10-70 frames; each frame is a FULL snapshot (repeat unchanged structures); "line" must point at the code line executing; pick a small input if none given; final frame shows the answer.`;

  async function ask(ctx, extra, input) {
    const p = prov(), key = keyOf(p), model = modelOf(p);
    if (!key) throw new Error(`Pehle ${PROV[p].name} API key add karo (🔑 button).`);
    const user = `${ctx}\n\n${extra ? "Extra details / code:\n" + extra + "\n\n" : ""}Input: ${input || "(choose a small illustrative input)"}`;
    let r, text;
    if (p === "gemini") {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }) });
      if (!r.ok) throw new Error(`Gemini error ${r.status}: ${(await r.text()).slice(0, 180)}`);
      text = (await r.json()).candidates?.[0]?.content?.parts?.map(x => x.text).join("") || "";
    } else {
      const url = p === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.mistral.ai/v1/chat/completions";
      r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" },
          messages: [{ role: "system", content: SYS }, { role: "user", content: user }] }) });
      if (!r.ok) throw new Error(`${PROV[p].name} error ${r.status}: ${(await r.text()).slice(0, 180)}`);
      text = (await r.json()).choices[0].message.content;
    }
    const t = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    if (!Array.isArray(t.frames) || !t.frames.length) throw new Error("AI ne steps nahi diye, dobara try karo.");
    if (!Array.isArray(t.code)) t.code = String(t.code || "").split("\n");
    t.model = `${PROV[p].name} · ${model}`;
    return t;
  }

  // ---------- renderers ----------
  const c = (hl, k) => COL[(hl || {})[k]] || "";
  const R = {
    array: s => { const ptr = {}; Object.entries(s.ptr || {}).forEach(([k, v]) => (ptr[v] = ptr[v] || []).push(k));
      return `<div class="lb-row">${(s.values || []).map((v, i) => `<div class="lb-col"><div class="lb-ptr">${(ptr[i] || []).map(esc).join(" ")}</div>
        <div class="lb-box" style="${c(s.hl, i) ? `border-color:${c(s.hl, i)};box-shadow:0 0 0 1px ${c(s.hl, i)} inset;color:${c(s.hl, i)}` : ""}">${esc(v)}</div><div class="lb-idx">${i}</div></div>`).join("")}</div>`; },
    grid: s => `<div class="lb-grid" style="grid-template-columns:repeat(${(s.cells[0] || []).length},40px)">${s.cells.map((row, r) => row.map((v, k) => { const col = c(s.hl, r + "," + k);
      return `<div class="lb-box" style="${col ? `border-color:${col};background:${col}22;color:${col}` : ""}">${esc(v ?? "")}</div>`; }).join("")).join("")}</div>`,
    stack: s => `<div class="lb-stack">${(s.items || []).map(x => `<div class="lb-box wide">${esc(x)}</div>`).reverse().join("") || `<span class="mute">empty</span>`}</div>`,
    queue: s => `<div class="lb-row">${(s.items || []).map(x => `<div class="lb-box wide">${esc(x)}</div>`).join(`<span class="lb-arrow">←</span>`) || `<span class="mute">empty</span>`}</div>`,
    calls: s => `<div class="lb-stack">${(s.items || []).map((x, i, a) => `<div class="lb-box wide" style="${i === a.length - 1 ? `border-color:${COL.active};color:${COL.active}` : ""}">${esc(x)}</div>`).reverse().join("") || `<span class="mute">empty</span>`}</div>`,
    map: s => `<div class="lb-map">${Object.entries(s.entries || {}).map(([k, v]) => `<div class="lb-box wide"><b>${esc(k)}</b> → ${esc(typeof v === "object" ? JSON.stringify(v) : v)}</div>`).join("") || `<span class="mute">empty</span>`}</div>`,
    list: s => { const ptr = {}; Object.entries(s.ptr || {}).forEach(([k, v]) => (ptr[v] = ptr[v] || []).push(k));
      return `<div class="lb-row">${(s.values || []).map((v, i) => `<div class="lb-col"><div class="lb-ptr">${(ptr[i] || []).map(esc).join(" ")}</div><div class="lb-box" style="${c(s.hl, i) ? `border-color:${c(s.hl, i)};color:${c(s.hl, i)}` : ""}">${esc(v)}</div></div>`).join(`<span class="lb-arrow">→</span>`)}<span class="lb-arrow">→ null</span></div>`; },
    tree: s => { const n = s.nodes || [], depth = Math.ceil(Math.log2(n.length + 1)) || 1, W = Math.max(320, 2 ** (depth - 1) * 56), H = depth * 64;
      const pos = i => { const d = Math.floor(Math.log2(i + 1)), k = i - (2 ** d - 1), slots = 2 ** d; return [W * (k + .5) / slots, 28 + d * 60]; };
      let e = "", v = "";
      n.forEach((x, i) => { if (x == null) return; const [X, Y] = pos(i); if (i) { const p = (i - 1) >> 1; if (n[p] != null) { const [px, py] = pos(p); e += `<line x1="${px}" y1="${py}" x2="${X}" y2="${Y}"/>`; } }
        const col = c(s.hl, i) || "#c9d3ff"; v += `<g><circle cx="${X}" cy="${Y}" r="17" style="stroke:${col}"/><text x="${X}" y="${Y + 5}" style="fill:${col}">${esc(x)}</text></g>`; });
      return `<svg class="lb-tree" viewBox="0 0 ${W} ${H}" style="max-width:${W}px">${e}${v}</svg>`; },
  };
  const struct = s => `<div class="lb-s"><div class="lb-lbl">${esc(s.name || s.type)}</div>${(R[s.type] || R.map)(s)}</div>`;

  function show() {
    const t = P.t, f = t.frames[P.i];
    $("#lb-note").textContent = f.note || "";
    $("#lb-step").textContent = `step ${P.i + 1} / ${t.frames.length}`;
    $("#lb-vars").innerHTML = Object.entries(f.vars || {}).map(([k, v]) => `<span class="lb-pill">${esc(k)} = ${esc(typeof v === "object" ? JSON.stringify(v) : v)}</span>`).join("") || `<span class="mute">—</span>`;
    $("#lb-structs").innerHTML = (f.structs || []).map(struct).join("");
    const code = $("#lb-code"); code.innerHTML = t.code.map((l, n) => `<div class="${n + 1 === f.line ? "on" : ""}"><i>${n + 1}</i>${esc(l) || " "}</div>`).join("");
    const on = code.querySelector(".on"); if (on) code.scrollTop = on.offsetTop - code.clientHeight / 2;
    $("#lb-play").textContent = P.timer ? "Pause" : "Play";
  }
  const stop = () => { clearInterval(P.timer); P.timer = null; };
  const play = () => { if (P.timer) { stop(); return show(); } if (P.i >= P.t.frames.length - 1) P.i = 0;
    P.timer = setInterval(() => { if (P.i >= P.t.frames.length - 1) stop(); else P.i++; show(); }, P.speed); show(); };

  function trace(t) {
    const D = { easy: "#2ee59d", medium: "#ffb020", hard: "#ff4d6d" }[(t.difficulty || "").toLowerCase()] || "#8b95c9";
    return `<div class="lb-crumb">${esc(t.source || "Dry Run Lab")}${t.pattern ? " &gt; " + esc(t.pattern) : ""}</div>
    <div class="lb-head"><h1>${esc(t.title || "Dry run")}</h1>${t.difficulty ? `<span class="lb-tag" style="color:${D};border-color:${D}">${esc(t.difficulty)}</span>` : ""}
      ${t.pattern ? `<span class="lb-tag" style="color:#a58bff;border-color:#a58bff">${esc(t.pattern)}</span>` : ""}${t.model ? `<span class="lb-tag" style="color:#8b95c9;border-color:#3a4577">${esc(t.model)}</span>` : ""}${t.link ? `<a class="lb-open" href="${esc(t.link)}" target="_blank" rel="noopener">Open problem</a>` : ""}</div>
    <div class="lb-card"><div class="lb-k"><span class="lb-n">1</span> Question samjho</div><p>${esc(t.explanation || "")}</p><code>Input traced: ${esc(t.input || "")}</code></div>
    <div class="lb-card"><div class="lb-ctrl"><button id="lb-play">Play</button><button id="lb-back">Back</button><button id="lb-next">Step</button><button id="lb-reset">Reset</button>
      <span class="mute">Speed</span><input type="range" id="lb-speed" min="150" max="2000" step="50" value="${2150 - P.speed}"><span id="lb-step" class="lb-stepc"></span></div>
      <div id="lb-note" class="lb-note"></div>
      <div class="lb-body"><div class="lb-left"><div class="lb-lbl">variables</div><div id="lb-vars" class="lb-vars"></div><div id="lb-structs"></div></div>
        <div id="lb-code" class="lb-code"></div></div></div>`;
  }

  function render() {
    document.body.classList.add("lab");
    const ts = traces(), p = prov(), key = !!keyOf(p);
    $("#view").innerHTML = `<div class="lb">
      <div class="lb-card lb-form"><div class="lb-titlerow"><div><div class="lb-brand">Dry Run Lab</div><div class="mute">Link do ya code paste karo — AI har step animate karega</div></div>
        <div class="lb-tools"><select id="lb-prov">${Object.entries(PROV).map(([k, v]) => `<option value="${k}" ${k === p ? "selected" : ""}>${v.name}${keyOf(k) ? " ✓" : ""}</option>`).join("")}</select>
        <select id="lb-model">${PROV[p].models.map(m => `<option ${m === modelOf(p) ? "selected" : ""}>${m}</option>`).join("")}</select>
        <button id="lb-key">${key ? "Change key" : `🔑 Add ${PROV[p].name} key`}</button>${key ? `<button id="lb-clear">Clear key</button>` : ""}</div></div>
        <input id="lb-link" placeholder="Paste link: GitHub file · LeetCode · Codeforces · GeeksforGeeks" value="${esc(get("dm_lb_link") || "")}">
        <textarea id="lb-extra" rows="4" placeholder="(Optional) apna code ya problem statement yahan paste karo">${esc(get("dm_lb_extra") || "")}</textarea>
        <input id="lb-input" placeholder='(Optional) input, e.g. board = [["A","B"],["C","D"]], word = "AB"' value="${esc(get("dm_lb_in") || "")}">
        <div class="lb-ctrl"><button class="lb-go" id="lb-run">Dry run</button><span class="mute" id="lb-msg">${key ? "" : `${PROV[p].name} key yahan se lo: ${PROV[p].keyUrl} — sirf aapke browser mein save hogi.`}</span></div>
        ${ts.length ? `<div class="lb-lbl" style="margin-top:10px">saved traces</div><div class="lb-saved">${ts.map((t, i) => `<button data-t="${i}" class="${P.t === t ? "on" : ""}">${esc(t.title)}</button>`).join("")}
          <button id="lb-export" class="ghost">Export</button><button id="lb-wipe" class="ghost">Clear</button></div>` : ""}</div>
      <div id="lb-trace">${P.t ? trace(P.t) : ""}</div></div>`;
    const msg = m => $("#lb-msg").textContent = m;
    $("#lb-prov").onchange = e => { put("dm_prov", e.target.value); render(); };
    $("#lb-key").onclick = () => { const k = prompt(`${PROV[p].name} API key paste karo (sirf is browser mein save hogi):`, keyOf(p) || ""); if (k !== null && k.trim()) { put("dm_key_" + p, k.trim()); render(); } };
    if ($("#lb-clear")) $("#lb-clear").onclick = () => { try { localStorage.removeItem("dm_key_" + p); if (p === "mistral") localStorage.removeItem("dm_mistral"); } catch {} render(); };
    $("#lb-model").onchange = e => put("dm_model_" + p, e.target.value);
    $("#lb-run").onclick = async () => {
      const link = $("#lb-link").value.trim(), extra = $("#lb-extra").value.trim(), inp = $("#lb-input").value.trim();
      put("dm_lb_link", link); put("dm_lb_extra", extra); put("dm_lb_in", inp);
      if (!link && !extra) return msg("Link ya code dono mein se kuch to do.");
      $("#lb-run").disabled = true; msg("AI dry run kar raha hai… (15–40s)");
      try { const t = await ask(await context(link), extra, inp); t.link = /^https?:/.test(link) ? link : ""; t.source = link ? new URL(link).hostname.replace("www.", "") : "Custom code";
        const all = [t, ...traces()].slice(0, 25); put("dm_traces", all); stop(); P.t = all[0]; P.i = 0; render(); play(); }
      catch (e) { msg(e.message.includes("Failed to fetch") ? "Network/CORS error — link ya AI provider tak request nahi pahunchi. Code paste karke try karo." : e.message); $("#lb-run").disabled = false; } };
    $("#view").querySelectorAll("[data-t]").forEach(b => b.onclick = () => { stop(); P.t = traces()[+b.dataset.t]; P.i = 0; render(); });
    if ($("#lb-export")) $("#lb-export").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(traces(), null, 1)], { type: "application/json" })); a.download = "dry-run-traces.json"; a.click(); };
    if ($("#lb-wipe")) $("#lb-wipe").onclick = () => { if (confirm("Saare saved traces delete karein?")) { put("dm_traces", []); P.t = null; stop(); render(); } };
    if (!P.t) return;
    $("#lb-play").onclick = play;
    $("#lb-back").onclick = () => { stop(); P.i = Math.max(0, P.i - 1); show(); };
    $("#lb-next").onclick = () => { stop(); P.i = Math.min(P.t.frames.length - 1, P.i + 1); show(); };
    $("#lb-reset").onclick = () => { stop(); P.i = 0; show(); };
    $("#lb-speed").oninput = e => { P.speed = 2150 - e.target.value; if (P.timer) { stop(); play(); } };
    show();
  }
  return { render, stop: () => { stop(); document.body.classList.remove("lab"); } };
})();
