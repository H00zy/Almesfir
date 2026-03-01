/* =========================
   Common (RTL Game) - Robust Base Path + Session Helpers
   ========================= */

const STORAGE_KEY = "eid_family_game_v1";

/**
 * يحدد قاعدة المسار تلقائياً من مكان ملف common.js
 * مثال: إذا كان common.js داخل /Almesfir/js/common.js
 * فـ BASE يصير /Almesfir/
 */
function getAppBase() {
  const scripts = document.getElementsByTagName("script");
  let commonSrc = null;

  for (const s of scripts) {
    const src = s.getAttribute("src") || "";
    if (src.includes("/js/common.js")) {
      commonSrc = src;
      break;
    }
  }

  // fallback: current script
  if (!commonSrc && document.currentScript) commonSrc = document.currentScript.src;

  // إذا ما قدرنا نحدد، نخليها على نفس المجلد الحالي
  if (!commonSrc) return new URL("./", window.location.href);

  // commonSrc ممكن يكون relative أو absolute
  const abs = new URL(commonSrc, window.location.href);

  // /.../js/common.js => نرجع خطوة /.../
  return new URL("../", abs);
}

const APP_BASE = getAppBase();

/** helper */
function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element not found: #${id}`);
  return el;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatMMSS(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/* =========================
   Session storage
   ========================= */

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function ensureSession() {
  let s = getSession();
  if (!s) {
    s = {
      auth: { ok: false },
      teams: { a: "", b: "" },
      scores: { a: 0, b: 0 },
      selectedChallenge: 1,
      selectedRoundId: null,
      selectedQuestionId: null,
      // locks structure:
      // locks[challengeId].questions["roundId|qId"]=true
      // locks[challengeId].rounds[roundId]=true
      locks: {}
    };
    saveSession(s);
  }
  // ضمان وجود مفاتيح
  s.scores = s.scores || { a: 0, b: 0 };
  s.teams = s.teams || { a: "", b: "" };
  s.auth = s.auth || { ok: false };
  s.locks = s.locks || {};
  return s;
}

function requireAuthOrRedirect() {
  const s = ensureSession();
  if (!s.auth || !s.auth.ok) {
    // رجّع للصفحة الرئيسية داخل نفس الـ base
    window.location.href = new URL("index.html", APP_BASE).toString();
    return false;
  }
  return true;
}

function logoutWipeAll() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = new URL("index.html", APP_BASE).toString();
}

function resetGameKeepNames(keepNames = true) {
  const s = ensureSession();
  const teams = keepNames ? (s.teams || { a: "", b: "" }) : { a: "", b: "" };
  const auth = s.auth || { ok: false };

  const newS = {
    auth,
    teams,
    scores: { a: 0, b: 0 },
    selectedChallenge: 1,
    selectedRoundId: null,
    selectedQuestionId: null,
    locks: {}
  };
  saveSession(newS);
}

function setStatus(el, msg, kind) {
  el.textContent = msg || "";
  el.classList.remove("status--ok", "status--bad");
  if (kind === "ok") el.classList.add("status--ok");
  if (kind === "bad") el.classList.add("status--bad");
}

/* =========================
   Locks + Assign
   ========================= */

function ensureLockBucket(s, challengeId) {
  s.locks = s.locks || {};
  if (!s.locks[challengeId]) {
    s.locks[challengeId] = { questions: {}, rounds: {}, assign: {} };
  }
  if (!s.locks[challengeId].questions) s.locks[challengeId].questions = {};
  if (!s.locks[challengeId].rounds) s.locks[challengeId].rounds = {};
  if (!s.locks[challengeId].assign) s.locks[challengeId].assign = {};
}

function qKey(roundId, qId) {
  return `${roundId}|${qId}`;
}

function lockQuestion(s, challengeId, roundId, qId) {
  ensureLockBucket(s, challengeId);
  s.locks[challengeId].questions[qKey(roundId, qId)] = true;
  saveSession(s);
}

function isQuestionLocked(s, challengeId, roundId, qId) {
  ensureLockBucket(s, challengeId);
  return !!s.locks[challengeId].questions[qKey(roundId, qId)];
}

function setRoundLocked(s, challengeId, roundId, locked) {
  ensureLockBucket(s, challengeId);
  s.locks[challengeId].rounds[roundId] = !!locked;
  saveSession(s);
}

function isRoundLocked(s, challengeId, roundId) {
  ensureLockBucket(s, challengeId);
  return !!s.locks[challengeId].rounds[roundId];
}

function setAssignedTeam(s, challengeId, roundId, qId, team) {
  ensureLockBucket(s, challengeId);
  s.locks[challengeId].assign[qKey(roundId, qId)] = team; // "a" or "b"
  saveSession(s);
}

function getAssignedTeam(s, challengeId, roundId, qId) {
  ensureLockBucket(s, challengeId);
  return s.locks[challengeId].assign[qKey(roundId, qId)] || null;
}

function otherTeam(t) {
  return t === "a" ? "b" : "a";
}

function computeRoundFullyLocked(s, challengeId, roundObj) {
  // roundObj.questions = [...]
  for (const q of (roundObj.questions || [])) {
    if (!isQuestionLocked(s, challengeId, roundObj.id, q.id)) return false;
  }
  return true;
}

/* =========================
   UI helpers
   ========================= */

function renderScorebar(container, s) {
  const aName = (s.teams?.a || "الفريق الأول").trim() || "الفريق الأول";
  const bName = (s.teams?.b || "الفريق الثاني").trim() || "الفريق الثاني";
  const aScore = s.scores?.a ?? 0;
  const bScore = s.scores?.b ?? 0;

  container.innerHTML = `
    <div class="score">
      <div class="score__val">${aScore}</div>
      <div class="score__name">${aName}</div>
    </div>
    <div class="score">
      <div class="score__val">${bScore}</div>
      <div class="score__name">${bName}</div>
    </div>
  `;
}

/* =========================
   Data loading (FIXED PATH)
   ========================= */

async function loadChallengeData(id) {
  // يبني رابط صحيح حسب مكان APP_BASE
  const url = new URL(`data/challenges/${id}.json`, APP_BASE);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url.toString()}`);
  return await res.json();
}
