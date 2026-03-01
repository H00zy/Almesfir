(async function () {
  if (!requireAuthOrRedirect()) return;

  const s = ensureSession();

  const sessionLine = $("sessionLine");
  const scorebar = $("scorebar");
  const content = $("content");

  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");

  btnLogout.addEventListener("click", () => logoutWipeAll());
  btnNewGame.addEventListener("click", () => {
    const ns = resetGameKeepNames(true);
    window.location.reload();
  });

  sessionLine.textContent = `${s.teams.a || "الفريق 1"} ضد ${s.teams.b || "الفريق 2"} • تحدي رقم ${s.selectedChallenge || 1}`;
  renderScorebar(scorebar, s);

  let data;
  try {
    data = await loadChallengeData(s.selectedChallenge || 1);
  } catch (e) {
    content.innerHTML = `<div class="card"><div class="card__title">خطأ</div><div class="muted">تعذر تحميل بيانات التحدي.</div></div>`;
    return;
  }

  // Render categories
  content.innerHTML = "";
  const challengeId = String(data.id);

  data.categories.forEach(cat => {
    const totalRounds = cat.rounds.length;
    let lockedRounds = 0;

    cat.rounds.forEach(r => {
      const fullyLocked = computeRoundFullyLocked(s, challengeId, r);
      if (fullyLocked) {
        lockedRounds++;
        setRoundLocked(s, challengeId, r.id, true);
      } else {
        setRoundLocked(s, challengeId, r.id, false);
      }
    });

    const catTile = document.createElement("div");
    catTile.className = "tile";
    catTile.innerHTML = `
      <div class="tile__title">${escapeHtml(cat.title)}</div>
      <div class="tile__sub">${escapeHtml(cat.subtitle || "")}</div>
      <div class="tile__footer">
        <div class="row row--wrap">
          <span class="badge ${lockedRounds === totalRounds ? "badge--locked" : "badge--open"}">
            ${lockedRounds === totalRounds ? "مقفلة بالكامل" : "متاحة"}
          </span>
          <span class="badge">Rounds: ${lockedRounds}/${totalRounds}</span>
        </div>
        <span class="pill pill--soft">اختر Round</span>
      </div>
      <div class="divider"></div>
      <div class="grid" style="grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px;" id="rounds-${cat.id}"></div>
    `;

    content.appendChild(catTile);

    const roundsWrap = catTile.querySelector(`#rounds-${cat.id}`);
    cat.rounds.forEach(r => {
      const fullyLocked = isRoundLocked(s, challengeId, r.id) || computeRoundFullyLocked(s, challengeId, r);
      const btn = document.createElement("button");
      btn.className = `btn ${fullyLocked ? "btn--ghost" : "btn--soft"}`;
      btn.type = "button";
      btn.disabled = fullyLocked;
      btn.textContent = fullyLocked ? `🔒 ${r.title}` : r.title;

      btn.addEventListener("click", () => {
        const ns = ensureSession();
        ns.selectedCategoryId = cat.id;
        ns.selectedRoundId = r.id;
        ns.lastUpdatedAt = nowISO();
        saveSession(ns);
        window.location.href = "questions.html";
      });

      roundsWrap.appendChild(btn);
    });
  });

})();
