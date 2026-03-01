(function () {
  const s = ensureSession();

  const statusBox = $("statusBox");
  const password = $("password");
  const teamA = $("teamA");
  const teamB = $("teamB");

  const btnContinue = $("btnContinue");
  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");

  // Prefill from session
  teamA.value = s.teams.a || "";
  teamB.value = s.teams.b || "";

  // (1) لا نظهر زر تسجيل الخروج إلا إذا فيه تسجيل دخول فعلي
  if (s.authed) {
    btnLogout.style.display = "inline-flex";
    setStatus(statusBox, "أنت مسجل دخول. تقدر تكمل مباشرة أو تبدأ لعبة جديدة.", "ok");
    password.placeholder = "مسجل دخول بالفعل";
  } else {
    btnLogout.style.display = "none";
  }

  btnLogout.addEventListener("click", () => logoutWipeAll());

  btnNewGame.addEventListener("click", () => {
    // لعبة جديدة: تصفر النقاط/الأقفال وتخلي الأسماء حسب اللي مكتوب الآن
    const ns = resetGameKeepNames(true);
    ns.teams.a = teamA.value.trim();
    ns.teams.b = teamB.value.trim();
    // تحدي واحد فقط = 1
    ns.selectedChallenge = 1;
    saveSession(ns);
    setStatus(statusBox, "تمت إعادة ضبط اللعبة (النقاط/الأقفال).", "ok");
  });

  btnContinue.addEventListener("click", async () => {
    const p = password.value.trim();
    const a = teamA.value.trim();
    const b = teamB.value.trim();

    if (!s.authed) {
      if (!p) return setStatus(statusBox, "اكتب كلمة المرور.", "bad");
      if (p !== DEFAULT_PASSWORD) return setStatus(statusBox, "كلمة المرور غير صحيحة.", "bad");
    }

    if (!a || !b) return setStatus(statusBox, "اكتب أسماء الفريقين.", "bad");

    // تحدي واحد فقط = 1
    try {
      await loadChallengeData(1);
    } catch (e) {
      return setStatus(statusBox, "ملف بيانات اللعبة غير موجود (data/challenges/1.json).", "bad");
    }

    const ns = ensureSession();
    ns.authed = true;
    ns.teams.a = a;
    ns.teams.b = b;
    ns.selectedChallenge = 1; // ثابت
    ns.lastUpdatedAt = nowISO();
    saveSession(ns);

    window.location.href = "rounds.html";
  });
})();
