(async function () {
  if (!requireAuthOrRedirect()) return;

  const s = ensureSession();
  s.selectedChallenge = 1;
  saveSession(s);

  const teamAName = getTeamName(s,"a");
  const teamBName = getTeamName(s,"b");

  $("sessionLine").textContent = `${teamAName} ضد ${teamBName}`;

  const scorebar = $("scorebar");
  renderScorebar(scorebar, s);

  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");
  btnLogout.addEventListener("click", () => logoutWipeAll());
  btnNewGame.addEventListener("click", () => { resetGameKeepNames(true); window.location.href = "rounds.html"; });

  if (!s.selectedRoundId || !s.selectedQuestionId) {
    window.location.href = "questions.html";
    return;
  }

  let data;
  try { data = await loadChallengeData(1); }
  catch(e){ $("questionText").textContent = "تعذر تحميل بيانات اللعبة."; return; }

  const challengeId = String(data.id);

  let selectedCat=null, selectedRound=null, selectedQ=null;
  for (const cat of data.categories) {
    for (const r of cat.rounds) {
      if (r.id === s.selectedRoundId) {
        selectedCat = cat; selectedRound = r;
        for (const q of r.questions) if (q.id === s.selectedQuestionId) selectedQ = q;
      }
    }
  }
  if (!selectedRound || !selectedQ) { window.location.href = "questions.html"; return; }

  $("roundTitle").textContent = `${selectedCat.title} • ${selectedRound.title}`;

  const points = (data.pointsPerQuestion || 10);
  $("questionMeta").textContent = `القيمة: ${points} نقاط`;
  $("questionText").textContent = selectedQ.text || "—";

  // locked?
  const alreadyLocked = isQuestionLocked(s, challengeId, selectedRound.id, selectedQ.id);
  if (alreadyLocked) {
    $("lockedNotice").style.display = "block";
    $("qboxTop").style.display = "none";
    $("timerCard").style.display = "none";
    return;
  }

  const statusBox = $("statusBox");
  const assignedPill = $("assignedPill");

  const btnAssignA = $("btnAssignA");
  const btnAssignB = $("btnAssignB");
  const btnSwitch = $("btnSwitch");

  btnAssignA.textContent = `تعيين لـ ${teamAName}`;
  btnAssignB.textContent = `تعيين لـ ${teamBName}`;

  function getAssignedNow(){
    const ns = ensureSession();
    return getAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id);
  }

  function updateAssignedPill(){
    const assigned = getAssignedNow();
    if(!assigned){ assignedPill.textContent = "غير معيّن"; return null; }
    assignedPill.textContent = `موجّه إلى: ${assigned==="a" ? teamAName : teamBName}`;
    return assigned;
  }

  btnAssignA.addEventListener("click", () => {
    const ns = ensureSession();
    setAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id, "a");
    setStatus(statusBox, `تم تعيين السؤال لـ ${teamAName}.`, "ok");
    updateAssignedPill();
  });

  btnAssignB.addEventListener("click", () => {
    const ns = ensureSession();
    setAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id, "b");
    setStatus(statusBox, `تم تعيين السؤال لـ ${teamBName}.`, "ok");
    updateAssignedPill();
  });

  btnSwitch.addEventListener("click", () => {
    const ns = ensureSession();
    const assigned = getAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id);
    if(!assigned){ setStatus(statusBox, "عيّن الفريق أولاً.", "bad"); return; }
    setAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id, otherTeam(assigned));
    setStatus(statusBox, "تم التبديل للفريق الآخر.", "ok");
    updateAssignedPill();
  });

  updateAssignedPill();

  // -------- Timer 30s (blocked until assigned)
  const DEFAULT_SECONDS = 30;
  let total = DEFAULT_SECONDS, running=false, t=null;

  const timerCard = $("timerCard");
  const timerText = $("timerText");
  const timerSub = $("timerSub");
  const btnStartPause = $("btnStartPause");
  const btnResetTimer = $("btnResetTimer");
  const btnPlus10 = $("btnPlus10");
  const btnMinus10 = $("btnMinus10");

  function renderTimer(){ timerText.textContent = formatMMSS(total); }
  renderTimer();

  function setTimerStateLabel(state){
    timerSub.textContent =
      state==="running" ? "شغال" :
      state==="paused" ? "موقوف" :
      state==="done" ? "انتهى الوقت" : "جاهز";
  }

  function stopInterval(){ if(t) clearInterval(t); t=null; }
  function clearFX(){ timerCard.classList.remove("timer--urgent","timer--done","timer--shake"); }

  function tick(){
    total -= 1;
    if(total <= 5 && total > 0) timerCard.classList.add("timer--urgent");
    if(total <= 0){
      total = 0; renderTimer();
      running=false; stopInterval();
      timerCard.classList.remove("timer--urgent");
      timerCard.classList.add("timer--done","timer--shake");
      setTimeout(()=>timerCard.classList.remove("timer--shake"), 520);
      btnStartPause.textContent = "▶ ابدأ";
      setTimerStateLabel("done");
      setStatus(statusBox, "انتهى الوقت ⏱️", "");
      return;
    }
    renderTimer();
  }

  btnStartPause.addEventListener("click", () => {
    const assigned = getAssignedNow();
    if(!assigned){ setStatus(statusBox, "عيّن الفريق أولاً ثم شغّل المؤقت.", "bad"); return; }

    timerCard.classList.remove("timer--done");

    if(!running){
      running=true; btnStartPause.textContent="⏸ إيقاف"; setTimerStateLabel("running");
      stopInterval(); t=setInterval(tick,1000);
    }else{
      running=false; stopInterval(); btnStartPause.textContent="▶ ابدأ"; setTimerStateLabel("paused");
    }
  });

  btnResetTimer.addEventListener("click", () => {
    clearFX(); stopInterval(); running=false;
    total=DEFAULT_SECONDS; renderTimer();
    btnStartPause.textContent="▶ ابدأ"; setTimerStateLabel("ready");
  });

  btnPlus10.addEventListener("click", ()=>{ total=clamp(total+10,0,600); renderTimer(); });
  btnMinus10.addEventListener("click", ()=>{ total=clamp(total-10,0,600); renderTimer(); });

  // -------- Award / Lock with Winner check
  const btnAward = $("btnAward");
  const btnNoPoints = $("btnNoPoints");

  const winnerPanel = $("winnerPanel");
  const winnerTitle = $("winnerTitle");
  const winnerDesc  = $("winnerDesc");
  const btnContinueAfterWin = $("btnContinueAfterWin");
  const btnNewTeamsAfterWin = $("btnNewTeamsAfterWin");

  function showWinner(teamKey){
    const ns = ensureSession();
    const name = getTeamName(ns, teamKey);
    winnerTitle.textContent = `🎉 مبروك!`;
    winnerDesc.textContent  = `${name} وصل إلى ${toArabicDigits(String(WIN_SCORE))} نقطة أولاً. تبغون تكملون ولا فريقين جدد؟`;
    winnerPanel.style.display = "block";
    // نوقف المؤقت (احتياط)
    stopInterval(); running=false; btnStartPause.textContent="▶ ابدأ"; setTimerStateLabel("paused");
  }

  btnContinueAfterWin.addEventListener("click", () => {
    winnerPanel.style.display = "none";
    window.location.href = "questions.html";
  });

  btnNewTeamsAfterWin.addEventListener("click", () => {
    startNewTeamsKeepLocks();
  });

  btnAward.addEventListener("click", () => {
    const ns = ensureSession();
    const assigned = getAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id);
    if(!assigned){ setStatus(statusBox, "لازم تعيّن الفريق قبل منح النقاط.", "bad"); return; }

    ns.scores[assigned] = (ns.scores[assigned]||0) + points;
    saveSession(ns);

    lockQuestion(ns, challengeId, selectedRound.id, selectedQ.id);
    setRoundLocked(ns, challengeId, selectedRound.id, computeRoundFullyLocked(ns, challengeId, selectedRound));

    renderScorebar(scorebar, ns);

    // ✅ Winner check
    markWinnerIfReached(ns);
    const fresh = ensureSession();
    if(fresh.winner && (fresh.scores[ fresh.winner.team ] >= WIN_SCORE)){
      showWinner(fresh.winner.team);
      return;
    }

    setStatus(statusBox, `تم منح ${points} نقاط وقفل السؤال ✅`, "ok");
    setTimeout(()=>window.location.href="questions.html", 250);
  });

  btnNoPoints.addEventListener("click", () => {
    const ns = ensureSession();
    lockQuestion(ns, challengeId, selectedRound.id, selectedQ.id);
    setRoundLocked(ns, challengeId, selectedRound.id, computeRoundFullyLocked(ns, challengeId, selectedRound));
    setStatus(statusBox, "تم قفل السؤال بدون نقاط ✅", "ok");
    setTimeout(()=>window.location.href="questions.html", 250);
  });

})();
