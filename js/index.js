(function () {
  const s = ensureSession();

  const statusBox = $("statusBox");
  const password = $("password");
  const teamA = $("teamA");
  const teamB = $("teamB");
  const challengeNo = $("challengeNo");

  const btnContinue = $("btnContinue");
  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");

  // Prefill from session
  teamA.value = s.teams.a || "";
  teamB.value = s.teams.b || "";
  challengeNo.value = String(s.selectedChallenge || 1);

  // If already authed: show hint
  if (s.authed) {
    setStatus(statusBox, "أنت مسجل دخول. تقدر تكمل مباشرة أو تبدأ New Game.", "ok");
    password.placeholder = "مسجل دخول بالفعل";
  }

  btnLogout.addEventListener("click", () => logoutWipeAll());

  btnNewGame.addEventListener("click", () => {
    // New Game keeps names by default, but on index we respect current inputs
    const keep = (teamA.value.trim() || teamB.value.trim()) ? true : true;
    const ns = resetGameKeepNames(keep);
    ns.teams.a = teamA.value.trim();
    ns.teams.b = teamB.value.trim();
    ns.selectedChallenge = Number(challengeNo.value || 1);
    saveSession(ns);
    setStatus(statusBox, "تمت إعادة ضبط اللعبة (نقاط/أقفال).", "ok");
  });

  btnContinue.addEventListener("click", async () => {
    const p = password.value.trim();
    const a = teamA.value.trim();
    const b = teamB.value.trim();
    const ch = Number(challengeNo.value || 1);

    if (!s.authed) {
      if (!p) return setStatus(statusBox, "اكتب كلمة المرور.", "bad");
      if (p !== DEFAULT_PASSWORD) return setStatus(statusBox, "كلمة المرور غير صحيحة.", "bad");
    }

    if (!a || !b) return setStatus(statusBox, "اكتب أسماء الفريقين.", "bad");

    // Validate challenge JSON exists
    try {
      await loadChallengeData(ch);
    } catch (e) {
      return setStatus(statusBox, "ملف التحدي غير موجود/غير قابل للتحميل. تأكد من data/challenges.", "bad");
    }

    const ns = ensureSession();
    ns.authed = true;
    ns.teams.a = a;
    ns.teams.b = b;
    ns.selectedChallenge = ch;
    ns.lastUpdatedAt = nowISO();
    saveSession(ns);

    window.location.href = "rounds.html";
  });
})();
