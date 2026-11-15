# FitPlan – Workout Planner (PWA)

A web app you can install on your phone. It builds a two-week training plan that mixes strength and cardio, runs your workouts with timers, and tracks your progress. There is no server and no sign-in: all data stays on the device.

**Live:** https://matreed90.github.io/fitplan/

## Features

- **Two-week plan generator.** For each training day you choose the time, duration, location (home, gym, outdoors, army) and the equipment you'll have. Week 1 and week 2 get different workouts, then the cycle repeats.
- **Live workout mode.** Log weight and reps for every set, automatic rest timer (beep and vibration), timers for holds and cardio, values pre-filled from your last session.
- **YouTube.** Every exercise has a form tip and a ready YouTube search. Paste a link to a video you like and it plays inside the app from then on.
- **Progress tracking.** Weekly charts (workouts, cardio minutes, strength volume), per-exercise progress chart, personal records, week streak, history.
- **Body.** Weight, waist, body fat %, BMI and a trend chart.
- **Reminders.** Browser notifications before each workout, plus calendar export (`.ics` with alarms) that works even when the app is closed.
- **Backup and restore** to a JSON file. Works offline (service worker).
- **"How your plan is built" screen** in the app, plus a "Why this workout?" note on every day of the plan.

## How the plan is built

The plan is built by fixed rules in [`data.js`](data.js) that run on the phone. There is no coach or AI involved. The inputs are only the setup answers: goal, level, and for each training day its time, duration, location and equipment.

### 1. Goal → sets, reps and rest

| Goal | Sets × reps | Rest | Timed holds |
|---|---|---|---|
| Build muscle | 4 × 8–10 | 90 s | 45 s |
| Lose weight | 3 × 12–15 | 40 s | 40 s |
| General fitness | 3 × 10–12 | 60 s | 40 s |
| Endurance | 3 × 15–20 | 40 s | 50 s |

Values for the intermediate level.

### 2. Level → adjustments

- **Beginner:** 1 set fewer (minimum 2), timed holds 15 s shorter, cardio 20% shorter.
- **Intermediate:** no change.
- **Advanced:** 1 extra set, timed holds 15 s longer, cardio 20% longer.

### 3. Training days per week → session types

Each week is planned from the number of days you train that week. Examples:

| Goal | 3 days | 4 days |
|---|---|---|
| Build muscle | Full body ×3 | Upper · Lower · Upper · Lower |
| Lose weight | Circuit · Steady cardio · Circuit | Full body · HIIT · Full body · Long cardio |
| General fitness | Full body · Steady cardio · Full body | Full body · Steady cardio · Full body · HIIT |
| Endurance | Steady cardio · Full body · Long cardio | Steady cardio · Full body · HIIT · Long cardio |

The full table for 1–7 days is `PATTERNS` in `data.js`. Few days → full-body sessions so every muscle is trained each week; more days → upper/lower splits so each area can recover.

### 4. Placing sessions on days

1. Outdoor days get the cardio sessions first.
2. Gym days get the strength sessions first.
3. The remaining sessions fill the other days in order.
4. The long cardio session moves to the longest cardio day.
5. Week 2 uses different exercise variants (A–D) from week 1.

### 5. Duration → session size

| Duration | 20 | 30 | 45 | 60 | 75 | 90 min |
|---|---|---|---|---|---|---|
| Exercise slots | 3 | 4 | 5 | 6 | 7 | 7 |

Strength sessions add a cardio warm-up (5 min, or 10 min from 45 min up) and, from 45 min, a 5-minute cool-down. Cardio sessions fill the day's duration, adjusted by level.

### 6. Location and equipment → exercises

- Exercises come only from the equipment ticked for that day; bodyweight exercises are always allowed.
- When several fit, the best-equipped option wins: gym machines → dumbbells or pull-up bar → vibration plate or yoga mat → bodyweight.
- Default equipment per place: gym = gym machines, dumbbells, pull-up bar, mat; army = pull-up bar; home and outdoors = none.
- Cardio per place: gym = treadmill, bike, rower, elliptical; outdoors = run, cycling, sprints (beginners: brisk walk); army = run, sprints; home = jump rope, walk-at-home video.

### 7. Fixed rules

- Every strength session starts with a cardio warm-up, so every plan mixes cardio and strength.
- Sessions of 45 min or more end with a cool-down: stretching, yoga (with a mat) or a vibration-plate release.
- Army strength days add 2 conditioning exercises.
- During a workout, weights and reps are pre-filled from the last session.

### What it's based on

Common, general training principles: lower reps with longer rest for muscle growth and higher reps with shorter rest for endurance and fat loss; full-body training for few days and upper/lower splits for more; easy conversational cardio (zone 2) plus HIIT; warm-up and cool-down. For reference, the WHO recommends 150–300 minutes of moderate aerobic activity a week plus muscle-strengthening on 2 or more days.

### What it does not consider

- Age, sex, injuries, pain, medical conditions or pregnancy.
- Progress over time: it doesn't raise weights, add sets or ease off on its own.
- Real fitness: the level is what the user selected, not a test.
- Whether the WHO weekly activity target is met.

It's a planning and tracking tool, not a replacement for a coach or doctor.

## Privacy and security

- All data is stored in the browser on the user's device (`localStorage`). Nothing is sent to a server.
- Each person who installs the app has their own separate data.
- Backup files are validated field by field before import, user text is escaped on screen, and a Content Security Policy only allows the app's own scripts to run.
- The only external content is the YouTube player (`youtube-nocookie.com`), loaded only when you open a saved video.

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765

## Deploy (GitHub Pages)

Upload all files to the repository root, then **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**. Updates go live within a minute or two; installed copies pick them up on next launch.

## Install on a phone

- **iPhone:** open the site in Safari → Share → **Add to Home Screen**. Notifications work only after installing (iOS 16.4+).
- **Android:** Chrome → menu → **Install app**.

## Files

| File | Contents |
|---|---|
| `index.html` | Page shell and navigation |
| `data.js` | Exercise library and the plan generator rules |
| `app.js` | Screens, live workout, charts, reminders, calendar, backup |
| `styles.css` | Styles (including dark mode) |
| `sw.js`, `manifest.webmanifest` | Offline support and installation |
