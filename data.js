'use strict';
// Exercise library.
// eq = equipment needed: none | dumbbells | gym | pullbar | mat | vibe (vibration plate)
// kind: weight | reps | time | cardio. q = YouTube search query. loc (cardio only) = where it can be done.
const EXERCISES = [
  // Chest
  { id: 'pushup', name: 'Push-ups', cat: 'chest', eq: 'none', kind: 'reps', q: 'push up proper form tutorial', tip: 'Body straight like a plank, elbows about 45° from your torso.' },
  { id: 'db_bench', name: 'Dumbbell Bench Press', cat: 'chest', eq: 'dumbbells', kind: 'weight', q: 'dumbbell bench press form', tip: 'Shoulder blades pinned to the bench, lower under control to chest level.' },
  { id: 'incline_db', name: 'Incline Dumbbell Press', cat: 'chest', eq: 'dumbbells', kind: 'weight', q: 'incline dumbbell press form', tip: 'Bench at about 30°, press up over your shoulder line.' },
  { id: 'bench', name: 'Barbell Bench Press', cat: 'chest', eq: 'gym', kind: 'weight', q: 'barbell bench press form', tip: 'Feet planted, bar comes down to mid-chest.' },
  // Back
  { id: 'superman', name: 'Superman', cat: 'back', eq: 'none', kind: 'reps', q: 'superman exercise form', tip: 'Lift arms and legs slowly and hold for a second at the top.' },
  { id: 'db_row', name: 'One-Arm Dumbbell Row', cat: 'back', eq: 'dumbbells', kind: 'weight', q: 'one arm dumbbell row form', tip: 'Flat back, pull your elbow toward your hip.' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', cat: 'back', eq: 'gym', kind: 'weight', q: 'lat pulldown proper form', tip: 'Pull to your upper chest without swinging back.' },
  { id: 'cable_row', name: 'Seated Cable Row', cat: 'back', eq: 'gym', kind: 'weight', q: 'seated cable row form', tip: 'Chest up, squeeze your shoulder blades at the end.' },
  { id: 'pullup', name: 'Pull-ups', cat: 'back', eq: 'pullbar', kind: 'reps', q: 'pull up proper form beginner', tip: 'Start from a dead hang, chin over the bar.' },
  // Legs
  { id: 'squat_bw', name: 'Bodyweight Squat', cat: 'legs', eq: 'none', kind: 'reps', q: 'bodyweight squat form', tip: 'Knees track over your toes, go down until thighs are parallel to the floor.' },
  { id: 'lunge', name: 'Lunges', cat: 'legs', eq: 'none', kind: 'reps', q: 'lunges proper form', tip: 'Long step, back knee drops almost to the floor.' },
  { id: 'glute_bridge', name: 'Glute Bridge', cat: 'legs', eq: 'none', kind: 'reps', q: 'glute bridge form', tip: 'Drive through your heels and squeeze your glutes at the top.' },
  { id: 'goblet', name: 'Goblet Squat', cat: 'legs', eq: 'dumbbells', kind: 'weight', q: 'goblet squat form', tip: 'Dumbbell held against your chest, torso upright.' },
  { id: 'rdl', name: 'Romanian Deadlift', cat: 'legs', eq: 'dumbbells', kind: 'weight', q: 'dumbbell romanian deadlift form', tip: 'Push your hips back, neutral spine, feel the stretch in your hamstrings.' },
  { id: 'squat', name: 'Barbell Back Squat', cat: 'legs', eq: 'gym', kind: 'weight', q: 'barbell back squat form', tip: 'Take a deep breath and brace your core before descending.' },
  { id: 'leg_press', name: 'Leg Press', cat: 'legs', eq: 'gym', kind: 'weight', q: 'leg press proper form', tip: 'Don’t lock your knees at the top, keep your back against the pad.' },
  { id: 'deadlift', name: 'Deadlift', cat: 'legs', eq: 'gym', kind: 'weight', q: 'deadlift proper form beginner', tip: 'Bar close to your legs, lift with your legs, not your back.' },
  // Shoulders
  { id: 'pike_pushup', name: 'Pike Push-ups', cat: 'shoulders', eq: 'none', kind: 'reps', q: 'pike push up form', tip: 'Hips high, head goes down between your hands.' },
  { id: 'db_press', name: 'Dumbbell Shoulder Press', cat: 'shoulders', eq: 'dumbbells', kind: 'weight', q: 'dumbbell shoulder press form', tip: 'Core tight, don’t arch your lower back.' },
  { id: 'lateral_raise', name: 'Lateral Raise', cat: 'shoulders', eq: 'dumbbells', kind: 'weight', q: 'lateral raise proper form', tip: 'Raise to shoulder height with slightly bent elbows.' },
  { id: 'ohp', name: 'Barbell Overhead Press', cat: 'shoulders', eq: 'gym', kind: 'weight', q: 'overhead press barbell form', tip: 'Move your head back to clear a path for the bar.' },
  // Arms
  { id: 'bench_dips', name: 'Bench Dips', cat: 'arms', eq: 'none', kind: 'reps', q: 'bench dips form', tip: 'Back close to the bench, lower to a 90° elbow bend.' },
  { id: 'db_curl', name: 'Dumbbell Biceps Curl', cat: 'arms', eq: 'dumbbells', kind: 'weight', q: 'dumbbell bicep curl form', tip: 'Elbows tucked to your sides, no swinging.' },
  { id: 'tricep_ext', name: 'Overhead Triceps Extension', cat: 'arms', eq: 'dumbbells', kind: 'weight', q: 'overhead tricep extension dumbbell form', tip: 'Elbows point forward, not out to the sides.' },
  { id: 'pushdown', name: 'Cable Triceps Pushdown', cat: 'arms', eq: 'gym', kind: 'weight', q: 'tricep pushdown form', tip: 'Elbows stay fixed at your sides.' },
  // Core
  { id: 'plank', name: 'Plank', cat: 'core', eq: 'none', kind: 'time', q: 'plank proper form', tip: 'Straight line from head to heels, glutes and abs tight.' },
  { id: 'crunch', name: 'Crunches', cat: 'core', eq: 'none', kind: 'reps', q: 'crunches proper form', tip: 'Lift only your shoulder blades, don’t pull on your neck.' },
  { id: 'leg_raise', name: 'Lying Leg Raises', cat: 'core', eq: 'none', kind: 'reps', q: 'lying leg raises form', tip: 'Lower back stays pressed to the floor the whole time.' },
  { id: 'dead_bug', name: 'Dead Bug', cat: 'core', eq: 'none', kind: 'reps', q: 'dead bug exercise form', tip: 'Opposite arm and leg, lower back pressed down.' },
  { id: 'russian_twist', name: 'Russian Twists', cat: 'core', eq: 'none', kind: 'reps', q: 'russian twist form', tip: 'Rotate from your torso, not just your arms.' },
  { id: 'side_plank', name: 'Side Plank', cat: 'core', eq: 'none', kind: 'time', q: 'side plank proper form', tip: 'Hips high, shoulder stacked over your elbow.' },
  // Vibration plate
  { id: 'vibe_squat', name: 'Squat on Vibration Plate', cat: 'legs', eq: 'vibe', kind: 'time', q: 'vibration plate squat exercise', tip: 'Keep knees slightly bent (not locked) so the vibration doesn’t travel to your head.' },
  { id: 'vibe_bridge', name: 'Glute Bridge, Feet on Vibration Plate', cat: 'legs', eq: 'vibe', kind: 'time', q: 'vibration plate glute bridge', tip: 'Heels on the plate, hips up and squeeze your glutes.' },
  { id: 'vibe_plank', name: 'Plank on Vibration Plate', cat: 'core', eq: 'vibe', kind: 'time', q: 'vibration plate plank', tip: 'Forearms on the plate, body straight. Start on low intensity.' },
  { id: 'vibe_pushup', name: 'Push-ups on Vibration Plate', cat: 'chest', eq: 'vibe', kind: 'reps', q: 'vibration plate push ups', tip: 'Hands on the plate, slow and controlled.' },
  // Yoga mat
  { id: 'bird_dog', name: 'Bird Dog', cat: 'core', eq: 'mat', kind: 'reps', q: 'bird dog exercise form', tip: 'On the mat on all fours, opposite arm and leg, flat back.' },
  { id: 'hollow_hold', name: 'Hollow Body Hold', cat: 'core', eq: 'mat', kind: 'time', q: 'hollow body hold beginner', tip: 'Lower back pressed into the mat, arms and legs raised.' },
  // Army / conditioning (no equipment, works in the field)
  { id: 'burpees', name: 'Burpees', cat: 'conditioning', eq: 'none', kind: 'reps', q: 'burpees proper form', tip: 'Land softly, keep your back straight in the push-up position.' },
  { id: 'bear_crawl', name: 'Bear Crawl', cat: 'conditioning', eq: 'none', kind: 'time', q: 'bear crawl exercise', tip: 'Knees just off the ground, flat back, small steps.' },
  { id: 'mountain_climbers', name: 'Mountain Climbers', cat: 'conditioning', eq: 'none', kind: 'time', q: 'mountain climbers proper form', tip: 'Hips low, drive your knees quickly toward your chest.' },
  { id: 'jump_squat', name: 'Jump Squat', cat: 'conditioning', eq: 'none', kind: 'reps', q: 'jump squat form', tip: 'Land softly with bent knees.' },
  // Cardio
  { id: 'run', name: 'Running', cat: 'cardio', eq: 'none', kind: 'cardio', loc: ['outdoor', 'gym', 'army'], q: 'running form tips beginners', tip: 'A pace that lets you talk in short sentences (zone 2). At the gym: treadmill at 1% incline.' },
  { id: 'brisk_walk', name: 'Brisk Walk', cat: 'cardio', eq: 'none', kind: 'cardio', loc: ['outdoor', 'gym', 'army'], q: 'brisk walking workout', tip: 'A pace that raises your heart rate but still lets you hold a conversation.' },
  { id: 'sprints', name: 'Sprints', cat: 'cardio', eq: 'none', kind: 'cardio', loc: ['outdoor', 'army'], q: 'sprint interval workout', tip: '10 × 100 m sprint, walk back to recover. Warm up well first!' },
  { id: 'cycle_out', name: 'Cycling', cat: 'cardio', eq: 'none', kind: 'cardio', loc: ['outdoor'], q: 'cycling tips for beginners', tip: 'Steady pace, always wear a helmet. Push harder on the climbs.' },
  { id: 'home_walk', name: 'Walk-at-Home Workout', cat: 'cardio', eq: 'none', kind: 'cardio', loc: ['home'], q: 'walk at home workout low impact', tip: 'A follow-along walking-in-place video, apartment-friendly with no jumping.' },
  { id: 'jump_rope', name: 'Jump Rope', cat: 'cardio', eq: 'none', kind: 'cardio', loc: ['home', 'outdoor'], q: 'jump rope workout beginner', tip: 'Small jumps on the balls of your feet.' },
  { id: 'hiit', name: 'HIIT Workout', cat: 'cardio', eq: 'none', kind: 'cardio', loc: ['home', 'outdoor', 'gym', 'army'], q: '20 minute HIIT workout no equipment', tip: '40 seconds work / 20 seconds rest. You can follow along with a video.' },
  { id: 'bike', name: 'Stationary Bike', cat: 'cardio', eq: 'gym', kind: 'cardio', loc: ['gym'], q: 'stationary bike interval workout', tip: 'Seat height: knee almost straight at the bottom of the stroke.' },
  { id: 'rowing', name: 'Rowing Machine', cat: 'cardio', eq: 'gym', kind: 'cardio', loc: ['gym'], q: 'rowing machine technique', tip: 'Legs → back → arms, then reverse on the way back.' },
  { id: 'elliptical', name: 'Elliptical', cat: 'cardio', eq: 'gym', kind: 'cardio', loc: ['gym'], q: 'elliptical workout tips', tip: 'Stand tall, don’t lean on the handles.' },
  // Mobility / recovery (sessions measured in minutes)
  { id: 'stretch', name: 'Cool-down Stretching', cat: 'mobility', eq: 'none', kind: 'cardio', loc: ['home', 'outdoor', 'gym', 'army'], q: '10 minute full body stretch after workout', tip: 'Hold each stretch 20–30 seconds, breathe calmly.' },
  { id: 'yoga', name: 'Yoga on the Mat', cat: 'mobility', eq: 'mat', kind: 'cardio', loc: ['home', 'gym'], q: 'yoga for beginners 20 minutes', tip: 'Stay in a comfortable range with no pain. You can follow along with a video.' },
  { id: 'vibe_recovery', name: 'Vibration Plate Muscle Release', cat: 'mobility', eq: 'vibe', kind: 'cardio', loc: ['home'], q: 'vibration plate massage recovery', tip: 'Stand or sit on the plate on low intensity, 30–60 s per muscle.' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKS = 2; // plan is a repeating 2-week cycle (14 days)
const dayName = (i) => DAYS[i % 7];
const weekName = (i) => `Week ${Math.floor(i / 7) + 1}`;
// Preference when several exercises fit: equipment-based variants first.
const EQ_PREF = { gym: 3, dumbbells: 2, pullbar: 2, vibe: 1, mat: 1, none: 0 };
const EQ_LABEL = { gym: 'gym', dumbbells: 'dumbbells', pullbar: 'pull-up bar', vibe: 'vibration plate', mat: 'mat', none: '' };
const GOALS = { muscle: 'Build muscle', loss: 'Lose weight', fitness: 'General fitness', endurance: 'Endurance' };
const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const EQUIP_CHOICES = { dumbbells: 'Dumbbells', gym: 'Gym machines', pullbar: 'Pull-up bar', vibe: 'Vibration plate', mat: 'Yoga mat' };
const LOCS = { home: 'Home', gym: 'Gym', outdoor: 'Outdoors', army: 'Army' };
const LOC_ICON = { home: '🏠', gym: '🏢', outdoor: '🌳', army: '🪖' };
const DURATIONS = [20, 30, 45, 60, 75, 90];
const TYPE_LABEL = { strength: 'Strength', cardio: 'Cardio', mixed: 'Mixed', rest: 'Rest' };
const TYPE_ICON = { strength: '🏋️', cardio: '🏃', mixed: '⚡', rest: '😴' };
const CAT_LABEL = { chest: 'Chest', back: 'Back', legs: 'Legs', shoulders: 'Shoulders', arms: 'Arms', core: 'Core', conditioning: 'Conditioning', cardio: 'Cardio', mobility: 'Mobility' };
const DEFAULT_KIND = { strength: 'full', cardio: 'cardio', mixed: 'mixed' };

const exById = (id) => EXERCISES.find((e) => e.id === id) || { id, name: id, cat: 'other', kind: 'reps', q: id };

// Equipment is chosen per day. These are the defaults suggested when a location is picked.
const DEFAULT_EQUIP = { home: [], gym: ['gym', 'dumbbells', 'pullbar', 'mat'], outdoor: [], army: ['pullbar'] };
const defaultEquip = (loc) => [...(DEFAULT_EQUIP[loc] || [])];
// Body-weight exercises ('none') are always available.
const slotEquipment = (slot) => ['none', ...(Array.isArray(slot.equip) ? slot.equip : defaultEquip(slot.loc))];

// ---------- Plan generator ----------
function goalParams(goal, level) {
  const base = {
    muscle: { sets: 4, reps: '8-10', rest: 90, sec: 45 },
    loss: { sets: 3, reps: '12-15', rest: 40, sec: 40 },
    fitness: { sets: 3, reps: '10-12', rest: 60, sec: 40 },
    endurance: { sets: 3, reps: '15-20', rest: 40, sec: 50 },
  }[goal];
  const p = { ...base };
  if (level === 'beginner') { p.sets = Math.max(2, p.sets - 1); p.sec -= 15; }
  if (level === 'advanced') { p.sets += 1; p.sec += 15; }
  return p;
}

// Session sequence by goal, indexed by (number of training days in the week - 1)
const PATTERNS = {
  muscle: [['full'], ['full', 'full'], ['full', 'full', 'full'], ['upper', 'lower', 'upper', 'lower'],
    ['upper', 'lower', 'cardio', 'upper', 'lower'], ['upper', 'lower', 'cardio', 'upper', 'lower', 'hiit'],
    ['upper', 'lower', 'cardio', 'upper', 'lower', 'hiit', 'cardio']],
  loss: [['circuit'], ['circuit', 'hiit'], ['circuit', 'cardio', 'circuit'], ['full', 'hiit', 'full', 'cardioLong'],
    ['circuit', 'cardio', 'full', 'hiit', 'cardioLong'], ['circuit', 'cardio', 'full', 'hiit', 'mixed', 'cardioLong'],
    ['circuit', 'cardio', 'full', 'hiit', 'mixed', 'cardioLong', 'cardio']],
  fitness: [['mixed'], ['full', 'mixed'], ['full', 'cardio', 'full'], ['full', 'cardio', 'full', 'hiit'],
    ['upper', 'cardio', 'lower', 'hiit', 'mixed'], ['upper', 'cardio', 'lower', 'hiit', 'full', 'cardioLong'],
    ['upper', 'cardio', 'lower', 'hiit', 'full', 'cardioLong', 'cardio']],
  endurance: [['cardioLong'], ['cardio', 'mixed'], ['cardio', 'full', 'cardioLong'], ['cardio', 'full', 'hiit', 'cardioLong'],
    ['cardio', 'full', 'hiit', 'mixed', 'cardioLong'], ['cardio', 'full', 'hiit', 'cardio', 'mixed', 'cardioLong'],
    ['cardio', 'full', 'hiit', 'cardio', 'mixed', 'cardioLong', 'cardio']],
};
// How many exercise slots a session gets from its length (warm-up/cool-down are extra).
const exerciseCount = (minutes) => (minutes <= 20 ? 3 : minutes <= 30 ? 4 : minutes <= 45 ? 5 : minutes <= 60 ? 6 : 7);
// Human names for session kinds, used by the "How your plan is built" screen.
const KIND_LABEL = { full: 'Full body', upper: 'Upper body', lower: 'Lower body', circuit: 'Fat-burn circuit', mixed: 'Strength + cardio', hiit: 'HIIT', cardio: 'Steady cardio', cardioLong: 'Long cardio', rest: 'Rest' };
const LEVEL_EFFECT = { beginner: '1 set fewer (min. 2), timed holds 15 s shorter, cardio 20% shorter', intermediate: 'no change', advanced: '1 extra set, timed holds 15 s longer, cardio 20% longer' };
const CARDIO_KINDS = ['cardio', 'cardioLong', 'hiit'];
const STRENGTH_KINDS = ['full', 'upper', 'lower'];

// slot = { minutes, loc } — each day has its own duration and location.
function buildSession(t, v, pr, slot) {
  const P = goalParams(pr.goal, pr.level);
  const loc = slot.loc || 'home';
  const avail = slotEquipment(slot);
  const minutes = +slot.minutes || 45;
  const n = exerciseCount(minutes);
  const lvl = { beginner: 0.8, intermediate: 1, advanced: 1.2 }[pr.level];
  const round5 = (m) => Math.max(10, Math.round(m / 5) * 5);
  const beginner = pr.level === 'beginner';
  const army = loc === 'army';
  const used = {};
  const pick = (cat) => {
    let list = EXERCISES.filter((e) => e.cat === cat && avail.includes(e.eq))
      .sort((a, b) => EQ_PREF[b.eq] - EQ_PREF[a.eq]);
    if (!list.length) return null;
    const top = EQ_PREF[list[0].eq];
    list = list.filter((e) => EQ_PREF[e.eq] >= top - 1); // use the best equipment on hand
    const k = (used[cat] = (used[cat] ?? -1) + 1);
    return list[(v + k) % list.length];
  };
  const strength = (cats, rest = P.rest) => cats.map(pick).filter(Boolean)
    .filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i)
    .map((e) => (e.kind === 'time'
      ? { exId: e.id, sets: P.sets, sec: P.sec, rest }
      : { exId: e.id, sets: P.sets, reps: P.reps, rest }));
  const CARDIO_BY_LOC = {
    gym: ['run', 'bike', 'rowing', 'elliptical'],
    outdoor: beginner ? ['brisk_walk', 'run', 'cycle_out'] : ['run', 'cycle_out', 'sprints'],
    army: beginner ? ['brisk_walk', 'run'] : ['run', 'sprints'],
    home: beginner ? ['home_walk', 'jump_rope'] : ['jump_rope', 'home_walk'],
  };
  const hasGym = avail.includes('gym');
  if (loc === 'gym' && !hasGym) CARDIO_BY_LOC.gym = ['run', 'brisk_walk'];
  const cardioEx = () => { const o = CARDIO_BY_LOC[loc]; return o[v % o.length]; };
  const warmup = () => ({
    exId: { gym: hasGym ? ['bike', 'rowing', 'elliptical'][v % 3] : 'brisk_walk', outdoor: beginner ? 'brisk_walk' : 'run', army: beginner ? 'brisk_walk' : 'run', home: beginner ? 'home_walk' : 'jump_rope' }[loc],
    minutes: minutes >= 45 ? 10 : 5,
  });
  // Cool-down on longer sessions: vibration-plate release or yoga when available, else stretching.
  const cooldown = () => (minutes < 45 ? [] : [{ exId: avail.includes('vibe') && v % 2 ? 'vibe_recovery' : avail.includes('mat') ? 'yoga' : 'stretch', minutes: 5 }]);
  const conditioning = () => (army ? strength(['conditioning', 'conditioning'], 45) : []);
  const sn = Math.max(3, n - (minutes >= 45 ? 1 : 0) - (army ? 2 : 0));
  const FULL = ['legs', 'chest', 'back', 'shoulders', 'core', 'arms', 'legs'];
  const S = (type, title, items) => ({ kind: t, type, title, items });
  switch (t) {
    case 'full': return S('strength', (army ? 'Combat Fitness ' : 'Full Body ') + 'ABCD'[v % 4], [warmup(), ...strength(FULL.slice(0, sn)), ...conditioning(), ...cooldown()]);
    case 'upper': return S('strength', 'Upper Body ' + 'ABCD'[v % 4], [warmup(), ...strength(['chest', 'back', 'shoulders', 'chest', 'back', 'arms', 'arms'].slice(0, sn)), ...conditioning(), ...cooldown()]);
    case 'lower': return S('strength', 'Lower Body ' + 'ABCD'[v % 4], [warmup(), ...strength(['legs', 'legs', 'core', 'legs', 'core', 'legs', 'core'].slice(0, sn)), ...conditioning(), ...cooldown()]);
    case 'circuit': return S('mixed', 'Fat-Burn Circuit ' + 'ABCD'[v % 4], [...strength([...FULL.slice(0, Math.max(2, n - 2)), 'conditioning'], 30), { exId: cardioEx(), minutes: minutes >= 45 ? 10 : 5 }]);
    case 'mixed': return S('mixed', 'Strength + Cardio', [...strength(FULL.slice(0, Math.max(2, n - 2))), { exId: cardioEx(), minutes: round5(minutes * 0.4 * lvl) }]);
    case 'hiit': {
      const h = round5(Math.min(30, minutes * 0.6) * lvl);
      const extra = minutes - h - 10; // long days: add steady cardio after the intervals
      return S('cardio', 'HIIT', [{ exId: 'hiit', minutes: h }, ...(extra >= 15 ? [{ exId: cardioEx(), minutes: round5(extra * lvl) }] : []), ...strength(['core', 'core'], 30)]);
    }
    case 'cardio': return S('cardio', 'Cardio', [{ exId: cardioEx(), minutes: round5(minutes * lvl) }]);
    case 'cardioLong': return S('cardio', 'Long Cardio', [{ exId: cardioEx(), minutes: round5(minutes * lvl) }]);
    default: return { kind: 'rest', type: 'rest', title: 'Rest', items: [] };
  }
}

const restDay = () => ({ kind: 'rest', type: 'rest', title: 'Rest', time: '18:00', minutes: 45, loc: 'home', items: [] });

// pr.schedule = [{ day: 0..13, time, minutes, loc }] — two weeks, each planned on its own.
function generatePlan(pr) {
  const plan = Array.from({ length: 7 * WEEKS }, restDay);
  const counters = {}; // shared across weeks so week 2 gets different variants
  for (let w = 0; w < WEEKS; w++) {
    const slots = pr.schedule.filter((s) => Math.floor(s.day / 7) === w).sort((a, b) => a.day - b.day);
    if (!slots.length) continue;
    const pool = [...PATTERNS[pr.goal][Math.min(slots.length, 7) - 1]];
    const take = (pred) => { const i = pool.findIndex(pred); return i < 0 ? null : pool.splice(i, 1)[0]; };
    // Fit sessions to places: outdoors → cardio, gym → strength, the rest in order.
    const kinds = new Array(slots.length).fill(null);
    slots.forEach((s, i) => { if (s.loc === 'outdoor') kinds[i] = take((t) => CARDIO_KINDS.includes(t)); });
    slots.forEach((s, i) => { if (!kinds[i] && s.loc === 'gym') kinds[i] = take((t) => STRENGTH_KINDS.includes(t)); });
    slots.forEach((s, i) => { if (!kinds[i]) kinds[i] = take(() => true); });
    // The long cardio session goes on the longest cardio day.
    const longIdx = kinds.indexOf('cardioLong');
    if (longIdx >= 0) {
      const best = kinds.reduce((b, k, i) => ((k === 'cardio' || k === 'cardioLong') && +slots[i].minutes > +slots[b].minutes ? i : b), longIdx);
      [kinds[longIdx], kinds[best]] = [kinds[best], kinds[longIdx]];
    }
    slots.forEach((s, i) => {
      const t = kinds[i];
      const v = (counters[t] = (counters[t] ?? -1) + 1);
      plan[s.day] = { ...buildSession(t, v, pr, s), time: s.time, minutes: +s.minutes, loc: s.loc, equip: slotEquipment(s).slice(1) };
    });
  }
  return plan;
}

// Rebuild one day from its own type / duration / location (used by the plan editor).
function rebuildDay(pr, day) {
  const kind = day.kind && day.kind !== 'rest' && buildSession(day.kind, 0, pr, day).type === day.type ? day.kind : DEFAULT_KIND[day.type];
  const v = Math.floor(Math.random() * 4);
  return { ...day, ...buildSession(kind, v, pr, day) };
}
