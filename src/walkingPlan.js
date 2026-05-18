// Plan marche 32 semaines · Mode Goggins
// Source : C:\Users\Cleme\Documents\walking_plan_32w.json

export const WALKING_PLAN = {
  startDate: '2026-05-18', // lundi semaine 1 (modifiable via la UI)
  goals: {
    targetWeightKgMedian: 122,
    targetWeightKgAmbitious: 117,
    durationWeeks: 32,
  },
  locations: {
    mont_st_quentin: { name: 'Mont Saint-Quentin', driveMin: 5, type: 'vallonné' },
    foret_st_privat: { name: 'Forêt Saint-Privat / Vallière', driveMin: 10, type: 'plat à léger' },
    vallee_canner: { name: 'Vallée de la Canner (Vigy)', driveMin: 20, type: 'variable' },
  },
  intensityLabels: {
    easy: 'Easy · récup',
    leger: 'Léger',
    moyen: 'Moyen · vallonné',
    dur: 'Dur · vallonné',
    leger_long: 'Long · léger',
  },
  template: {
    mon: { spot: 'mont_st_quentin', intensity: 'moyen', label: 'Vallonné dur' },
    tue: { spot: 'mont_st_quentin', intensity: 'moyen', label: 'Vallonné dur' },
    wed: { spot: 'foret_st_privat', intensity: 'easy',  label: 'Easy plat' },
    thu: { spot: 'mont_st_quentin', intensity: 'moyen', label: 'Vallonné dur' },
    fri: { spot: 'mont_st_quentin', intensity: 'moyen', label: 'Vallonné dur' },
    sat: { spot: 'foret_st_privat', intensity: 'easy',  label: 'Easy plat' },
    sun: { spot: 'vallee_canner',   intensity: 'leger_long', label: 'Sortie longue' },
  },
  blocks: [
    { id: 1, name: 'Allumage',      weeks: [1, 4],   objective: 'Créer l\'habitude 7/7, ménager les articulations',  expectedLossKg: [6, 9] },
    { id: 2, name: 'Endurance',     weeks: [5, 12],  objective: 'Passer le mur hormonal, construire la base',         expectedLossKg: [8, 12] },
    { id: 3, name: 'Forge',         weeks: [13, 20], objective: 'Devenir athlète, pousser le dénivelé',                expectedLossKg: [7, 10] },
    { id: 4, name: 'Consolidation', weeks: [21, 28], objective: 'Stabiliser le volume, ajouter du lest',               expectedLossKg: [5, 7] },
    { id: 5, name: 'Affûtage',      weeks: [29, 32], objective: 'Peak, préparation phase post',                        expectedLossKg: [3, 4] },
  ],
  weeks: [
    { week: 1,  block: 1, dur: { mon:120, tue:120, wed:45,  thu:120, fri:120, sat:45,  sun:150 } },
    { week: 2,  block: 1, dur: { mon:135, tue:135, wed:60,  thu:135, fri:135, sat:60,  sun:180 } },
    { week: 3,  block: 1, dur: { mon:150, tue:150, wed:60,  thu:150, fri:150, sat:60,  sun:210 } },
    { week: 4,  block: 1, dur: { mon:165, tue:165, wed:75,  thu:165, fri:165, sat:75,  sun:240 } },
    { week: 5,  block: 2, dur: { mon:180, tue:180, wed:75,  thu:180, fri:180, sat:75,  sun:240 } },
    { week: 6,  block: 2, dur: { mon:180, tue:180, wed:75,  thu:180, fri:180, sat:75,  sun:270 }, note: 'Plateau attendu — ne change rien' },
    { week: 7,  block: 2, dur: { mon:195, tue:195, wed:75,  thu:195, fri:195, sat:75,  sun:270 } },
    { week: 8,  block: 2, dur: { mon:195, tue:195, wed:75,  thu:195, fri:195, sat:75,  sun:270 }, note: 'Démarre la muscu 2× 30 min' },
    { week: 9,  block: 2, dur: { mon:195, tue:195, wed:75,  thu:195, fri:195, sat:75,  sun:270 } },
    { week: 10, block: 2, dur: { mon:210, tue:210, wed:75,  thu:210, fri:210, sat:75,  sun:270 } },
    { week: 11, block: 2, dur: { mon:210, tue:210, wed:75,  thu:210, fri:210, sat:75,  sun:270 } },
    { week: 12, block: 2, dur: { mon:210, tue:210, wed:90,  thu:210, fri:210, sat:90,  sun:300 } },
    { week: 13, block: 3, dur: { mon:210, tue:210, wed:90,  thu:210, fri:210, sat:90,  sun:300 }, note: 'Passe la muscu à 3× 40 min' },
    { week: 14, block: 3, dur: { mon:210, tue:210, wed:90,  thu:210, fri:210, sat:90,  sun:300 } },
    { week: 15, block: 3, dur: { mon:210, tue:210, wed:90,  thu:210, fri:210, sat:90,  sun:330 }, note: 'Plateau potentiel' },
    { week: 16, block: 3, dur: { mon:225, tue:225, wed:90,  thu:225, fri:225, sat:90,  sun:330 } },
    { week: 17, block: 3, dur: { mon:225, tue:225, wed:90,  thu:225, fri:225, sat:90,  sun:330 } },
    { week: 18, block: 3, dur: { mon:225, tue:225, wed:90,  thu:225, fri:225, sat:90,  sun:360 } },
    { week: 19, block: 3, dur: { mon:225, tue:225, wed:90,  thu:225, fri:225, sat:90,  sun:360 }, note: 'Sortie ultra 6h ce mois-ci' },
    { week: 20, block: 3, dur: { mon:225, tue:225, wed:90,  thu:225, fri:225, sat:90,  sun:360 } },
    { week: 21, block: 4, dur: { mon:225, tue:225, wed:90,  thu:225, fri:225, sat:90,  sun:360 }, vest: 5 },
    { week: 22, block: 4, dur: { mon:240, tue:240, wed:90,  thu:240, fri:240, sat:90,  sun:360 }, vest: 6 },
    { week: 23, block: 4, dur: { mon:240, tue:240, wed:90,  thu:240, fri:240, sat:90,  sun:360 }, vest: 6 },
    { week: 24, block: 4, dur: { mon:240, tue:240, wed:90,  thu:240, fri:240, sat:90,  sun:360 }, vest: 7, note: 'Sortie ultra 6h30' },
    { week: 25, block: 4, dur: { mon:240, tue:240, wed:90,  thu:240, fri:240, sat:90,  sun:360 }, vest: 7 },
    { week: 26, block: 4, dur: { mon:240, tue:240, wed:90,  thu:240, fri:240, sat:90,  sun:390 }, vest: 8 },
    { week: 27, block: 4, dur: { mon:240, tue:240, wed:90,  thu:240, fri:240, sat:90,  sun:390 }, vest: 8 },
    { week: 28, block: 4, dur: { mon:240, tue:240, wed:90,  thu:240, fri:240, sat:90,  sun:390 }, vest: 8, note: 'Sortie ultra 7h. Décide : maintenance ou continuation après S32 ?' },
    { week: 29, block: 5, dur: { mon:240, tue:240, wed:75,  thu:240, fri:240, sat:75,  sun:390 } },
    { week: 30, block: 5, dur: { mon:240, tue:240, wed:75,  thu:240, fri:240, sat:75,  sun:390 } },
    { week: 31, block: 5, dur: { mon:225, tue:225, wed:75,  thu:225, fri:225, sat:75,  sun:360 }, note: 'Décharge avant le rite de passage' },
    { week: 32, block: 5, dur: { mon:180, tue:180, wed:60,  thu:180, fri:180, sat:60,  sun:420 }, note: 'Rite de passage : 20-25 km le dimanche' },
  ],
};

// JS getDay() = 0 dimanche, 1 lundi, ..., 6 samedi
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function dayKeyFromDate(d) {
  return DAY_KEYS[d.getDay()];
}

export function dayLabel(key) {
  return ({ mon:'Lundi', tue:'Mardi', wed:'Mercredi', thu:'Jeudi', fri:'Vendredi', sat:'Samedi', sun:'Dimanche' })[key];
}

// Calcule le numéro de semaine (1..32) selon date du jour vs startDate.
// Renvoie null si avant le début ou après la fin du plan.
export function currentWeekNumber(startDateIso, today = new Date()) {
  const start = new Date(startDateIso + 'T00:00:00');
  // Aligne start sur lundi de sa semaine
  const startDay = start.getDay(); // 0=dim
  const offsetToMon = startDay === 0 ? -6 : 1 - startDay;
  const startMon = new Date(start);
  startMon.setDate(start.getDate() + offsetToMon);
  const ms = today - startMon;
  const days = Math.floor(ms / 86400000);
  const week = Math.floor(days / 7) + 1;
  if (week < 1) return null;
  if (week > WALKING_PLAN.weeks.length) return null;
  return week;
}

export function getWeek(weekNum) {
  return WALKING_PLAN.weeks.find(w => w.week === weekNum);
}

export function getBlock(blockId) {
  return WALKING_PLAN.blocks.find(b => b.id === blockId);
}

// Cible du jour : { minutes, spot, intensity, label, key, dayLabel }
export function targetForToday(weekNum, today = new Date()) {
  const w = getWeek(weekNum);
  if (!w) return null;
  const key = dayKeyFromDate(today);
  const minutes = w.dur[key];
  const tpl = WALKING_PLAN.template[key];
  const spot = WALKING_PLAN.locations[tpl.spot];
  return {
    key,
    dayLabel: dayLabel(key),
    minutes,
    spot,
    intensity: tpl.intensity,
    intensityLabel: WALKING_PLAN.intensityLabels[tpl.intensity] || tpl.intensity,
    label: tpl.label,
    note: w.note,
    vest: w.vest,
  };
}

export function weekTotalMinutes(weekNum) {
  const w = getWeek(weekNum);
  if (!w) return 0;
  return Object.values(w.dur).reduce((a, b) => a + b, 0);
}

export function formatDuration(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
