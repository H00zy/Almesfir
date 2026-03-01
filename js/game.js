(async function () {
  if (!requireAuthOrRedirect()) return;

  const s = ensureSession();
  s.selectedChallenge = 1;
  saveSession(s);

  const teamAName = (s.teams && s.teams.a && s.teams.a.trim()) ? s.teams.a.trim() : "الفريق الأول";
  const teamBName = (s.teams && s.teams.b && s.teams.b.trim()) ? s.teams.b.trim() : "الفريق الثاني";

  const sessionLine = $("sessionLine");
  const scorebar = $("scorebar");
  const roundTitle = $("roundTitle");
  const questionMeta = $("questionMeta");
  const questionText = $("questionText");
  const assignedPill = $("assignedPill");
  const lockedNotice = $("lockedNotice");

  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");

  btnLogout.addEventListener("click", () => logoutWipeAll());
  btnNewGame.addEventListener("click", () => { resetGameKeepNames(true); window.location.href = "rounds.html"; });

  sessionLine.textContent = `${teamAName} ضد ${teamBName}`;
  renderScorebar(scorebar, s);

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
    $("qboxTop").style.display = "none";
    $("timerCard").style.display = "none";
    return;
  }

  questionText.textContent = selectedQ.text || "—";

  // تعيين الفريق بأسماء الفرق
  const btnAssignA = $("btnAssignA");
  const btnAssignB = $("btnAssignB");
  const btnSwitch = $("btnSwitch");
  const btnAward = $("btnAward");
  const btnNoPoints = $("btnNoPoints");
  const statusBox = $("statusBox");

  btnAssignA.textContent = `تعيين لـ ${teamAName}`;
  btnAssignB.textContent = `تعيين لـ ${teamBName}`;

  function updateAssignedPill() {
    const ns = ensureSession();
    const assigned = getAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id);
    if (!assigned) {
      assignedPill.textContent = "غير معيّن";
      return null;
    }
    const name = assigned === "a" ? teamAName : teamBName;
    assignedPill.textContent = `موجّه إلى: ${name}`;
    return assigned;
  }

  btnAssignA.addEventListener("click", () => {
    const ns = ensureSession();
    ns.selectedChallenge = 1;
    setAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id, "a");
    setStatus(statusBox, `تم تعيين السؤال لـ ${teamAName}.`, "ok");
    updateAssignedPill();
  });

  btnAssignB.addEventListener("click", () => {
    const ns = ensureSession();
    ns.selectedChallenge = 1;
    setAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id, "b");
    setStatus(statusBox, `تم تعيين السؤال لـ ${teamBName}.`, "ok");
    updateAssignedPill();
  });

  btnSwitch.addEventListener("click", () => {
    const ns = ensureSession();
    const assigned = getAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id);
    if (!assigned) {
      setStatus(statusBox, "عيّن الفريق أولاً ثم بدّل.", "bad");
      return;
    }
    setAssignedTeam(ns, challengeId, selectedRound.id, selectedQ.id, otherTeam(assigned));
    setStatus(statusBox, "تم التبديل للفريق الآخر.", "ok");
    updateAssignedPill();
  });

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
    window.setTimeout(() => window.location.href = "questions.html", 350);
  });

  btnNoPoints.addEventListener("click", () => {
    const ns = ensureSession();
    lockQuestion(ns, challengeId, selectedRound.id, selectedQ.id);

    const fullyLocked = computeRoundFullyLocked(ns, challengeId, selectedRound);
    setRoundLocked(ns, challengeId, selectedRound.id, fullyLocked);

    setStatus(statusBox, "تم قفل السؤال بدون نقاط ✅", "ok");
    window.setTimeout(() => window.location.href = "questions.html", 350);
  });

  updateAssignedPill();

  // -------------------------
  // Timer (default 30 seconds)
  // -------------------------
  const DEFAULT_SECONDS = 30;

  let total = DEFAULT_SECONDS;
  let running = false;
  let t = null;

  const timerCard = $("timerCard");
  const timerText = $("timerText");
  const timerSub = $("timerSub");
  const btnStartPause = $("btnStartPause");
  const btnResetTimer = $("btnResetTimer");
  const btnPlus10 = $("btnPlus10");
  const btnMinus10 = $("btnMinus10");

  function renderTimer() {
    timerText.textContent = formatMMSS(total);
  }
  renderTimer();

  function setTimerStateLabel(state) {
    if (state === "running") timerSub.textContent = "شغال";
    else if (state === "paused") timerSub.textContent = "موقوف";
    else if (state === "done") timerSub.textContent = "انتهى الوقت";
    else timerSub.textContent = "جاهز";
  }

  function clearFX() {
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
    if (state !== "running") timerCard.classList.remove("timer--urgent");
  }

  function tick() {
    total -= 1;

    // آخر 5 ثواني: وميض خفيف
    if (total <= 5 && total > 0) timerCard.classList.add("timer--urgent");

    if (total <= 0) {
      total = 0;
      renderTimer();
      running = false;
      stopInterval();

      // تأثير نهاية الوقت داخل المؤقت فقط
      timerCard.classList.remove("timer--urgent");
      timerCard.classList.add("timer--done", "timer--shake");
      window.setTimeout(() => timerCard.classList.remove("timer--shake"), 520);

      btnStartPause.textContent = "▶ ابدأ";
      setTimerStateLabel("done");
      setStatus(statusBox, "انتهى الوقت ⏱️ تقدر تبدّل الفريق أو تمنح النقاط.", "");
      return;
    }

    renderTimer();
  }

  btnStartPause.addEventListener("click", () => {
    // لو كان انتهى الوقت ورجعت تضغط: نشيل تأثير النهاية
    timerCard.classList.remove("timer--done");

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
