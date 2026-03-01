/* =========================
   common.js
   - localStorage session
   - auth gate
   - helpers
   ========================= */

const STORAGE_KEY = "EID_FAMILY_GAME_SESSION_V1";

// Default (change in README "How to customize")
const DEFAULT_PASSWORD = "EID2026"; // demo password

function nowISO() {
  return new Date().toISOString();
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function wipeSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function ensureSession() {
  let s = loadSession();
  if (!s) {
    s = {
      version: 1,
      createdAt: nowISO(),
      authed: false,
      passwordHashHint: "client-side gate",
      teams: { a: "", b: "" },
      scores: { a: 0, b: 0 },
      selectedChallenge: 1,
      selectedCategoryId: null,
      selectedRoundId: null,
      selectedQuestionId: null,
      // Locks and per-question state
      locks: {
        // [challengeId]: { [roundId]: { [questionId]: true } }
      },
      // assignment: [challengeId]: { [roundId]: { [questionId]: "a"|"b" } }
      assignment: {},
      // roundLocks: [challengeId]: { [roundId]: true }
      roundLocks: {},
      lastUpdatedAt: nowISO()
    };
    saveSession(s);
  }
  return s;
}

function requireAuthOrRedirect() {
  const s = ensureSession();
  if (!s.authed) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/* UI helpers */
function $(id) { return document.getElementById(id); }

function setStatus(el, msg, type = "") {
  if (!el) return;
  el.classList.remove("status--ok", "status--bad");
  if (type === "ok") el.classList.add("status--ok");
  if (type === "bad") el.classList.add("status--bad");
  el.textContent = msg || "";
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function formatMMSS(totalSeconds) {
  const s = clamp(totalSeconds, 0, 24 * 3600);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function otherTeam(team) {
  return team === "a" ? "b" : "a";
}

function renderScorebar(container, session) {
  if (!container) return;
  container.innerHTML = `
    <div class="score">
      <div class="score__name">${escapeHtml(session.teams.a || "الفريق 1")}</div>
      <div class="score__val">${session.scores.a || 0}</div>
    </div>
    <div class="score">
      <div class="score__name">${escapeHtml(session.teams.b || "الفريق 2")}</div>
      <div class="score__val">${session.scores.b || 0}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Locks helpers */
function getLockPath(session, challengeId, roundId) {
  const c = String(challengeId);
  session.locks[c] = session.locks[c] || {};
  session.locks[c][roundId] = session.locks[c][roundId] || {};
  return session.locks[c][roundId];
}

function getAssignPath(session, challengeId, roundId) {
  const c = String(challengeId);
  session.assignment[c] = session.assignment[c] || {};
  session.assignment[c][roundId] = session.assignment[c][roundId] || {};
  return session.assignment[c][roundId];
}

function isQuestionLocked(session, challengeId, roundId, questionId) {
  const p = getLockPath(session, challengeId, roundId);
  return !!p[questionId];
}

function lockQuestion(session, challengeId, roundId, questionId) {
  const p = getLockPath(session, challengeId, roundId);
  p[questionId] = true;
  session.lastUpdatedAt = nowISO();
  saveSession(session);
}

function setAssignedTeam(session, challengeId, roundId, questionId, team) {
  const p = getAssignPath(session, challengeId, roundId);
  p[questionId] = team;
  session.lastUpdatedAt = nowISO();
  saveSession(session);
}

function getAssignedTeam(session, challengeId, roundId, questionId) {
  const p = getAssignPath(session, challengeId, roundId);
  return p[questionId] || null;
}

function setRoundLocked(session, challengeId, roundId, locked) {
  const c = String(challengeId);
  session.roundLocks[c] = session.roundLocks[c] || {};
  session.roundLocks[c][roundId] = !!locked;
  session.lastUpdatedAt = nowISO();
  saveSession(session);
}

function isRoundLocked(session, challengeId, roundId) {
  const c = String(challengeId);
  return !!(session.roundLocks[c] && session.roundLocks[c][roundId]);
}

/* Game resets */
function resetGameKeepNames(keepNames = true) {
  const s = ensureSession();
  const names = keepNames ? { ...s.teams } : { a: "", b: "" };
  const authed = s.authed;

  const newS = ensureSession();
  newS.authed = authed;
  newS.teams = names;
  newS.scores = { a: 0, b: 0 };
  newS.selectedCategoryId = null;
  newS.selectedRoundId = null;
  newS.selectedQuestionId = null;
  newS.locks = {};
  newS.assignment = {};
  newS.roundLocks = {};
  newS.lastUpdatedAt = nowISO();
  saveSession(newS);
  return newS;
}

function logoutWipeAll() {
  wipeSession();
  window.location.href = "index.html";
}

/* Challenge data loading */
async function loadChallengeData(challengeNo) {
  const id = String(challengeNo);
  const res = await fetch(`data/challenges/${id}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("تعذر تحميل ملف التحدي");
  return await res.json();
}

/* Winner calc across a challenge dataset */
function computeAllQuestionsLocked(session, challengeData) {
  const ch = String(challengeData.id);
  for (const cat of challengeData.categories) {
    for (const round of cat.rounds) {
      for (const q of round.questions) {
        const locked = isQuestionLocked(session, ch, round.id, q.id);
        if (!locked) return false;
      }
    }
  }
  return true;
}

function computeRoundFullyLocked(session, challengeId, round) {
  for (const q of round.questions) {
    if (!isQuestionLocked(session, challengeId, round.id, q.id)) return false;
  }
  return true;
}

function computeWinner(session) {
  const a = session.scores.a || 0;
  const b = session.scores.b || 0;
  if (a === b) return { winner: "tie", line: `تعادل 🤝 (${a} - ${b})` };
  const team = a > b ? "a" : "b";
  const name = team === "a" ? (session.teams.a || "الفريق 1") : (session.teams.b || "الفريق 2");
  return { winner: team, line: `الفائز: ${name} 🏆 (${a} - ${b})` };
}
// =======================
// Arabic-Indic digits helper
// =======================
function toArabicDigits(input) {
  const map = { "0":"٠","1":"١","2":"٢","3":"٣","4":"٤","5":"٥","6":"٦","7":"٧","8":"٨","9":"٩" };
  return String(input).replace(/[0-9]/g, d => map[d]);
}
