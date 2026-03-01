(async function () {
  if (!requireAuthOrRedirect()) return;

  const s = ensureSession();
  s.selectedChallenge = 1; // تحدي واحد فقط
  saveSession(s);

  const sessionLine = $("sessionLine");
  const scorebar = $("scorebar");
  const content = $("content");

  const progressLine = $("progressLine");
  const progressFill = $("progressFill");

  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");

  btnLogout.addEventListener("click", () => logoutWipeAll());
  btnNewGame.addEventListener("click", () => {
    resetGameKeepNames(true);
    window.location.reload();
  });

  sessionLine.textContent = `${s.teams.a || "الفريق 1"} ضد ${s.teams.b || "الفريق 2"}`;
  renderScorebar(scorebar, s);

  let data;
  try {
    data = await loadChallengeData(1);
  } catch (e) {
    content.innerHTML = `<div class="card"><div class="card__title">خطأ</div><div class="muted">تعذر تحميل بيانات اللعبة (data/challenges/1.json).</div></div>`;
    return;
  }

  const challengeId = String(data.id);

  // ---- compute global progress (all questions locked) ----
  let totalQ = 0;
  let lockedQ = 0;

  for (const cat of data.categories) {
    for (const round of cat.rounds) {
      totalQ += round.questions.length;
      for (const q of round.questions) {
        if (isQuestionLocked(s, challengeId, round.id, q.id)) lockedQ++;
      }
    }
  }

  const pct = totalQ ? Math.round((lockedQ / totalQ) * 100) : 0;
  progressLine.textContent = `التقدّم: ${lockedQ}/${totalQ} سؤال مقفل (${pct}%)`;
  progressFill.style.width = `${pct}%`;

  // ---- render categories as large premium blocks ----
  content.innerHTML = "";

  data.categories.forEach(cat => {
    // compute category stats
    const catTotalRounds = cat.rounds.length;
    let catLockedRounds = 0;

    let catTotalQ = 0;
    let catLockedQ = 0;

    cat.rounds.forEach(r => {
      catTotalQ += r.questions.length;

      const fullyLocked = computeRoundFullyLocked(s, challengeId, r);
      if (fullyLocked) {
        catLockedRounds++;
        setRoundLocked(s, challengeId, r.id, true);
      } else {
        setRoundLocked(s, challengeId, r.id, false);
      }

      for (const q of r.questions) {
        if (isQuestionLocked(s, challengeId, r.id, q.id)) catLockedQ++;
      }
    });

    const catPct = catTotalQ ? Math.round((catLockedQ / catTotalQ) * 100) : 0;

    const block = document.createElement("section");
    block.className = "categoryBlock";
    block.setAttribute("data-type", cat.id); // grandparents / parents / grandkids

    block.innerHTML = `
      <div class="categoryBlock__head">
        <div class="categoryBlock__titles">
          <div class="categoryBlock__title">${escapeHtml(cat.title)}</div>
          <div class="categoryBlock__sub">${escapeHtml(cat.subtitle || "")}</div>
        </div>

        <div class="categoryBlock__stats">
          <span class="badge ${catLockedRounds === catTotalRounds ? "badge--locked" : "badge--open"}">
            ${catLockedRounds === catTotalRounds ? "مقفلة بالكامل" : "متاحة"}
          </span>
          <span class="badge">الجولات: ${catLockedRounds}/${catTotalRounds}</span>
          <span class="badge">الأسئلة: ${catLockedQ}/${catTotalQ}</span>
        </div>
      </div>

      <div class="categoryBlock__bar">
        <div class="categoryBar" aria-hidden="true">
          <div class="categoryBar__fill" style="width:${catPct}%"></div>
        </div>
        <div class="muted categoryBlock__barTxt">${catPct}% من أسئلة الفئة مقفلة</div>
      </div>

      <div class="categoryBlock__rounds" id="rounds-${cat.id}"></div>
    `;

    content.appendChild(block);

    const roundsWrap = block.querySelector(`#rounds-${cat.id}`);

    cat.rounds.forEach(r => {
      const fullyLocked = isRoundLocked(s, challengeId, r.id) || computeRoundFullyLocked(s, challengeId, r);

      const roundTotal = r.questions.length;
      let roundLocked = 0;
      r.questions.forEach(q => {
        if (isQuestionLocked(s, challengeId, r.id, q.id)) roundLocked++;
      });

      const roundCard = document.createElement("div");
      roundCard.className = `roundCard ${fullyLocked ? "roundCard--locked" : ""}`;

      roundCard.innerHTML = `
        <div class="roundCard__top">
          <div>
            <div class="roundCard__title">${escapeHtml(r.title)}</div>
            <div class="roundCard__meta">${escapeHtml(r.hint || "هذه الجولة تحتوي 4 أسئلة")}</div>
          </div>
          <span class="badge ${fullyLocked ? "badge--locked" : "badge--open"}">${fullyLocked ? "مقفول" : "متاح"}</span>
        </div>

        <div class="roundCard__mid">
          <div class="roundDots" aria-hidden="true">
            ${Array.from({ length: roundTotal }).map((_, i) => {
              const qid = `q${i+1}`;
              const locked = isQuestionLocked(s, challengeId, r.id, qid);
              return `<span class="dot ${locked ? "dot--on" : ""}"></span>`;
            }).join("")}
          </div>
          <div class="muted">مقفلة: ${roundLocked}/${roundTotal}</div>
        </div>

        <div class="roundCard__actions">
          <button class="btn ${fullyLocked ? "btn--ghost" : "btn--primary"} btn--sm" type="button" ${fullyLocked ? "disabled" : ""}>
            ${fullyLocked ? "🔒 مقفل" : "ابدأ الجولة"}
          </button>
        </div>
      `;

      const startBtn = roundCard.querySelector("button");
      startBtn.addEventListener("click", () => {
        const ns = ensureSession();
        ns.selectedChallenge = 1;
        ns.selectedCategoryId = cat.id;
        ns.selectedRoundId = r.id;
        ns.lastUpdatedAt = nowISO();
        saveSession(ns);
        window.location.href = "questions.html";
      });

      roundsWrap.appendChild(roundCard);
    });
  });

})();
