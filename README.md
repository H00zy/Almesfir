# Eid Family Game (RTL) — Password Protected Mini Web App (GitHub Pages)

A polished, mobile-friendly Arabic (RTL) mini web game for Eid family gatherings:
- Password gate (client-side demo)
- Two teams session (names + challenge number 1–7)
- Flow: `index.html` → `rounds.html` → `questions.html` → `game.html`
- Local persistence: auth, names, selected challenge/round, scores, question locks, team assignment
- No external frameworks (vanilla HTML/CSS/JS)

---

## Live flow (How it works)
1) **index.html**
   - Enter password
   - Team A + Team B names
   - Choose challenge number (1–7)

2) **rounds.html**
   - Choose a category + round from the selected challenge JSON

3) **questions.html**
   - Shows 4 questions for the selected round
   - Assign a team to each question (A/B)
   - Open question (moves to game screen)

4) **game.html**
   - Shows question
   - Timer
   - Switch team (optional)
   - Award 10 points and lock question OR lock without points
   - Locked questions cannot be reopened

When ALL questions in the challenge are locked, the game shows the winner.

---

## Repo structure
