(async function () {
  if (!requireAuthOrRedirect()) return;

  const s = ensureSession();
  s.selectedChallenge = 1;
  saveSession(s);

  const teamAName = (s.teams && s.teams.a && s.teams.a.trim()) ? s.teams.a.trim() : "الفريق الأول";
  const teamBName = (s.teams && s.teams.b && s.teams.b.trim()) ? s.teams.b.trim() : "الفريق الثاني";

  $("sessionLine").textContent = `${teamAName} ضد ${teamBName}`;

  const btnLogout = $("btnLogout");
  const btnNewGame = $("btnNewGame");
  btnLogout.addEventListener("click", () => logoutWipeAll());
  btnNewGame.addEventListener("click", () => { resetGameKeepNames(true); window.location.href = "rounds.html"; });

  const scorebar = $("scorebar");
  renderScorebar(scorebar, s);

  // ✅ زر فتح جميع الأسئلة المقفولة (بدون تأثير على النقاط ولا أسماء الفرق)
  const btnUnlockAll = document.getElementById("btnUnlockAll");
  btnUnlockAll.addEventListener("click", () => {
    const ns = ensureSession();

    // احذف الأقفال فقط
    if (ns.locks) delete ns.locks;

    // (اختياري) إزالة مؤشرات “جولة مقفولة” لو كانت محفوظة بشكل مختلف
    if (ns.roundLocks) delete ns.roundLocks;

    saveSession(ns);
    window.location.reload();
  });

  // تحميل بيانات التحدي 1
  let data;
  try {
    data = await loadChallengeData(1);
  } catch (e) {
    document.getElementById("categoriesWrap").innerHTML = `<div class="muted">تعذر تحميل بيانات الفئات.</div>`;
    return;
  }

  const wrap = document.getElementById("categoriesWrap");
  wrap.innerHTML = "";

  // عرض الفئات + الجولات
  for (const cat of data.categories) {
    const block = document.createElement("div");
    block.className = "categoryBlock";
    // تلوين حسب النوع إن كان موجود
    if (cat.type) block.setAttribute("data-type", cat.type);

    const head = document.createElement("div");
    head.className = "categoryBlock__head";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "categoryBlock__title";
    title.textContent = cat.title;

    const sub = document.createElement("div");
    sub.className = "categoryBlock__sub";
    sub.textContent = cat.subtitle || "";

    left.appendChild(title);
    if (cat.subtitle) left.appendChild(sub);

    head.appendChild(left);
    block.appendChild(head);

    const roundsGrid = document.createElement("div");
    roundsGrid.className = "categoryBlock__rounds";

    for (const r of cat.rounds) {
      const card = document.createElement("div");
      card.className = "roundCard";

      const top = document.createElement("div");
      top.className = "roundCard__top";

      const rTitle = document.createElement("div");
      rTitle.className = "roundCard__title";
      rTitle.textContent = r.title;

      const meta = document.createElement("div");
      meta.className = "roundCard__meta";
      meta.textContent = "٤ أسئلة";

      top.appendChild(rTitle);
      card.appendChild(top);
      card.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "roundCard__actions";

      const btn = document.createElement("button");
      btn.className = "btn btn--primary btn--sm";
      btn.type = "button";
      btn.textContent = "اختيار";

      btn.addEventListener("click", () => {
        const ns = ensureSession();
        ns.selectedRoundId = r.id;
        // لا نحدد سؤال هنا — يتم اختيار السؤال من questions.html
        saveSession(ns);
        window.location.href = "questions.html";
      });

      actions.appendChild(btn);
      card.appendChild(actions);

      roundsGrid.appendChild(card);
    }

    block.appendChild(roundsGrid);
    wrap.appendChild(block);
  }
})();
