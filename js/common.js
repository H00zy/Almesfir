/* =========================
   Common Utilities (RTL Game)
   - Robust data loader (fixes /Almesfir/ path issue)
   - Session + localStorage helpers
   ========================= */

const STORAGE_KEY = "family_game_session_v1";

function $(id){ return document.getElementById(id); }

function readSession(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}

function saveSession(s){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

function ensureSession(){
  let s = readSession();
  if(!s){
    s = {
      auth: false,
      teams: { a:"", b:"" },
      scores: { a:0, b:0 },
      selectedChallenge: 1,
      selectedRoundId: null,
      selectedQuestionId: null,
      // locks structure:
      // locks[challengeId][roundId][questionId] = true
      locks: {},
      // optional round locks:
      // roundLocks[challengeId][roundId] = true
      roundLocks: {}
    };
    saveSession(s);
  }
  if(!s.teams) s.teams = {a:"", b:""};
  if(!s.scores) s.scores = {a:0, b:0};
  if(!s.locks) s.locks = {};
  if(!s.roundLocks) s.roundLocks = {};
  return s;
}

function requireAuthOrRedirect(){
  const s = ensureSession();
  if(!s.auth){
    // حاول يرجع لصفحة الدخول داخل نفس المجلد
    const here = location.href;
    const url = new URL("index.html", here);
    window.location.href = url.toString();
    return false;
  }
  return true;
}

/* ---------- Auth / Reset ---------- */
function logoutWipeAll(){
  localStorage.removeItem(STORAGE_KEY);
  // رجع لصفحة الدخول ضمن نفس المجلد
  window.location.href = new URL("index.html", location.href).toString();
}

function resetGameKeepNames(keepNames = true){
  const s = ensureSession();
  const teams = keepNames ? (s.teams || {a:"",b:""}) : {a:"",b:""};
  const auth = s.auth === true; // ما نغير تسجيل الدخول
  const selectedChallenge = s.selectedChallenge || 1;

  // نخلي الأقفال كما هي؟ حسب الاستخدام:
  // "لعبة جديدة" عندك سابقاً كانت تصفر النقاط وتبقي الأقفال أحياناً — خلها "تصفر" وتفتح اختيارك حسب تصميمك
  // هنا نخليها تصفر النقاط فقط (آمن)
  s.auth = auth;
  s.teams = teams;
  s.scores = {a:0, b:0};
  s.selectedChallenge = selectedChallenge;
  s.selectedRoundId = null;
  s.selectedQuestionId = null;

  saveSession(s);
}

/* ---------- UI helpers ---------- */
function renderScorebar(el, s){
  if(!el) return;
  const teamA = (s.teams?.a || "").trim() || "الفريق الأول";
  const teamB = (s.teams?.b || "").trim() || "الفريق الثاني";
  const aVal = Number(s.scores?.a || 0);
  const bVal = Number(s.scores?.b || 0);

  el.innerHTML = `
    <div class="score">
      <div class="score__val">${toArabicDigits(aVal)}</div>
      <div class="score__name">${escapeHtml(teamA)}</div>
    </div>
    <div class="score">
      <div class="score__val">${toArabicDigits(bVal)}</div>
      <div class="score__name">${escapeHtml(teamB)}</div>
    </div>
  `;
}

function setStatus(el, text, type){
  if(!el) return;
  el.className = "status";
  if(type === "ok") el.classList.add("status--ok");
  if(type === "bad") el.classList.add("status--bad");
  el.textContent = text || "";
}

/* ---------- Locks / Assignment ---------- */
function isQuestionLocked(s, challengeId, roundId, questionId){
  const c = String(challengeId);
  const r = String(roundId);
  const q = String(questionId);
  return !!(s.locks?.[c]?.[r]?.[q]);
}

function lockQuestion(s, challengeId, roundId, questionId){
  const c = String(challengeId);
  const r = String(roundId);
  const q = String(questionId);
  if(!s.locks) s.locks = {};
  if(!s.locks[c]) s.locks[c] = {};
  if(!s.locks[c][r]) s.locks[c][r] = {};
  s.locks[c][r][q] = true;
  saveSession(s);
}

function setRoundLocked(s, challengeId, roundId, locked){
  const c = String(challengeId);
  const r = String(roundId);
  if(!s.roundLocks) s.roundLocks = {};
  if(!s.roundLocks[c]) s.roundLocks[c] = {};
  s.roundLocks[c][r] = !!locked;
  saveSession(s);
}

function computeRoundFullyLocked(s, challengeId, roundObj){
  const c = String(challengeId);
  const r = String(roundObj.id);
  const qs = roundObj.questions || [];
  if(qs.length === 0) return false;
  return qs.every(q => !!(s.locks?.[c]?.[r]?.[String(q.id)]));
}

// تعيين الفريق لكل سؤال (يحفظ داخل session.assign)
function getAssignedTeam(s, challengeId, roundId, questionId){
  const c = String(challengeId), r = String(roundId), q = String(questionId);
  return s.assign?.[c]?.[r]?.[q] || null;
}

function setAssignedTeam(s, challengeId, roundId, questionId, teamKey){
  const c = String(challengeId), r = String(roundId), q = String(questionId);
  if(!s.assign) s.assign = {};
  if(!s.assign[c]) s.assign[c] = {};
  if(!s.assign[c][r]) s.assign[c][r] = {};
  s.assign[c][r][q] = teamKey; // "a" أو "b"
  saveSession(s);
}

function otherTeam(teamKey){
  return teamKey === "a" ? "b" : "a";
}

/* ---------- Timer helpers ---------- */
function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

function formatMMSS(totalSeconds){
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2,"0");
  const ss = String(s).padStart(2,"0");
  // أرقام عربية هندية
  return toArabicDigits(`${mm}:${ss}`);
}

/* ---------- Arabic digits ---------- */
function toArabicDigits(input){
  const str = String(input);
  const map = {"0":"٠","1":"١","2":"٢","3":"٣","4":"٤","5":"٥","6":"٦","7":"٧","8":"٨","9":"٩"};
  return str.replace(/[0-9]/g, d => map[d]);
}

/* ---------- Robust data loader (THE FIX) ---------- */
// IMPORTANT: GitHub Pages subpaths + /Almesfir/ folder can break relative fetch paths.
// We try multiple candidates automatically.
async function loadChallengeData(challengeNumber){
  const id = Number(challengeNumber);
  const candidates = [
    // same folder level (if /data is sibling of /Almesfir)
    `../data/challenges/challenge-${id}.json`,
    `../data/challenge-${id}.json`,
    // current folder contains /data
    `data/challenges/challenge-${id}.json`,
    `data/challenge-${id}.json`,
    // one more level up safety
    `../../data/challenges/challenge-${id}.json`,
    `../../data/challenge-${id}.json`,
  ];

  let lastErr = null;

  for(const path of candidates){
    try{
      const url = new URL(path, location.href).toString();
      const res = await fetch(url, { cache: "no-store" });
      if(!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const json = await res.json();
      return json;
    }catch(e){
      lastErr = e;
    }
  }

  // إذا فشل كل شيء:
  throw lastErr || new Error("Failed to load challenge data");
}

/* ---------- safety ---------- */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
