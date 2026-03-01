(async function () {
  if (!requireAuthOrRedirect()) return;

  const s = ensureSession();
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
  btnNewGame.addEventListener("click", () => { resetGameKeepNames(true); window.location.href="rounds.html"; });

  if (btnNewGame2) btnNewGame2.addEventListener("click", () => { resetGameKeepNames(true); window.location.href="rounds.html"; });
  if (btnLogout2) btnLogout2.addEventListener("click", () => logoutWipeAll());

  sessionLine.textContent = `${s.teams.a || "الفريق 1"} ضد ${s.teams.b || "الفريق 2"} • تحدي رقم ${s.selectedChallenge || 1}`;
  renderScorebar(scorebar, s);

  if (!s.selectedRoundId) {
    window.location.href = "rounds.html";
    return;
  }

  let data;
  try {
    data = await loadChallengeData(s.selectedChallenge || 1);
  } catch (e) {
    questionsGrid.innerHTML = `<div class="card"><div class="card__title">خطأ</div><div class="muted">تعذر تحميل بيانات التحدي.</div></div>`;
    return;
  }

  const challengeId = String(data.id);

  // find selected round
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

  // update round lock if fully locked
  const fullyLocked = computeRoundFullyLocked(s, challengeId, selectedRound);
  setRoundLocked(s, challengeId, selectedRound.id, fullyLocked);

  // render questions
  questionsGrid.innerHTML = "";
  selectedRound.questions.forEach((q, idx) => {
    const locked = isQuestionLocked(s, challengeId, selectedRound.id, q.id);
    const assigned = getAssignedTeam(s, challengeId, selectedRound.id, q.id);

    const card = document.createElement("div");
    card.className = "qcard";

    const assignLabel = assigned
      ? (assigned === "a" ? (s.teams.a || "الفريق 1") : (s.teams.b || "الفريق 2"))
      : "غير معيّن";

    card.innerHTML = `
      <div class="qcard__top">
        <div>
          <div class="qcard__title">سؤال ${idx + 1}</div>
          <div class="qcard__meta">القيمة: 10 نقاط • الحالة: ${locked ? "🔒 مقفل" : "✅ متاح"}</div>
        </div>
        <span class="badge ${locked ? "badge--locked" : "badge--open"}">${locked ? "مقفول" : "مفتوح"}</span>
      </div>

      <div class="qcard__assign">
        <span class="pill">الفريق المعيّن: <strong>${escapeHtml(assignLabel)}</strong></span>
        <div class="row row--wrap">
          <button class="btn btn--ghost btn--sm" type="button" data-assign="a" ${locked ? "disabled" : ""}>تعيين للفريق 1</button>
          <button class="btn btn--ghost btn--sm" type="button" data-assign="b" ${locked ? "disabled" : ""}>تعيين للفريق 2</button>
        </div>
      </div>

      <div class="qcard__actions">
        <button class="btn ${locked ? "btn--ghost" : "btn--primary"}" type="button" data-open ${locked ? "disabled" : ""}>
          ${locked ? "مقفل" : "افتح السؤال"}
        </button>
      </div>
    `;

    // assignment handlers
    card.querySelectorAll("button[data-assign]").forEach(btn => {
      btn.addEventListener("click", () => {
        const team = btn.getAttribute("data-assign");
        const ns = ensureSession();
        setAssignedTeam(ns, challengeId, selectedRound.id, q.id, team);
        window.location.reload();
      });
    });

    // open question
    card.querySelector("button[data-open]").addEventListener("click", () => {
      const ns = ensureSession();
      ns.selectedQuestionId = q.id;
      ns.lastUpdatedAt = nowISO();
      saveSession(ns);
      window.location.href = "game.html";
    });

    questionsGrid.appendChild(card);
  });

  // If all questions in whole challenge locked => show finish
  const allDone = computeAllQuestionsLocked(s, data);
  if (allDone) {
    finishCard.style.display = "block";
    const w = computeWinner(s);
    winnerLine.textContent = w.line;
  } else {
    finishCard.style.display = "none";
  }
})();
