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
eid-family-game/
├─ index.html
├─ rounds.html
├─ questions.html
├─ game.html
├─ assets/
│ ├─ images/logo.png
│ └─ icons/favicon.png
├─ css/style.css
├─ js/
│ ├─ common.js
│ ├─ index.js
│ ├─ rounds.js
│ ├─ questions.js
│ └─ game.js
└─ data/challenges/
├─ 1.json
├─ 2.json
├─ 3.json
├─ 4.json
├─ 5.json
├─ 6.json
└─ 7.json


---

## Setup (Local)
Because we load JSON with `fetch()`, run via a local server (not by opening the file directly).

### Option A: VS Code Live Server
1. Install "Live Server"
2. Right click `index.html` → "Open with Live Server"

### Option B: Python simple server
From the repo root:
- Python 3:python -m http.server 5500

Then open:
- http://localhost:5500

---

## Deploy to GitHub Pages
1. Create a GitHub repository (e.g. `eid-family-game`)
2. Upload all files to the repo root
3. Go to:
 - **Settings → Pages**
4. Under **Build and deployment**:
 - Source: **Deploy from a branch**
 - Branch: **main**
 - Folder: **/(root)**
5. Save
6. GitHub will give you your site URL

> Tip: Always keep `index.html` in the root for GitHub Pages.

---

## Data format (Adding new questions / challenges)
Each challenge is a JSON file under:
`data/challenges/<challengeNo>.json`

Schema:
```json
{
"id": 1,
"title": "Challenge title",
"description": "Optional",
"pointsPerQuestion": 10,
"categories": [
  {
    "id": "category_id",
    "title": "Category title",
    "subtitle": "Optional",
    "rounds": [
      {
        "id": "round_id",
        "title": "Round title",
        "hint": "Optional hint",
        "questions": [
          { "id": "q1", "text": "Question text" },
          { "id": "q2", "text": "Question text" },
          { "id": "q3", "text": "Question text" },
          { "id": "q4", "text": "Question text" }
        ]
      }
    ]
  }
]
}

