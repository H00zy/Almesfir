// صفحة الدخول فقط — لا تستدعي requireAuthOrRedirect هنا.

(function () {
  const form = document.getElementById("loginForm");
  const pass = document.getElementById("password");
  const teamA = document.getElementById("teamA");
  const teamB = document.getElementById("teamB");
  const status = document.getElementById("status");
  const btnClearAll = document.getElementById("btnClearAll");

  // ✅ غيّر كلمة المرور هنا
  const DEMO_PASSWORD = "1234";

  // لو كان مسجل دخول سابقاً، ودّه مباشرة
  const s0 = ensureSession();
  if (s0.auth === true) {
    window.location.href = "rounds.html";
    return;
  }

  btnClearAll.addEventListener("click", () => {
    localStorage.removeItem("family_game_session_v1");
    status.className = "status status--ok";
    status.textContent = "تم مسح كل البيانات.";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const entered = (pass.value || "").trim();

    if (entered !== DEMO_PASSWORD) {
      status.className = "status status--bad";
      status.textContent = "كلمة المرور غير صحيحة.";
      return;
    }

    const s = ensureSession();

    // احفظ الجلسة
    s.auth = true;
    s.selectedChallenge = 1;

    // أسماء الفرق
    s.teams = {
      a: (teamA.value || "").trim() || "الفريق الأول",
      b: (teamB.value || "").trim() || "الفريق الثاني"
    };

    // إذا ما فيه نقاط، ابدأ من صفر
    if (!s.scores) s.scores = { a: 0, b: 0 };

    // لا نلمس locks هنا — إذا تبغى دخول جديد يفتح كل شيء قلّي
    saveSession(s);

    status.className = "status status--ok";
    status.textContent = "تم الدخول بنجاح…";

    window.setTimeout(() => {
      window.location.href = "rounds.html";
    }, 150);
  });
})();
