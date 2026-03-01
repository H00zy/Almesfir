(function(){
  if (!requireAuthOrRedirect()) return;

  const s = ensureSession();

  const btnLogout = $("btnLogout");
  btnLogout.addEventListener("click", () => logoutWipeAll());

  const teamAName = (s.teams.a || "الفريق 1");
  const teamBName = (s.teams.b || "الفريق 2");

  $("sessionLine").textContent = `${teamAName} ضد ${teamBName}`;
  renderScorebar($("scorebar"), s);

  const target = getWinTarget();
  $("targetVal").textContent = String(target);

  // إذا ما فيه فائز مسجّل (مثلاً فتح الصفحة يدويًا)
  if (!s.winState || !s.winState.reached) {
    $("winnerTitle").textContent = "جاهزين للّعب 🎮";
    $("winnerLine").textContent = "ما تم تسجيل فائز بعد. ارجع للأسئلة وكمل اللعب.";
    stopConfettiSoon();
    return;
  }

  const winnerTeam = s.winState.team;
  const winnerName = winnerTeam === "a" ? teamAName : teamBName;

  $("winnerTitle").textContent = `مبروك يا ${winnerName}! 🏆`;
  $("winnerLine").textContent = `وصلت/وصلتم إلى ${target} نقطة أولاً — تستاهلون!`;

  // Confetti
  startConfetti();

  const btnContinue = $("btnContinue");
  const btnNewTeams = $("btnNewTeams");
  const newTeamsBox = $("newTeamsBox");

  btnContinue.addEventListener("click", () => {
    const ns = ensureSession();
    setWinnerMode(ns, "continue");
    // لا نمس الأقفال ولا النقاط — فقط نكمل
    window.location.href = "questions.html";
  });

  btnNewTeams.addEventListener("click", () => {
    newTeamsBox.style.display = "block";
  });

  $("btnCancelNewTeams").addEventListener("click", () => {
    newTeamsBox.style.display = "none";
  });

  $("btnStartNewTeams").addEventListener("click", () => {
    const a = ($("teamA").value || "").trim();
    const b = ($("teamB").value || "").trim();

    if (!a || !b) {
      setStatus($("statusBox"), "اكتب اسمين للفرق الجديدة.", "bad");
      return;
    }

    startNewTeamsKeepLocks(a, b);
    window.location.href = "rounds.html";
  });

  /* -------------------------
     Simple Confetti (Canvas)
     ------------------------- */
  let raf = null;
  let stopAt = Date.now() + 6500;

  function stopConfettiSoon(){
    stopAt = Date.now() + 1200;
  }

  function startConfetti(){
    const canvas = document.getElementById("confettiCanvas");
    const ctx = canvas.getContext("2d");

    function resize(){
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * devicePixelRatio);
      canvas.height = Math.floor(rect.height * devicePixelRatio);
      ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    }
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.getBoundingClientRect().width;
    const H = () => canvas.getBoundingClientRect().height;

    const pieces = Array.from({length: 120}).map(() => makePiece());

    function makePiece(){
      return {
        x: Math.random() * W(),
        y: -20 - Math.random() * H(),
        r: 4 + Math.random()*6,
        vx: (-1 + Math.random()*2) * 1.1,
        vy: 2.0 + Math.random()*3.2,
        a: Math.random() * Math.PI*2,
        va: (-1 + Math.random()*2) * 0.08,
        c: pick([
          "rgba(108,92,231,0.85)", // primary
          "rgba(245,158,11,0.85)", // gold
          "rgba(56,189,248,0.85)", // blue
          "rgba(34,197,94,0.80)"   // green
        ])
      };
    }

    function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

    function frame(){
      ctx.clearRect(0,0,W(),H());

      for (const p of pieces){
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r, p.r*2, p.r*1.4);
        ctx.restore();

        if (p.y > H()+40) {
          p.x = Math.random()*W();
          p.y = -30;
        }
      }

      if (Date.now() > stopAt){
        cancelAnimationFrame(raf);
        raf = null;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    frame();
  }

})();
