/* =========================
   common.js - Session + Helpers (RTL Arabic Game)
   ========================= */

const STORAGE_KEY = "eid_family_game_v1";
const WIN_SCORE = 50;

function $(id){ return document.getElementById(id); }

function loadSession(){
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
  let s = loadSession();
  if(!s){
    s = {
      auth: { ok:false },
      teams: { a:"", b:"" },
      scores: { a:0, b:0 },
      selectedChallenge: 1,
      selectedRoundId: null,
      selectedQuestionId: null,
      // locks: challengeId -> { rounds: {roundId:true}, questions: { roundId: { qid:true } } }
      locks: {},
      winner: null, // {team:"a"|"b", name:"", reachedAt:timestamp}
      ui: {}
    };
    saveSession(s);
  }
  // normalize
  if(!s.scores) s.scores = {a:0,b:0};
  if(!s.teams) s.teams = {a:"",b:""};
  if(!s.auth) s.auth = {ok:false};
  if(!s.locks) s.locks = {};
  return s;
}

function requireAuthOrRedirect(){
  const s = ensureSession();
  if(!s.auth || !s.auth.ok){
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function logoutWipeAll(){
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = "index.html";
}

function resetGameKeepNames(keepNames=true){
  const s = ensureSession();
  s.scores = {a:0,b:0};
  s.selectedRoundId = null;
  s.selectedQuestionId = null;
  s.winner = null;
  if(!keepNames){
    s.teams = {a:"", b:""};
  }
  // NOTE: locks remain as-is
  saveSession(s);
}

function getTeamName(s, teamKey){
  const name = (s.teams && s.teams[teamKey] || "").trim();
  return name || (teamKey==="a" ? "الفريق الأول" : "الفريق الثاني");
}

/* -------------------------
   Scorebar
------------------------- */
function renderScorebar(el, s){
  if(!el) return;
  const aName = getTeamName(s,"a");
  const bName = getTeamName(s,"b");
  el.innerHTML = `
    <div class="score">
      <div class="score__val">${toArabicDigits(String(s.scores?.a ?? 0))}</div>
      <div class="score__name">${escapeHtml(aName)}</div>
    </div>
    <div class="score">
      <div class="score__val">${toArabicDigits(String(s.scores?.b ?? 0))}</div>
      <div class="score__name">${escapeHtml(bName)}</div>
    </div>
  `;
}

/* -------------------------
   Locks helpers
------------------------- */
function ensureChallengeLocks(s, challengeId){
  if(!s.locks[challengeId]){
    s.locks[challengeId] = { rounds:{}, questions:{} };
  }
  if(!s.locks[challengeId].rounds) s.locks[challengeId].rounds = {};
  if(!s.locks[challengeId].questions) s.locks[challengeId].questions = {};
}

function isQuestionLocked(s, challengeId, roundId, questionId){
  ensureChallengeLocks(s, challengeId);
  const q = s.locks[challengeId].questions[roundId];
  return !!(q && q[questionId]);
}

function lockQuestion(s, challengeId, roundId, questionId){
  ensureChallengeLocks(s, challengeId);
  if(!s.locks[challengeId].questions[roundId]){
    s.locks[challengeId].questions[roundId] = {};
  }
  s.locks[challengeId].questions[roundId][questionId] = true;
  saveSession(s);
}

function setRoundLocked(s, challengeId, roundId, locked){
  ensureChallengeLocks(s, challengeId);
  if(locked) s.locks[challengeId].rounds[roundId] = true;
  else delete s.locks[challengeId].rounds[roundId];
  saveSession(s);
}

function isRoundLocked(s, challengeId, roundId){
  ensureChallengeLocks(s, challengeId);
  return !!s.locks[challengeId].rounds[roundId];
}

function computeRoundFullyLocked(s, challengeId, roundObj){
  // roundObj.questions: [{id,...},...]
  let allLocked = true;
  for(const q of roundObj.questions){
    if(!isQuestionLocked(s, challengeId, roundObj.id, q.id)){
      allLocked = false;
      break;
    }
  }
  return allLocked;
}

/* -------------------------
   Assignment per question (stored in session.ui.assignments)
------------------------- */
function ensureAssignments(s){
  if(!s.ui) s.ui = {};
  if(!s.ui.assignments) s.ui.assignments = {};
  // assignments[challengeId][roundId][questionId] = "a"|"b"
}

function getAssignedTeam(s, challengeId, roundId, questionId){
  ensureAssignments(s);
  const c = s.ui.assignments[challengeId];
  const r = c ? c[roundId] : null;
  return r ? r[questionId] : null;
}

function setAssignedTeam(s, challengeId, roundId, questionId, teamKey){
  ensureAssignments(s);
  if(!s.ui.assignments[challengeId]) s.ui.assignments[challengeId] = {};
  if(!s.ui.assignments[challengeId][roundId]) s.ui.assignments[challengeId][roundId] = {};
  s.ui.assignments[challengeId][roundId][questionId] = teamKey;
  saveSession(s);
}

function otherTeam(teamKey){
  return teamKey === "a" ? "b" : "a";
}

/* -------------------------
   Winner logic
------------------------- */
function markWinnerIfReached(s){
  if(s.winner) return s; // already set once (we won't overwrite)
  const a = s.scores?.a ?? 0;
  const b = s.scores?.b ?? 0;

  if(a >= WIN_SCORE){
    s.winner = { team:"a", name:getTeamName(s,"a"), reachedAt: Date.now() };
    return saveSession(s);
  }
  if(b >= WIN_SCORE){
    s.winner = { team:"b", name:getTeamName(s,"b"), reachedAt: Date.now() };
    return saveSession(s);
  }
  return s;
}

function clearWinner(s){
  s.winner = null;
  saveSession(s);
}

/* ✅ فريقين جدد: تصفير النقاط + مسح أسماء الفرق فقط، بدون فتح الأسئلة المقفولة */
function startNewTeamsKeepLocks(){
  const s = ensureSession();
  s.scores = {a:0,b:0};
  s.teams = {a:"", b:""};
  s.selectedRoundId = null;
  s.selectedQuestionId = null;
  s.winner = null;
  // assignments optional reset (so old assigned doesn't leak)
  if(s.ui && s.ui.assignments) s.ui.assignments = {};
  saveSession(s);

  // نروح لصفحة الدخول لكن بدون كلمة مرور (لأن auth.ok=true)
  window.location.href = "index.html?mode=newteams";
}

/* ✅ فتح كل الأسئلة المقفولة بدون لمس النقاط أو أسماء الفرق */
function unlockAllQuestionsKeepScores(){
  const s = ensureSession();
  // clear all locks
  s.locks = {};
  // keep scores, teams, auth as is
  saveSession(s);
  return s;
}

/* -------------------------
   Data loaders
------------------------- */
async function loadChallengeData(challengeNumber){
  // fixed challenge 1 for this game
  const res = await fetch(`data/challenges/challenge-${challengeNumber}.json?v=1`);
  if(!res.ok) throw new Error("Failed to load data");
  return await res.json();
}

/* -------------------------
   UI helpers
------------------------- */
function setStatus(el, msg, type){
  if(!el) return;
  el.classList.remove("status--ok","status--bad");
  if(type==="ok") el.classList.add("status--ok");
  if(type==="bad") el.classList.add("status--bad");
  el.textContent = msg || "";
}

function escapeHtml(str){
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function formatMMSS(totalSeconds){
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2,"0");
  const ss = String(s).padStart(2,"0");
  return toArabicDigits(`${mm}:${ss}`);
}
