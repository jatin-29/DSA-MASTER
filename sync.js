// Google login + progress sync via Firebase (Auth + Firestore). Works only when firebase-config.js is filled in.
self.Sync = (() => {
  const V = "10.12.2", SDK = n => `https://www.gstatic.com/firebasejs/${V}/firebase-${n}-compat.js`;
  let auth = null, db = null, user = null, status = "", timer = null, unsub = null, ready = false;
  const load = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const state = () => ({ done, badges: get("dm_badges") || {}, courses: get("dm_courses") || null, coursesAt: get("dm_courses_at") || 0, goal: get("dm_goal") || null, handles: get("dm_handles") || null, settingsAt: get("dm_settings_at") || 0 });

  function merge(remote) {
    let changed = false;
    for (const [k, t] of Object.entries(remote.done || {})) if (Math.abs(t) > Math.abs(done[k] || 0)) { done[k] = t; changed = true; }
    const bg = get("dm_badges") || {}; let bc = false;
    for (const [k, t] of Object.entries(remote.badges || {})) if (!bg[k] || t < bg[k]) { bg[k] = t; bc = true; }
    if (bc) { put("dm_badges", bg); changed = true; }
    if (remote.courses && (remote.coursesAt || 0) > (get("dm_courses_at") || 0)) { put("dm_courses", remote.courses); put("dm_courses_at", remote.coursesAt); if (self.MC) MC.refreshIds(); changed = true; }
    if ((remote.settingsAt || 0) > (get("dm_settings_at") || 0)) {
      if (remote.goal) put("dm_goal", remote.goal); if (remote.handles) put("dm_handles", remote.handles); put("dm_settings_at", remote.settingsAt); changed = true; }
    if (changed) { put("dm_done", done); render(); }
    const remoteHasAll = Object.entries(done).every(([k, t]) => Math.abs(remote.done?.[k] || 0) >= Math.abs(t)) && (remote.settingsAt || 0) >= (get("dm_settings_at") || 0) && Object.keys(get("dm_badges") || {}).every(k => remote.badges && remote.badges[k]) && (remote.coursesAt || 0) >= (get("dm_courses_at") || 0);
    if (!remoteHasAll) push(true);
  }
  function push(now) {
    if (!user) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try { status = "Saving…"; paint(); await db.collection("users").doc(user.uid).set({ ...state(), updated: Date.now() }, { merge: true }); status = "Synced ✓"; }
      catch (e) { status = "Sync error: " + e.code; }
      paint(); }, now ? 0 : 1200);
  }
  const settingsTouched = () => put("dm_settings_at", Date.now());

  async function init() {
    const cfg = window.FIREBASE_CONFIG; if (!cfg) { ready = true; return paint(); }
    try { await load(SDK("app")); await Promise.all([load(SDK("auth")), load(SDK("firestore"))]); }
    catch { status = "Couldn't load Firebase"; ready = true; return paint(); }
    firebase.initializeApp(cfg); auth = firebase.auth(); db = firebase.firestore();
    auth.onAuthStateChanged(u => {
      user = u; ready = true; if (unsub) { unsub(); unsub = null; }
      if (u) { status = "Connecting…"; unsub = db.collection("users").doc(u.uid).onSnapshot(s => { merge(s.data() || {}); if (status !== "Saving…") status = "Synced ✓"; paint(); },
        e => { status = "Sync error: " + e.code; paint(); }); }
      paint(); });
  }
  function paint() {
    const el = document.getElementById("sync-box"); if (!el) return;
    if (!ready) { el.innerHTML = ""; return; }
    if (!window.FIREBASE_CONFIG) { el.innerHTML = `<div class="sync off"><span>☁ Sync off</span><a href="https://github.com/jatin-29/DSA-MASTER#enable-progress-sync" target="_blank" rel="noopener">Set up</a></div>`; return; }
    el.innerHTML = user
      ? `<div class="sync"><img src="${esc(user.photoURL || "")}" alt=""><div><b>${esc(user.displayName || user.email)}</b><small>${esc(status)}</small></div><button id="sync-out" title="Sign out">⎋</button></div>`
      : `<div class="sync"><button id="sync-in" class="gbtn">Sign in with Google</button><small>to sync progress across devices${status ? " · " + esc(status) : ""}</small></div>`;
    const i = document.getElementById("sync-in"), o = document.getElementById("sync-out");
    if (i) i.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => { status = e.code === "auth/popup-blocked" ? "Allow pop-ups and retry" : e.code; paint(); });
    if (o) o.onclick = () => auth.signOut();
  }
  init();
  return { push, paint, settingsTouched };
})();
