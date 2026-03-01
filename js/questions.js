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
  const roundHint = $("roundHint");
  const questionsGrid = $("questionsGrid");

  const finishCard = $("finishCard");
  const winnerLine = $("winnerLine");

  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");
  const btnNewGame2 = $("btnNewGame2");
  const btnLogout2 = $("btnLogout2");

  btnLogout.addEventListener("click", () => logoutWipeAll());
  btnNewGame.addEventListener("click", () => { resetGameKeepNames(true); window.location.href = "rounds.html"; });

  if (btnNewGame2) btnNewGame2.addEventListener("click", () => { resetGameKeepNames(true); window.location.href = "rounds.html"; });
  if (btnLogout2) btnLogout2.addEventListener("click", () => logoutWipeAll());

  sessionLine.textContent = `${teamAName} ضد ${teamBName}`;
  renderScorebar(scorebar, s);

  if (!s.selectedRoundId) {
    window.location.href = "rounds.html";
    return;
  }

  let data;
  try {
    data = await loadChallengeData(1);
  } catch (e) {
    questionsGrid.innerHTML = `<div class="card"><div class="card__title">خطأ</div><div class="muted">تعذر تحميل بيانات اللعبة.</div></div>`;
    return;
  }

  const challengeId = String(data.id);

  let selectedCat = null;
  let selectedRound = null;

  for (const cat of data.categories) {
    for (const r of cat.rounds) {
      if (r.id === s.selectedRoundId) {
        selectedCat = cat;
        selectedRound = r;
      }
    }
  }

  if (!selectedRound) {
    window.location.href = "rounds.html";
    return;
  }

  roundTitle.textContent = `${selectedCat.title} • ${selectedRound.title}`;
  roundHint.textContent = selectedRound.hint || "كل سؤال = 10 نقاط. بعد الاستخدام يُقفل.";

  // تحديث حالة قفل الجولة
  const fullyLocked = computeRoundFullyLocked(s, challengeId, selectedRound);
  setRoundLocked(s, challengeId, selectedRound.id, fullyLocked);

  questionsGrid.innerHTML = "";

  selectedRound.questions.forEach((q, idx) => {
    const locked = isQuestionLocked(s, challengeId, selectedRound.id, q.id);
    const assigned = getAssignedTeam(s, challengeId, selectedRound.id, q.id);

    const assignedLabel = assigned
      ? (assigned === "a" ? teamAName : teamBName)
      : "غير معيّن";

    const card = document.createElement("div");
    card.className = "qcard";

    // ملاحظة: حتى لو صار كاش لجزء من النص، بنضبطه بعد الإنشاء مباشرة
    card.innerHTML = `
      <div class="qcard__top">
        <div>
          <div class="qcard__title">سؤال ${idx + 1}</div>
          <div class="qcard__meta">القيمة: 10 نقاط • الحالة: ${locked ? "🔒 مقفل" : "✅ متاح"}</div>
        </div>
        <span class="badge ${locked ? "badge--locked" : "badge--open"}">${locked ? "مقفول" : "مفتوح"}</span>
      </div>

      <div class="qcard__assign">
        <span class="pill">الفريق المعيّن: <strong class="assignedLabel">${escapeHtml(assignedLabel)}</strong></span>
        <div class="row row--wrap">
          <button class="btn btn--ghost btn--sm btnAssignA" type="button" data-assign="a" ${locked ? "disabled" : ""}>تعيين لـ ${escapeHtml(teamAName)}</button>
          <button class="btn btn--ghost btn--sm btnAssignB" type="button" data-assign="b" ${locked ? "disabled" : ""}>تعيين لـ ${escapeHtml(teamBName)}</button>
        </div>
      </div>

      <div class="qcard__actions">
        <button class="btn ${locked ? "btn--ghost" : "btn--primary"} btnOpen" type="button" data-open ${locked ? "disabled" : ""}>
          ${locked ? "هذا السؤال مقفل" : "افتح السؤال"}
        </button>
      </div>
    `;

    // ✅ ضمان 100% أن النص يكون بأسماء الفرق (حتى لو كان فيه شيء قديم)
    const btnA = card.querySelector(".btnAssignA");
    const btnB = card.querySelector(".btnAssignB");
    if (btnA) btnA.textContent = `تعيين لـ ${teamAName}`;
    if (btnB) btnB.textContent = `تعيين لـ ${teamBName}`;

    // تعيين الفريق
    card.querySelectorAll("button[data-assign]").forEach(btn => {
      btn.addEventListener("click", () => {
        const team = btn.getAttribute("data-assign");
        const ns = ensureSession();
        ns.selectedChallenge = 1;
        setAssignedTeam(ns, challengeId, selectedRound.id, q.id, team);
        saveSession(ns);
        window.location.reload();
      });
    });

    // فتح شاشة اللعب
    card.querySelector("button[data-open]").addEventListener("click", () => {
      const ns = ensureSession();
      ns.selectedChallenge = 1;
      ns.selectedQuestionId = q.id;
      ns.lastUpdatedAt = nowISO();
      saveSession(ns);
      window.location.href = "game.html";
    });

    questionsGrid.appendChild(card);
  });

  // نهاية اللعبة
  const allDone = computeAllQuestionsLocked(s, data);
  if (allDone) {
    finishCard.style.display = "block";
    const w = computeWinner(s);
    winnerLine.textContent = w.line;
  } else {
    finishCard.style.display = "none";
  }
})();
