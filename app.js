'use strict';
// ---------- State ----------
const KEY = 'fitapp.v1';
const defaultState = () => ({
  profile: null, plan: null, logs: [], body: [], videos: {},
  settings: { notify: false, before: 30 }, active: null, notified: {},
});
let S = migrate(load());
function load() {
  try { return Object.assign(defaultState(), JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch { return defaultState(); }
}
// Older saves had one time/duration/equipment for the whole week.
function migrate(st) {
  const p = st.profile;
  if (p && !p.schedule) {
    const loc = p.equipment === 'gym' ? 'gym' : 'home';
    p.schedule = (p.days || []).map((day) => ({ day, time: p.time || '18:00', minutes: p.minutes || 45, loc }));
    p.homeEquipment = p.equipment === 'dumbbells' ? 'dumbbells' : 'none';
  }
  if (p && !Array.isArray(p.homeEquipment)) p.homeEquipment = p.homeEquipment === 'dumbbells' ? ['dumbbells'] : [];
  // One-week plans become a 2-week cycle (week 2 starts as a copy of week 1).
  if (p && p.schedule.every((s) => s.day < 7)) p.schedule = [...p.schedule, ...p.schedule.map((s) => ({ ...s, day: s.day + 7 }))];
  // Equipment moved from one "home equipment" answer to each day.
  if (p) p.schedule.forEach((s) => { s.equip ??= s.loc === 'home' ? [...p.homeEquipment] : defaultEquip(s.loc); });
  if (st.plan && st.plan.length === 7) st.plan = [...st.plan, ...JSON.parse(JSON.stringify(st.plan))];
  (st.plan || []).forEach((d) => { d.equip ??= d.loc === 'home' ? [...(p?.homeEquipment || [])] : defaultEquip(d.loc || 'home'); });
  // The app used to be in Hebrew: translate generated workout titles saved by older versions.
  const HE_TITLES = [['כושר קרבי', 'Combat Fitness'], ['גוף מלא', 'Full Body'], ['פלג גוף עליון', 'Upper Body'], ['פלג גוף תחתון', 'Lower Body'],
    ['מעגל שריפה', 'Fat-Burn Circuit'], ['כוח + אירובי', 'Strength + Cardio'], ['אירובי ארוך', 'Long Cardio'], ['אירובי', 'Cardio'], ['מנוחה', 'Rest']];
  const tr = (t) => { for (const [he, en] of HE_TITLES) if (typeof t === 'string' && t.startsWith(he)) return en + t.slice(he.length); return t; };
  (st.plan || []).forEach((d) => { d.title = tr(d.title); });
  (st.logs || []).forEach((l) => { l.title = tr(l.title); });
  if (st.plan && !st.planStart) st.planStart = weekStart().toLocaleDateString('en-CA'); // dateStr isn't defined yet here
  (st.plan || []).forEach((d) => { d.minutes ??= p?.minutes || 45; d.loc ??= p?.equipment === 'gym' ? 'gym' : 'home'; d.kind ??= d.type === 'rest' ? 'rest' : DEFAULT_KIND[d.type]; });
  return st;
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

// ---------- Backup import validation ----------
// A backup file may come from someone else, so rebuild it field by field: known keys only,
// numbers as numbers, ids/dates/times matching strict patterns, exercises from the library only.
function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.plan) || !Array.isArray(raw.logs)) throw new Error('bad backup');
  const EX_IDS = new Set(EXERCISES.map((e) => e.id));
  const KINDS = ['weight', 'reps', 'time', 'cardio'];
  const SESSION_KINDS = ['rest', 'full', 'upper', 'lower', 'circuit', 'mixed', 'hiit', 'cardio', 'cardioLong'];
  const n = (v, min = 0, max = 100000) => { const x = parseFloat(v); return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : 0; };
  const valid = (v) => v !== '' && v != null && Number.isFinite(parseFloat(v));
  const nOrEmpty = (v, max) => (valid(v) ? n(v, 0, max) : '');
  const nOrNull = (v, max) => (valid(v) ? n(v, 0, max) : null);
  const int = (v, min, max) => Math.round(n(v, min, max));
  const str = (v, max = 80) => String(v ?? '').slice(0, max);
  const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);
  const match = (v, re, dflt) => (typeof v === 'string' && re.test(v) ? v : dflt);
  const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^\d{2}:\d{2}$/, ID = /^[\w-]{1,40}$/, REPS = /^[\d\s\-–]{0,12}$/;
  const arr = (v) => (Array.isArray(v) ? v : []);
  const equip = (v) => arr(v).filter((k) => k in EQUIP_CHOICES);
  const item = (it) => (EX_IDS.has(it?.exId) ? {
    exId: it.exId, sets: int(it.sets, 1, 20), reps: match(String(it.reps ?? ''), REPS, '10'),
    sec: int(it.sec, 0, 3600), rest: int(it.rest, 0, 600), minutes: int(it.minutes, 0, 600),
  } : null);
  const day = (d) => ({
    kind: oneOf(d?.kind, SESSION_KINDS, 'rest'), type: oneOf(d?.type, Object.keys(TYPE_LABEL), 'rest'), title: str(d?.title),
    time: match(d?.time, TIME, '18:00'), minutes: int(d?.minutes, 5, 300) || 45, loc: oneOf(d?.loc, Object.keys(LOCS), 'home'),
    equip: equip(d?.equip), items: arr(d?.items).map(item).filter(Boolean),
  });
  const set = (s) => ({ reps: nOrEmpty(s?.reps, 1000), weight: nOrEmpty(s?.weight, 1000), sec: nOrEmpty(s?.sec, 36000), done: s?.done === true });
  const entry = (e) => (EX_IDS.has(e?.exId) ? {
    exId: e.exId, kind: oneOf(e.kind, KINDS, exById(e.exId).kind), rest: int(e.rest, 0, 600), target: str(e.target, 20),
    sets: arr(e.sets).slice(0, 50).map(set), minutes: nOrEmpty(e.minutes, 1000), distance: nOrEmpty(e.distance, 1000), done: e.done === true,
  } : null);
  const plan = raw.plan.slice(0, 7 * WEEKS).map(day);
  if (plan.length !== 7 && plan.length !== 7 * WEEKS) throw new Error('bad plan length');
  const p = raw.profile || {};
  const videos = {};
  for (const [k, v] of Object.entries(raw.videos || {})) { const id = ytId(v); if (EX_IDS.has(k) && id) videos[k] = `https://youtu.be/${id}`; }
  return {
    ...defaultState(),
    profile: {
      goal: oneOf(p.goal, Object.keys(GOALS), 'fitness'), level: oneOf(p.level, Object.keys(LEVELS), 'beginner'), height: nOrEmpty(p.height, 260),
      homeEquipment: equip(p.homeEquipment),
      schedule: arr(p.schedule).map((s) => ({ day: int(s?.day, 0, 7 * WEEKS - 1), time: match(s?.time, TIME, '18:00'), minutes: int(s?.minutes, 5, 300) || 45, loc: oneOf(s?.loc, Object.keys(LOCS), 'home'), equip: equip(s?.equip) })),
    },
    planStart: match(raw.planStart, DATE, undefined),
    plan,
    logs: raw.logs.slice(0, 5000).map((l) => ({
      id: match(l?.id, ID, uid()), date: match(l?.date, DATE, null), dayIdx: int(l?.dayIdx, 0, 7 * WEEKS - 1), title: str(l?.title),
      type: oneOf(l?.type, Object.keys(TYPE_LABEL), 'strength'), durationSec: int(l?.durationSec, 0, 86400), entries: arr(l?.entries).map(entry).filter(Boolean),
    })).filter((l) => l.date),
    body: arr(raw.body).slice(0, 5000).map((r) => ({ id: match(r?.id, ID, uid()), date: match(r?.date, DATE, null), weight: nOrNull(r?.weight, 500), waist: nOrNull(r?.waist, 300), fat: nOrNull(r?.fat, 100) })).filter((r) => r.date),
    videos,
    settings: { notify: false, before: int(raw.settings?.before, 0, 600) }, // notifications need a fresh permission on this device
  };
}

// ---------- Helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateStr = (d = new Date()) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
const fmtDate = (s) => new Date(s + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
const fmtDur = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);
function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function setPath(obj, path, val) {
  const keys = path.split('.'); let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys.at(-1)] = val;
}
// The plan is a repeating 2-week cycle anchored at S.planStart (a Sunday).
function cycleWeek(d = new Date()) {
  if (!S.planStart) return 0;
  const diff = Math.round((weekStart(d) - new Date(S.planStart + 'T00:00')) / (7 * 864e5));
  return ((diff % WEEKS) + WEEKS) % WEEKS;
}
const planIdx = (d = new Date()) => cycleWeek(d) * 7 + d.getDay();
const plannedDays = (w = cycleWeek()) => (S.plan || []).slice(w * 7, w * 7 + 7).filter((d) => d.type !== 'rest').length;
const logsOn = (ds) => S.logs.filter((l) => l.date === ds);

function itemTarget(it) {
  const ex = exById(it.exId);
  if (ex.kind === 'cardio') return `${num(it.minutes)} min`;
  if (ex.kind === 'time') return `${num(it.sets)}×${num(it.sec)}s`;
  return `${num(it.sets)}×${esc(it.reps)}`; // reps is free text typed in the plan editor
}
function ytId(u) { const m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : null; }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- Charts (inline SVG) ----------
function lineChart(pts, unit = '') {
  if (pts.length < 2) return `<p class="muted small">At least 2 data points are needed to draw a chart.</p>`;
  const W = 600, H = 240, p = { l: 64, r: 16, t: 16, b: 34 };
  const ys = pts.map((x) => x.y); let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const X = (i) => p.l + (i * (W - p.l - p.r)) / (pts.length - 1);
  const Y = (v) => p.t + (1 - (v - min) / (max - min)) * (H - p.t - p.b);
  const path = pts.map((q, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(q.y).toFixed(1)}`).join('');
  const grid = [0, 0.5, 1].map((f) => { const v = min + f * (max - min); return `<line x1="${p.l}" x2="${W - p.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${p.l - 6}" y="${Y(v) + 4}" class="axis" text-anchor="end">${+v.toFixed(1)}</text>`; }).join('');
  const dots = pts.map((q, i) => `<circle cx="${X(i)}" cy="${Y(q.y)}" r="3.5" class="dot"><title>${esc(q.label)}: ${q.y}${unit}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" direction="ltr">${grid}<path d="${path}" class="line"/>${dots}
    <text x="${p.l}" y="${H - 6}" class="axis">${esc(pts[0].label)}</text><text x="${W - p.r}" y="${H - 6}" class="axis" text-anchor="end">${esc(pts.at(-1).label)}</text></svg>`;
}
function barChart(pts, unit = '') {
  const W = 600, H = 220, p = { l: 10, r: 10, t: 26, b: 32 };
  const max = Math.max(1, ...pts.map((x) => x.y));
  const bw = (W - p.l - p.r) / pts.length;
  const bars = pts.map((q, i) => {
    const h = (q.y / max) * (H - p.t - p.b); const x = p.l + i * bw + bw * 0.18; const y = H - p.b - h;
    return `<rect x="${x}" y="${y}" width="${bw * 0.64}" height="${Math.max(h, q.y ? 2 : 0)}" rx="4" class="bar"><title>${esc(q.label)}: ${q.y}${unit}</title></rect>
      ${q.y ? `<text x="${x + bw * 0.32}" y="${y - 4}" class="axis" text-anchor="middle">${Math.round(q.y)}</text>` : ''}
      <text x="${x + bw * 0.32}" y="${H - 6}" class="axis" text-anchor="middle">${esc(q.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" direction="ltr">${bars}</svg>`;
}

// ---------- Stats ----------
function lastPerf(exId) {
  for (let i = S.logs.length - 1; i >= 0; i--) {
    const en = S.logs[i].entries.find((e) => e.exId === exId);
    if (en) return en;
  }
  return null;
}
function entryBest(en) {
  if (en.kind === 'cardio') return { dist: num(en.distance), min: num(en.minutes) };
  const sets = (en.sets || []).filter((s) => s.done);
  if (en.kind === 'weight') return { w: Math.max(0, ...sets.map((s) => num(s.weight))), e1: Math.max(0, ...sets.map((s) => e1rm(num(s.weight), num(s.reps)))) };
  if (en.kind === 'time') return { sec: Math.max(0, ...sets.map((s) => num(s.sec))) };
  return { reps: Math.max(0, ...sets.map((s) => num(s.reps))) };
}
function entryMetric(en) { // single number used for progress chart / PR comparison
  const b = entryBest(en);
  return en.kind === 'weight' ? +b.e1.toFixed(1) : en.kind === 'time' ? b.sec : en.kind === 'cardio' ? (b.dist || b.min) : b.reps;
}
const METRIC_LABEL = { weight: 'estimated 1RM (kg)', reps: 'max reps', time: 'max seconds', cardio: 'distance (km) / minutes' };
function personalRecords(logs = S.logs) {
  const pr = {};
  for (const l of logs) for (const en of l.entries) {
    const m = entryMetric(en); if (!m) continue;
    if (!pr[en.exId] || m > pr[en.exId].value) pr[en.exId] = { value: m, date: l.date, best: entryBest(en), kind: en.kind };
  }
  return pr;
}
function weekStreak() {
  const goal = (ws) => Math.max(1, plannedDays(cycleWeek(ws)));
  let ws = weekStart(), streak = 0;
  const count = (start) => { const a = dateStr(start), b = dateStr(addDays(start, 7)); return S.logs.filter((l) => l.date >= a && l.date < b).length; };
  if (count(ws) < goal(ws)) ws = addDays(ws, -7); // current week still in progress
  while (count(ws) >= goal(ws)) { streak++; ws = addDays(ws, -7); }
  return streak;
}
function logVolume(l) { return l.entries.reduce((s, en) => s + (en.kind === 'weight' ? en.sets.filter((x) => x.done).reduce((a, x) => a + num(x.weight) * num(x.reps), 0) : 0), 0); }
function logCardioMin(l) { return l.entries.reduce((s, en) => s + (en.kind === 'cardio' && en.done ? num(en.minutes) : 0), 0); }

// ---------- Router ----------
const app = $('#app');
function route() { return (location.hash || '#today').slice(1); }
function go(r) { if (location.hash === '#' + r) render(); else location.hash = r; }
window.addEventListener('hashchange', render);

function render() {
  let r = route();
  if (!S.profile && r !== 'setup') { r = 'setup'; }
  if (S.active && r !== 'workout' && r !== 'setup') { /* allow browsing, show resume banner */ }
  document.querySelectorAll('nav.tabs a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + (r === 'how' ? 'plan' : r)));
  $('nav.tabs').hidden = r === 'setup' || r === 'workout';
  const views = { today: viewToday, plan: viewPlan, how: viewHow, workout: viewWorkout, progress: viewProgress, body: viewBody, settings: viewSettings, setup: viewSetup };
  app.innerHTML = (views[r] || viewToday)();
  window.scrollTo(0, 0);
}

// ---------- Setup wizard ----------
const opts = (obj, val) => Object.entries(obj).map(([k, l]) => `<option value="${k}" ${String(val) === String(k) ? 'selected' : ''}>${l}</option>`).join('');
const durOpts = (val) => opts(Object.fromEntries(DURATIONS.map((m) => [m, m + ' min'])), val);
const locOpts = (val) => opts(Object.fromEntries(Object.entries(LOCS).map(([k, l]) => [k, LOC_ICON[k] + ' ' + l])), val);
const lastWeight = () => [...S.body].sort((a, b) => a.date.localeCompare(b.date)).filter((r) => r.weight).at(-1)?.weight || '';
function viewSetup() {
  const wk = [{ day: 0, time: '18:00', minutes: 45, loc: 'home', equip: [] }, { day: 2, time: '18:00', minutes: 45, loc: 'gym', equip: defaultEquip('gym') }, { day: 4, time: '07:00', minutes: 45, loc: 'outdoor', equip: [] }];
  const p = S.profile || { goal: 'fitness', level: 'beginner', height: '', schedule: [...wk, ...wk.map((s) => ({ ...s, day: s.day + 7 }))] };
  const chips = (name, obj, val) => Object.entries(obj).map(([k, l]) =>
    `<label class="chip"><input type="radio" name="${name}" value="${k}" ${val === k ? 'checked' : ''}><span>${l}</span></label>`).join('');
  const row = (i) => { const s = p.schedule.find((x) => x.day === i); const v = s || { time: '18:00', minutes: 45, loc: 'home', equip: [] }; return `
        <div class="sched-row"><label class="chip"><input type="checkbox" name="on-${i}" ${s ? 'checked' : ''}><span>${dayName(i)}</span></label>
          <div class="fields"><input type="time" name="time-${i}" value="${esc(v.time)}" aria-label="Time">
            <select name="min-${i}" aria-label="Duration">${durOpts(v.minutes)}</select>
            <select name="loc-${i}" aria-label="Location" data-setup-loc="${i}">${locOpts(v.loc)}</select>
            <div class="eq-chips">${equipChecks(`eq-${i}`, v.equip || [])}</div></div></div>`; };
  const weekBlock = (w) => `<h4 class="week-h">${weekName(w * 7)}</h4><div class="sched">${DAYS.map((_, d) => row(w * 7 + d)).join('')}</div>`;
  return `
  <header class="hero"><h1>💪 Let’s build your plan</h1><p>A few quick questions and we'll create a plan that mixes strength and cardio. You can edit everything later.</p></header>
  <form id="setup-form" class="card stack">
    <div><h3>What’s your main goal?</h3><div class="chips">${chips('goal', GOALS, p.goal)}</div></div>
    <div><h3>Current fitness level</h3><div class="chips">${chips('level', LEVELS, p.level)}</div></div>
    <div><h3>When, where and with what? (2-week plan)</h3><p class="small muted">The plan alternates: week 1, week 2, then repeats. For each day pick a time, duration, location (home, gym, outdoors or army) and the equipment you’ll have that day. No equipment ticked = bodyweight exercises.</p>
      ${weekBlock(0)}
      <button type="button" class="btn small ghost" data-action="copy-week-setup">⬇ Copy week 1 to week 2</button>
      ${weekBlock(1)}
      <button type="button" class="btn small ghost" data-action="copy-sched">Copy the first day to all selected days</button></div>
    <div class="grid2">
      <label>Weight in kg (optional)<input type="number" step="0.1" name="weight" inputmode="decimal" value="${esc(lastWeight())}"></label>
      <label>Height in cm (optional)<input type="number" name="height" inputmode="decimal" value="${esc(p.height)}"></label>
    </div>
    <p class="small muted">Your weight is saved to body tracking and used to calculate BMI.</p>
    <button class="btn primary big" type="submit">✨ Create plan</button>
    ${S.profile ? `<a class="btn ghost" href="#settings">Cancel</a>` : ''}
  </form>`;
}
const equipText = (eq) => (eq || []).map((k) => EQUIP_CHOICES[k]).filter(Boolean).join(', ') || 'Bodyweight only';
const ALL_DAYS = Array.from({ length: 7 * WEEKS }, (_, i) => i);
// Equipment checkboxes for one day. `name` is a form field name (setup) or empty (plan editor uses data attrs).
function equipChecks(name, vals, day) {
  return Object.entries(EQUIP_CHOICES).map(([k, l]) => `<label class="chip sm"><input type="checkbox" ${name ? `name="${name}"` : `data-action-change="day-eq" data-day="${day}"`} value="${k}" ${vals.includes(k) ? 'checked' : ''}><span>${l}</span></label>`).join('');
}
const setEquipBoxes = (f, i, vals) => f.querySelectorAll(`[name="eq-${i}"]`).forEach((c) => { c.checked = vals.includes(c.value); });
const getEquipBoxes = (f, i) => [...f.querySelectorAll(`[name="eq-${i}"]:checked`)].map((c) => c.value);
function copyDay(f, from, to) {
  ['time', 'min', 'loc'].forEach((k) => { f[`${k}-${to}`].value = f[`${k}-${from}`].value; });
  setEquipBoxes(f, to, getEquipBoxes(f, from));
}
function copySchedule() {
  const f = $('#setup-form'); const on = ALL_DAYS.map((i) => f['on-' + i].checked);
  const first = on.indexOf(true); if (first < 0) return toast('Select at least one day first');
  on.forEach((c, i) => { if (c && i !== first) copyDay(f, first, i); });
  toast('Copied to all selected days');
}
function copyWeekSetup() {
  const f = $('#setup-form');
  for (let d = 0; d < 7; d++) { f['on-' + (d + 7)].checked = f['on-' + d].checked; copyDay(f, d, d + 7); }
  toast('Week 2 now matches week 1 (the workouts themselves will differ)');
}
function submitSetup(form) {
  const f = new FormData(form);
  const schedule = ALL_DAYS.map((i) => (f.get('on-' + i) ? { day: i, time: f.get('time-' + i) || '18:00', minutes: +f.get('min-' + i), loc: f.get('loc-' + i), equip: f.getAll('eq-' + i) } : null)).filter(Boolean);
  if (!schedule.length) return toast('Pick at least one training day');
  if (S.plan && S.profile && !confirm('Create a new plan? Your current plan will be replaced (your history is kept).')) return;
  S.profile = { goal: f.get('goal'), level: f.get('level'), schedule, height: f.get('height') };
  S.planStart = dateStr(weekStart()); // this week = week 1
  const w = num(f.get('weight'));
  if (w && w !== num(lastWeight())) {
    const today = S.body.find((r) => r.date === dateStr());
    if (today) today.weight = w; else S.body.push({ id: uid(), date: dateStr(), weight: w, waist: null, fat: null });
  }
  S.plan = generatePlan(S.profile);
  save(); toast('Plan created 🎉'); go('plan');
}
function rebuild(i, msg) {
  if (S.plan[i].type === 'rest') return;
  S.plan[i] = rebuildDay(S.profile, S.plan[i]); save(); render(); $$open(i); toast(msg);
}

// ---------- Today ----------
function weekStrip() {
  const ws = weekStart(); const today = dateStr(); const off = cycleWeek() * 7;
  return `<div class="week">${DAYS_SHORT.map((d, i) => {
    const ds = dateStr(addDays(ws, i)); const pd = S.plan[off + i]; const done = logsOn(ds).length > 0;
    const cls = [ds === today ? 'today' : '', done ? 'done' : '', pd.type === 'rest' ? 'rest' : '', ds < today && !done && pd.type !== 'rest' ? 'missed' : ''].join(' ');
    return `<div class="wd ${cls}" title="${esc(pd.title)}"><b>${d}</b><span>${done ? '✓' : TYPE_ICON[pd.type]}</span></div>`;
  }).join('')}</div>`;
}
function itemList(items, withVideo = true) {
  return `<ul class="items">${items.map((it) => { const ex = exById(it.exId); return `
    <li><span class="cat">${CAT_LABEL[ex.cat] || ''}</span><span class="name">${esc(ex.name)}</span><span class="tgt">${itemTarget(it)}</span>
    ${withVideo ? `<button class="icon" data-action="video" data-ex="${esc(ex.id)}" title="Video">▶</button>` : ''}</li>`; }).join('')}</ul>`;
}
function viewToday() {
  const di = planIdx(); const d = S.plan[di]; const today = dateStr();
  const doneToday = logsOn(today);
  const ws = dateStr(weekStart()); const weekLogs = S.logs.filter((l) => l.date >= ws);
  const goal = plannedDays();
  let next = null;
  for (let k = 1; k <= 14 && !next; k++) { const dt = addDays(new Date(), k); const j = planIdx(dt); if (S.plan[j].type !== 'rest') next = { j, k, dt }; }
  const reminder = S.settings.notify && (!('Notification' in window) || Notification.permission !== 'granted');
  return `
  <header class="top"><div><small>${dayName(di)}, ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · Plan ${weekName(di).toLowerCase()}</small><h1>Today</h1></div>
    <div class="ring" style="--p:${Math.min(1, weekLogs.length / Math.max(1, goal))}"><b>${weekLogs.length}/${goal}</b><small>this week</small></div></header>
  ${S.active ? `<div class="banner">Workout in progress: <b>${esc(S.active.title)}</b> <a class="btn small primary" href="#workout">Back to workout</a></div>` : ''}
  ${reminder ? `<div class="banner warn">Notifications aren’t allowed in this browser. <a href="#settings">Settings</a></div>` : ''}
  ${weekStrip()}
  <section class="card today-card ${d.type}">
    <div class="row between"><div><span class="tag ${d.type}">${TYPE_ICON[d.type]} ${TYPE_LABEL[d.type]}</span><h2>${esc(d.title)}</h2>
      ${d.type !== 'rest' ? `<small class="muted">⏰ ${esc(d.time || '')} · ⏱ ${d.minutes} min · ${LOC_ICON[d.loc]} ${LOCS[d.loc]}</small>
        <small class="muted d-block">🧰 ${equipText(d.equip)}</small>` : ''}</div></div>
    ${d.type === 'rest'
      ? `<p>Rest day. Muscles grow while you rest 😴 A light walk or some stretching will do you good.</p>${next ? `<p class="muted">Next workout: <b>${esc(S.plan[next.j].title)}</b> on ${dayName(next.j)}${next.k === 1 ? ' (tomorrow)' : ` (${fmtDate(dateStr(next.dt))})`}</p>` : ''}
         <button class="btn ghost" data-action="start" data-day="${next ? next.j : di}">Train anyway? Start "${esc(next ? S.plan[next.j].title : '')}"</button>`
      : `${itemList(d.items)}
         ${doneToday.length ? `<p class="ok">✓ Today’s workout is done! (${fmtDur(doneToday[0].durationSec)})</p>` : ''}
         <button class="btn primary big" data-action="start" data-day="${di}">${doneToday.length ? 'Another workout' : '▶ Start workout'}</button>`}
  </section>
  <section class="stats3">
    <div class="stat"><b>${weekStreak()}</b><small>week streak 🔥</small></div>
    <div class="stat"><b>${S.logs.length}</b><small>total workouts</small></div>
    <div class="stat"><b>${Math.round(weekLogs.reduce((s, l) => s + logCardioMin(l), 0))}</b><small>cardio min this week</small></div>
  </section>
  ${S.logs.length ? `<section class="card"><h3>Last workout</h3>${historyRow(S.logs.at(-1))}</section>` : ''}`;
}

// ---------- Plan editor ----------
function exOptions() {
  const groups = {};
  for (const e of EXERCISES) (groups[e.cat] ||= []).push(e);
  return Object.entries(groups).map(([c, list]) => `<optgroup label="${CAT_LABEL[c]}">${list.map((e) => `<option value="${e.id}">${esc(e.name)}${e.eq !== 'none' ? ` (${EQ_LABEL[e.eq]})` : ''}</option>`).join('')}</optgroup>`).join('');
}
function viewPlan() {
  const di = planIdx(); const cw = cycleWeek();
  return `
  <header class="top"><div><small>${GOALS[S.profile.goal]} · ${LEVELS[S.profile.level]} · 2-week cycle</small><h1>Plan</h1></div>
    <div class="row"><a class="btn small ghost" href="#how">ℹ️ How it’s built</a><a class="btn small" href="#setup">✨ Rebuild</a></div></header>
  ${S.plan.map((d, i) => `
  ${i % 7 === 0 ? `<div class="row between week-h"><h2>${weekName(i)} ${Math.floor(i / 7) === cw ? '<span class="tag now">this week</span>' : ''}</h2><span class="muted small">${plannedDays(i / 7)} workouts</span></div>` : ''}
  ${i === 7 ? `<button class="btn small ghost" data-action="copy-week">⬇ Copy week 1 to week 2</button>` : ''}
  <details class="card day ${d.type}" ${i === di ? 'open' : ''}>
    <summary><span class="dname">${dayName(i)}</span><span class="tag ${d.type}">${TYPE_ICON[d.type]} ${TYPE_LABEL[d.type]}</span><span class="dtitle">${d.type === 'rest' ? '' : esc(d.title)}</span><span class="muted small dmeta">${d.type === 'rest' ? '' : `${LOC_ICON[d.loc]} ${esc(d.time)} · ${d.minutes}′`}</span></summary>
    <div class="stack">
      <div class="grid2">
        <label>Type<select data-path="plan.${i}.type" data-rebuild>${opts(TYPE_LABEL, d.type)}</select></label>
        <label>Name<input data-path="plan.${i}.title" value="${esc(d.title)}"></label>
      </div>
      ${d.type === 'rest' ? '' : `<div class="grid3 even">
        <label>Time<input type="time" data-path="plan.${i}.time" value="${esc(d.time)}"></label>
        <label>Duration<select data-path="plan.${i}.minutes" data-num data-rebuild>${durOpts(d.minutes)}</select></label>
        <label>Location<select data-path="plan.${i}.loc" data-rebuild>${locOpts(d.loc)}</select></label>
      </div>
      <div><small class="muted">Equipment this day</small><div class="eq-chips">${equipChecks('', d.equip || [], i)}</div></div>
      <details class="why"><summary>💡 Why this workout?</summary><ul class="plain small">${whyDay(d, i).map((x) => `<li>• ${esc(x)}</li>`).join('')}</ul>
        <a class="small" href="#how">All the rules →</a></details>`}
      ${d.type === 'rest' ? '' : `
      <ul class="edit-items">${d.items.map((it, j) => { const ex = exById(it.exId); const pth = `plan.${i}.items.${j}`; return `
        <li><div class="row between"><b>${esc(ex.name)}</b><span class="acts">
          <button class="icon" data-action="video" data-ex="${esc(ex.id)}" title="Video">▶</button>
          <button class="icon" data-action="move" data-day="${i}" data-idx="${j}" data-dir="-1" title="Move up">↑</button>
          <button class="icon" data-action="move" data-day="${i}" data-idx="${j}" data-dir="1" title="Move down">↓</button>
          <button class="icon danger" data-action="rm-item" data-day="${i}" data-idx="${j}" title="Remove">✕</button></span></div>
          <div class="mini">${ex.kind === 'cardio'
            ? `<label>Minutes<input type="number" inputmode="numeric" data-path="${pth}.minutes" value="${it.minutes ?? ''}"></label>`
            : `<label>Sets<input type="number" inputmode="numeric" data-path="${pth}.sets" value="${it.sets ?? ''}"></label>
               ${ex.kind === 'time' ? `<label>Seconds<input type="number" inputmode="numeric" data-path="${pth}.sec" value="${it.sec ?? ''}"></label>`
                : `<label>Reps<input data-path="${pth}.reps" value="${esc(it.reps ?? '')}"></label>`}
               <label>Rest (sec)<input type="number" inputmode="numeric" data-path="${pth}.rest" value="${it.rest ?? ''}"></label>`}</div></li>`; }).join('')}</ul>
      <div class="row"><select id="add-${i}">${exOptions()}</select><button class="btn small" data-action="add-item" data-day="${i}">+ Add</button></div>
      <button class="btn small ghost" data-action="rebuild" data-day="${i}">🔄 Swap for a different workout (same type, duration, place and equipment)</button>
      <button class="btn primary" data-action="start" data-day="${i}">▶ Start this workout</button>`}
    </div>
  </details>`).join('')}`;
}
function addItem(i) {
  const id = $('#add-' + i).value; const ex = exById(id); const P = goalParams(S.profile.goal, S.profile.level);
  S.plan[i].items.push(ex.kind === 'cardio' ? { exId: id, minutes: 20 } : ex.kind === 'time' ? { exId: id, sets: P.sets, sec: P.sec, rest: P.rest } : { exId: id, sets: P.sets, reps: P.reps, rest: P.rest });
  save(); render(); $$open(i);
}
function $$open(i) { const el = document.querySelectorAll('details.day')[i]; if (el) { el.open = true; el.scrollIntoView({ block: 'nearest' }); } }

// ---------- How the plan is built ----------
// Reasons for one day, derived from the same rules the generator uses (data.js).
function whyDay(d, i) {
  if (d.type === 'rest') return [];
  const pr = S.profile; const P = goalParams(pr.goal, pr.level);
  const count = plannedDays(Math.floor(i / 7));
  const pat = PATTERNS[pr.goal][Math.min(Math.max(count, 1), 7) - 1] || [];
  const r = [`${GOALS[pr.goal]} with ${count} training day${count === 1 ? '' : 's'} in ${weekName(i).toLowerCase()} → sessions that week: ${pat.map((k) => KIND_LABEL[k]).join(', ')}. This day is ${KIND_LABEL[d.kind] || TYPE_LABEL[d.type]}.`];
  if (d.loc === 'outdoor' && CARDIO_KINDS.includes(d.kind)) r.push('Outdoor days get the cardio sessions first.');
  if (d.loc === 'gym' && STRENGTH_KINDS.includes(d.kind)) r.push('Gym days get the strength sessions first.');
  if (d.kind === 'cardioLong') r.push('The long cardio session goes on your longest cardio day.');
  if (d.loc === 'army' && STRENGTH_KINDS.includes(d.kind)) r.push('Army strength days add 2 conditioning exercises.');
  r.push(`${d.minutes} min → up to ${exerciseCount(d.minutes)} exercise slots${STRENGTH_KINDS.includes(d.kind) ? `, starting with a ${d.minutes >= 45 ? 10 : 5}-min cardio warm-up${d.minutes >= 45 ? ' and ending with a 5-min cool-down' : ''}` : ''}.`);
  if (d.items.some((it) => exById(it.exId).kind !== 'cardio')) r.push(`Strength sets: ${P.sets} × ${P.reps} with ${P.rest} s rest (${GOALS[pr.goal]}, ${LEVELS[pr.level]}).`);
  r.push(`Exercises are chosen only from: ${(d.equip || []).length ? equipText(d.equip) + ' + bodyweight' : 'bodyweight'}.`);
  return r;
}
function viewHow() {
  const pr = S.profile;
  const mine = (on) => (on ? ' class="mine"' : '');
  const weekCounts = [0, 1].map((w) => plannedDays(w));
  return `
  <header class="top"><div><small>The rules behind your plan</small><h1>How your plan is built</h1></div><a class="btn small" href="#plan">← Plan</a></header>
  <section class="card"><p>Your plan is built by a fixed set of rules that run on your phone. There is no coach or AI involved, and nothing is sent anywhere. The only inputs are your setup answers: goal, level, and for each training day its time, duration, location and equipment.</p>
    <p class="small muted">Highlighted rows match your current answers.</p></section>
  <section class="card"><h3>1. Goal → sets, reps and rest</h3><table class="tbl"><thead><tr><th>Goal</th><th>Sets × reps</th><th>Rest</th><th>Timed holds</th></tr></thead><tbody>
    ${Object.keys(GOALS).map((g) => { const x = goalParams(g, 'intermediate'); return `<tr${mine(g === pr.goal)}><td>${GOALS[g]}</td><td>${x.sets} × ${x.reps}</td><td>${x.rest} s</td><td>${x.sec} s</td></tr>`; }).join('')}
    </tbody></table><p class="small muted">Values for the intermediate level; see the level adjustments below.</p></section>
  <section class="card"><h3>2. Level → adjustments</h3><table class="tbl"><tbody>
    ${Object.keys(LEVELS).map((l) => `<tr${mine(l === pr.level)}><td>${LEVELS[l]}</td><td>${LEVEL_EFFECT[l]}</td></tr>`).join('')}</tbody></table></section>
  <section class="card"><h3>3. Training days → session types</h3>
    <p class="small">Each week is planned from the number of days you train that week. For your goal (${GOALS[pr.goal]}):</p>
    <table class="tbl"><thead><tr><th>Days</th><th>Sessions, in order</th></tr></thead><tbody>
    ${PATTERNS[pr.goal].map((p, k) => `<tr${mine(weekCounts.includes(k + 1))}><td>${k + 1}</td><td>${p.map((t) => KIND_LABEL[t]).join(' · ')}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Few days → full-body sessions so every muscle is trained each week. More days → upper/lower splits so each area gets time to recover.</p></section>
  <section class="card"><h3>4. Placing sessions on days</h3><ul class="plain small">
    <li>• Outdoor days get the cardio sessions first.</li><li>• Gym days get the strength sessions first.</li>
    <li>• The remaining sessions fill the other days in order.</li><li>• The long cardio session moves to your longest cardio day.</li>
    <li>• Week 2 uses different exercise variants (A–D) from week 1, so the two weeks don’t repeat.</li></ul></section>
  <section class="card"><h3>5. Duration → session size</h3><table class="tbl"><thead><tr><th>Duration</th><th>Exercise slots</th><th>Warm-up</th><th>Cool-down</th></tr></thead><tbody>
    ${DURATIONS.map((m) => `<tr><td>${m} min</td><td>${exerciseCount(m)}</td><td>${m >= 45 ? 10 : 5} min</td><td>${m >= 45 ? '5 min' : '—'}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Cardio sessions fill the day’s duration (adjusted by level). On days of 45 min or more, a strength session gives one slot to the warm-up. Warm-up and cool-down apply to strength sessions.</p></section>
  <section class="card"><h3>6. Location and equipment → exercises</h3><ul class="plain small">
    <li>• Exercises come only from the equipment ticked for that day. Bodyweight exercises are always allowed.</li>
    <li>• When several exercises fit, the best-equipped one wins: gym machines → dumbbells or pull-up bar → vibration plate or mat → bodyweight.</li>
    <li>• Default equipment when you pick a place: gym = gym machines, dumbbells, pull-up bar, mat; army = pull-up bar; home and outdoors = none (tick what you have).</li>
    <li>• Cardio by place: gym = treadmill, bike, rower, elliptical; outdoors = run, cycling, sprints (beginners: brisk walk); army = run, sprints; home = jump rope, walk-at-home video.</li></ul></section>
  <section class="card"><h3>7. Fixed rules</h3><ul class="plain small">
    <li>• Every strength session starts with a cardio warm-up, so every plan mixes cardio and strength.</li>
    <li>• Sessions of 45 min or more end with a cool-down: stretching, yoga (with a mat) or a vibration-plate release.</li>
    <li>• Army strength days add 2 conditioning exercises (burpees, bear crawls, mountain climbers, jump squats).</li>
    <li>• During a workout, weights and reps are pre-filled from your last session.</li></ul></section>
  <section class="card"><h3>What it’s based on</h3><p class="small">Common, general training principles: lower reps with longer rest for muscle growth and higher reps with shorter rest for endurance and fat loss; full-body training when you have few days and upper/lower splits when you have more; easy “conversational” cardio (zone 2) plus HIIT intervals; a warm-up before and a cool-down after. For reference, the WHO recommends that adults get 150–300 minutes of moderate aerobic activity a week, plus muscle-strengthening activity on 2 or more days.</p></section>
  <section class="card warn-card"><h3>What it does not consider</h3><ul class="plain small">
    <li>• Age, sex, injuries, pain, medical conditions or pregnancy. The app doesn’t ask about them.</li>
    <li>• Progress over time: it doesn’t raise weights, add sets or ease off on its own.</li>
    <li>• Your real fitness: the level is what you selected, not a test.</li>
    <li>• Whether you reach the WHO weekly activity target.</li></ul>
    <p class="small"><b>It’s a planning and tracking tool, not a replacement for a coach or doctor.</b> If you have an injury or a medical condition, check with a professional before you start.</p></section>`;
}

// ---------- Live workout ----------
function startWorkout(di) {
  if (S.active && !confirm('A workout is already in progress. Start a new one instead?')) return go('workout');
  const d = S.plan[di];
  if (!d.items.length) return toast('No exercises on this day');
  S.active = {
    dayIdx: di, title: d.title, type: d.type, startedAt: Date.now(),
    entries: d.items.map((it) => {
      const ex = exById(it.exId); const last = lastPerf(it.exId);
      if (ex.kind === 'cardio') return { exId: ex.id, kind: 'cardio', target: it.minutes, minutes: it.minutes, distance: '', done: false };
      const lastSets = last?.sets?.filter((s) => s.done) || [];
      return {
        exId: ex.id, kind: ex.kind, rest: it.rest || 60, target: itemTarget(it),
        sets: Array.from({ length: +it.sets || 3 }, (_, k) => {
          const ls = lastSets[Math.min(k, lastSets.length - 1)];
          return { reps: ls?.reps ?? (parseInt(it.reps) || ''), weight: ls?.weight ?? '', sec: ls?.sec ?? it.sec ?? '', done: false };
        }),
      };
    }),
  };
  save(); go('workout');
}
function viewWorkout() {
  const A = S.active;
  if (!A) return `<div class="card"><p>No active workout.</p><a class="btn primary" href="#today">Back to Today</a></div>`;
  const total = A.entries.reduce((s, e) => s + (e.kind === 'cardio' ? 1 : e.sets.length), 0);
  const done = A.entries.reduce((s, e) => s + (e.kind === 'cardio' ? +e.done : e.sets.filter((x) => x.done).length), 0);
  return `
  <header class="top sticky"><div><small>Active workout</small><h1>${esc(A.title)}</h1></div>
    <div class="elapsed"><b id="elapsed">${fmtDur((Date.now() - A.startedAt) / 1000)}</b><small>${done}/${total} sets</small></div></header>
  <div class="progress"><i style="width:${(done / Math.max(1, total)) * 100}%"></i></div>
  ${A.entries.map((en, i) => { const ex = exById(en.exId); const pth = `active.entries.${i}`; const last = lastPerf(en.exId); return `
  <section class="card ex ${en.kind === 'cardio' ? (en.done ? 'complete' : '') : en.sets.every((s) => s.done) ? 'complete' : ''}">
    <div class="row between"><div><h3>${esc(ex.name)}</h3><small class="muted">Target: ${en.kind === 'cardio' ? en.target + ' min' : esc(en.target)}${en.rest && en.kind !== 'cardio' ? ` · rest ${en.rest}s` : ''}</small></div>
      <button class="btn small" data-action="video" data-ex="${esc(ex.id)}">▶ Video</button></div>
    ${ex.tip ? `<p class="tip">💡 ${esc(ex.tip)}</p>` : ''}
    ${last ? `<p class="muted small">Last time: ${lastSummary(last)}</p>` : ''}
    ${en.kind === 'cardio' ? `
      <div class="mini"><label>Minutes<input type="number" inputmode="decimal" data-path="${pth}.minutes" value="${esc(en.minutes)}"></label>
        <label>Distance (km)<input type="number" inputmode="decimal" step="0.01" data-path="${pth}.distance" value="${esc(en.distance)}"></label></div>
      <div class="row"><button class="btn" data-action="countdown" data-sec="${num(en.minutes) * 60}" data-label="${esc(ex.name)}">⏱ ${esc(en.minutes)} min timer</button>
        <button class="btn ${en.done ? 'primary' : ''}" data-action="toggle-cardio" data-i="${i}">${en.done ? '✓ Done' : 'Mark as done'}</button></div>`
    : `<table class="sets"><thead><tr><th>Set</th>${en.kind === 'weight' ? '<th>kg</th>' : ''}<th>${en.kind === 'time' ? 'Seconds' : 'Reps'}</th><th></th></tr></thead><tbody>
      ${en.sets.map((s, k) => `<tr class="${s.done ? 'done' : ''}"><td>${k + 1}</td>
        ${en.kind === 'weight' ? `<td><input type="number" inputmode="decimal" step="0.5" data-path="${pth}.sets.${k}.weight" value="${esc(s.weight)}"></td>` : ''}
        <td>${en.kind === 'time' ? `<input type="number" inputmode="numeric" data-path="${pth}.sets.${k}.sec" value="${esc(s.sec)}">` : `<input type="number" inputmode="numeric" data-path="${pth}.sets.${k}.reps" value="${esc(s.reps)}">`}</td>
        <td class="acts">${en.kind === 'time' && !s.done ? `<button class="icon" data-action="hold" data-i="${i}" data-k="${k}" title="Timer">⏱</button>` : ''}
          <button class="check ${s.done ? 'on' : ''}" data-action="toggle-set" data-i="${i}" data-k="${k}">✓</button></td></tr>`).join('')}
      </tbody></table>
      <div class="row"><button class="btn small ghost" data-action="add-set" data-i="${i}">+ Set</button>${en.sets.length > 1 ? `<button class="btn small ghost" data-action="rm-set" data-i="${i}">− Set</button>` : ''}</div>`}
  </section>`; }).join('')}
  <div class="row end-actions"><button class="btn danger ghost" data-action="cancel-workout">Cancel workout</button><button class="btn primary big" data-action="finish">🏁 Finish & save</button></div>`;
}
function lastSummary(en) {
  if (en.kind === 'cardio') return `${en.minutes} min${num(en.distance) ? `, ${en.distance} km` : ''}`;
  const sets = en.sets.filter((s) => s.done);
  if (!sets.length) return '—';
  if (en.kind === 'weight') return sets.map((s) => `${s.weight || 0}×${s.reps}`).join(', ');
  if (en.kind === 'time') return sets.map((s) => s.sec + 's').join(', ');
  return sets.map((s) => s.reps).join(', ') + ' reps';
}
function finishWorkout() {
  const A = S.active;
  const entries = A.entries.map((en) => (en.kind === 'cardio' ? { ...en } : { ...en, sets: en.sets.filter((s) => s.done) }))
    .filter((en) => (en.kind === 'cardio' ? en.done : en.sets.length));
  if (!entries.length && !confirm('You haven’t marked any set as done. Save anyway?')) return;
  const before = personalRecords();
  const log = { id: uid(), date: dateStr(), dayIdx: A.dayIdx, title: A.title, type: A.type, durationSec: Math.round((Date.now() - A.startedAt) / 1000), entries };
  const newPRs = entries.filter((en) => { const m = entryMetric(en); return m && (!before[en.exId] || m > before[en.exId].value); });
  S.logs.push(log); S.active = null; stopTimer(); save();
  go('today');
  showModal(`<div class="center"><div class="big-emoji">🎉</div><h2>Great job!</h2>
    <div class="stats3"><div class="stat"><b>${fmtDur(log.durationSec)}</b><small>duration</small></div>
    <div class="stat"><b>${entries.reduce((s, e) => s + (e.kind === 'cardio' ? 0 : e.sets.length), 0)}</b><small>sets</small></div>
    <div class="stat"><b>${Math.round(logVolume(log))}</b><small>volume (kg)</small></div></div>
    ${newPRs.length ? `<h3>🏆 New personal records</h3><ul class="plain">${newPRs.map((en) => `<li>${esc(exById(en.exId).name)}: <b>${entryMetric(en)}</b> <small class="muted">${METRIC_LABEL[en.kind]}</small></li>`).join('')}</ul>` : ''}
    <button class="btn primary" data-action="close-modal">Close</button></div>`);
}

// ---------- Timer (rest / countdown) ----------
let timer = null;
function startTimer(sec, label, onDone) {
  if (!(sec > 0)) return;
  timer = { end: Date.now() + sec * 1000, total: sec, label, onDone };
  $('#timer').hidden = false; tickTimer();
}
function stopTimer() { timer = null; $('#timer').hidden = true; }
function tickTimer() {
  if (!timer) return;
  const left = (timer.end - Date.now()) / 1000;
  $('#timer-label').textContent = timer.label;
  $('#timer-time').textContent = fmtDur(Math.ceil(Math.max(0, left)));
  $('#timer-bar').style.width = `${(Math.max(0, left) / timer.total) * 100}%`;
  if (left <= 0) {
    const { onDone: cb, label } = timer; stopTimer(); beep(); navigator.vibrate?.([200, 100, 200]);
    if (document.hidden) notify('⏱ Time is up', label || 'On to the next set');
    cb?.();
  }
}
let audioCtx;
function beep() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.25, audioCtx.currentTime + t); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.15); });
  } catch { /* ignore */ }
}
setInterval(() => {
  tickTimer();
  const el = $('#elapsed'); if (el && S.active) el.textContent = fmtDur((Date.now() - S.active.startedAt) / 1000);
}, 250);

// ---------- Progress ----------
let progEx = null;
function historyRow(l) {
  return `<details class="hist"><summary><span>${TYPE_ICON[l.type] || '🏋️'} <b>${esc(l.title)}</b></span><span class="muted small">${fmtDate(l.date)} · ${fmtDur(l.durationSec)}</span></summary>
    <ul class="plain small">${l.entries.map((en) => `<li><b>${esc(exById(en.exId).name)}</b>: ${lastSummary(en)}</li>`).join('') || '<li class="muted">No sets marked</li>'}</ul>
    <button class="btn small danger ghost" data-action="del-log" data-id="${esc(l.id)}">Delete workout</button></details>`;
}
function viewProgress() {
  const weeks = Array.from({ length: 8 }, (_, k) => {
    const s = addDays(weekStart(), -7 * (7 - k)); const a = dateStr(s), b = dateStr(addDays(s, 7));
    const ls = S.logs.filter((l) => l.date >= a && l.date < b);
    return { label: `${s.getDate()}/${s.getMonth() + 1}`, count: ls.length, vol: ls.reduce((x, l) => x + logVolume(l), 0), cardio: ls.reduce((x, l) => x + logCardioMin(l), 0) };
  });
  const prs = personalRecords();
  const exIds = [...new Set(S.logs.flatMap((l) => l.entries.map((e) => e.exId)))];
  if (!exIds.includes(progEx)) progEx = exIds[0] || null;
  const month = dateStr().slice(0, 7);
  const exPts = progEx ? S.logs.flatMap((l) => l.entries.filter((e) => e.exId === progEx).map((e) => ({ label: fmtDate(l.date), y: entryMetric(e) }))).filter((p) => p.y) : [];
  return `
  <header class="top"><div><small>Performance tracking</small><h1>Progress</h1></div></header>
  <section class="stats3">
    <div class="stat"><b>${S.logs.filter((l) => l.date.startsWith(month)).length}</b><small>workouts this month</small></div>
    <div class="stat"><b>${weekStreak()}</b><small>week streak 🔥</small></div>
    <div class="stat"><b>${Math.round(S.logs.reduce((s, l) => s + l.durationSec, 0) / 3600)}</b><small>training hours</small></div>
  </section>
  ${!S.logs.length ? `<div class="card center"><p>No saved workouts yet. Charts and records will appear here after your first workout.</p><a class="btn primary" href="#today">Go to today’s workout</a></div>` : `
  <section class="card"><h3>Workouts per week</h3>${barChart(weeks.map((w) => ({ label: w.label, y: w.count })))}</section>
  <section class="card"><h3>Cardio minutes per week</h3>${barChart(weeks.map((w) => ({ label: w.label, y: Math.round(w.cardio) })), ' min')}</section>
  <section class="card"><h3>Strength volume per week (kg × reps)</h3>${barChart(weeks.map((w) => ({ label: w.label, y: Math.round(w.vol) })))}</section>
  <section class="card"><div class="row between"><h3>Exercise progress</h3>
    <select data-action-change="prog-ex">${exIds.map((id) => `<option value="${id}" ${id === progEx ? 'selected' : ''}>${esc(exById(id).name)}</option>`).join('')}</select></div>
    ${progEx ? `<small class="muted">${METRIC_LABEL[exById(progEx).kind]}</small>${lineChart(exPts)}` : ''}</section>
  <section class="card"><h3>🏆 Personal records</h3><table class="tbl"><thead><tr><th>Exercise</th><th>Record</th><th>Date</th></tr></thead><tbody>
    ${Object.entries(prs).map(([id, p]) => `<tr><td>${esc(exById(id).name)}</td><td><b>${p.kind === 'weight' ? `${p.best.w} kg <small class="muted">(1RM≈${p.value})</small>` : p.kind === 'time' ? p.value + 's' : p.kind === 'cardio' ? (p.best.dist ? p.best.dist + ' km' : p.best.min + ' min') : p.value + ' reps'}</b></td><td class="muted">${fmtDate(p.date)}</td></tr>`).join('')}
  </tbody></table></section>
  <section class="card"><h3>History</h3>${[...S.logs].reverse().map(historyRow).join('')}</section>`}`;
}

// ---------- Body metrics ----------
let bodyMetric = 'weight';
function viewBody() {
  const rows = [...S.body].sort((a, b) => a.date.localeCompare(b.date));
  const last = rows.at(-1); const first = rows[0];
  const h = num(S.profile.height) / 100;
  const bmi = last?.weight && h ? (last.weight / (h * h)).toFixed(1) : null;
  const M = { weight: 'Weight (kg)', waist: 'Waist (cm)', fat: 'Body fat %' };
  const pts = rows.filter((r) => num(r[bodyMetric])).map((r) => ({ label: fmtDate(r.date), y: num(r[bodyMetric]) }));
  const diff = last && first && last !== first && last.weight && first.weight ? (last.weight - first.weight).toFixed(1) : null;
  return `
  <header class="top"><div><small>Weight & measurements</small><h1>Body</h1></div></header>
  <section class="stats3">
    <div class="stat"><b>${last?.weight || '—'}</b><small>latest weight</small></div>
    <div class="stat"><b>${diff !== null ? (diff > 0 ? '+' : '') + diff : '—'}</b><small>change since start</small></div>
    <div class="stat"><b>${bmi || '—'}</b><small>BMI${h ? '' : ' (set height)'}</small></div>
  </section>
  <form id="body-form" class="card stack"><h3>New measurement</h3>
    <div class="grid2"><label>Date<input type="date" name="date" value="${dateStr()}" required></label>
      <label>Weight (kg)<input type="number" step="0.1" inputmode="decimal" name="weight"></label>
      <label>Waist (cm)<input type="number" step="0.5" inputmode="decimal" name="waist"></label>
      <label>Body fat %<input type="number" step="0.1" inputmode="decimal" name="fat"></label></div>
    <button class="btn primary" type="submit">Save measurement</button></form>
  <section class="card"><div class="row between"><h3>Trend</h3><select data-action-change="body-metric">${Object.entries(M).map(([k, l]) => `<option value="${k}" ${k === bodyMetric ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${lineChart(pts)}</section>
  ${rows.length ? `<section class="card"><table class="tbl"><thead><tr><th>Date</th><th>Weight</th><th>Waist</th><th>Fat</th><th></th></tr></thead><tbody>
    ${[...rows].reverse().map((r) => `<tr><td>${fmtDate(r.date)}</td><td>${r.weight || '—'}</td><td>${r.waist || '—'}</td><td>${r.fat ? r.fat + '%' : '—'}</td><td><button class="icon danger" data-action="del-body" data-id="${esc(r.id)}">✕</button></td></tr>`).join('')}
  </tbody></table></section>` : ''}`;
}
function submitBody(form) {
  const f = new FormData(form);
  const r = { id: uid(), date: f.get('date'), weight: num(f.get('weight')) || null, waist: num(f.get('waist')) || null, fat: num(f.get('fat')) || null };
  if (!r.weight && !r.waist && !r.fat) return toast('Enter at least one value');
  S.body.push(r); save(); toast('Measurement saved'); render();
}

// ---------- Settings, notifications, calendar ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
function viewSettings() {
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const permLabel = { granted: '✅ Allowed', denied: '⛔ Blocked in browser', default: 'Not allowed yet', unsupported: 'Not supported in this browser' }[perm];
  return `
  <header class="top"><div><small>Preferences</small><h1>Settings</h1></div></header>
  <section class="card stack"><h3>🔔 Workout reminders</h3>
    <p class="small muted">Permission: <b>${permLabel}</b></p>
    <label class="switch"><input type="checkbox" data-action-change="notify" ${S.settings.notify ? 'checked' : ''}><span>Remind me before each workout</span></label>
    <label>How long before?<select data-path="settings.before" data-num>${[0, 10, 15, 30, 60, 120].map((m) => `<option value="${m}" ${S.settings.before == m ? 'selected' : ''}>${m ? m + ' minutes' : 'At workout time'}</option>`).join('')}</select></label>
    <button class="btn small" data-action="test-notify">Send a test notification</button>
    <p class="small muted">App notifications work while the app is open or in the background. For reminders that always work (even with the phone locked and the app closed), add the plan to your calendar:</p>
    <button class="btn" data-action="ics">📅 Add the plan to your phone’s calendar</button>
  </section>
  <section class="card stack"><h3>👤 Profile & plan</h3>
    <p class="small">${GOALS[S.profile.goal]} · ${LEVELS[S.profile.level]}</p>
    <ul class="plain small">${S.plan.map((d, i) => (d.type === 'rest' ? '' : `<li>${weekName(i)}, ${dayName(i)}: ${esc(d.title)} · ${esc(d.time)} · ${d.minutes} min · ${LOC_ICON[d.loc]} ${LOCS[d.loc]} · 🧰 ${equipText(d.equip)}</li>`)).join('')}</ul>
    <label>Height (cm)<input type="number" inputmode="decimal" data-path="profile.height" value="${esc(S.profile.height)}"></label>
    <a class="btn" href="#setup">✨ Update profile and create a new plan</a>
    <a class="btn ghost" href="#how">ℹ️ How your plan is built</a></section>
  <section class="card stack"><h3>📱 Install</h3>
    ${installEvt ? `<button class="btn primary" data-action="install">Install as an app</button>` : `<p class="small muted">iPhone: Safari → Share → "Add to Home Screen". Android: Chrome menu → "Install app".</p>`}</section>
  <section class="card stack"><h3>💾 Backup</h3>
    <p class="small muted">Your data is stored only on this device. Back it up from time to time.</p>
    <div class="row"><button class="btn" data-action="export">⬇ Export backup</button><label class="btn">⬆ Import backup<input type="file" accept=".json" hidden data-action-change="import"></label></div>
    <button class="btn danger ghost" data-action="reset">Delete all data</button></section>`;
}
async function swReg() { return 'serviceWorker' in navigator ? navigator.serviceWorker.getRegistration() : null; }
async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const reg = await swReg();
  const opts = { body, icon: 'icon.svg', badge: 'icon.svg', tag: 'fitapp', lang: 'en', dir: 'ltr' };
  if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
  return true;
}
async function enableNotify(on) {
  if (on) {
    if (!('Notification' in window)) { toast('This browser doesn’t support notifications'); on = false; }
    else if (Notification.permission !== 'granted') {
      const r = await Notification.requestPermission();
      if (r !== 'granted') { toast('Permission wasn’t granted'); on = false; }
    }
  }
  S.settings.notify = on; save(); render();
}
function checkReminders() {
  if (!S.settings.notify || !S.plan) return;
  const now = new Date(); const d = S.plan[planIdx(now)]; const ds = dateStr(now);
  if (d.type === 'rest' || !d.time || S.notified[ds] || logsOn(ds).length) return;
  const [h, m] = d.time.split(':').map(Number);
  const at = new Date(now); at.setHours(h, m, 0, 0);
  const remindAt = at.getTime() - num(S.settings.before) * 60000;
  if (now.getTime() >= remindAt && now.getTime() < at.getTime() + 2 * 3600000) {
    S.notified = { [ds]: true }; save();
    notify(`💪 ${d.title} ${S.settings.before ? `in ${S.settings.before} min` : 'now'}`, d.items.slice(0, 4).map((it) => exById(it.exId).name).join(' · '));
  }
}
setInterval(checkReminders, 30000);

function exportICS() {
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const events = S.plan.map((d, i) => {
    if (d.type === 'rest' || !d.time) return '';
    const [h, m] = d.time.split(':').map(Number);
    let start = addDays(new Date(S.planStart + 'T00:00'), i); start.setHours(h, m, 0, 0);
    while (start < new Date()) start = addDays(start, 7 * WEEKS);
    const dur = num(d.minutes) || 45;
    const desc = d.items.map((it) => `${exById(it.exId).name} ${itemTarget(it)}`).join('\\n');
    return ['BEGIN:VEVENT', `UID:fitapp-${i}-${uid()}@fitapp`, `DTSTAMP:${stamp}`, `DTSTART:${fmt(start)}`, `DURATION:PT${Math.max(20, Math.round(dur))}M`,
      `RRULE:FREQ=WEEKLY;INTERVAL=${WEEKS};BYDAY=${BYDAY[i % 7]}`, `SUMMARY:${TYPE_ICON[d.type]} ${d.title} (${LOCS[d.loc]})`, `DESCRIPTION:${desc}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${d.title}`, `TRIGGER:-PT${num(S.settings.before) || 0}M`, 'END:VALARM', 'END:VEVENT'].join('\r\n');
  }).filter(Boolean);
  download('fitness-plan.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FitApp//HE', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
  toast('Calendar file downloaded. Open it to add the workouts');
}
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Modal & video ----------
function showModal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
function openVideo(exId) {
  const ex = exById(exId); const url = S.videos[exId]; const id = ytId(url);
  const search = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.q || ex.name);
  showModal(`<h2>${esc(ex.name)}</h2>
    ${ex.tip ? `<p class="tip">💡 ${esc(ex.tip)}</p>` : ''}
    ${id ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" title="YouTube" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe></div>`
      : `<p class="muted small">No video saved for this exercise yet. Open the YouTube search, copy the link of a video you like and paste it here. From then on it plays right inside the app.</p>`}
    <a class="btn ${id ? '' : 'primary'}" href="${search}" target="_blank" rel="noopener">🔎 Search YouTube</a>
    <div class="row"><input id="yt-url" placeholder="Paste a YouTube link" value="${esc(url || '')}" dir="ltr"><button class="btn" data-action="save-video" data-ex="${esc(exId)}">Save</button></div>
    <button class="btn ghost" data-action="close-modal">Close</button>`);
}

// ---------- Events ----------
app.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'setup-form') submitSetup(e.target);
  if (e.target.id === 'body-form') submitBody(e.target);
});
document.addEventListener('input', (e) => {
  const p = e.target.dataset.path; if (!p) return;
  let v = e.target.value;
  if (e.target.type === 'number' || 'num' in e.target.dataset) v = v === '' ? '' : +v;
  setPath(S, p, v); save();
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  // Setup: picking a location suggests that place's usual equipment.
  if (t.dataset.setupLoc) { setEquipBoxes($('#setup-form'), t.dataset.setupLoc, defaultEquip(t.value)); return; }
  if (t.dataset.actionChange === 'day-eq') {
    const i = +t.dataset.day; const set = new Set(S.plan[i].equip || []);
    t.checked ? set.add(t.value) : set.delete(t.value);
    S.plan[i].equip = [...set]; rebuild(i, 'Workout updated for this equipment'); return;
  }
  if (t.dataset.path && 'rebuild' in t.dataset) {
    const i = +t.dataset.path.split('.')[1];
    if (t.dataset.path.endsWith('.loc')) S.plan[i].equip = defaultEquip(t.value);
    if (S.plan[i].type === 'rest') { S.plan[i].title = 'Rest'; save(); render(); $$open(i); return; }
    if (S.plan[i].title === 'Rest') S.plan[i].title = '';
    rebuild(i, 'Workout updated for the new settings'); return;
  }
  const a = t.dataset.actionChange; if (!a) return;
  if (a === 'prog-ex') { progEx = t.value; render(); }
  if (a === 'body-metric') { bodyMetric = t.value; render(); }
  if (a === 'notify') enableNotify(t.checked);
  if (a === 'import') {
    try {
      const file = t.files[0]; t.value = '';
      if (!file || file.size > 5e6) throw new Error('too big');
      const data = migrate(sanitizeState(JSON.parse(await file.text())));
      if (!confirm('Importing replaces all your current data. Continue?')) return;
      S = data; save(); toast('Data imported'); go('today');
    } catch { toast('Invalid backup file'); }
  }
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-action]'); if (!b || b.tagName === 'INPUT') return;
  const d = b.dataset; const A = S.active;
  switch (d.action) {
    case 'start': startWorkout(+d.day); break;
    case 'video': openVideo(d.ex); break;
    case 'close-modal': closeModal(); break;
    case 'save-video': {
      const v = $('#yt-url').value.trim();
      if (v && !ytId(v)) return toast('Invalid YouTube link');
      if (v) S.videos[d.ex] = v; else delete S.videos[d.ex];
      save(); toast(v ? 'Video saved' : 'Video removed'); openVideo(d.ex); break;
    }
    case 'add-item': addItem(+d.day); break;
    case 'rebuild': rebuild(+d.day, 'New workout built for this day'); break;
    case 'copy-sched': copySchedule(); break;
    case 'copy-week-setup': copyWeekSetup(); break;
    case 'copy-week':
      if (confirm('Replace all of week 2 with a copy of week 1?')) {
        for (let k = 0; k < 7; k++) S.plan[k + 7] = JSON.parse(JSON.stringify(S.plan[k]));
        save(); render(); toast('Week 1 copied to week 2');
      }
      break;
    case 'rm-item': S.plan[d.day].items.splice(+d.idx, 1); save(); render(); $$open(+d.day); break;
    case 'move': {
      const it = S.plan[d.day].items; const i = +d.idx, j = i + +d.dir;
      if (j < 0 || j >= it.length) return; [it[i], it[j]] = [it[j], it[i]]; save(); render(); $$open(+d.day); break;
    }
    case 'toggle-set': {
      const en = A.entries[d.i]; const s = en.sets[d.k]; s.done = !s.done;
      if (s.done && s.weight === '' && +d.k > 0) s.weight = en.sets[d.k - 1].weight;
      if (s.done) en.sets.slice(+d.k + 1).forEach((n) => { if (n.weight === '' && s.weight !== '') n.weight = s.weight; });
      save();
      const y = window.scrollY; render(); window.scrollTo(0, y);
      if (s.done) {
        const last = +d.k === en.sets.length - 1 && +d.i === A.entries.length - 1;
        if (!last) startTimer(en.rest || 60, `Rest · next: ${+d.k < en.sets.length - 1 ? exById(en.exId).name : exById(A.entries[+d.i + 1].exId).name}`);
      }
      break;
    }
    case 'hold': {
      const en = A.entries[d.i];
      startTimer(num(en.sets[d.k].sec) || 30, `${exById(en.exId).name} · set ${+d.k + 1}`, () => {
        if (S.active !== A) return;
        en.sets[d.k].done = true; save(); const y = window.scrollY; render(); window.scrollTo(0, y);
        if (+d.k < en.sets.length - 1 || +d.i < A.entries.length - 1) setTimeout(() => startTimer(en.rest || 30, 'Rest'), 400);
      });
      break;
    }
    case 'countdown': startTimer(+d.sec, d.label); break;
    case 'toggle-cardio': { A.entries[d.i].done = !A.entries[d.i].done; save(); const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'add-set': { const en = A.entries[d.i]; en.sets.push({ ...en.sets.at(-1), done: false }); save(); const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'rm-set': { A.entries[d.i].sets.pop(); save(); const y = window.scrollY; render(); window.scrollTo(0, y); break; }
    case 'finish': finishWorkout(); break;
    case 'cancel-workout': if (confirm('Cancel this workout without saving?')) { S.active = null; stopTimer(); save(); go('today'); } break;
    case 'timer-add': if (timer) { timer.end += 15000; timer.total += 15; tickTimer(); } break;
    case 'timer-skip': stopTimer(); break;
    case 'del-log': if (confirm('Delete this workout from your history?')) { S.logs = S.logs.filter((l) => l.id !== d.id); save(); render(); } break;
    case 'del-body': S.body = S.body.filter((r) => r.id !== d.id); save(); render(); break;
    case 'test-notify': if (!(await notify('💪 Test notification', 'Notifications are working!'))) toast('Turn on and allow notifications first'); break;
    case 'ics': exportICS(); break;
    case 'install': installEvt?.prompt(); installEvt = null; break;
    case 'export': download(`fitness-backup-${dateStr()}.json`, JSON.stringify({ ...S, active: null }, null, 2), 'application/json'); break;
    case 'reset': if (confirm('Delete all data? This can’t be undone.')) { localStorage.removeItem(KEY); S = defaultState(); go('setup'); } break;
  }
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

// ---------- Boot ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
checkReminders();
