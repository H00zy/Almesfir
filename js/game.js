(async function () {
  if (!requireAuthOrRedirect()) return;

  const WIN_SCORE = 50;
  const DEFAULT_SECONDS = 30;

  const s = ensureSession();
  s.selectedChallenge = 1;
  saveSession(s);

  let teamAName = (s.teams && s.teams.a && s.teams.a.trim()) ? s.teams.a.trim() : "الفريق الأول";
  let teamBName = (s.teams && s.teams.b && s.teams.b.trim()) ? s.teams.b.trim() : "الفريق الثاني";

  const sessionLine = $("sessionLine");
  const scorebar = $("scorebar");
  const roundTitle = $("roundTitle");
  const questionMeta = $("questionMeta");
  const questionText = $("questionText");
  const assignedPill = $("assignedPill");
  const lockedNotice = $("lockedNotice");

  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");

  const winnerPanel = $("winnerPanel");
  const winnerTitle = $("winnerTitle");
  const winnerDesc = $("winnerDesc");
  const btnContinuePlay = $("btnContinuePlay");
  const btnStartNewTeams = $("btnStartNewTeams");
  const newTeamA = $("newTeamA");
  const newTeamB = $("newTeamB");

  btnLogout.addEventListener("click", () => logoutWipeAll());
  btnNewGame.addEventListener("click", () => { resetGameKeepNames(true); window.location.href = "rounds.html"; });

  function refreshHeaderAndScores() {
    const ns = ensureSession();
    teamAName = (ns.teams && ns.teams.a && ns.teams.a.trim()) ? ns.teams.a.trim() : "الفريق الأول";
    teamBName = (ns.teams && ns.teams.b && ns.teams.b.trim()) ? ns.teams.b.trim() : "الفريق الثاني";
    sessionLine.textContent = `${teamAName} ضد ${teamBName}`;
    renderScorebar(scorebar, ns);
  }
  refreshHeaderAndScores();

  if (!s.selectedRoundId || !s.selectedQuestionId) {
    window.location.href = "questions.html";
    return;
  }

  let data;
  try {
    data = await loadChallengeData(1);
  } catch (e) {
    questionText.textContent = "تعذر تحميل بيانات اللعبة.";
    return;
  }

  const challengeId = String(data.id);

  let selectedCat = null;
  let selectedRound = null;
  let selectedQ = null;

  for (const cat of data.categories) {
    for (const r of cat.rounds) {
      if (r.id === s.selectedRoundId) {
        selectedCat = cat;
        selectedRound = r;
        for (const q of r.questions) {
          if (q.id === s.selectedQuestionId) selectedQ = q;
        }
      }
    }
  }

  if (!selectedRound || !selectedQ) {
    window.location.href = "questions.html";
    return;
  }

  roundTitle.textContent = `${selectedCat.title} • ${selectedRound.title}`;

  const points = (data.pointsPerQuestion || 10);
  questionMeta.textContent = `القيمة: ${points} نقاط`;

  const alreadyLocked = isQuestionLocked(s, challengeId, selectedRound.id, selectedQ.id);
  if (alreadyLocked) {
    lockedNotice.style.display = "block";
    const qboxTop = document.getElementById("qboxTop");
    if (qboxTop) qboxTop.style.display = "none";
    const timerCard = document.getElementById("timerCard");
    if (timerCard) timerCard.style.display = "none";
    return;
  }

  questionText.textContent = selectedQ.text || "—";

  // تعيين الفريق
  const btnAssignA = $("btnAssignA");
  const btnAssignB = $("btnAssignB");
  const btnSwitch = $("btnSwitch");
  const btnAward = $("btnAward");
  const btnNoPoints = $("btnNoPoints");
  const statusBox = $("statusBox");

  function getAssignedNow() {
    const ns = ensureSession();
    return getAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id);
  }

  function updateAssignedPill() {
    const assigned = getAssignedNow();
    if (!assigned) {
      assignedPill.textContent = "غير معيّن";
      return null;
    }
    const name = assigned === "a" ? teamAName : teamBName;
    assignedPill.textContent = `موجّه إلى: ${name}`;
    return assigned;
  }

  function updateAssignButtonsText() {
    btnAssignA.textContent = `تعيين لـ ${teamAName}`;
    btnAssignB.textContent = `تعيين لـ ${teamBName}`;
  }
  updateAssignButtonsText();

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
    if (!assigned) {
      setStatus(statusBox, "عيّن الفريق أولاً.", "bad");
      return;
    }
    setAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id, otherTeam(assigned));
    setStatus(statusBox, "تم التبديل للفريق الآخر.", "ok");
    updateAssignedPill();
  });

  // =========================
  // Winner flow
  // =========================
  function showWinner(teamKey) {
    const name = teamKey === "a" ? teamAName : teamBName;
    winnerTitle.textContent = `🎉 فاز ${name}!`;
    winnerDesc.textContent = `وصل إلى ${WIN_SCORE} نقطة أولاً.`;

    // يفضل يعبّي الأسماء الحالية كبداية
    newTeamA.value = "";
    newTeamB.value = "";

    winnerPanel.style.display = "block";
    winnerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideWinner() {
    winnerPanel.style.display = "none";
  }

  btnContinuePlay.addEventListener("click", () => {
    hideWinner();
    window.location.href = "questions.html";
  });

  btnStartNewTeams.addEventListener("click", () => {
    const a = (newTeamA.value || "").trim();
    const b = (newTeamB.value || "").trim();

    const ns = ensureSession();
    // ✅ تصفير النقاط فقط + تغيير أسماء الفرق
    ns.scores = { a: 0, b: 0 };
    ns.teams = {
      a: a || "الفريق الأول",
      b: b || "الفريق الثاني"
    };
    saveSession(ns);

    // تحديث العرض
    refreshHeaderAndScores();
    updateAssignButtonsText();
    updateAssignedPill();

    hideWinner();
    window.location.href = "rounds.html";
  });

  // =========================
  // Award/Lock
  // =========================
  btnAward.addEventListener("click", () => {
    const ns = ensureSession();
    const assigned = getAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id);
    if (!assigned) {
      setStatus(statusBox, "لازم تعيّن الفريق قبل منح النقاط.", "bad");
      return;
    }

    ns.scores[assigned] = (ns.scores[assigned] || 0) + points;
    saveSession(ns);

    lockQuestion(ns, challengeId, selectedRound.id, selectedQ.id);

    const fullyLocked = computeRoundFullyLocked(ns, challengeId, selectedRound);
    setRoundLocked(ns, challengeId, selectedRound.id, fullyLocked);

    renderScorebar(scorebar, ns);
    setStatus(statusBox, `تم منح ${points} نقاط وقفل السؤال ✅`, "ok");

    // ✅ لو وصل 50: اسأل (نكمل / فريق جديد)
    if ((ns.scores[assigned] || 0) >= WIN_SCORE) {
      stopTimer("paused"); // وقف المؤقت
      showWinner(assigned);
      return;
    }

    window.setTimeout(() => window.location.href = "questions.html", 300);
  });

  btnNoPoints.addEventListener("click", () => {
    const ns = ensureSession();
    lockQuestion(ns, challengeId, selectedRound.id, selectedQ.id);

    const fullyLocked = computeRoundFullyLocked(ns, challengeId, selectedRound);
    setRoundLocked(ns, challengeId, selectedRound.id, fullyLocked);

    setStatus(statusBox, "تم قفل السؤال بدون نقاط ✅", "ok");
    window.setTimeout(() => window.location.href = "questions.html", 300);
  });

  updateAssignedPill();

  // =========================
  // Timer (لا يعمل بدون تعيين فريق)
  // =========================
  let total = DEFAULT_SECONDS;
  let running = false;
  let t = null;

  const timerCard = document.getElementById("timerCard");
  const timerText = $("timerText");
  const timerSub = $("timerSub");
  const btnStartPause = $("btnStartPause");
  const btnResetTimer = $("btnResetTimer");
  const btnPlus10 = $("btnPlus10");
  const btnMinus10 = $("btnMinus10");

  function renderTimer() { timerText.textContent = formatMMSS(total); }
  renderTimer();

  function setTimerStateLabel(state) {
    if (state === "running") timerSub.textContent = "شغال";
    else if (state === "paused") timerSub.textContent = "موقوف";
    else if (state === "done") timerSub.textContent = "انتهى الوقت";
    else timerSub.textContent = "جاهز";
  }

  function clearFX() {
    if (!timerCard) return;
    timerCard.classList.remove("timer--urgent", "timer--done", "timer--shake");
  }

  function stopInterval() {
    if (t) window.clearInterval(t);
    t = null;
  }

  function stopTimer(state = "paused") {
    running = false;
    stopInterval();
    btnStartPause.textContent = "▶ ابدأ";
    setTimerStateLabel(state);
    if (timerCard) timerCard.classList.remove("timer--urgent");
  }

  function tick() {
    total -= 1;
    if (timerCard && total <= 5 && total > 0) timerCard.classList.add("timer--urgent");

    if (total <= 0) {
      total = 0;
      renderTimer();
      running = false;
      stopInterval();

      if (timerCard) {
        timerCard.classList.remove("timer--urgent");
        timerCard.classList.add("timer--done", "timer--shake");
        window.setTimeout(() => timerCard.classList.remove("timer--shake"), 520);
      }

      btnStartPause.textContent = "▶ ابدأ";
      setTimerStateLabel("done");
      setStatus(statusBox, "انتهى الوقت ⏱️", "");
      return;
    }
    renderTimer();
  }

  btnStartPause.addEventListener("click", () => {
    // ✅ لا تشغيل بدون تعيين فريق
    const assigned = getAssignedNow();
    if (!assigned) {
      setStatus(statusBox, "عيّن الفريق أولاً ثم شغّل المؤقت.", "bad");
      return;
    }

    if (timerCard) timerCard.classList.remove("timer--done");

    if (!running) {
      running = true;
      btnStartPause.textContent = "⏸ إيقاف";
      setTimerStateLabel("running");
      stopInterval();
      t = window.setInterval(tick, 1000);
    } else {
      running = false;
      stopInterval();
      btnStartPause.textContent = "▶ ابدأ";
      setTimerStateLabel("paused");
    }
  });

  btnResetTimer.addEventListener("click", () => {
    clearFX();
    stopInterval();
    running = false;
    total = DEFAULT_SECONDS;
    renderTimer();
    btnStartPause.textContent = "▶ ابدأ";
    setTimerStateLabel("ready");
  });

  btnPlus10.addEventListener("click", () => {
    total = clamp(total + 10, 0, 600);
    renderTimer();
  });

  btnMinus10.addEventListener("click", () => {
    total = clamp(total - 10, 0, 600);
    renderTimer();
  });

})();
