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

  // لازم يكون فيه جولة مختارة
  if (!s.selectedRoundId) {
    window.location.href = "rounds.html";
    return;
  }

  let data;
  try {
    data = await loadChallengeData(1);
  } catch (e) {
    $("questionsGrid").innerHTML = `<div class="muted">تعذر تحميل بيانات الأسئلة.</div>`;
    return;
  }

  const challengeId = String(data.id);
  const points = (data.pointsPerQuestion || 10);
  $("pointsVal").textContent = String(points);

  // استخراج الجولة المختارة
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

  $("roundTitle").textContent = `${selectedCat.title} • ${selectedRound.title}`;

  // ✅ بطاقة الفوز (داخل صفحة الأسئلة)
  injectWinnerCardIfNeeded();

  const grid = $("questionsGrid");
  grid.innerHTML = "";

  // بناء 4 أسئلة
  for (const q of selectedRound.questions) {
    const locked = isQuestionLocked(s, challengeId, selectedRound.id, q.id);
    const assigned = getAssignedTeam(s, challengeId, selectedRound.id, q.id); // a/b/null

    const card = document.createElement("div");
    card.className = "qcard";

    const top = document.createElement("div");
    top.className = "qcard__top";

    const title = document.createElement("div");
    title.className = "qcard__title";
    title.textContent = `سؤال ${String(q.id).replace(/[^\d]/g,'') || ""}`.trim() || "سؤال";

    const badge = document.createElement("span");
    badge.className = `badge ${locked ? "badge--locked" : "badge--open"}`;
    badge.textContent = locked ? "مقفول" : "مفتوح";

    top.appendChild(title);
    top.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "qcard__meta";
    meta.textContent = `القيمة: ${points} نقاط`;

    // تعيين الفريق
    const assign = document.createElement("div");
    assign.className = "qcard__assign";

    const assignLabel = document.createElement("span");
    assignLabel.className = "pill";
    assignLabel.textContent = assigned
      ? `موجّه إلى: ${assigned === "a" ? teamAName : teamBName}`
      : "غير معيّن";

    const btnA = document.createElement("button");
    btnA.className = "btn btn--ghost btn--sm";
    btnA.type = "button";
    btnA.textContent = `تعيين لـ ${teamAName}`;
    btnA.disabled = locked;

    const btnB = document.createElement("button");
    btnB.className = "btn btn--ghost btn--sm";
    btnB.type = "button";
    btnB.textContent = `تعيين لـ ${teamBName}`;
    btnB.disabled = locked;

    const btnOpen = document.createElement("button");
    btnOpen.className = "btn btn--primary btn--sm";
    btnOpen.type = "button";
    btnOpen.textContent = "افتح السؤال";
    // ✅ ما تقدر تفتح بدون تعيين
    btnOpen.disabled = locked || !assigned;

    btnA.addEventListener("click", () => {
      const ns = ensureSession();
      setAssignedTeam(ns, challengeId, selectedRound.id, q.id, "a");
      assignLabel.textContent = `موجّه إلى: ${teamAName}`;
      btnOpen.disabled = false;
    });

    btnB.addEventListener("click", () => {
      const ns = ensureSession();
      setAssignedTeam(ns, challengeId, selectedRound.id, q.id, "b");
      assignLabel.textContent = `موجّه إلى: ${teamBName}`;
      btnOpen.disabled = false;
    });

    btnOpen.addEventListener("click", () => {
      const ns = ensureSession();
      const a = getAssignedTeam(ns, challengeId, selectedRound.id, q.id);
      if (!a) return;

      ns.selectedChallenge = 1;
      ns.selectedQuestionId = q.id;
      saveSession(ns);
      window.location.href = "game.html";
    });

    assign.appendChild(assignLabel);
    assign.appendChild(btnA);
    assign.appendChild(btnB);

    const actions = document.createElement("div");
    actions.className = "qcard__actions";
    actions.appendChild(btnOpen);

    card.appendChild(top);
    card.appendChild(meta);
    card.appendChild(assign);
    card.appendChild(actions);

    grid.appendChild(card);
  }

  // -------- helpers --------
  function injectWinnerCardIfNeeded(){
    const ns = ensureSession();
    if (!ns.winState || !ns.winState.reached) return;

    const target = getWinTarget();
    const winnerTeam = ns.winState.team;
    const winnerName = winnerTeam === "a" ? (ns.teams.a || "الفريق الأول") : (ns.teams.b || "الفريق الثاني");

    // مكان البطاقة: فوق الشبكة
    const host = document.getElementById("winnerHost") || document.querySelector("main.container") || document.body;

    // إذا موجودة مسبقًا لا نكررها
    if (document.getElementById("winnerCard")) return;

    const card = document.createElement("section");
    card.className = "card";
    card.id = "winnerCard";

    card.innerHTML = `
      <div class="card__title" style="font-size:20px;">🎉 مبروك! ${escapeHtml(winnerName)} وصل ${target} نقطة 🏆</div>
      <div class="muted" style="margin-top:6px; line-height:1.8;">
        تقدرون تكملون اللعب للنهاية، أو تبدأ فرق جديدة على الأسئلة المتبقية (المقفولة تظل مقفولة).
      </div>

      <div class="divider"></div>

      <div class="row row--wrap">
        <button id="btnWinContinue" class="btn btn--primary" type="button">نكمل باقي الأسئلة</button>
        <button id="btnWinNewTeams" class="btn btn--ghost" type="button">فريق جديد</button>
      </div>

      <div id="newTeamsBox" style="display:none; margin-top:14px;">
        <div class="divider"></div>
        <div class="card__title">أسماء الفرق الجديدة</div>
        <div class="muted">النقاط تبدأ من صفر، والأسئلة المقفولة تظل مقفولة.</div>

        <div class="grid grid--2" style="margin-top:12px;">
          <div class="field">
            <div class="label">اسم الفريق الأول</div>
            <input id="newTeamA" class="input" placeholder="مثال: فريق 1" />
          </div>
          <div class="field">
            <div class="label">اسم الفريق الثاني</div>
            <input id="newTeamB" class="input" placeholder="مثال: فريق 2" />
          </div>
        </div>

        <div class="row row--wrap" style="margin-top:12px;">
          <button id="btnStartNewTeams" class="btn btn--primary" type="button">ابدأ بالفريقين الجديدين</button>
          <button id="btnCancelNewTeams" class="btn btn--ghost" type="button">إلغاء</button>
        </div>

        <div class="status" id="winStatus" style="margin-top:10px;"></div>
      </div>
    `;

    // نحطه قبل grid لو نقدر
    const before = document.getElementById("questionsGrid");
    if (before && before.parentElement) before.parentElement.insertBefore(card, before);
    else host.prepend(card);

    // handlers
    document.getElementById("btnWinContinue").addEventListener("click", () => {
      const x = ensureSession();
      setWinnerMode(x, "continue");
      // نكمل بدون ما نمس شيء
      // نخفي البطاقة بس (اختياري)
      card.style.display = "none";
    });

    document.getElementById("btnWinNewTeams").addEventListener("click", () => {
      document.getElementById("newTeamsBox").style.display = "block";
    });

    document.getElementById("btnCancelNewTeams").addEventListener("click", () => {
      document.getElementById("newTeamsBox").style.display = "none";
    });

    document.getElementById("btnStartNewTeams").addEventListener("click", () => {
      const a = (document.getElementById("newTeamA").value || "").trim();
      const b = (document.getElementById("newTeamB").value || "").trim();
      if (!a || !b) {
        setStatus(document.getElementById("winStatus"), "اكتب اسمين للفرق الجديدة.", "bad");
        return;
      }
      startNewTeamsKeepLocks(a, b);
      window.location.href = "rounds.html";
    });
  }

})();
